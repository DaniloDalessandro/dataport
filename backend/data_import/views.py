from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from django.http import HttpResponse, StreamingHttpResponse
from django.db.models import Count, Sum, Q
from django.db.models.functions import TruncMonth
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django_ratelimit.decorators import ratelimit
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes
from .models import DataImportProcess
from .serializers import DataImportRequestSerializer, DataImportProcessSerializer
from .services import DataImportService
from .permissions import IsDatasetOwnerOrReadOnly, IsDatasetOwner, CanDeleteDatasets
from .cache import cache_view_result, invalidate_process_caches
from datetime import datetime, timedelta
import csv
import io
import logging
import uuid

logger = logging.getLogger(__name__)


def log_error_safely(error: Exception, context: str = "") -> str:
    """
    Log error details server-side and return a safe error ID for client response.
    Never exposes internal details to the client.
    """
    import traceback
    error_id = str(uuid.uuid4())[:8]
    error_details = traceback.format_exc()

    logger.error(f"Error ID {error_id} - {context}")
    logger.error(f"Error type: {type(error).__name__}")
    logger.error(f"Error message: {str(error)}")
    logger.error(f"Traceback:\n{error_details}")

    return error_id


class DataImportPagination(PageNumberPagination):
    """
    Paginação para lista de processos
    """
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


@extend_schema(
    tags=['Data Import'],
    summary='Importar dados de arquivo ou endpoint',
    description='''
    Importa dados de um arquivo (CSV, Excel) ou endpoint externo.

    **Rate limit:** 10 imports por hora por usuário

    **Formatos suportados:**
    - CSV (.csv)
    - Excel (.xlsx, .xls)
    - Endpoint JSON (API externa)

    **Limites:**
    - Tamanho máximo: 50MB
    - Linhas máximas: 100.000
    - Colunas máximas: 100
    ''',
    request=DataImportRequestSerializer,
    responses={
        201: DataImportProcessSerializer,
        400: OpenApiTypes.OBJECT,
        500: OpenApiTypes.OBJECT,
    },
)
@method_decorator(ratelimit(key='user', rate='10/h', method='POST'), name='post')
class ImportDataView(APIView):
    """
    View para importar dados de um endpoint externo ou arquivo
    POST /api/data-import/
    Rate limit: 10 imports per hour per user

    Supports both:
    - Endpoint URL import (JSON data from API)
    - File upload import (Excel/CSV files)
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Import data from external endpoint or uploaded file
        """
        print(f"\n{'='*60}")
        print(f"📥 Nova requisição de importação recebida")
        print(f"{'='*60}")
        print(f"Content-Type: {request.content_type}")
        print(f"FILES: {list(request.FILES.keys())}")
        print(f"DATA keys: {list(request.data.keys())}")

        # Prepare data for serializer (handle both multipart and JSON)
        data = request.data.copy()

        # Get file if present
        file = request.FILES.get('file', None)
        if file:
            print(f"📁 Arquivo recebido:")
            print(f"   - Nome: {file.name}")
            print(f"   - Tamanho: {file.size} bytes")
            print(f"   - Content-Type: {file.content_type}")
            data['file'] = file

        serializer = DataImportRequestSerializer(data=data)

        if not serializer.is_valid():
            print(f"❌ Validação falhou: {serializer.errors}")
            return Response(
                {'error': 'Dados inválidos', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Extract validated data
        import_type = serializer.validated_data['import_type']
        table_name = serializer.validated_data['table_name']
        endpoint_url = serializer.validated_data.get('endpoint_url')
        uploaded_file = serializer.validated_data.get('file')

        print(f"✅ Dados validados:")
        print(f"   - Tipo: {import_type}")
        print(f"   - Tabela: {table_name}")
        if import_type == 'file' and uploaded_file:
            print(f"   - Arquivo: {uploaded_file.name}")

        try:
            print(f"\n🔄 Iniciando importação...")
            # Execute import (works for both endpoint and file)
            process = DataImportService.import_data(
                table_name=table_name,
                user=request.user,
                endpoint_url=endpoint_url,
                file=uploaded_file,
                import_type=import_type
            )
            print(f"✅ Importação concluída com sucesso!")

            # Invalidate related caches
            invalidate_process_caches(process.id)

            # Return created process
            result_serializer = DataImportProcessSerializer(process)

            # Get insertion statistics if available
            message = f'Dados importados com sucesso! {process.record_count} registros inseridos.'

            return Response(
                {
                    'success': True,
                    'message': message,
                    'process': result_serializer.data
                },
                status=status.HTTP_201_CREATED
            )

        except Exception as e:
            error_id = log_error_safely(e, "Data import failed")

            # Create more user-friendly error messages
            error_message = str(e)
            if 'Erro ao ler arquivo' in error_message:
                user_message = "Não foi possível ler o arquivo. Verifique se está no formato correto (.xlsx, .xls ou .csv)."
            elif 'Formato de arquivo não suportado' in error_message:
                user_message = "Formato de arquivo não suportado. Use arquivos .xlsx, .xls ou .csv"
            elif 'arquivo está vazio' in error_message:
                user_message = "O arquivo está vazio ou não contém dados válidos"
            elif 'timeout' in error_message.lower():
                user_message = 'O servidor de dados não respondeu a tempo. Tente novamente mais tarde.'
            elif 'connection' in error_message.lower():
                user_message = 'Não foi possível conectar ao servidor de dados. Verifique a URL.'
            else:
                user_message = "Erro ao importar dados. Por favor, tente novamente."

            return Response(
                {
                    'success': False,
                    'error': user_message,
                    'error_type': type(e).__name__,
                    'error_id': error_id
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@extend_schema(
    tags=['Data Import'],
    summary='Listar todos os processos de importação',
    description='Lista todos os processos de importação com paginação. Cache de 5 minutos.',
    parameters=[
        OpenApiParameter(name='page', type=int, description='Número da página'),
        OpenApiParameter(name='page_size', type=int, description='Itens por página (max 100)'),
    ],
    responses={200: DataImportProcessSerializer(many=True)},
)
class ListProcessesView(APIView):
    """
    View para listar todos os processos de importação
    GET /api/data-import/processes/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        List all import processes with pagination and optimized queries
        """
        # Use select_related to avoid N+1 queries when accessing created_by
        processes = DataImportProcess.objects.select_related('created_by').all()

        # Paginação
        paginator = DataImportPagination()
        paginated_processes = paginator.paginate_queryset(processes, request)

        serializer = DataImportProcessSerializer(paginated_processes, many=True)

        return paginator.get_paginated_response(serializer.data)


class ProcessDetailView(APIView):
    """
    View para ver detalhes de um processo específico
    GET /api/data-import/processes/<id>/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        """
        Get details of a specific import process
        """
        try:
            process = DataImportProcess.objects.get(pk=pk)
            serializer = DataImportProcessSerializer(process)

            return Response(serializer.data)

        except DataImportProcess.DoesNotExist:
            return Response(
                {'error': 'Processo não encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )


class DeleteProcessView(APIView):
    """
    View para deletar um processo e sua tabela
    DELETE /api/data-import/processes/<id>/delete/
    """
    permission_classes = [IsAuthenticated, CanDeleteDatasets]

    def delete(self, request, pk):
        """
        Delete a process and its associated records (using ORM)
        """
        try:
            process = DataImportProcess.objects.get(pk=pk)

            # Check object-level permission
            self.check_object_permissions(request, process)
            table_name = process.table_name

            # Delete all associated records using ORM (CASCADE will handle this automatically)
            # But we'll do it explicitly for logging
            from .models import ImportedDataRecord
            record_count = ImportedDataRecord.objects.filter(process=process).count()

            # Delete the process record (CASCADE will delete all ImportedDataRecord entries)
            process.delete()

            # Invalidate related caches
            invalidate_process_caches(pk)

            print(f"✅ Processo {table_name} e {record_count} registros deletados com sucesso")

            return Response(
                {
                    'success': True,
                    'message': f'Processo {table_name} e {record_count} registros deletados com sucesso'
                },
                status=status.HTTP_200_OK
            )

        except DataImportProcess.DoesNotExist:
            return Response(
                {'error': 'Processo não encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Erro ao deletar processo: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(ratelimit(key='user', rate='20/h', method='POST'), name='post')
class AppendDataView(APIView):
    """
    View para adicionar mais dados a uma tabela existente
    POST /api/data-import/processes/<id>/append/
    Rate limit: 20 appends per hour per user
    """
    permission_classes = [IsAuthenticated, IsDatasetOwner]

    def post(self, request, pk):
        """
        Append more data to an existing table
        """
        try:
            process = DataImportProcess.objects.get(pk=pk)

            # Check object-level permission
            self.check_object_permissions(request, process)

            print(f"\n{'='*60}")
            print(f"📥 Adicionando dados à tabela: {process.table_name}")
            print(f"{'='*60}")

            # Prepare data for serializer
            data = request.data.copy()
            file = request.FILES.get('file', None)
            if file:
                data['file'] = file

            # Validate request
            serializer = DataImportRequestSerializer(data=data)
            if not serializer.is_valid():
                print(f"❌ Validação falhou: {serializer.errors}")
                return Response(
                    {'error': 'Dados inválidos', 'details': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Extract validated data
            import_type = serializer.validated_data['import_type']
            endpoint_url = serializer.validated_data.get('endpoint_url')
            uploaded_file = serializer.validated_data.get('file')

            # Fetch new data
            if import_type == 'endpoint':
                if not endpoint_url:
                    raise ValueError('URL do endpoint é obrigatória')
                data, column_structure = DataImportService.fetch_data_from_endpoint(endpoint_url)
            elif import_type == 'file':
                if not uploaded_file:
                    raise ValueError('Arquivo é obrigatório')
                data, column_structure = DataImportService.process_file_data(uploaded_file)
            else:
                raise ValueError(f'Tipo de importação inválido: {import_type}')

            # Insert new data using ORM
            insert_stats = DataImportService.insert_data_orm(
                process,
                data,
                process.column_structure
            )

            # Update process record with newly inserted records only
            process.record_count += insert_stats['inserted']
            process.save()

            # Invalidate related caches
            invalidate_process_caches(pk)

            print(f"✅ Importação concluída:")
            print(f"   - Inseridos: {insert_stats['inserted']}")
            print(f"   - Duplicatas ignoradas: {insert_stats['duplicates']}")
            print(f"   - Erros: {insert_stats['errors']}")
            print(f"   - Total processado: {insert_stats['total']}")

            # Return updated process with statistics
            result_serializer = DataImportProcessSerializer(process)

            # Create detailed message
            message_parts = [f"{insert_stats['inserted']} novos registros adicionados"]
            if insert_stats['duplicates'] > 0:
                message_parts.append(f"{insert_stats['duplicates']} duplicatas ignoradas")
            if insert_stats['errors'] > 0:
                message_parts.append(f"{insert_stats['errors']} erros")

            message = " | ".join(message_parts)

            return Response(
                {
                    'success': True,
                    'message': message,
                    'statistics': insert_stats,
                    'process': result_serializer.data
                },
                status=status.HTTP_200_OK
            )

        except DataImportProcess.DoesNotExist:
            return Response(
                {'error': 'Processo não encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            error_id = log_error_safely(e, "Data append failed")

            return Response(
                {
                    'success': False,
                    'error': 'Erro ao adicionar dados. Por favor, tente novamente.',
                    'error_id': error_id
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ToggleStatusView(APIView):
    """
    View para alternar o status de um processo entre ativo e inativo
    POST /api/data-import/processes/<id>/toggle-status/
    """
    permission_classes = [IsAuthenticated, IsDatasetOwner]

    def post(self, request, pk):
        """
        Toggle process status between active and inactive
        Only owner or superuser can toggle
        """
        try:
            process = DataImportProcess.objects.get(pk=pk)

            # Check permission
            self.check_object_permissions(request, process)

            # Toggle status
            if process.status == 'active':
                process.status = 'inactive'
                message = f'Processo {process.table_name} marcado como inativo'
            else:
                process.status = 'active'
                message = f'Processo {process.table_name} marcado como ativo'

            process.save()

            # Invalidate related caches
            invalidate_process_caches(pk)

            # Return updated process
            serializer = DataImportProcessSerializer(process)

            return Response(
                {
                    'success': True,
                    'message': message,
                    'process': serializer.data
                },
                status=status.HTTP_200_OK
            )

        except DataImportProcess.DoesNotExist:
            return Response(
                {'error': 'Processo não encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Erro ao alterar status: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DataPreviewView(APIView):
    """
    View para retornar uma prévia dos dados da tabela
    GET /api/data-import/processes/<id>/preview/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        """
        Get preview of table data (first 5 records) using ORM
        """
        try:
            process = DataImportProcess.objects.get(pk=pk)
            from .models import ImportedDataRecord

            # Get column names from column_structure
            columns = list(process.column_structure.keys())

            if not columns:
                return Response(
                    {'error': 'Estrutura de colunas não disponível'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Query records using ORM
            records = ImportedDataRecord.objects.filter(process=process)[:5]

            # Convert to list of dictionaries
            data = [record.data for record in records]

            return Response({
                'success': True,
                'columns': columns,
                'data': data,
                'total_records': process.record_count
            })

        except DataImportProcess.DoesNotExist:
            return Response(
                {'error': 'Processo não encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Erro ao buscar prévia: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SearchDataView(APIView):
    """
    View para buscar dados em todas as tabelas ativas
    GET /api/data-import/search/?q=termo
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Search data across all active processes using ORM
        """
        query = request.GET.get('q', '').strip()

        if not query:
            return Response({
                'success': False,
                'error': 'Termo de busca é obrigatório'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Get all active processes
            active_processes = DataImportProcess.objects.filter(status='active')
            from .models import ImportedDataRecord
            from django.db.models import Q
            import json

            results = []

            for process in active_processes:
                columns = list(process.column_structure.keys())

                if not columns:
                    continue

                # Build Q objects for searching in JSON fields
                # Search in any column value (converted to string)
                search_query = Q()
                for col in columns:
                    # Django JSONField lookup: data__column_name__icontains
                    search_query |= Q(**{f'data__{col}__icontains': query})

                try:
                    # Find matching records
                    matching_records = ImportedDataRecord.objects.filter(
                        process=process
                    ).filter(search_query)[:100]

                    if matching_records.exists():
                        table_results = [record.data for record in matching_records]

                        results.append({
                            'process_id': process.id,
                            'table_name': process.table_name,
                            'columns': columns,
                            'data': table_results,
                            'count': len(table_results)
                        })

                except Exception as e:
                    print(f"Erro ao buscar no processo {process.table_name}: {e}")
                    continue

            return Response({
                'success': True,
                'query': query,
                'results': results,
                'total_tables': len(results)
            })

        except Exception as e:
            return Response(
                {'error': f'Erro ao buscar dados: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class Echo:
    """An object that implements just the write method of the file-like interface for streaming."""
    def write(self, value):
        return value


class DownloadDataView(APIView):
    """
    View para baixar dados de uma tabela em CSV com streaming
    GET /api/data-import/processes/<id>/download/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        """
        Download table data as CSV using streaming to avoid memory issues
        """
        try:
            process = DataImportProcess.objects.get(pk=pk)
            from .models import ImportedDataRecord

            columns = list(process.column_structure.keys())

            if not columns:
                return Response(
                    {'error': 'Estrutura de colunas não disponível'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            def iter_csv_rows():
                """Generator function to stream CSV rows"""
                buffer = Echo()
                writer = csv.writer(buffer)

                # Yield header
                yield writer.writerow(columns)

                # Stream records in batches to avoid loading all data in memory
                records = ImportedDataRecord.objects.filter(process=process).iterator(chunk_size=1000)
                for record in records:
                    row = [record.data.get(col, '') for col in columns]
                    yield writer.writerow(row)

            # Create streaming response
            response = StreamingHttpResponse(
                iter_csv_rows(),
                content_type='text/csv'
            )
            response['Content-Disposition'] = f'attachment; filename="{process.table_name}.csv"'

            return response

        except DataImportProcess.DoesNotExist:
            return Response(
                {'error': 'Processo não encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            error_id = log_error_safely(e, "Download failed")
            return Response(
                {
                    'error': 'Erro ao baixar dados. Por favor, tente novamente.',
                    'error_id': error_id
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PublicListDatasetsView(APIView):
    """
    Public view to list all active datasets (no authentication required)
    GET /api/data-import/public-datasets/
    Cached for 10 minutes (public endpoint, less frequent updates)
    """
    permission_classes = [AllowAny]

    def get(self, request):
        """
        List all active datasets
        """
        try:
            # Get all active processes with optimized queries
            active_processes = DataImportProcess.objects.select_related('created_by').filter(
                status='active'
            ).order_by('-created_at')

            # Serialize the data
            serializer = DataImportProcessSerializer(active_processes, many=True)

            return Response({
                'success': True,
                'count': active_processes.count(),
                'results': serializer.data
            })
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Erro ao listar datasets: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(ratelimit(key='ip', rate='100/h', method='GET'), name='get')
class PublicSearchDataView(APIView):
    """
    Public view to search data across all active tables (no authentication required)
    GET /api/data-import/public-search/?q=termo
    Rate limit: 100 searches per hour per IP
    """
    permission_classes = [AllowAny]

    def get(self, request):
        """
        Public search across all active tables using ORM
        """
        query = request.GET.get('q', '').strip()

        if not query:
            return Response({
                'success': False,
                'error': 'Termo de busca é obrigatório'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Get all active processes
            active_processes = DataImportProcess.objects.filter(status='active')
            from .models import ImportedDataRecord
            from django.db.models import Q

            results = []

            for process in active_processes:
                columns = list(process.column_structure.keys())

                if not columns:
                    continue

                # Build Q objects for searching in JSON fields
                search_query = Q()
                for col in columns:
                    search_query |= Q(**{f'data__{col}__icontains': query})

                try:
                    # Find matching records
                    matching_records = ImportedDataRecord.objects.filter(
                        process=process
                    ).filter(search_query)[:100]

                    if matching_records.exists():
                        table_results = [record.data for record in matching_records]

                        results.append({
                            'process_id': process.id,
                            'table_name': process.table_name,
                            'columns': columns,
                            'data': table_results,
                            'count': len(table_results)
                        })

                except Exception as e:
                    print(f"Erro ao buscar no processo {process.table_name}: {e}")
                    continue

            return Response({
                'success': True,
                'query': query,
                'results': results,
                'total_tables': len(results)
            })

        except Exception as e:
            return Response(
                {'error': f'Erro ao buscar dados: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(ratelimit(key='ip', rate='50/h', method='GET'), name='get')
class PublicDownloadDataView(APIView):
    """
    Public view to download table data with streaming support (no authentication required)
    GET /api/data-import/public-download/<id>/?format=csv&columns=col1,col2
    Rate limit: 50 downloads per hour per IP
    """
    permission_classes = [AllowAny]

    def get(self, request, pk):
        """
        Download table data (public access) with memory-efficient streaming
        Supports formats: csv, xlsx
        """
        try:
            process = DataImportProcess.objects.get(pk=pk, status='active')
            all_columns = list(process.column_structure.keys())

            # Get selected columns from query params
            columns_param = request.GET.get('columns', '')
            if columns_param:
                selected_columns = [col for col in columns_param.split(',') if col in all_columns]
            else:
                selected_columns = all_columns

            if not selected_columns:
                return Response(
                    {'error': 'Nenhuma coluna válida selecionada'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get format from query params (use file_format to avoid conflict with DRF's format param)
            file_format = request.GET.get('file_format', request.GET.get('format', 'csv')).lower()
            if file_format not in ['csv', 'xlsx']:
                file_format = 'csv'

            from .models import ImportedDataRecord

            if file_format == 'csv':
                def iter_csv_rows():
                    """Generator function to stream CSV rows"""
                    buffer = Echo()
                    writer = csv.writer(buffer, delimiter=';', quoting=csv.QUOTE_MINIMAL)

                    # Yield UTF-8 BOM for Excel compatibility
                    yield '\ufeff'

                    # Yield header
                    yield writer.writerow(selected_columns)

                    # Stream records in batches
                    records = ImportedDataRecord.objects.filter(process=process).iterator(chunk_size=1000)
                    for record in records:
                        row = [record.data.get(col, '') for col in selected_columns]
                        yield writer.writerow(row)

                response = StreamingHttpResponse(
                    iter_csv_rows(),
                    content_type='text/csv; charset=utf-8'
                )
                response['Content-Disposition'] = f'attachment; filename="{process.table_name}.csv"'

            else:
                # For Excel, we need to use write-only mode for better memory efficiency
                import openpyxl
                from openpyxl import Workbook

                wb = Workbook(write_only=True)
                ws = wb.create_sheet(process.table_name[:31])

                # Write header
                ws.append(selected_columns)

                # Write data in batches using iterator
                records = ImportedDataRecord.objects.filter(process=process).iterator(chunk_size=1000)
                for record in records:
                    row = [record.data.get(col, '') for col in selected_columns]
                    ws.append(row)

                # Save to bytes
                output = io.BytesIO()
                wb.save(output)
                output.seek(0)

                content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                response = HttpResponse(output.getvalue(), content_type=content_type)
                response['Content-Disposition'] = f'attachment; filename="{process.table_name}.xlsx"'

            return response

        except DataImportProcess.DoesNotExist:
            return Response(
                {'error': 'Dados não encontrados ou não estão públicos'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            error_id = log_error_safely(e, "Download failed")
            return Response(
                {
                    'error': 'Erro ao baixar dados. Por favor, tente novamente.',
                    'error_id': error_id
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PublicDataPreviewView(APIView):
    """
    Public view to get all data from a specific dataset (no authentication required)
    GET /api/data-import/public-data/<id>/
    """
    permission_classes = [AllowAny]

    def get(self, request, pk):
        """
        Get all data from a specific active dataset
        """
        try:
            process = DataImportProcess.objects.get(pk=pk, status='active')

            from django.db import connection

            safe_table_name = DataImportService.sanitize_column_name(process.table_name)
            columns = list(process.column_structure.keys())

            if not columns:
                return Response({
                    'success': False,
                    'error': 'Estrutura de colunas não disponível'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Query all data using ORM
            from .models import ImportedDataRecord
            records = ImportedDataRecord.objects.filter(process=process)

            # Convert to list of dictionaries
            data = [record.data for record in records]

            return Response({
                'success': True,
                'process_id': process.id,
                'table_name': process.table_name,
                'columns': columns,
                'data': data,
                'count': len(data)
            })

        except DataImportProcess.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Dados não encontrados ou não estão públicos'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Erro ao buscar dados: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PublicColumnMetadataView(APIView):
    """
    Public view to get column metadata including types and unique values
    GET /api/data-import/public-metadata/<id>/
    """
    permission_classes = [AllowAny]

    def get(self, request, pk):
        """
        Get column metadata for filtering
        """
        try:
            process = DataImportProcess.objects.get(pk=pk, status='active')

            from django.db import connection

            safe_table_name = DataImportService.sanitize_column_name(process.table_name)
            column_structure = process.column_structure

            if not column_structure:
                return Response({
                    'success': False,
                    'error': 'Estrutura de colunas não disponível'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Build metadata for each column
            from .models import ImportedDataRecord
            columns_metadata = []

            for col_name, col_info in column_structure.items():
                col_type = col_info.get('type', 'string') if isinstance(col_info, dict) else str(col_info)

                # Determine filter type based on column type
                filter_type = 'string'
                if col_type in ['INTEGER', 'int', 'bigint', 'smallint']:
                    filter_type = 'integer'
                elif col_type in ['REAL', 'float', 'double', 'decimal', 'numeric']:
                    filter_type = 'float'
                elif col_type in ['date']:
                    filter_type = 'date'
                elif col_type in ['datetime', 'timestamp']:
                    filter_type = 'datetime'
                elif col_type in ['BOOLEAN', 'bool']:
                    filter_type = 'boolean'

                # Get unique values for category filters (limit to 100)
                unique_values = []
                try:
                    # Query unique values using Django JSONField
                    records = ImportedDataRecord.objects.filter(process=process)
                    unique_set = set()
                    for record in records:
                        value = record.data.get(col_name)
                        if value is not None:
                            unique_set.add(str(value))
                            if len(unique_set) >= 100:
                                break

                    unique_values = sorted(list(unique_set))[:100]

                    # If there are few unique values, treat as category
                    if len(unique_values) <= 20 and filter_type == 'string':
                        filter_type = 'category'
                except Exception as e:
                    print(f"Error getting unique values for {col_name}: {e}")

                columns_metadata.append({
                    'name': col_name,
                    'type': col_type,
                    'filter_type': filter_type,
                    'unique_values': unique_values if filter_type == 'category' else []
                })

            return Response({
                'success': True,
                'process_id': process.id,
                'table_name': process.table_name,
                'columns': columns_metadata
            })

        except DataImportProcess.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Dados não encontrados ou não estão públicos'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Erro ao buscar metadados: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@extend_schema(
    tags=['Analytics'],
    summary='Estatísticas do dashboard',
    description='''
    Retorna estatísticas agregadas para o dashboard.

    **Inclui:**
    - Status dos datasets (ativos, inativos, etc.)
    - Total de registros importados
    - Estimativa de armazenamento
    - Dados mensais (últimos 6 meses)
    - Datasets mais recentes
    ''',
    responses={200: OpenApiTypes.OBJECT},
)
class DashboardStatsView(APIView):
    """
    View para retornar estatísticas agregadas para o dashboard
    GET /api/data-import/dashboard-stats/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Get aggregated statistics for dashboard
        """
        try:
            # Get status counts
            status_counts = {
                'active': DataImportProcess.objects.filter(status='active').count(),
                'inactive': DataImportProcess.objects.filter(status='inactive').count(),
                'processing': 0,  # Can be implemented if you add processing status
                'pending': 0,     # Can be implemented if you add pending status
            }

            # Total datasets by status (for pie chart)
            dataset_status = [
                {'name': 'Ativos', 'value': status_counts['active'], 'color': '#10b981'},
                {'name': 'Arquivados', 'value': status_counts['inactive'], 'color': '#6b7280'},
                {'name': 'Em Processamento', 'value': status_counts['processing'], 'color': '#f59e0b'},
                {'name': 'Pendentes', 'value': status_counts['pending'], 'color': '#ef4444'},
            ]

            # Total records
            total_records = DataImportProcess.objects.aggregate(Sum('record_count'))['record_count__sum'] or 0

            # Storage calculation (rough estimate based on record count)
            # Assuming average of 1KB per record
            storage_gb = (total_records * 1024) / (1024 * 1024 * 1024)  # Convert bytes to GB
            storage_tb = storage_gb / 1024

            # Get monthly data (last 6 months)
            six_months_ago = datetime.now() - timedelta(days=180)
            monthly_data = DataImportProcess.objects.filter(
                created_at__gte=six_months_ago
            ).annotate(
                month=TruncMonth('created_at')
            ).values('month').annotate(
                count=Count('id'),
                total_records=Sum('record_count')
            ).order_by('month')

            # Format monthly data
            monthly_volume = []
            months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
            for item in monthly_data:
                month_num = item['month'].month - 1
                volume_gb = (item['total_records'] or 0) / 1000  # Convert to GB (simplified)
                monthly_volume.append({
                    'month': months[month_num],
                    'value': int(volume_gb),
                    'datasets': item['count']
                })

            # If less than 6 months of data, fill with zeros
            while len(monthly_volume) < 6:
                month_idx = (datetime.now().month - 6 + len(monthly_volume)) % 12
                monthly_volume.insert(0, {
                    'month': months[month_idx],
                    'value': 0,
                    'datasets': 0
                })

            # Calculate growth rate (comparing last month to previous month)
            growth_rate = 0
            if len(monthly_volume) >= 2:
                last_month = monthly_volume[-1]['value']
                prev_month = monthly_volume[-2]['value']
                if prev_month > 0:
                    growth_rate = ((last_month - prev_month) / prev_month) * 100

            # Calculate average monthly volume
            avg_volume = sum(item['value'] for item in monthly_volume) / len(monthly_volume) if monthly_volume else 0

            return Response({
                'success': True,
                'data': {
                    'metrics': {
                        'total_datasets': status_counts['active'] + status_counts['inactive'] + status_counts['processing'] + status_counts['pending'],
                        'active_datasets': status_counts['active'],
                        'total_records': total_records,
                        'storage_tb': round(storage_tb, 2),
                        'storage_percent': min(int((storage_tb / 24) * 100), 100),  # Assuming 24TB capacity
                        'growth_rate': round(growth_rate, 1)
                    },
                    'dataset_status': dataset_status,
                    'monthly_volume': monthly_volume,
                    'summary': {
                        'avg_monthly_volume': round(avg_volume, 0),
                        'active_percentage': round((status_counts['active'] / max(status_counts['active'] + status_counts['inactive'], 1)) * 100, 0)
                    }
                }
            })

        except Exception as e:
            error_id = log_error_safely(e, "Dashboard stats failed")
            return Response({
                'success': False,
                'error': 'Erro ao buscar estatísticas. Por favor, tente novamente.',
                'error_id': error_id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ReanalyzeColumnTypesView(APIView):
    """
    View to re-analyze column types for an existing dataset
    POST /api/data-import/reanalyze-types/<id>/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        """
        Re-analyze column types for a dataset
        """
        try:
            process = DataImportProcess.objects.get(pk=pk, created_by=request.user)

            # Get all records for this process
            from .models import ImportedDataRecord
            records = ImportedDataRecord.objects.filter(process=process)

            if not records.exists():
                return Response({
                    'success': False,
                    'error': 'Nenhum registro encontrado para este dataset'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Convert records to list of dicts
            data = [record.data for record in records]

            # Re-analyze column structure with improved type detection
            new_column_structure = DataImportService.analyze_column_structure(data)

            # Update process with new column structure
            process.column_structure = new_column_structure
            process.save()

            return Response({
                'success': True,
                'message': 'Tipos de coluna re-analisados com sucesso',
                'column_structure': new_column_structure
            })

        except DataImportProcess.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Processo não encontrado'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            error_id = log_error_safely(e, "Reanalyze column types failed")
            return Response({
                'success': False,
                'error': 'Erro ao re-analisar tipos. Por favor, tente novamente.',
                'error_id': error_id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TaskStatusView(APIView):
    """
    View para verificar o status de uma task assíncrona
    GET /api/data-import/tasks/<task_id>/status/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, task_id):
        """
        Get status of an async task
        """
        try:
            from .models import AsyncTask

            task = AsyncTask.objects.get(task_id=task_id)

            # Check if user owns this task
            if task.created_by != request.user and not request.user.is_superuser:
                return Response(
                    {'error': 'Você não tem permissão para acessar esta task'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Prepare response
            response_data = {
                'task_id': task.task_id,
                'task_name': task.task_name,
                'status': task.status,
                'status_display': task.get_status_display(),
                'progress': task.progress,
                'created_at': task.created_at,
                'updated_at': task.updated_at,
            }

            # Add result if completed
            if task.status == 'success':
                response_data['result'] = task.result
                response_data['completed_at'] = task.completed_at

            # Add error if failed
            if task.status == 'failed':
                response_data['error'] = task.error

            # Add process info if available
            if task.process:
                response_data['process'] = {
                    'id': task.process.id,
                    'table_name': task.process.table_name,
                    'record_count': task.process.record_count,
                    'status': task.process.status,
                }

            return Response(response_data)

        except AsyncTask.DoesNotExist:
            return Response(
                {'error': 'Task não encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            error_id = log_error_safely(e, "Task status check failed")
            return Response({
                'error': 'Erro ao verificar status da task',
                'error_id': error_id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
