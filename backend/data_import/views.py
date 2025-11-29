from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import HttpResponse
from django.db.models import Count, Sum, Q
from django.db.models.functions import TruncMonth
from .models import DataImportProcess
from .serializers import DataImportRequestSerializer, DataImportProcessSerializer
from .services import DataImportService
from datetime import datetime, timedelta
import csv
import io


class DataImportPagination(PageNumberPagination):
    """
    Paginação para lista de processos
    """
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


@method_decorator(csrf_exempt, name='dispatch')
class ImportDataView(APIView):
    """
    View para importar dados de um endpoint externo ou arquivo
    POST /api/data-import/

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
            import traceback
            error_traceback = traceback.format_exc()
            print(f"\n{'='*60}")
            print(f"❌ ERRO na importação:")
            print(f"{'='*60}")
            print(error_traceback)
            print(f"{'='*60}\n")

            # Create more user-friendly error messages
            error_message = str(e)
            if 'Erro ao ler arquivo' in error_message:
                user_message = f"Não foi possível ler o arquivo. Verifique se está no formato correto (.xlsx, .xls ou .csv). Detalhes: {error_message}"
            elif 'Formato de arquivo não suportado' in error_message:
                user_message = "Formato de arquivo não suportado. Use arquivos .xlsx, .xls ou .csv"
            elif 'arquivo está vazio' in error_message:
                user_message = "O arquivo está vazio ou não contém dados válidos"
            else:
                user_message = error_message

            return Response(
                {
                    'success': False,
                    'error': user_message,
                    'error_type': type(e).__name__,
                    'traceback': error_traceback if request.user.is_superuser else None
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ListProcessesView(APIView):
    """
    View para listar todos os processos de importação
    GET /api/data-import/processes/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        List all import processes with pagination
        """
        processes = DataImportProcess.objects.all()

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
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        """
        Delete a process and its associated records (using ORM)
        """
        try:
            process = DataImportProcess.objects.get(pk=pk)
            table_name = process.table_name

            # Delete all associated records using ORM (CASCADE will handle this automatically)
            # But we'll do it explicitly for logging
            from .models import ImportedDataRecord
            record_count = ImportedDataRecord.objects.filter(process=process).count()

            # Delete the process record (CASCADE will delete all ImportedDataRecord entries)
            process.delete()

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


@method_decorator(csrf_exempt, name='dispatch')
class AppendDataView(APIView):
    """
    View para adicionar mais dados a uma tabela existente
    POST /api/data-import/processes/<id>/append/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        """
        Append more data to an existing table
        """
        try:
            process = DataImportProcess.objects.get(pk=pk)

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
            import traceback
            error_traceback = traceback.format_exc()
            print(f"\n{'='*60}")
            print(f"❌ ERRO ao adicionar dados:")
            print(f"{'='*60}")
            print(error_traceback)
            print(f"{'='*60}\n")

            return Response(
                {
                    'success': False,
                    'error': str(e),
                    'traceback': error_traceback if request.user.is_superuser else None
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ToggleStatusView(APIView):
    """
    View para alternar o status de um processo entre ativo e inativo
    POST /api/data-import/processes/<id>/toggle-status/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        """
        Toggle process status between active and inactive
        """
        try:
            process = DataImportProcess.objects.get(pk=pk)

            # Toggle status
            if process.status == 'active':
                process.status = 'inactive'
                message = f'Processo {process.table_name} marcado como inativo'
            else:
                process.status = 'active'
                message = f'Processo {process.table_name} marcado como ativo'

            process.save()

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


class DownloadDataView(APIView):
    """
    View para baixar dados de uma tabela em CSV
    GET /api/data-import/processes/<id>/download/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        """
        Download table data as CSV using ORM
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

            # Query all data using ORM
            records = ImportedDataRecord.objects.filter(process=process)

            # Create CSV
            output = io.StringIO()
            writer = csv.writer(output)

            # Write header
            writer.writerow(columns)

            # Write data
            for record in records:
                row = [record.data.get(col, '') for col in columns]
                writer.writerow(row)

            # Create HTTP response
            response = HttpResponse(output.getvalue(), content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="{process.table_name}.csv"'

            return response

        except DataImportProcess.DoesNotExist:
            return Response(
                {'error': 'Processo não encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Erro ao baixar dados: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PublicListDatasetsView(APIView):
    """
    Public view to list all active datasets (no authentication required)
    GET /api/data-import/public-datasets/
    """
    permission_classes = [AllowAny]

    def get(self, request):
        """
        List all active datasets
        """
        try:
            # Get all active processes
            active_processes = DataImportProcess.objects.filter(status='active').order_by('-created_at')

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


class PublicSearchDataView(APIView):
    """
    Public view to search data across all active tables (no authentication required)
    GET /api/data-import/public-search/?q=termo
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


class PublicDownloadDataView(APIView):
    """
    Public view to download table data (no authentication required)
    GET /api/data-import/public-download/<id>/?format=csv&columns=col1,col2
    """
    permission_classes = [AllowAny]

    def get(self, request, pk):
        """
        Download table data (public access)
        Supports formats: csv, xlsx, xls
        """
        try:
            process = DataImportProcess.objects.get(pk=pk, status='active')

            from django.db import connection

            safe_table_name = DataImportService.sanitize_column_name(process.table_name)
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

            # Query data using ORM
            from .models import ImportedDataRecord
            records = ImportedDataRecord.objects.filter(process=process)

            if file_format == 'csv':
                # Create CSV with proper line endings for Excel compatibility
                output = io.StringIO(newline='')
                writer = csv.writer(output, delimiter=';', quoting=csv.QUOTE_MINIMAL)
                writer.writerow(selected_columns)
                for record in records:
                    row = [record.data.get(col, '') for col in selected_columns]
                    writer.writerow(row)

                # Convert to bytes with UTF-8 BOM for Excel compatibility
                csv_content = output.getvalue()
                response = HttpResponse(
                    '\ufeff' + csv_content,  # UTF-8 BOM for Excel
                    content_type='text/csv; charset=utf-8'
                )
                response['Content-Disposition'] = f'attachment; filename="{process.table_name}.csv"'

            else:
                # Create Excel (xlsx or xls)
                import openpyxl
                from openpyxl.utils import get_column_letter

                wb = openpyxl.Workbook()
                ws = wb.active
                ws.title = process.table_name[:31]  # Excel sheet name limit

                # Write header
                for col_idx, col_name in enumerate(selected_columns, 1):
                    cell = ws.cell(row=1, column=col_idx, value=col_name)
                    cell.font = openpyxl.styles.Font(bold=True)

                # Write data
                for row_idx, record in enumerate(records, 2):
                    for col_idx, col_name in enumerate(selected_columns, 1):
                        value = record.data.get(col_name, '')
                        ws.cell(row=row_idx, column=col_idx, value=value)

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
            return Response(
                {'error': f'Erro ao baixar dados: {str(e)}'},
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
            import traceback
            print(f"Error in dashboard stats: {traceback.format_exc()}")
            return Response({
                'success': False,
                'error': f'Erro ao buscar estatísticas: {str(e)}'
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
            import traceback
            print(f"Error reanalyzing column types: {traceback.format_exc()}")
            return Response({
                'success': False,
                'error': f'Erro ao re-analisar tipos: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
