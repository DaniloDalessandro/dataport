import os
import django
import pandas as pd

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from data_import.services import DataImportService
from accounts.models import CustomUser
from django.core.files.uploadedfile import SimpleUploadedFile

# Criar um arquivo Excel de teste
print('Criando arquivo Excel de teste...')
data = {
    'nome': ['João Silva', 'Maria Santos', 'Pedro Costa', 'Ana Oliveira'],
    'idade': [28, 35, 42, 31],
    'cidade': ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba'],
    'salario': [5000.50, 7500.75, 6200.00, 5800.25]
}
df = pd.DataFrame(data)
df.to_excel('test_data.xlsx', index=False, engine='openpyxl')
print('Arquivo Excel criado: test_data.xlsx')

# Ler o arquivo Excel
with open('test_data.xlsx', 'rb') as f:
    xlsx_content = f.read()

# Criar um arquivo simulado
uploaded_file = SimpleUploadedFile('test_data.xlsx', xlsx_content, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

# Obter usuario
user = CustomUser.objects.first()

print('\n' + '=' * 60)
print('Testando importacao de XLSX para tabela do banco...')
print('=' * 60)

# Executar importacao
try:
    process = DataImportService.import_data(
        table_name='funcionarios_xlsx',
        user=user,
        file=uploaded_file,
        import_type='file'
    )

    print(f'\nStatus: {process.status}')
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

    print('\n' + '=' * 60)
    print('TESTE CONCLUIDO COM SUCESSO!')
    print('=' * 60)

except Exception as e:
    print(f'\nERRO: {e}')
    print('\nTraceback completo:')
    import traceback
    traceback.print_exc()
