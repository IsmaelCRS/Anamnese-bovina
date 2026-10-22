import pytest
from src.kb import carregar_kb
from src.engine import InferenceEngine

def test_min_respostas_respeitado_mesmo_com_certeza_alta():
    """
    Garante que o motor não interrompe antes de min_respostas mesmo quando
    uma hipótese atinge CF alto ou liderança absoluta.
    """
    kb = carregar_kb("src/kb/regras_mvp.json")
    engine = InferenceEngine(kb)
    min_respostas = kb.criterio_parada.min_respostas
    assert min_respostas == 8

    respostas = {}
    for i in range(min_respostas - 1):
        prox = engine.selecionar_proxima_pergunta(respostas)
        assert prox is not None, f"Deveria haver próxima pergunta no passo {i}"
        
        ranking = engine.ranking(respostas)
        parada = engine.deve_parar(ranking, len(respostas))
        assert not parada.parar, f"Não deveria parar com {len(respostas)} respostas (< {min_respostas})"
        
        # Simula resposta que aumenta fortemente o CF de uma doença
        respostas[prox.parametro.id] = 1.0

    # No passo 8, atingiu min_respostas
    assert len(respostas) == min_respostas - 1
    prox = engine.selecionar_proxima_pergunta(respostas)
    assert prox is not None
    respostas[prox.parametro.id] = 1.0
    assert len(respostas) == min_respostas

    # Agora sim o critério de parada pode ser acionado se houver hipótese forte
    ranking = engine.ranking(respostas)
    parada = engine.deve_parar(ranking, len(respostas))
    # Com 8 respostas afirmativas, o líder deve ter atingido CF forte e permitir a parada
    assert parada.parar


def test_min_respostas_respeitado_quando_utilidade_zera():
    """
    Garante que o motor continue perguntando parâmetros pendentes até min_respostas
    mesmo que a utilidade clínica de todas as opções pendentes seja zero.
    """
    kb = carregar_kb("src/kb/regras_mvp.json")
    engine = InferenceEngine(kb)
    min_respostas = kb.criterio_parada.min_respostas

    # Simula respostas 'Não' para refutar ou neutralizar utilidade
    respostas = {}
    for i in range(min_respostas):
        prox = engine.selecionar_proxima_pergunta(respostas)
        assert prox is not None, f"Deveria retornar pergunta no passo {i} para cumprir min_respostas"
        respostas[prox.parametro.id] = -1.0

    assert len(respostas) == min_respostas


def test_api_min_respostas_fluxo_completo():
    """
    Testa a integração via rotas HTTP (/start, /next-question, /answer)
    assegurando que next-question não retorne concluida=True antes de min_respostas.
    """
    from fastapi.testclient import TestClient
    from src.main import app

    client = TestClient(app)
    start_resp = client.post("/start")
    assert start_resp.status_code == 201
    session_id = start_resp.json()["session_id"]

    for resposta_num in range(7):
        nq_resp = client.get(f"/{session_id}/next-question")
        assert nq_resp.status_code == 200
        nq_data = nq_resp.json()
        assert not nq_data["concluida"], f"A sessão não pode estar concluída na pergunta {resposta_num + 1}"
        assert nq_data["pergunta"] is not None
        param = nq_data["pergunta"]["parametro"]

        ans_resp = client.post(f"/{session_id}/answer", json={"parametro": param, "opcao": "s"})
        assert ans_resp.status_code == 200

    # Na 8ª pergunta (quando atinge 7 respostas prévias)
    nq_resp = client.get(f"/{session_id}/next-question")
    assert nq_resp.status_code == 200
    nq_data = nq_resp.json()
    assert not nq_data["concluida"], "A sessão não pode concluir antes de registrar a 8ª resposta"
    assert nq_data["pergunta"] is not None
    param = nq_data["pergunta"]["parametro"]

    ans_resp = client.post(f"/{session_id}/answer", json={"parametro": param, "opcao": "s"})
    assert ans_resp.status_code == 200

    # Com 8 respostas dadas (todas 's'), o líder deve ter atingido liderança e concluído
    nq_resp = client.get(f"/{session_id}/next-question")
    assert nq_resp.status_code == 200
    nq_data = nq_resp.json()
    assert nq_data["concluida"]

