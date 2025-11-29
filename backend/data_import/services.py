import logging
import requests
import re
import time
import warnings
import pandas as pd
from datetime import datetime
from typing import Dict, List, Any, Tuple, Optional
from django.core.files.uploadedfile import UploadedFile
from django.db import connection
from .models import DataImportProcess

logger = logging.getLogger(__name__)

# Suppress SSL warnings when verification is disabled
warnings.filterwarnings('ignore', message='Unverified HTTPS request')


class DataImportService:
    """
    Service to handle dynamic data import from external endpoints
    """

    TYPE_MAPPING = {
        'str': 'TEXT',
        'int': 'INTEGER',
        'float': 'REAL',
        'bool': 'BOOLEAN',
        'NoneType': 'TEXT',
    }

    @staticmethod
    def sanitize_column_name(column_name: str) -> str:
        """
        Sanitize column names to be SQL-safe
        """
        sanitized = re.sub(r'[^\w\s]', '', str(column_name))
        sanitized = re.sub(r'\s+', '_', sanitized)
        sanitized = sanitized.lower()

        if sanitized and sanitized[0].isdigit():
            sanitized = f'col_{sanitized}'

        return sanitized or 'unnamed_column'

    @staticmethod
    def detect_column_type(values: List[Any]) -> str:
        """
        Detect the most appropriate SQL type for a column based on its values
        """
        from dateutil import parser as date_parser

        non_none_values = [v for v in values if v is not None]

        if not non_none_values:
            return 'TEXT'

        sample = non_none_values[:100]

        # Check if values are already datetime objects
        if any(isinstance(v, (pd.Timestamp, datetime)) for v in sample):
            # Check if any has time component
            has_time = False
            for v in sample:
                if isinstance(v, (pd.Timestamp, datetime)):
                    if v.hour != 0 or v.minute != 0 or v.second != 0:
                        has_time = True
                        break
            return 'datetime' if has_time else 'date'

        # Check if string values are dates
        if all(isinstance(v, str) for v in sample):
            date_count = 0
            datetime_count = 0

            for v in sample[:20]:  # Check first 20 samples
                try:
                    # Try to parse as date
                    parsed_date = date_parser.parse(v, fuzzy=False)

                    # Check if it has time component
                    if parsed_date.hour != 0 or parsed_date.minute != 0 or parsed_date.second != 0:
                        datetime_count += 1
                    else:
                        date_count += 1
                except (ValueError, TypeError, AttributeError):
                    # Not a date, continue
                    pass

            # If more than 80% are dates, consider it a date column
            total_parsed = date_count + datetime_count
            if total_parsed > len(sample[:20]) * 0.8:
                return 'datetime' if datetime_count > date_count else 'date'

        # Fall back to type-based detection
        types = [type(v).__name__ for v in sample]
        most_common = max(set(types), key=types.count)

        return DataImportService.TYPE_MAPPING.get(most_common, 'TEXT')

    @staticmethod
    def read_file_to_dataframe(file: UploadedFile) -> pd.DataFrame:
        """
        Read uploaded file (Excel or CSV) into a pandas DataFrame
        """
        file_name = file.name.lower()

        try:
            # Reset file pointer to the beginning
            file.seek(0)

            if file_name.endswith('.csv'):
                # Try different encodings for CSV
                try:
                    df = pd.read_csv(file, encoding='utf-8')
                except UnicodeDecodeError:
                    file.seek(0)  # Reset file pointer
                    try:
                        df = pd.read_csv(file, encoding='latin-1')
                    except UnicodeDecodeError:
                        file.seek(0)
                        df = pd.read_csv(file, encoding='cp1252')

            elif file_name.endswith('.xlsx'):
                # For .xlsx files, use openpyxl engine
                try:
                    df = pd.read_excel(file, engine='openpyxl')
                except Exception as e:
                    # If direct reading fails, try reading as BytesIO
                    import io
                    file.seek(0)
                    file_content = file.read()
                    df = pd.read_excel(io.BytesIO(file_content), engine='openpyxl')

            elif file_name.endswith('.xls'):
                # For .xls files, use xlrd engine
                try:
                    df = pd.read_excel(file, engine='xlrd')
                except Exception as e:
                    # If xlrd is not available, try openpyxl
                    import io
                    file.seek(0)
                    file_content = file.read()
                    df = pd.read_excel(io.BytesIO(file_content), engine='openpyxl')

            else:
                raise ValueError(f'Formato de arquivo não suportado: {file_name}')

            # Verify DataFrame is not empty
            if df.empty:
                raise ValueError('O arquivo está vazio ou não contém dados válidos')

            return df

        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f'Erro detalhado ao ler arquivo {file_name}:')
            print(error_details)
            raise Exception(f'Erro ao ler arquivo {file_name}: {str(e)}')

    @staticmethod
    def dataframe_to_dict_list(df: pd.DataFrame) -> List[Dict]:
        """
        Convert pandas DataFrame to list of dictionaries
        Handles NaN values and data type conversions
        """
        # Replace NaN with None
        df = df.where(pd.notna(df), None)

        # Convert to list of dictionaries
        data = df.to_dict('records')

        return data

    @staticmethod
    def process_file_data(file: UploadedFile) -> Tuple[List[Dict], Dict]:
        """
        Process uploaded file and return data in the same format as endpoint data
        Returns: (data, column_structure)
        """
        try:
            # Read file into DataFrame
            df = DataImportService.read_file_to_dataframe(file)

            # Check if DataFrame is empty
            if df.empty:
                raise ValueError('O arquivo está vazio ou não contém dados válidos')

            # Convert DataFrame to list of dictionaries
            data = DataImportService.dataframe_to_dict_list(df)

            # Analyze column structure (same as endpoint)
            column_structure = DataImportService.analyze_column_structure(data)

            return data, column_structure

        except Exception as e:
            raise Exception(f'Erro ao processar arquivo: {str(e)}')

    @staticmethod
    def process_file_data_from_path(file_path: str) -> Tuple[List[Dict], Dict]:
        """
        Process file from filesystem path (for use with Celery tasks)
        Returns: (data, column_structure)
        """
        try:
            import os
            if not os.path.exists(file_path):
                raise FileNotFoundError(f'Arquivo não encontrado: {file_path}')

            # Determine file extension
            file_extension = os.path.splitext(file_path)[1].lower()

            # Read file based on extension
            if file_extension in ['.xlsx', '.xls']:
                df = pd.read_excel(file_path)
            elif file_extension == '.csv':
                df = pd.read_csv(file_path, encoding='utf-8')
            else:
                raise ValueError(f'Formato de arquivo não suportado: {file_extension}')

            # Check if DataFrame is empty
            if df.empty:
                raise ValueError('O arquivo está vazio ou não contém dados válidos')

            # Convert DataFrame to list of dictionaries
            data = DataImportService.dataframe_to_dict_list(df)

            # Analyze column structure
            column_structure = DataImportService.analyze_column_structure(data)

            return data, column_structure

        except Exception as e:
            raise Exception(f'Erro ao processar arquivo: {str(e)}')

    @staticmethod
    def fetch_data_from_endpoint(url: str) -> Tuple[List[Dict], Dict]:
        """
        Fetch data from external endpoint
        Returns: (data, column_structure)
        """
        try:
            # Add proper headers to avoid connection issues
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
            }

            # Try to fetch data with retry logic
            max_retries = 3
            retry_count = 0
            last_error = None

            while retry_count < max_retries:
                try:
                    response = requests.get(
                        url,
                        headers=headers,
                        timeout=30,
                        verify=True  # SSL verification enabled
                    )
                    response.raise_for_status()
                    data = response.json()
                    break  # Success, exit retry loop

                except (requests.exceptions.ConnectionError, ConnectionResetError) as e:
                    retry_count += 1
                    last_error = e
                    if retry_count < max_retries:
                        time.sleep(2)  # Wait 2 seconds before retry
                        continue
                    else:
                        raise Exception(f'Falha ao conectar ao endpoint após {max_retries} tentativas: {str(e)}')

                except requests.exceptions.SSLError as e:
                    # If SSL fails, try without verification
                    print(f"SSL verification failed, trying without verification: {e}")
                    response = requests.get(
                        url,
                        headers=headers,
                        timeout=30,
                        verify=False  # Disable SSL verification
                    )
                    response.raise_for_status()
                    data = response.json()
                    break

            if isinstance(data, dict):
                for key, value in data.items():
                    if isinstance(value, list):
                        data = value
                        break
                else:
                    data = [data]
            elif not isinstance(data, list):
                raise ValueError('Response must be a list or JSON object')

            if not data:
                raise ValueError('Endpoint returned empty list')

            column_structure = DataImportService.analyze_column_structure(data)

            return data, column_structure

        except requests.exceptions.Timeout:
            raise Exception(f'Timeout ao tentar acessar o endpoint. Verifique se a URL está correta e acessível.')
        except requests.exceptions.RequestException as e:
            raise Exception(f'Erro ao buscar dados do endpoint: {str(e)}. Verifique se a URL está correta e o serviço está disponível.')
        except ValueError as e:
            raise Exception(f'Erro ao processar os dados retornados: {str(e)}. Certifique-se de que o endpoint retorna dados em formato JSON válido.')
        except Exception as e:
            raise Exception(f'Erro inesperado ao buscar dados: {str(e)}')

    @staticmethod
    def analyze_column_structure(data: List[Dict]) -> Dict[str, str]:
        """
        Analyze data structure and determine column types
        """
        if not data:
            return {}

        all_keys = set()
        for item in data:
            if isinstance(item, dict):
                all_keys.update(item.keys())

        column_structure = {}

        for key in all_keys:
            values = [item.get(key) for item in data if isinstance(item, dict)]
            safe_column_name = DataImportService.sanitize_column_name(key)
            column_type = DataImportService.detect_column_type(values)

            column_structure[safe_column_name] = {
                'original_name': key,
                'type': column_type
            }

        return column_structure

    @staticmethod
    def create_table(table_name: str, column_structure: Dict[str, Dict]) -> None:
        """
        DEPRECATED: No longer creates dynamic tables.
        Column structure is now stored in DataImportProcess model.
        """
        # This method is kept for backward compatibility but does nothing
        # Data is now stored in ImportedDataRecord model using JSONField
        logger.info(f"Skipping dynamic table creation for {table_name} - using ORM model instead")

    @staticmethod
    def insert_data_orm(process, data: List[Dict], column_structure: Dict[str, Dict]) -> Dict[str, int]:
        """
        Insert data using Django ORM (ImportedDataRecord model)
        Returns: dictionary with statistics {
            'inserted': number of records inserted,
            'duplicates': number of duplicates skipped,
            'errors': number of errors,
            'total': total records processed
        }
        """
        from .models import ImportedDataRecord

        if not data:
            return {'inserted': 0, 'duplicates': 0, 'errors': 0, 'total': 0}

        # Map original names to sanitized names
        name_mapping = {
            info['original_name']: col_name
            for col_name, info in column_structure.items()
        }

        records_inserted = 0
        duplicates_skipped = 0
        errors = 0

        for item in data:
            if not isinstance(item, dict):
                continue

            # Create normalized data dict with sanitized column names
            normalized_data = {}
            for original_name, value in item.items():
                safe_name = name_mapping.get(original_name)
                if safe_name:
                    normalized_data[safe_name] = value

            if not normalized_data:
                continue

            try:
                # Generate hash for duplicate detection
                row_hash = ImportedDataRecord.generate_row_hash(normalized_data)

                # Try to create record (will fail if duplicate due to unique_together constraint)
                record, created = ImportedDataRecord.objects.get_or_create(
                    process=process,
                    row_hash=row_hash,
                    defaults={'data': normalized_data}
                )

                if created:
                    records_inserted += 1
                else:
                    duplicates_skipped += 1
                    logger.debug(f'Duplicate record skipped (hash: {row_hash})')

            except Exception as e:
                errors += 1
                logger.error(f'Error processing record: {e}')
                logger.error(f'Data: {normalized_data}')
                continue

        total = records_inserted + duplicates_skipped + errors

        return {
            'inserted': records_inserted,
            'duplicates': duplicates_skipped,
            'errors': errors,
            'total': total
        }

    @staticmethod
    def insert_data(table_name: str, data: List[Dict], column_structure: Dict[str, Dict], process=None) -> Dict[str, int]:
        """
        BACKWARD COMPATIBILITY WRAPPER
        Now uses ORM instead of direct SQL
        """
        if process is None:
            # Try to find process by table_name
            try:
                process = DataImportProcess.objects.get(table_name=table_name)
            except DataImportProcess.DoesNotExist:
                logger.error(f"Process not found for table_name: {table_name}")
                return {'inserted': 0, 'duplicates': 0, 'errors': len(data), 'total': len(data)}

        return DataImportService.insert_data_orm(process, data, column_structure)

    @staticmethod
    def import_data(
        table_name: str,
        user=None,
        endpoint_url: Optional[str] = None,
        file: Optional[UploadedFile] = None,
        import_type: str = 'endpoint'
    ) -> DataImportProcess:
        """
        Main method to import data from an endpoint or file

        Args:
            table_name: Name of the table to create
            user: User who initiated the import
            endpoint_url: URL of external endpoint (for endpoint import)
            file: Uploaded file (for file import)
            import_type: Type of import ('endpoint' or 'file')
        """
        # Create process record
        process = DataImportProcess.objects.create(
            endpoint_url=endpoint_url or f'file:{file.name if file else "unknown"}',
            table_name=table_name,
            status='active',
            created_by=user
        )

        try:
            # Fetch data based on import type
            if import_type == 'endpoint':
                if not endpoint_url:
                    raise ValueError('URL do endpoint é obrigatória para importação via endpoint')
                data, column_structure = DataImportService.fetch_data_from_endpoint(endpoint_url)
            elif import_type == 'file':
                if not file:
                    raise ValueError('Arquivo é obrigatório para importação via arquivo')
                data, column_structure = DataImportService.process_file_data(file)
            else:
                raise ValueError(f'Tipo de importação inválido: {import_type}')

            # Insert data using ORM (no table creation needed)
            logger.info(f"Importing data for {table_name} with {len(column_structure)} columns")
            logger.info(f"Data contains {len(data)} records")

            # Use ORM-based insertion
            insert_stats = DataImportService.insert_data_orm(process, data, column_structure)

            logger.info(f"Insert stats: {insert_stats}")

            # Update process - keep as active
            process.status = 'active'
            process.record_count = insert_stats['inserted']
            process.column_structure = column_structure
            process.save()

            logger.info(f"Process updated with record_count={insert_stats['inserted']}")

            # Store stats in process for later reference
            if insert_stats['duplicates'] > 0 or insert_stats['errors'] > 0:
                print(f"Import completed: {insert_stats['inserted']} inserted, {insert_stats['duplicates']} duplicates skipped, {insert_stats['errors']} errors")

            return process

        except Exception as e:
            process.status = 'inactive'
            process.error_message = str(e)
            process.save()

            raise Exception(f'Erro na importação: {str(e)}')
