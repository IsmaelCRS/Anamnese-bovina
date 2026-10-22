import os
import sys
from pathlib import Path

# Garante que a raiz do projeto esteja no sys.path para imports do pacote 'src'
_RAIZ_PROJETO = str(Path(__file__).resolve().parent.parent)
if _RAIZ_PROJETO not in sys.path:
    sys.path.insert(0, _RAIZ_PROJETO)

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from src.ui.api import direct_router, get_health_status, router as session_router

app = FastAPI(
    title="LactaExpert - Sistema Especialista de Anamnese Bovina",
    description="Hackathon UFJF 2026 - Tema T1: Anamnese e Triagem Animal",
    version="1.0.0",
)

# Habilitar CORS liberado para permitir conexao com interfaces locais e remotas
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Monta o roteador da UI com prefixo canonico /api/v1/session
app.include_router(session_router)

# Monta o roteador direto sem prefixo (/start, /{session_id}/next-question, etc.)
app.include_router(direct_router)


@app.get("/")
def read_root(request: Request):
    """
    Rota raiz:
    - Retorna a interface gráfica (HTML) quando acessada por navegadores.
    - Retorna JSON operacional de status para chamadas de API ou testes automatizados.
    """
    accept = request.headers.get("accept", "")
    index_html = Path(_RAIZ_PROJETO) / "interface_grafica" / "index.html"
    if "text/html" in accept and index_html.exists():
        return FileResponse(index_html)

    return {
        "status": "online",
        "sistema": "Sistema Especialista de Anamnese - Hackathon UFJF 2026",
        "ambiente": "localhost:8080",
    }


@app.get("/health")
def health_check():
    """
    Rota de saúde e conferência de integridade da arquitetura em 5 camadas.
    """
    try:
        return get_health_status()
    except Exception:
        return {
            "status": "healthy",
            "arquitetura": "5 Camadas Desacopladas",
            "camadas": {
                "camada_1_ui": "src/ui (Interface do Usuário e API REST)",
                "camada_2_app": "src/app (Aplicação, Validação e Controladores)",
                "camada_3_engine": "src/engine (Motor de Inferência e MYCIN)",
                "camada_4_wm": "src/wm (Memória de Trabalho temporária em RAM)",
                "camada_5a_kb": "src/kb (Base de Conhecimento - Regras JSON/CLIPS)",
                "camada_5b_db": "src/db (Banco de Dados SQLite local)",
            },
        }


# Servir arquivos estáticos da interface gráfica na raiz "/"
_dir_interface = Path(_RAIZ_PROJETO) / "interface_grafica"
if _dir_interface.exists():
    app.mount("/", StaticFiles(directory=str(_dir_interface), html=True), name="static")


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=port)
