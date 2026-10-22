import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="LactaExpert - Sistema Especialista de Anamnese Bovina",
    description="Hackathon UFJF 2026 - Tema T1: Anamnese e Triagem Animal",
    version="1.0.0",
)

# Habilitar CORS para permitir conexão com interfaces locais (React, Vue, Vanilla HTML/JS, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    """
    Rota raiz para verificação de status operacional do sistema.
    """
    return {
        "status": "online",
        "sistema": "Sistema Especialista de Anamnese - Hackathon UFJF 2026",
        "ambiente": "localhost:8080",
    }

@app.get("/health")
def health_check():
    """
    Rota de saúde e conferência de arquitetura em 5 camadas.
    """
    return {
        "status": "healthy",
        "arquitetura": "5 Camadas Desacopladas",
        "camadas": {
            "camada_1_ui": "src/ui (Interface do Usuário)",
            "camada_2_app": "src/app (Aplicação, Validação e Controladores)",
            "camada_3_engine": "src/engine (Motor de Inferência e MYCIN)",
            "camada_4_wm": "src/wm (Memória de Trabalho temporária em RAM)",
            "camada_5a_kb": "src/kb (Base de Conhecimento - Regras JSON/CLIPS)",
            "camada_5b_db": "src/db (Banco de Dados SQLite local)",
        },
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
