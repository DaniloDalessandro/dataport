# Alice AI Assistant

Aplicativo Django dedicado para a Alice - Assistente Virtual de IA do DataPort.

## Funcionalidades

- **Chat AI**: Assistente virtual powered by Google Gemini
- **Rate Limiting**: Limite de 10 requisições por minuto por usuário
- **Cache**: Context caching de 5 minutos para otimizar performance
- **Retry com Backoff**: Retry automático com exponential backoff (3s, 6s, 12s)
- **Health Check**: Endpoint para verificar status do serviço

## Endpoints

### POST /api/alice/chat/
Envia mensagem para a Alice e recebe resposta com contexto dos datasets.

**Request:**
```json
{
  "message": "Quantos datasets temos?"
}
```

**Response:**
```json
{
  "success": true,
  "response": "Atualmente temos **45** datasets cadastrados...",
  "timestamp": "2025-12-14T15:30:00"
}
```

### GET /api/alice/health/
Verifica se o serviço está saudável e configurado.

**Response:**
```json
{
  "status": "healthy",
  "service": "Alice AI Assistant",
  "gemini_configured": true,
  "timestamp": "2025-12-14T15:30:00"
}
```

## Configuração

1. Adicionar GEMINI_API_KEY no arquivo .env:
```env
GEMINI_API_KEY=your-api-key-here
```

2. O app já está configurado em INSTALLED_APPS

3. URLs já configuradas em core/urls.py

## Arquitetura

```
alice/
├── views.py         # AliceChatView e AliceHealthView
├── urls.py          # Configuração de rotas
├── apps.py          # Configuração do app
├── admin.py         # Admin (sem models)
└── README.md        # Esta documentação
```

## Rate Limiting

- **Limite**: 30 requisições por minuto por usuário
- **Throttle Class**: AliceRateThrottle
- **Comportamento**: Retorna 429 se exceder o limite
- **Frontend**: Mostra cooldown timer de 60s quando limite é atingido

## Cache

- **Contexto dos Datasets**: Cached por 5 minutos
- **Cache Key**: 'alice_dataset_context'
- **Benefício**: Reduz carga no banco e melhora tempo de resposta

## Tratamento de Erros

1. **Rate Limit (429)**: Mensagem amigável + retry automático
2. **Quota Exceeded**: Informa ao usuário para aguardar
3. **API Key não configurada**: Mensagem clara sobre configuração
4. **Outros erros**: Mensagem genérica + logging completo

## Exemplos de Uso

### Frontend (TypeScript)
```typescript
const response = await fetch(`${API_URL}/api/alice/chat/`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ message: "Como está o armazenamento?" })
})
```

### cURL
```bash
curl -X POST http://localhost:8000/api/alice/chat/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Quantos datasets ativos?"}'
```

## Logs

Todos os erros são logados com stack trace completo:
```python
logger.error(f"Error in Alice chat: {traceback.format_exc()}")
```

## Melhorias Futuras

- [ ] Histórico de conversas
- [ ] Suporte a múltiplos idiomas
- [ ] Analytics de perguntas mais comuns
- [ ] Fine-tuning do modelo com dados específicos
- [ ] Suporte a anexos (imagens, arquivos)
