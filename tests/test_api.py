from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)

def test_read_root():
    """
    Valida se a rota raiz '/' retorna status 200 e a estrutura JSON exigida:
    {"status": "online", "sistema": "Sistema Especialista de Anamnese - Hackathon UFJF 2026", "ambiente": "localhost:8080"}
    """
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["sistema"] == "Sistema Especialista de Anamnese - Hackathon UFJF 2026"
    assert data["ambiente"] == "localhost:8080"

def test_health_check():
    """
    Valida a rota de conferência '/health' e integridade das 5 camadas.
    """
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "camadas" in data
    assert "camada_1_ui" in data["camadas"]
    assert "camada_2_app" in data["camadas"]
    assert "camada_3_engine" in data["camadas"]
    assert "camada_4_wm" in data["camadas"]
    assert "camada_5a_kb" in data["camadas"]
    assert "camada_5b_db" in data["camadas"]
