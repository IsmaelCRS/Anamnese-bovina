/**
 * app.js — Lógica das telas.
 *
 * Este arquivo NÃO conhece as perguntas nem as regras: ele apenas mostra o que
 * o back-end (real ou simulado) devolve. Toda comunicação passa pelo api.js.
 */
import { iniciarAnamnese, enviarResposta, USANDO_MOCK } from './api.js';

// Elementos da página
const telaInicio = document.getElementById('tela-inicio');
const telaAnamnese = document.getElementById('tela-anamnese');
const btnIniciar = document.getElementById('btn-iniciar');
const painel = document.getElementById('painel-principal');
const listaHistorico = document.getElementById('lista-historico');
const avisoMock = document.getElementById('aviso-mock');

// Estado da anamnese atual
const estado = {
    sessao: null,
    perguntaAtual: null,
    historico: [], // [{ pergunta, opcao }]
    ocupado: false,
};

const CLASSE_BOTAO =
    'bg-rust text-white px-6 py-3 rounded-full text-lg shadow-md hover:opacity-90 hover:-translate-y-0.5 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0';

if (USANDO_MOCK) avisoMock.classList.remove('hidden');

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

/** Cria um elemento. Usa textContent (nunca innerHTML) para dados vindos do servidor. */
function el(tag, classes = '', texto) {
    const elemento = document.createElement(tag);
    if (classes) elemento.className = classes;
    if (texto !== undefined) elemento.textContent = texto;
    return elemento;
}

function botao(texto, id, aoClicar, classesExtras = '') {
    const b = el('button', `${CLASSE_BOTAO} ${classesExtras}`, texto);
    b.id = id;
    b.type = 'button';
    b.addEventListener('click', aoClicar);
    return b;
}

// ---------------------------------------------------------------------------
// Fluxo
// ---------------------------------------------------------------------------

/** Executa uma chamada ao back-end cuidando de carregamento e erros. */
async function executar(acao) {
    if (estado.ocupado) return;
    estado.ocupado = true;
    mostrarCarregando();
    try {
        tratarResposta(await acao());
    } catch (erro) {
        console.error(erro);
        mostrarErro(erro.message, () => executar(acao));
    } finally {
        estado.ocupado = false;
    }
}

function tratarResposta(resposta) {
    estado.sessao = resposta.sessao ?? estado.sessao;

    if (resposta.tipo === 'pergunta') {
        estado.perguntaAtual = resposta.pergunta;
        mostrarPergunta(resposta.pergunta);
    } else if (resposta.tipo === 'diagnostico') {
        estado.perguntaAtual = null;
        mostrarDiagnostico(resposta);
    } else {
        throw new Error(`Resposta desconhecida do servidor: "${resposta.tipo}".`);
    }
}

function iniciar() {
    estado.sessao = null;
    estado.perguntaAtual = null;
    estado.historico = [];
    listaHistorico.replaceChildren();
    painel.replaceChildren();

    telaInicio.classList.add('hidden');
    telaAnamnese.classList.remove('hidden');

    executar(() => iniciarAnamnese());
}

function responder(opcao) {
    const pergunta = estado.perguntaAtual;
    executar(async () => {
        const resposta = await enviarResposta(estado.sessao, pergunta.id, opcao.valor);
        adicionarAoHistorico(pergunta, opcao); // só registra se o servidor aceitou
        return resposta;
    });
}

// ---------------------------------------------------------------------------
// Renderização
// ---------------------------------------------------------------------------

function mostrarCarregando() {
    painel.querySelector('#caixa-erro')?.remove();
    painel.querySelectorAll('button').forEach((b) => (b.disabled = true));

    const indicador = el('div', 'flex items-center justify-center gap-3 mt-6 text-stone-600');
    indicador.id = 'indicador-carregando';
    indicador.append(el('div', 'spinner'), el('span', 'text-sm', 'Consultando o sistema especialista...'));
    painel.append(indicador);
}

function mostrarErro(mensagem, tentarNovamente) {
    painel.querySelector('#indicador-carregando')?.remove();
    painel.querySelectorAll('button').forEach((b) => (b.disabled = false));

    const caixa = el('div', 'surgir mt-6 w-full bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 text-center');
    caixa.id = 'caixa-erro';
    caixa.append(
        el('p', 'font-medium', 'Não foi possível falar com o servidor.'),
        el('p', 'text-sm mt-1', mensagem),
        botao('Tentar novamente', 'btn-tentar-novamente', tentarNovamente, 'mt-3 text-base')
    );
    painel.append(caixa);
}

function mostrarPergunta(pergunta) {
    painel.replaceChildren();

    const caixa = el('div', 'surgir bg-tan w-full text-center py-8 px-6 rounded-[2rem] shadow-sm mb-8');
    caixa.append(
        el('p', 'text-sm font-semibold text-rust uppercase tracking-wide mb-2', `Pergunta ${estado.historico.length + 1}`),
        el('p', 'text-xl font-medium', pergunta.texto)
    );
    if (pergunta.ajuda) caixa.append(el('p', 'text-sm text-stone-600 mt-3', pergunta.ajuda));

    const botoes = el('div', 'surgir flex flex-wrap w-full justify-center gap-4 md:gap-6');
    pergunta.opcoes.forEach((opcao) => {
        botoes.append(botao(opcao.rotulo, `btn-opcao-${opcao.valor}`, () => responder(opcao), 'w-32'));
    });

    painel.append(caixa, botoes);
}

function adicionarAoHistorico(pergunta, opcao) {
    estado.historico.push({ pergunta, opcao });

    const item = el('li', 'surgir bg-rust text-white rounded-full shadow-sm px-5 py-3 flex items-center justify-between gap-3');
    const texto = el('span', 'text-sm truncate', `${estado.historico.length} - ${pergunta.resumo ?? pergunta.texto}`);
    texto.title = pergunta.texto;
    item.append(texto, el('span', 'text-sm font-semibold shrink-0', opcao.rotulo.toUpperCase()));
    listaHistorico.append(item);
}

function mostrarDiagnostico(resposta) {
    painel.replaceChildren();

    const cabecalho = el('div', 'surgir bg-tan w-full text-center py-6 px-6 rounded-[2rem] shadow-sm mb-6');
    cabecalho.append(
        el('h2', 'text-2xl font-semibold text-rust', 'Resultado da anamnese'),
        el('p', 'text-sm text-stone-600 mt-1', `${estado.historico.length} perguntas respondidas`)
    );
    painel.append(cabecalho);

    if (resposta.diagnosticos.length === 0) {
        painel.append(
            el('p', 'surgir w-full bg-white/70 border border-tan rounded-3xl p-5 text-center mb-4',
                resposta.mensagem ?? 'Nenhum diagnóstico conclusivo.')
        );
    }

    resposta.diagnosticos.forEach((diagnostico, i) => painel.append(cartaoDiagnostico(diagnostico, i)));

    painel.append(botao('Nova anamnese', 'btn-nova-anamnese', iniciar, 'mt-2'));
}

function cartaoDiagnostico(d, indice) {
    const porcentagem = Math.round(d.certeza * 100);

    const cartao = el('article', 'surgir w-full bg-white/70 border border-tan rounded-3xl p-5 shadow-sm mb-4');
    cartao.style.animationDelay = `${indice * 120}ms`;

    if (indice === 0) {
        cartao.append(el('span', 'inline-block text-xs font-semibold uppercase tracking-wide text-rust mb-1', 'Mais provável'));
    }

    const topo = el('div', 'flex items-baseline justify-between gap-4');
    topo.append(el('h3', 'text-lg font-semibold', d.doenca), el('span', 'text-rust font-semibold', `${porcentagem}%`));

    // Barra de certeza (anima de 0 até o valor)
    const barra = el('div', 'h-2 bg-tan rounded-full overflow-hidden mt-2 mb-4');
    const preenchimento = el('div', 'h-full bg-rust rounded-full transition-all duration-700');
    preenchimento.style.width = '0%';
    barra.append(preenchimento);
    requestAnimationFrame(() => requestAnimationFrame(() => (preenchimento.style.width = `${porcentagem}%`)));

    cartao.append(topo, barra);

    if (d.alerta) {
        cartao.append(el('p', 'bg-amber-100 border border-amber-300 text-amber-900 text-sm rounded-xl p-3 mb-3', `⚠️ ${d.alerta}`));
    }

    if (d.justificativa?.length) {
        const lista = el('ul', 'list-disc pl-5 text-sm text-stone-700 space-y-0.5');
        d.justificativa.forEach((motivo) => lista.append(el('li', '', motivo)));
        cartao.append(el('p', 'text-sm font-medium mb-1', 'Por que este diagnóstico?'), lista);
    }

    if (d.recomendacao) {
        const recomendacao = el('p', 'text-sm mt-3');
        recomendacao.append(el('strong', '', 'Recomendação: '), document.createTextNode(d.recomendacao));
        cartao.append(recomendacao);
    }

    return cartao;
}

// ---------------------------------------------------------------------------
btnIniciar.addEventListener('click', iniciar);
