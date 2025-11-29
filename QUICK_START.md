# DataPort - Quick Start

## 🚀 Início Rápido (5 minutos)

### Pré-requisitos

- Python 3.11+
- Node.js 20+
- Redis (via Docker recomendado)

### 1. Iniciar Redis

```bash
docker run -d -p 6379:6379 --name redis redis:latest
```

### 2. Backend

```bash
cd backend

# Windows
.\start-dev.bat

# Linux/Mac
chmod +x start-dev.sh
./start-dev.sh
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Acessar

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Swagger Docs: http://localhost:8000/api/docs (em breve)

---

## ⚡ Performance Features

### ✅ Implementado

- **Redis Cache** - Respostas 86% mais rápidas
- **Celery** - Uploads grandes processados em background
- **Lazy Loading** - Bundle 30% menor

### 📊 Resultados

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Response Time | 850ms | 120ms | 86% ↓ |
| Upload Timeout | Sim | Não | 100% ↓ |
| Bundle Size | 450KB | 315KB | 30% ↓ |

Veja [PERFORMANCE_IMPROVEMENTS.md](./PERFORMANCE_IMPROVEMENTS.md) para detalhes completos.

---

## 🔧 Desenvolvimento

### Instalar Dependências

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### Executar Testes

```bash
# Backend
cd backend
python manage.py test

# Frontend
cd frontend
npm test
```

### Build para Produção

```bash
# Backend
gunicorn core.wsgi:application --bind 0.0.0.0:8000

# Frontend
cd frontend
npm run build
npm start
```

---

## 📚 Documentação

- [Performance Improvements](./PERFORMANCE_IMPROVEMENTS.md)
- [API Documentation](./API.md) (em breve)
- [Deployment Guide](./DEPLOY.md) (em breve)

---

## 🐛 Problemas Comuns

### Redis não conecta

```bash
# Verificar
redis-cli ping

# Deve retornar: PONG
```

### Celery não processa

```bash
# Ver workers ativos
celery -A core inspect active

# Reiniciar worker
# Ctrl+C e rodar novamente
celery -A core worker --loglevel=info
```

### Frontend não compila

```bash
# Limpar cache
rm -rf .next node_modules
npm install
npm run dev
```

---

## 📞 Suporte

Problemas? Abra uma issue ou consulte a documentação completa.
