# DATAPORT Frontend - Setup Guide

## Configuração Inicial

### 1. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

Edite o arquivo `.env.local` e configure a URL da API:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 2. Instalar Dependências

```bash
npm install
```

### 3. Executar em Desenvolvimento

```bash
npm run dev
```

O aplicativo estará disponível em `http://localhost:3000`

## Variáveis de Ambiente

### Desenvolvimento

Arquivo: `.env.local`

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Produção

Configure as variáveis de ambiente no seu provedor de hospedagem (Vercel, Netlify, etc.):

```
NEXT_PUBLIC_API_URL=https://api.seudominio.com
```

## Build para Produção

```bash
# Criar build otimizado
npm run build

# Executar build
npm start
```

## Estrutura de Configuração

Todas as URLs da API são gerenciadas centralmente em `src/lib/config.ts`:

```typescript
export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
}
```

Use a função helper `getApiUrl()` para construir URLs:

```typescript
import { getApiUrl } from '@/lib/config'

const url = getApiUrl('/api/auth/login')
// Resultado: http://localhost:8000/api/auth/login
```

## Segurança

⚠️ **NUNCA** commite arquivos `.env.local` no Git!

Eles contém informações sensíveis e estão incluídos no `.gitignore`.

## Variáveis Públicas vs Privadas

- `NEXT_PUBLIC_*`: Variáveis expostas no browser (para URLs públicas)
- Sem prefixo: Variáveis server-side only (não use para dados sensíveis que vão para o browser)

**IMPORTANTE:** Qualquer variável com `NEXT_PUBLIC_` será incluída no bundle do cliente.
