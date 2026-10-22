/**
 * api.js — ÚNICO arquivo do front que conversa com o back-end.
 *
 * Enquanto o back-end real (Python + clipspy) não está pronto, as chamadas
 * vão para o back-end simulado em mock.js. Quando o servidor existir,
 * basta trocar USAR_MOCK para false. O formato das mensagens está em ../API.md.
 */
import * as mock from './mock.js';

const USAR_MOCK = true;
const BASE_URL = '/api';

export const USANDO_MOCK = USAR_MOCK;

async function post(caminho, corpo) {
    const resposta = await fetch(BASE_URL + caminho, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });

    if (!resposta.ok) {
        throw new Error(`Erro ${resposta.status} ao comunicar com o servidor.`);
    }
    return resposta.json();
}

/** Inicia uma nova anamnese. Retorna a primeira pergunta. */
export function iniciarAnamnese() {
    if (USAR_MOCK) return mock.iniciarAnamnese();
    return post('/anamnese');
}

/** Envia a resposta de uma pergunta. Retorna a próxima pergunta ou o diagnóstico. */
export function enviarResposta(sessao, idPergunta, valor) {
    if (USAR_MOCK) return mock.enviarResposta(sessao, idPergunta, valor);
    return post(`/anamnese/${encodeURIComponent(sessao)}/resposta`, { id: idPergunta, valor });
}
