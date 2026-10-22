/**
 * api.js — Comunicação com o back-end FastAPI do BioExpert.
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
        let alerta = null;
        if (h.nivel === 'alto') {
            alerta = `Atenção veterinária urgente: ${h.classificacao} (${h.nome})`;
        }

        return {
            id: h.doenca_id,
            doenca: h.nome,
            pilar: h.pilar,
            sistema: h.sistema,
            certeza: Math.max(0, h.cf),
            cf_percentual: h.cf_percentual ?? Math.round(Math.max(0, h.cf) * 100),
            classificacao: h.classificacao,
            nivel: h.nivel,
            explicacao: h.explicacao || [],
            justificativa: (h.explicacao || []).map(
                (e) => `${e.pergunta}: ${e.justificativa || (e.efeito === 'reforca' ? 'Reforça suspeita' : 'Atenua suspeita')}`
            ),
            recomendacao: h.conduta || h.recomendacao || '',
            conduta: h.conduta || '',
            urgencia: h.urgencia,
            alerta: alerta,
        };
    });

    return {
        sessao: session_id,
        tipo: 'diagnostico',
        diagnosticos: lista,
        mensagem: rankingData.motivo_conclusao || 'Anamnese concluída.',
        rankingCompleto: rankingData,
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
    // Normaliza valor para o código da escala aceita pela KB ('s', 'p', '?', 'pn', 'n')
    let opcao = valor;
    if (valor === 'sim') opcao = 's';
    else if (valor === 'nao') opcao = 'n';
    else if (valor === 'nao_sei') opcao = '?';
    else if (valor === 'provavelmente_nao') opcao = 'pn';

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

/** Executa uma sequência pré-definida de respostas para um caso de teste demo em 1 clique e retorna direto o laudo. */
export async function executarCasoDemo(respostasMap) {
    const sessao = await request('/start', { method: 'POST' });
    const sessionId = sessao.session_id;

    for (const [parametro, opcao] of Object.entries(respostasMap)) {
        await request(`/${encodeURIComponent(sessionId)}/answer`, {
            method: 'POST',
            body: JSON.stringify({ parametro, opcao }),
        });
    }

    const rank = await request(`/${encodeURIComponent(sessionId)}/ranking`);
    return {
        sessionId,
        diagnostico: converterDiagnostico(sessionId, rank),
    };
}

/** Consulta as métricas oficiais de conformidade e auditoria (Regra de Ouro). */
export async function obterAuditoriaRegraDeOuro() {
    return await request('/auditoria');
}
