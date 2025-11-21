#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from data_import.models import DataImportProcess
from django.db import connection

processes = DataImportProcess.objects.all()

for process in processes:
    table_name = process.table_name

    try:
        with connection.cursor() as cursor:
            cursor.execute(f'SELECT COUNT(*) FROM {table_name}')
            actual_count = cursor.fetchone()[0]

            print(f'ID: {process.id} | Table: {table_name}')
            print(f'  Model says: {process.record_count} records')
            print(f'  Actual count: {actual_count} records')

            if process.record_count != actual_count:
                print(f'  MISMATCH - Updating...')
                process.record_count = actual_count
                process.save()
                print(f'  Updated to {actual_count}')
            else:
                print(f'  Already correct')
            print()
    except Exception as e:
        print(f'  Error: {e}')
        print()
