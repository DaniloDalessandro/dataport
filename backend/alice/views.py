"""
Alice AI Assistant Views
"""
import os
import json
import logging
import time
from datetime import datetime, timedelta
from django.core.cache import cache
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import UserRateThrottle
from django.db.models import Count, Q
from data_import.models import DataImportProcess
import google.generativeai as genai

logger = logging.getLogger(__name__)


class AliceRateThrottle(UserRateThrottle):
    """Custom throttle for Alice API - 30 requests per minute"""
    rate = '30/min'


class AliceChatView(APIView):
    """
    Alice AI Assistant powered by Google Gemini
    POST /api/alice/chat/

    Request body:
    {
        "message": "User's question about datasets"
    }
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [AliceRateThrottle]

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

            # Gather dataset context (cached for 5 minutes)
            context = self._get_cached_dataset_context()

            # Build prompt with context
            system_prompt = f"""Você é a Alice, assistente virtual do DataPort - um sistema de gestão de dados portuários.
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
- Mantenha respostas concisas mas informativas

PERGUNTA DO USUÁRIO:
{user_message}

Sua resposta:"""

            # Get response from Gemini with retry logic
            response_text = self._get_gemini_response_with_retry(model, system_prompt)

            return Response({
                'success': True,
                'response': response_text,
                'timestamp': datetime.now().isoformat()
            })

        except Exception as e:
            import traceback
            error_message = str(e)
            logger.error(f"Error in Alice chat: {traceback.format_exc()}")

            # Handle rate limit errors with friendly message
            if '429' in error_message or 'RATE_LIMIT_EXCEEDED' in error_message:
                return Response({
                    'success': False,
                    'error': 'A Alice está processando muitas requisições no momento. Por favor, aguarde alguns segundos e tente novamente.'
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)

            # Handle quota errors
            if 'quota' in error_message.lower() or 'limit' in error_message.lower():
                return Response({
                    'success': False,
                    'error': 'Limite de uso da API foi atingido. Por favor, tente novamente em alguns minutos.'
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)

            return Response({
                'success': False,
                'error': 'Erro ao processar pergunta. Tente novamente em alguns instantes.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _get_gemini_response_with_retry(self, model, prompt, max_retries=3):
        """
        Get response from Gemini with exponential backoff retry
        """
        for attempt in range(max_retries):
            try:
                response = model.generate_content(prompt)
                return response.text
            except Exception as e:
                error_message = str(e)

                # If it's a rate limit error and not the last attempt, retry with backoff
                if ('429' in error_message or 'RATE_LIMIT_EXCEEDED' in error_message) and attempt < max_retries - 1:
                    wait_time = (2 ** attempt) * 3  # Exponential backoff: 3, 6, 12 seconds
                    logger.warning(f"Rate limit hit, waiting {wait_time}s before retry {attempt + 1}/{max_retries}")
                    time.sleep(wait_time)
                    continue

                # If it's the last attempt or a different error, raise it
                raise

    def _get_cached_dataset_context(self):
        """
        Get dataset context with caching (5 minutes)
        """
        cache_key = 'alice_dataset_context'
        context = cache.get(cache_key)

        if context is None:
            context = self._build_dataset_context()
            cache.set(cache_key, context, 300)  # Cache for 5 minutes

        return context

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


class AliceHealthView(APIView):
    """
    Health check for Alice service
    GET /api/alice/health/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Check if Alice service is healthy"""
        api_key = os.getenv('GEMINI_API_KEY')

        health_data = {
            'status': 'healthy',
            'service': 'Alice AI Assistant',
            'gemini_configured': bool(api_key and api_key != 'your-gemini-api-key-here'),
            'timestamp': datetime.now().isoformat()
        }

        return Response(health_data)
