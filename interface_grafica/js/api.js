/**
 * api.js — Comunicação com o back-end FastAPI do LactaExpert.
 *
 * Integra com os endpoints REST em /api/v1/session:
 *  - POST /api/v1/session/start
 *  - GET  /api/v1/session/{session_id}/next-question
 *  - POST /api/v1/session/{session_id}/answer
 *  - GET  /api/v1/session/{session_id}/ranking
 */

export const USANDO_MOCK = false;

const BASE_URL = '/api/v1/session';

async function request(caminho, options = {}) {
    const resposta = await fetch(BASE_URL + caminho, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options,
    });

    if (!resposta.ok) {
        let detalhe = `Erro ${resposta.status} ao comunicar com o servidor.`;
        try {
            const erroJson = await resposta.json();
            detalhe = erroJson.detail || detalhe;
        } catch (_) {}
        throw new Error(detalhe);
    }
    return resposta.json();
}

function converterPergunta(session_id, dataPergunta) {
    return {
        sessao: session_id,
        tipo: 'pergunta',
        pergunta: {
            id: dataPergunta.parametro,
            texto: dataPergunta.texto,
            ajuda: dataPergunta.ajuda || '',
            resumo: dataPergunta.parametro,
            opcoes: (dataPergunta.opcoes || []).map((o) => ({
                valor: o.codigo,
                rotulo: o.rotulo,
            })),
        },
    };
}

function converterDiagnostico(session_id, rankingData) {
    const lista = (rankingData.ranking || []).map((h) => {
        const justificativas = (h.explicacao || []).map(
            (e) => `${e.pergunta}: ${e.justificativa || (e.efeito === 'reforca' ? 'Reforça suspeita' : 'Atenua suspeita')}`
        );

        let alerta = null;
        if (h.nivel === 'alto') {
            alerta = `Atenção veterinária urgente: ${h.classificacao} (${h.nome})`;
        }

        return {
            id: h.doenca_id,
            doenca: h.nome,
            certeza: Math.max(0, h.cf),
            justificativa: justificativas,
            recomendacao: h.conduta || h.recomendacao || '',
            alerta: alerta,
        };
    });

    return {
        sessao: session_id,
        tipo: 'diagnostico',
        diagnosticos: lista,
        mensagem: rankingData.motivo_conclusao || 'Anamnese concluída.',
    };
}

/** Inicia uma nova anamnese e retorna a primeira pergunta calculada por Utilidade. */
export async function iniciarAnamnese() {
    const sessao = await request('/start', { method: 'POST' });
    const sessionId = sessao.session_id;

    const nextQ = await request(`/${encodeURIComponent(sessionId)}/next-question`);
    if (!nextQ.concluida && nextQ.pergunta) {
        return converterPergunta(sessionId, nextQ.pergunta);
    }

    const rank = await request(`/${encodeURIComponent(sessionId)}/ranking`);
    return converterDiagnostico(sessionId, rank);
}

/** Envia a resposta de uma pergunta e retorna a próxima pergunta ou diagnóstico. */
export async function enviarResposta(sessao, idPergunta, valor) {
    // Normaliza valor para o código da escala aceita pela KB ('s', 'p', '?', 'n')
    let opcao = valor;
    if (valor === 'sim') opcao = 's';
    else if (valor === 'nao') opcao = 'n';
    else if (valor === 'nao_sei') opcao = '?';

    await request(`/${encodeURIComponent(sessao)}/answer`, {
        method: 'POST',
        body: JSON.stringify({ parametro: idPergunta, opcao: opcao }),
    });

    const nextQ = await request(`/${encodeURIComponent(sessao)}/next-question`);
    if (!nextQ.concluida && nextQ.pergunta) {
        return converterPergunta(sessao, nextQ.pergunta);
    }

    const rank = await request(`/${encodeURIComponent(sessao)}/ranking`);
    return converterDiagnostico(sessao, rank);
}
