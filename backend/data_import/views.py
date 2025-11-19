from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import HttpResponse
from .models import DataImportProcess
from .serializers import DataImportRequestSerializer, DataImportProcessSerializer
from .services import DataImportService
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
        Delete a process and its associated table
        """
        try:
            process = DataImportProcess.objects.get(pk=pk)
            table_name = process.table_name

            # Drop the table from database
            from django.db import connection
            from .services import DataImportService

            safe_table_name = DataImportService.sanitize_column_name(table_name)

            with connection.cursor() as cursor:
                try:
                    cursor.execute(f'DROP TABLE IF EXISTS {safe_table_name}')
                    print(f"✅ Tabela {safe_table_name} deletada com sucesso")
                except Exception as e:
                    print(f"⚠️ Erro ao deletar tabela {safe_table_name}: {e}")

            # Delete the process record
            process.delete()

            return Response(
                {
                    'success': True,
                    'message': f'Processo e tabela {table_name} deletados com sucesso'
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

            # Insert new data into existing table
            insert_stats = DataImportService.insert_data(
                process.table_name,
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
        Get preview of table data (first 5 records)
        """
        try:
            process = DataImportProcess.objects.get(pk=pk)

            from django.db import connection
            from .services import DataImportService

            safe_table_name = DataImportService.sanitize_column_name(process.table_name)

            # Get column names from column_structure
            columns = list(process.column_structure.keys())

            if not columns:
                return Response(
                    {'error': 'Estrutura de colunas não disponível'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Query the table for first 5 records
            with connection.cursor() as cursor:
                columns_str = ', '.join(columns)
                query = f'SELECT {columns_str} FROM {safe_table_name} LIMIT 5'

                try:
                    cursor.execute(query)
                    rows = cursor.fetchall()

                    # Convert to list of dictionaries
                    data = []
                    for row in rows:
                        row_dict = {}
                        for i, col_name in enumerate(columns):
                            row_dict[col_name] = row[i]
                        data.append(row_dict)

                    return Response({
                        'success': True,
                        'columns': columns,
                        'data': data,
                        'total_records': process.record_count
                    })

                except Exception as e:
                    print(f"Erro ao consultar tabela {safe_table_name}: {e}")
                    return Response(
                        {'error': f'Erro ao consultar dados da tabela: {str(e)}'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )

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
        Search data across all active tables
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

            from django.db import connection
            results = []

            for process in active_processes:
                safe_table_name = DataImportService.sanitize_column_name(process.table_name)
                columns = list(process.column_structure.keys())

                if not columns:
                    continue

                # Build search query for all columns
                where_clauses = []
                for col in columns:
                    where_clauses.append(f"CAST({col} AS TEXT) LIKE %s")

                search_pattern = f'%{query}%'
                where_params = [search_pattern] * len(columns)

                search_sql = f'''
                    SELECT {', '.join(columns)}
                    FROM {safe_table_name}
                    WHERE {' OR '.join(where_clauses)}
                    LIMIT 100
                '''

                try:
                    with connection.cursor() as cursor:
                        cursor.execute(search_sql, where_params)
                        rows = cursor.fetchall()

                        if rows:
                            table_results = []
                            for row in rows:
                                row_dict = {}
                                for i, col_name in enumerate(columns):
                                    row_dict[col_name] = row[i]
                                table_results.append(row_dict)

                            results.append({
                                'process_id': process.id,
                                'table_name': process.table_name,
                                'columns': columns,
                                'data': table_results,
                                'count': len(table_results)
                            })

                except Exception as e:
                    print(f"Erro ao buscar na tabela {safe_table_name}: {e}")
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
        Download table data as CSV
        """
        try:
            process = DataImportProcess.objects.get(pk=pk)

            from django.db import connection

            safe_table_name = DataImportService.sanitize_column_name(process.table_name)
            columns = list(process.column_structure.keys())

            if not columns:
                return Response(
                    {'error': 'Estrutura de colunas não disponível'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Query all data from table
            with connection.cursor() as cursor:
                columns_str = ', '.join(columns)
                query = f'SELECT {columns_str} FROM {safe_table_name}'

                cursor.execute(query)
                rows = cursor.fetchall()

            # Create CSV
            output = io.StringIO()
            writer = csv.writer(output)

            # Write header
            writer.writerow(columns)

            # Write data
            for row in rows:
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
        Public search across all active tables
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

            from django.db import connection
            results = []

            for process in active_processes:
                safe_table_name = DataImportService.sanitize_column_name(process.table_name)
                columns = list(process.column_structure.keys())

                if not columns:
                    continue

                # Build search query for all columns
                where_clauses = []
                for col in columns:
                    where_clauses.append(f"CAST({col} AS TEXT) LIKE %s")

                search_pattern = f'%{query}%'
                where_params = [search_pattern] * len(columns)

                search_sql = f'''
                    SELECT {', '.join(columns)}
                    FROM {safe_table_name}
                    WHERE {' OR '.join(where_clauses)}
                    LIMIT 100
                '''

                try:
                    with connection.cursor() as cursor:
                        cursor.execute(search_sql, where_params)
                        rows = cursor.fetchall()

                        if rows:
                            table_results = []
                            for row in rows:
                                row_dict = {}
                                for i, col_name in enumerate(columns):
                                    row_dict[col_name] = row[i]
                                table_results.append(row_dict)

                            results.append({
                                'process_id': process.id,
                                'table_name': process.table_name,
                                'columns': columns,
                                'data': table_results,
                                'count': len(table_results)
                            })

                except Exception as e:
                    print(f"Erro ao buscar na tabela {safe_table_name}: {e}")
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
    Public view to download table data as CSV (no authentication required)
    GET /api/data-import/public-download/<id>/
    """
    permission_classes = [AllowAny]

    def get(self, request, pk):
        """
        Download table data as CSV (public access)
        """
        try:
            process = DataImportProcess.objects.get(pk=pk, status='active')

            from django.db import connection

            safe_table_name = DataImportService.sanitize_column_name(process.table_name)
            columns = list(process.column_structure.keys())

            if not columns:
                return Response(
                    {'error': 'Estrutura de colunas não disponível'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Query all data from table
            with connection.cursor() as cursor:
                columns_str = ', '.join(columns)
                query = f'SELECT {columns_str} FROM {safe_table_name}'

                cursor.execute(query)
                rows = cursor.fetchall()

            # Create CSV
            output = io.StringIO()
            writer = csv.writer(output)

            # Write header
            writer.writerow(columns)

            # Write data
            for row in rows:
                writer.writerow(row)

            # Create HTTP response
            response = HttpResponse(output.getvalue(), content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="{process.table_name}.csv"'

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

            # Query all data from table
            with connection.cursor() as cursor:
                columns_str = ', '.join(columns)
                query = f'SELECT {columns_str} FROM {safe_table_name}'

                cursor.execute(query)
                rows = cursor.fetchall()

                # Convert to list of dictionaries
                data = []
                for row in rows:
                    row_dict = {}
                    for i, col_name in enumerate(columns):
                        row_dict[col_name] = row[i]
                    data.append(row_dict)

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
