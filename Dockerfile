FROM python:3.11-slim

# Variáveis de ambiente exigidas para execução do Python em containers
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Instalação de dependências mínimas do SO (necessárias para suporte a compilação e diagnóstico)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Instalação de dependências do Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Cópia do código-fonte e arquivos da aplicação
COPY . .

# Exposição da porta 8080 padrão do sistema
EXPOSE 8080

# Comando para rodar src/main.py
CMD ["python", "src/main.py"]
