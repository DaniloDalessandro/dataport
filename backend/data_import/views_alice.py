"""
Alice Chat View - Gemini Integration
"""
import os
import json
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Sum, Q
from .models import DataImportProcess
import google.generativeai as genai


class AliceChatView(APIView):
    """
    Alice AI Assistant powered by Google Gemini
    POST /api/data-import/alice/chat/

    Request body:
    {
        "message": "User's question about datasets"
    }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Process user question and return AI response with dataset context
        """
        try:
            user_message = request.data.get('message', '').strip()

            if not user_message:
                return Response({
                    'success': False,
                    'error': 'Mensagem não pode estar vazia'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Get Gemini API key from environment
            api_key = os.getenv('GEMINI_API_KEY')
            if not api_key or api_key == 'your-gemini-api-key-here':
                return Response({
                    'success': False,
                    'error': 'Chave da API Gemini não configurada. Configure GEMINI_API_KEY no arquivo .env'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Configure Gemini
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-1.5-flash')

            # Gather dataset context
            context = self._build_dataset_context()

            # Build prompt with context
            system_prompt = f"""Você é a Alice, assistente virtual do DataDock - um sistema de gestão de dados.
Você deve responder perguntas sobre os datasets cadastrados no sistema de forma clara e objetiva.

CONTEXTO DOS DADOS DISPONÍVEIS:
{json.dumps(context, indent=2, ensure_ascii=False)}

INSTRUÇÕES:
- Responda em português brasileiro
- Seja objetiva e direta
- Use os dados do contexto fornecido
- Formate números com separadores de milhares quando apropriado
- Use markdown para destacar informações importantes (**negrito** para números e métricas)
- Se a pergunta não puder ser respondida com os dados disponíveis, seja honesta e sugira o que você pode responder

PERGUNTA DO USUÁRIO:
{user_message}

Sua resposta:"""

            # Get response from Gemini
            response = model.generate_content(system_prompt)

            return Response({
                'success': True,
                'response': response.text
            })

        except Exception as e:
            import traceback
            print(f"Error in Alice chat: {traceback.format_exc()}")
            return Response({
                'success': False,
                'error': f'Erro ao processar pergunta: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _build_dataset_context(self):
        """
        Build comprehensive context about datasets for Gemini
        """
        # Get all active processes
        all_processes = DataImportProcess.objects.all()

        # Status counts
        status_counts = all_processes.aggregate(
            active=Count('id', filter=Q(status='active')),
            inactive=Count('id', filter=Q(status='inactive')),
            processing=Count('id', filter=Q(status='processing')),
            pending=Count('id', filter=Q(status='pending'))
        )

        # Total records and storage
        total_records = sum(p.record_count or 0 for p in all_processes)

        # Dataset list with details
        datasets_info = []
        for process in all_processes:
            dataset_info = {
                'nome': process.table_name,
                'status': process.get_status_display(),
                'registros': process.record_count or 0,
                'colunas': len(process.column_structure) if process.column_structure else 0,
                'criado_em': process.created_at.strftime('%d/%m/%Y'),
                'tipo_importacao': process.get_import_type_display() if hasattr(process, 'import_type') else 'Não especificado'
            }

            # Add column names if available
            if process.column_structure:
                dataset_info['nomes_colunas'] = list(process.column_structure.keys())[:10]  # First 10 columns

            datasets_info.append(dataset_info)

        # Calculate totals and averages
        total_datasets = len(all_processes)
        avg_records = total_records / total_datasets if total_datasets > 0 else 0

        # Build context dictionary
        context = {
            'resumo': {
                'total_datasets': total_datasets,
                'datasets_ativos': status_counts['active'],
                'datasets_inativos': status_counts['inactive'],
                'datasets_processando': status_counts['processing'],
                'datasets_pendentes': status_counts['pending'],
                'total_registros': total_records,
                'media_registros_por_dataset': round(avg_records, 0)
            },
            'datasets': datasets_info[:50]  # Limit to 50 datasets to avoid token limits
        }

        # Add note if datasets were truncated
        if total_datasets > 50:
            context['nota'] = f'Mostrando 50 de {total_datasets} datasets disponíveis'

        return context
