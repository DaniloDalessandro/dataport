import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from data_import.services import DataImportService
from accounts.models import CustomUser
from django.core.files.uploadedfile import SimpleUploadedFile

# Ler o arquivo CSV
with open('test_data.csv', 'rb') as f:
    csv_content = f.read()

# Criar um arquivo simulado
uploaded_file = SimpleUploadedFile('test_data.csv', csv_content, content_type='text/csv')

# Obter usuario
user = CustomUser.objects.first()

print('\nTestando importacao de CSV para tabela do banco...')
print('=' * 60)

# Executar importacao
try:
    process = DataImportService.import_data(
        table_name='funcionarios_teste2',
        user=user,
        file=uploaded_file,
        import_type='file'
    )

    print(f'Status: {process.status}')
    print(f'Registros inseridos: {process.record_count}')
    print(f'Tabela criada: {process.table_name}')
    print(f'\nEstrutura das colunas criadas no banco:')
    for col, info in process.column_structure.items():
        print(f'  - {col:15} {info["type"]:10} <- {info["original_name"]}')

    # Verificar se a tabela foi criada e consultar dados
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute(f'SELECT * FROM {process.table_name}')
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]

        print(f'\nTabela criada no banco com {len(rows)} registros!')
        print(f'\nColunas da tabela: {", ".join(columns)}')
        print(f'\nPrimeiros registros:')
        for i, row in enumerate(rows[:4], 1):
            print(f'\n  Registro {i}:')
            for col, val in zip(columns, row):
                print(f'    {col}: {val}')

except Exception as e:
    print(f'Erro: {e}')
    import traceback
    traceback.print_exc()
