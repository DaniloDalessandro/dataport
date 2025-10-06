# API Documentation - Sistema de Gerenciamento

## Endpoints Disponíveis

### Autenticação e Usuários

#### 1. Listar Usuários
```
GET /api/users/
```
Retorna lista paginada de usuários.
Requer autenticação.

#### 2. Criar Novo Usuário
```
POST /api/users/
```
Cria um novo usuário e envia automaticamente um email com senha temporária.

**Body:**
```json
{
  "username": "usuario",
  "email": "usuario@example.com",
  "first_name": "Nome",
  "last_name": "Sobrenome",
  "phone": "11999999999",
  "cpf": "12345678900",
  "company_ids": [1, 2]
}
```

**O que acontece:**
- Gera uma senha temporária segura
- Cria token de redefinição de senha válido por 24h
- Envia email com a senha temporária e link de redefinição
- Define `must_change_password=True`

#### 3. Solicitar Redefinição de Senha
```
POST /api/users/request_password_reset/
```
Solicita link de redefinição de senha por email.
Não requer autenticação.

**Body:**
```json
{
  "email": "usuario@example.com"
}
```

#### 4. Redefinir Senha com Token
```
POST /api/users/reset_password/
```
Redefine a senha usando o token recebido por email.
Não requer autenticação.

**Body:**
```json
{
  "token": "token-recebido-por-email",
  "new_password": "NovaSenha123",
  "confirm_password": "NovaSenha123"
}
```

#### 5. Alterar Senha (usuário autenticado)
```
POST /api/users/change_password/
```
Permite que usuário autenticado altere sua senha.
Requer autenticação.

**Body:**
```json
{
  "old_password": "SenhaAtual123",
  "new_password": "NovaSenha123",
  "confirm_password": "NovaSenha123"
}
```

#### 6. Obter Dados do Usuário Atual
```
GET /api/users/me/
```
Retorna os dados do usuário autenticado.
Requer autenticação.

### Empresas

#### 1. Listar Empresas
```
GET /api/companies/
```
Retorna lista paginada de empresas.
Requer autenticação.

#### 2. Criar Empresa
```
POST /api/companies/
```
Cria uma nova empresa.
Requer autenticação.

**Body:**
```json
{
  "name": "Empresa LTDA",
  "cnpj": "12.345.678/0001-90",
  "email": "contato@empresa.com",
  "phone": "1133334444",
  "is_active": true
}
```

#### 3. Obter Empresa
```
GET /api/companies/{id}/
```
Retorna detalhes de uma empresa específica.
Requer autenticação.

#### 4. Atualizar Empresa
```
PUT /api/companies/{id}/
PATCH /api/companies/{id}/
```
Atualiza dados de uma empresa.
Requer autenticação.

#### 5. Deletar Empresa
```
DELETE /api/companies/{id}/
```
Remove uma empresa.
Requer autenticação.

## Configuração de Email

### Desenvolvimento
Por padrão, o sistema está configurado para usar o console backend do Django, que exibe os emails no terminal.

### Produção
Para usar um servidor SMTP real, edite `backend/core/settings.py`:

```python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'seu-email@gmail.com'
EMAIL_HOST_PASSWORD = 'sua-senha-de-app'  # Use senha de app, não a senha normal
DEFAULT_FROM_EMAIL = 'seu-email@gmail.com'
```

## Fluxo de Criação de Usuário

1. Admin cria novo usuário via `POST /api/users/`
2. Sistema gera senha temporária aleatória
3. Sistema gera token de redefinição (válido por 24h)
4. Email é enviado com:
   - Nome de usuário
   - Senha temporária
   - Link para redefinir senha
5. Usuário recebe email e acessa o link
6. Usuário define nova senha via `POST /api/users/reset_password/`
7. Usuário pode fazer login com nova senha

## Alterações no Model

### Company
- **Removido:** campo `address`

### CustomUser
- **Adicionado:** `reset_password_token` - Token para redefinição de senha
- **Adicionado:** `reset_password_token_expires` - Data de expiração do token
- **Adicionado:** `must_change_password` - Flag indicando se usuário deve alterar senha

## Segurança

- Tokens de redefinição expiram em 24 horas
- Senhas temporárias são geradas com 12 caracteres aleatórios
- Tokens usam `secrets.token_urlsafe()` para segurança criptográfica
- Endpoint de solicitação de redefinição não revela se email existe
- Senhas são hasheadas com algoritmos seguros do Django
