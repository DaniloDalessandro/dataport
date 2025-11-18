from rest_framework import serializers
from .models import DataImportProcess


class DataImportRequestSerializer(serializers.Serializer):
    """
    Serializer for data import request
    Supports both endpoint URL and file upload
    """
    IMPORT_TYPE_CHOICES = [
        ('endpoint', 'Endpoint URL'),
        ('file', 'Arquivo (Excel/CSV)'),
    ]

    import_type = serializers.ChoiceField(
        choices=IMPORT_TYPE_CHOICES,
        required=True,
        help_text='Tipo de importação: endpoint ou arquivo'
    )
    endpoint_url = serializers.URLField(
        required=False,
        allow_blank=True,
        help_text='URL do endpoint externo para importar dados'
    )
    file = serializers.FileField(
        required=False,
        allow_empty_file=False,
        help_text='Arquivo Excel (.xlsx) ou CSV (.csv) para importar'
    )
    table_name = serializers.CharField(
        required=True,
        max_length=255,
        help_text='Nome da tabela a ser criada'
    )

    def validate(self, data):
        """
        Validate that either endpoint_url or file is provided based on import_type
        """
        import_type = data.get('import_type')
        endpoint_url = data.get('endpoint_url')
        file = data.get('file')

        if import_type == 'endpoint':
            if not endpoint_url:
                raise serializers.ValidationError({
                    'endpoint_url': 'URL do endpoint é obrigatória quando o tipo é "endpoint"'
                })
        elif import_type == 'file':
            if not file:
                raise serializers.ValidationError({
                    'file': 'Arquivo é obrigatório quando o tipo é "file"'
                })
            # Validate file extension
            allowed_extensions = ['.xlsx', '.xls', '.csv']
            file_name = file.name.lower()
            if not any(file_name.endswith(ext) for ext in allowed_extensions):
                raise serializers.ValidationError({
                    'file': f'Formato de arquivo não suportado. Use: {", ".join(allowed_extensions)}'
                })

        return data

    def validate_table_name(self, value):
        """
        Validate table name to prevent SQL injection
        """
        # Remove caracteres especiais e espacos
        cleaned = ''.join(c for c in value if c.isalnum() or c == '_')
        if not cleaned:
            raise serializers.ValidationError(
                'Nome da tabela deve conter apenas letras, numeros e underscore'
            )
        # Nao pode comecar com numero
        if cleaned[0].isdigit():
            raise serializers.ValidationError(
                'Nome da tabela nao pode comecar com numero'
            )
        return cleaned.lower()


class DataImportProcessSerializer(serializers.ModelSerializer):
    """
    Serializer for DataImportProcess model
    """
    created_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = DataImportProcess
        fields = [
            'id',
            'table_name',
            'endpoint_url',
            'status',
            'status_display',
            'record_count',
            'column_structure',
            'error_message',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        """
        Get the name of the user who created this import
        """
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None
