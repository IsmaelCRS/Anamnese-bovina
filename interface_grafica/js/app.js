/**
 * app.js — Controlador de Apresentação e Interação da Interface Gráfica.
 *
 * Não conhece as regras nem a base clínica diretamente: consome exclusivamente
 * a camada de API (api.js), mantendo o fluxo estrito:
 * início -> perguntas -> parecer de triagem com explicabilidade.
 */
import { iniciarAnamnese, enviarResposta, USANDO_MOCK } from './api.js';
import { icone } from './icones.js';

// ---------------------------------------------------------------------------
// Elementos da Página
// ---------------------------------------------------------------------------
const telaInicio = document.getElementById('tela-inicio');
const telaAnamnese = document.getElementById('tela-anamnese');
const btnIniciar = document.getElementById('btn-iniciar');
const btnVerHistorico = document.getElementById('btn-ver-historico');
const painelPrincipal = document.getElementById('painel-principal');
const listaHistorico = document.getElementById('lista-historico');
const historicoVazio = document.getElementById('historico-vazio');
const acoesLateral = document.getElementById('acoes-lateral');

const navNovaAnamnese = document.getElementById('nav-nova-anamnese');
const navHistorico = document.getElementById('nav-historico');
const navBaseRegras = document.getElementById('nav-base-regras');
const modalBaseRegras = document.getElementById('modal-base-regras');
const btnFecharModal = document.getElementById('btn-fechar-modal');
const btnEntendidoModal = document.getElementById('btn-entendido-modal');
const iconeBtnIniciar = document.getElementById('icone-btn-iniciar');
const iconePranchetaVazia = document.getElementById('icone-prancheta-vazia');

// Injeção de ícones SVG estáticos locais
if (iconeBtnIniciar) {
    iconeBtnIniciar.appendChild(icone('estetoscopio', 'w-5 h-5 text-white', 'Estetoscópio'));
}
if (iconePranchetaVazia) {
    iconePranchetaVazia.appendChild(icone('prancheta', 'w-10 h-10', 'Prancheta vazia'));
}

// ---------------------------------------------------------------------------
// Estado da Anamnese Ativa
// ---------------------------------------------------------------------------
const estado = {
    sessao: null,
    perguntaAtual: null,
    historico: [], // [{ pergunta, opcao }]
    ocupado: false,
};

// ---------------------------------------------------------------------------
// Mapeamento Semântico para Rótulos Clínicos Legíveis (Nunca IDs snake_case)
// ---------------------------------------------------------------------------
const MAPA_ROTULOS = {
    decubito: 'Decúbito (vaca caída)',
    hipocalcemia_previa: 'Histórico de hipocalcemia prévia',
    temperatura_subnormal: 'Temperatura corporal subnormal (<38°C)',
    periparto_recente: 'Periparto recente (<72 horas do parto)',
    tremores_musculares: 'Tremores e espasmos musculares',
    diminuicao_producao: 'Queda brusca de produção leiteira',
    inapetencia: 'Perda acentuada de apetite',
    halito_cetonico: 'Odor cetônico no ar expirado/urina',
    escore_corporal_baixo: 'Escore de condição corporal reduzido',
    alteracao_leite: 'Alterações macroscópicas no leite',
    grumos_leite: 'Grumos visíveis no teste da caneca preta',
    edema_ubere: 'Edema, calor ou dor na glândula mamária',
    leite_aquoso: 'Aspecto aquoso ou seroso da secreção',
    febre: 'Hipertermia / Febre (>39,5°C)',
    queda_apetite: 'Diminuição do consumo voluntário',
    diminuicao_rumina: 'Hipomotilidade ou atonia ruminal',
    perda_peso: 'Perda acelerada de peso corporal',
    fezes_secas: 'Fezes secas e escurecidas com muco',
};

function obterRotuloLegivel(pergunta) {
    if (!pergunta) return 'Avaliação';
    const id = pergunta.id || pergunta.parametro || '';
    if (MAPA_ROTULOS[id]) return MAPA_ROTULOS[id];
    if (pergunta.resumo && !pergunta.resumo.includes('_')) {
        return pergunta.resumo;
    }
    const formatado = id.replace(/_/g, ' ');
    return formatado.charAt(0).toUpperCase() + formatado.slice(1);
}

const MAPA_CATEGORIAS = {
    decubito: 'Postura & Locomoção',
    hipocalcemia_previa: 'Histórico Clínico',
    temperatura_subnormal: 'Sinais Vitais',
    periparto_recente: 'Período de Transição',
    tremores_musculares: 'Avaliação Neuromuscular',
    diminuicao_producao: 'Desempenho Produtivo',
    inapetencia: 'Consumo Alimentar',
    halito_cetonico: 'Avaliação Metabólica',
    escore_corporal_baixo: 'Condição Corporal',
    alteracao_leite: 'Qualidade do Leite',
    grumos_leite: 'Exame de Mastite (Caneca Preta)',
    edema_ubere: 'Glândula Mamária',
    leite_aquoso: 'Exame do Leite',
    febre: 'Sinais Vitais',
    queda_apetite: 'Consumo Alimentar',
    diminuicao_rumina: 'Sistema Digestório',
    perda_peso: 'Condição Corporal',
    fezes_secas: 'Excreção & Digestão',
};

function obterCategoria(pergunta) {
    if (pergunta && pergunta.categoria) return pergunta.categoria;
    const id = pergunta ? (pergunta.id || pergunta.parametro || '') : '';
    return MAPA_CATEGORIAS[id] || 'Avaliação Clínica';
}

// ---------------------------------------------------------------------------
// Utilitários DOM
// ---------------------------------------------------------------------------
function el(tag, classes = '', texto) {
    const elemento = document.createElement(tag);
    if (classes) elemento.className = classes;
    if (texto !== undefined) elemento.textContent = texto;
    return elemento;
}

// ---------------------------------------------------------------------------
// Fluxo de Execução
// ---------------------------------------------------------------------------
async function executar(acao) {
    if (estado.ocupado) return;
    estado.ocupado = true;
    mostrarCarregando();
    try {
        const resultado = await acao();
        tratarResposta(resultado);
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
        throw new Error(`Resposta desconhecida recebida: "${resposta.tipo}".`);
    }
}

function iniciar() {
    estado.sessao = null;
    estado.perguntaAtual = null;
    estado.historico = [];
    listaHistorico.replaceChildren();
    painelPrincipal.replaceChildren();
    acoesLateral.replaceChildren();

    atualizarHistoricoVazio();

    telaInicio.classList.add('hidden');
    telaAnamnese.classList.remove('hidden');

    window.scrollTo({ top: 0, behavior: 'smooth' });
    executar(() => iniciarAnamnese());
}

function responder(opcao) {
    const pergunta = estado.perguntaAtual;
    executar(async () => {
        const resposta = await enviarResposta(estado.sessao, pergunta.id, opcao.valor);
        adicionarAoHistorico(pergunta, opcao);
        return resposta;
    });
}

function adicionarAoHistorico(pergunta, opcao) {
    estado.historico.push({ pergunta, opcao });
    atualizarHistoricoVazio();

    const li = el(
        'li',
        'bg-[#F7F2EC] rounded-[10px] py-3 px-4 text-sm text-[#2A211C] flex items-center justify-between gap-3 border border-[#E7DDD3]/80 surgir'
    );

    const rotuloLegivel = obterRotuloLegivel(pergunta);
    const spanTexto = el('span', 'truncate text-sm', `${estado.historico.length} · ${rotuloLegivel}`);
    spanTexto.title = pergunta.texto;

    const spanResp = el('span', 'font-bold text-[#7E2F18] shrink-0 text-sm', opcao.rotulo);

    li.append(spanTexto, spanResp);
    listaHistorico.append(li);
}

function atualizarHistoricoVazio() {
    if (estado.historico.length === 0) {
        historicoVazio.classList.remove('hidden');
        listaHistorico.classList.add('hidden');
    } else {
        historicoVazio.classList.add('hidden');
        listaHistorico.classList.remove('hidden');
    }
}

// ---------------------------------------------------------------------------
// Renderização das Telas
// ---------------------------------------------------------------------------

function mostrarCarregando() {
    painelPrincipal.querySelector('#caixa-erro')?.remove();
    painelPrincipal.querySelectorAll('button').forEach((b) => (b.disabled = true));

    const indicador = el('div', 'flex items-center justify-center gap-3 py-6 text-[#5F5148]');
    indicador.id = 'indicador-carregando';
    indicador.append(el('div', 'spinner'), el('span', 'text-sm font-medium', 'Consultando o motor de inferência MYCIN...'));
    painelPrincipal.append(indicador);
}

function mostrarErro(mensagem, tentarNovamente) {
    painelPrincipal.querySelector('#indicador-carregando')?.remove();
    painelPrincipal.querySelectorAll('button').forEach((b) => (b.disabled = false));

    const caixa = el(
        'div',
        'surgir card-bio border-l-4 border-l-[#9A3F25] text-center my-4 bg-white p-6'
    );
    caixa.id = 'caixa-erro';
    caixa.append(
        el('h3', 'text-base font-bold text-[#2A211C] m-0 mb-1', 'Não foi possível comunicar com o servidor'),
        el('p', 'text-sm text-[#5F5148] m-0 mb-4', mensagem)
    );

    const btnTentar = el('button', 'btn-primario text-sm h-10 px-5 inline-flex', 'Tentar novamente');
    btnTentar.type = 'button';
    btnTentar.addEventListener('click', tentarNovamente);
    caixa.append(btnTentar);

    painelPrincipal.append(caixa);
}

function mostrarPergunta(pergunta) {
    painelPrincipal.replaceChildren();

    const numeroPergunta = estado.historico.length + 1;
    const categoria = obterCategoria(pergunta);

    // 1. Linha superior: "Pergunta N" e categoria
    const linhaTopo = el('div', 'flex items-center justify-between text-[13px] font-semibold text-[#5F5148] w-full px-1');
    linhaTopo.append(el('span', '', `Pergunta ${numeroPergunta}`), el('span', '', categoria));

    // 2. Barra de progresso (track h10, fill accent)
    const progresso = Math.min(100, Math.max(10, Math.round((numeroPergunta / 18) * 100)));
    const trackProgresso = el('div', 'w-full h-[10px] bg-[#EADFD3] rounded-full overflow-hidden my-2');
    const fillProgresso = el('div', 'h-full bg-[#9A3F25] rounded-full transition-all duration-300');
    fillProgresso.style.width = `${progresso}%`;
    trackProgresso.append(fillProgresso);

    // 3. Card principal da pergunta (padding 40px)
    const card = el('div', 'card-bio p-8 sm:p-10 w-full surgir');

    const eyebrow = el('span', 'eyebrow block mb-2', categoria.toUpperCase());
    const h2 = el('h2', 'font-serif text-[26px] sm:text-[34px] leading-[1.2] font-semibold text-[#2A211C] my-3', pergunta.texto);
    const dica = el(
        'p',
        'text-base text-[#5F5148] leading-relaxed mb-8 m-0',
        pergunta.ajuda || 'Avalie os sinais apresentados pelo animal e responda conforme o grau de confiança.'
    );

    // Grid de 5 colunas com os 5 botões especificados
    const gridOpcoes = el('div', 'grid grid-cols-2 min-[900px]:grid-cols-5 gap-3 w-full');

    const OPCOES_5 = [
        { rotulo: 'Sim', sub: 'CF +1.0', valor: 's' },
        { rotulo: 'Provavelmente sim', sub: 'CF +0.6', valor: 'p' },
        { rotulo: 'Não sei', sub: 'CF 0.0', valor: '?' },
        { rotulo: 'Provavelmente não', sub: 'CF -0.6', valor: 'n' },
        { rotulo: 'Não', sub: 'CF -1.0', valor: 'n' },
    ];

    OPCOES_5.forEach((opt) => {
        const btn = el('button', 'btn-opcao-grid group');
        btn.type = 'button';
        btn.setAttribute('aria-label', `${opt.rotulo} (${opt.sub})`);

        const spanRotulo = el('span', 'rotulo-opcao text-[#2A211C] px-1', opt.rotulo);
        const spanSub = el('span', 'text-[11px] text-[#5F5148]/80 font-medium shrink-0 mt-0.5', opt.sub);

        btn.append(spanRotulo, spanSub);
        btn.addEventListener('click', () => {
            btn.classList.add('escolhido');
            responder({ valor: opt.valor, rotulo: opt.rotulo });
        });
        gridOpcoes.append(btn);
    });

    // Nota explicativa
    const nota = el(
        'p',
        'text-sm text-[#5F5148] mt-8 mb-0 flex items-center gap-2 border-t border-[#E7DDD3]/60 pt-4',
        'Cada resposta é convertida em Fator de Certeza e inserida na memória de trabalho.'
    );

    card.append(eyebrow, h2, dica, gridOpcoes, nota);
    painelPrincipal.append(linhaTopo, trackProgresso, card);

    // Atualiza botões da coluna lateral
    acoesLateral.replaceChildren();
    const btnReiniciar = el('button', 'btn-secundario w-full text-sm', 'Reiniciar atendimento');
    btnReiniciar.type = 'button';
    btnReiniciar.addEventListener('click', iniciar);
    acoesLateral.append(btnReiniciar);
}

function mostrarDiagnostico(resposta) {
    painelPrincipal.replaceChildren();

    const hipoteses = resposta.diagnosticos || [];
    const top = hipoteses[0] || {
        doenca: 'Sem diagnóstico conclusivo',
        certeza: 0,
        justificativa: [],
        recomendacao: 'Coletar mais evidências clínicas.',
    };

    // Cabeçalho da tela de resultado
    const containerResultado = el('div', 'w-full flex flex-col gap-6 surgir');

    const cabecalho = el('div', 'flex flex-col items-start');
    cabecalho.append(
        el('span', 'eyebrow mb-1', 'RESULTADO DA ANAMNESE'),
        el('h1', 'font-serif text-[32px] sm:text-[36px] font-bold text-[#2A211C] m-0 mb-1', 'Parecer de triagem'),
        el('p', 'text-sm text-[#5F5148] m-0', `${estado.historico.length} perguntas respondidas`)
    );

    // Card Principal: Mais Provável
    const cardPrincipal = el('div', 'card-bio p-7 sm:p-8');

    const pctTop = Math.round((top.certeza || 0) * 100);

    const topoCard = el('div', 'flex items-baseline justify-between gap-4');
    const esqCard = el('div', 'flex flex-col');
    esqCard.append(
        el('span', 'eyebrow block mb-1', 'MAIS PROVÁVEL'),
        el('h2', 'text-[24px] sm:text-[26px] font-bold text-[#2A211C] m-0', top.doenca)
    );
    const dirCard = el('span', 'text-[30px] sm:text-[34px] font-bold text-[#9A3F25] shrink-0', `${pctTop}%`);
    topoCard.append(esqCard, dirCard);

    // Barra de certeza principal (track h12 com fill = %)
    const trackPrincipal = el('div', 'h-3 bg-[#EADFD3] rounded-full overflow-hidden my-4');
    const fillPrincipal = el('div', 'h-full bg-[#9A3F25] rounded-full transition-all duration-700');
    fillPrincipal.style.width = '0%';
    trackPrincipal.append(fillPrincipal);
    requestAnimationFrame(() => requestAnimationFrame(() => (fillPrincipal.style.width = `${pctTop}%`)));

    cardPrincipal.append(topoCard, trackPrincipal);

    // Alerta (só se urgente ou se top.alerta existir)
    if (top.alerta || top.certeza >= 0.75) {
        const caixaAlerta = el('div', 'bg-[#FFF1D6] border border-[#E8C877] text-[#5C3D00] rounded-xl p-4 my-4 flex items-start gap-3');
        const iconeAlerta = icone('alerta', 'w-5 h-5 text-[#5C3D00] shrink-0 mt-0.5', 'Alerta');
        const corpoAlerta = el('div', 'flex flex-col');
        corpoAlerta.append(
            el('h3', 'text-sm font-bold m-0 mb-1', 'Atenção veterinária urgente'),
            el('p', 'text-sm m-0 leading-relaxed', top.alerta || 'Quadro com alta probabilidade clínica de emergência. Acionar o médico-veterinário imediatamente.')
        );
        caixaAlerta.append(iconeAlerta, corpoAlerta);
        cardPrincipal.append(caixaAlerta);
    }

    // Seção "Por que este diagnóstico?" com linhas formatadas
    const sessaoExplicacao = el('div', 'mt-6 mb-4');
    sessaoExplicacao.append(el('h3', 'text-base font-bold text-[#2A211C] m-0 mb-3', 'Por que este diagnóstico?'));

    const listaEvidencias = el('div', 'flex flex-col gap-2');
    if (top.justificativa && top.justificativa.length > 0) {
        top.justificativa.forEach((just) => {
            const linha = el('div', 'bg-[#F7F2EC] rounded-[10px] p-3 text-sm flex items-center justify-between gap-3 border border-[#E7DDD3]/60');
            linha.append(
                el('span', 'text-[#2A211C] text-sm leading-normal', String(just)),
                el('span', 'font-bold text-xs uppercase tracking-wide text-[#7E2F18] bg-[#F3E3DA] px-2.5 py-1 rounded-md shrink-0', 'Reforça suspeita')
            );
            listaEvidencias.append(linha);
        });
    } else {
        const linhaVazia = el('div', 'bg-[#F7F2EC] rounded-[10px] p-3 text-sm text-[#5F5148] italic border border-[#E7DDD3]/60', 'Evidências acumuladas através das respostas fornecidas.');
        listaEvidencias.append(linhaVazia);
    }
    sessaoExplicacao.append(listaEvidencias);
    cardPrincipal.append(sessaoExplicacao);

    // Caixa de recomendação
    const caixaRecomendacao = el('div', 'border border-[#E7DDD3] rounded-xl p-4 bg-[#F7F2EC]/50 mt-6');
    caixaRecomendacao.append(
        el('h4', 'text-sm font-bold text-[#2A211C] m-0 mb-1', 'Recomendação'),
        el('p', 'text-[15px] text-[#5F5148] m-0 leading-relaxed', top.recomendacao || 'Consultar avaliação presencial de médico-veterinário e monitorar evolução do animal.')
    );
    cardPrincipal.append(caixaRecomendacao);

    containerResultado.append(cabecalho, cardPrincipal);

    // Card "Outras hipóteses" (da 2ª em diante)
    if (hipoteses.length > 1) {
        const cardOutras = el('div', 'card-bio p-7');
        cardOutras.append(el('span', 'eyebrow block mb-4', 'OUTRAS HIPÓTESES'));

        for (let i = 1; i < hipoteses.length; i++) {
            const h = hipoteses[i];
            const pct = Math.round((h.certeza || 0) * 100);

            const bloco = el('div', 'mb-4 last:mb-0');
            const linhaInfo = el('div', 'flex items-center justify-between text-sm mb-1');
            linhaInfo.append(
                el('span', 'font-semibold text-[#2A211C]', h.doenca),
                el('span', 'font-semibold text-[#5F5148]', `${pct}%`)
            );

            const trackH = el('div', 'h-2 bg-[#EADFD3] rounded-full overflow-hidden');
            const fillH = el('div', 'h-full bg-[#C98A73] rounded-full');
            fillH.style.width = `${pct}%`;
            trackH.append(fillH);

            bloco.append(linhaInfo, trackH);
            cardOutras.append(bloco);
        }
        containerResultado.append(cardOutras);
    }

    painelPrincipal.append(containerResultado);

    // Atualiza botões da coluna lateral na tela de resultado
    acoesLateral.replaceChildren();

    const btnImprimir = el('button', 'btn-primario w-full text-base flex items-center justify-center gap-2 mb-2', 'Imprimir relatório');
    btnImprimir.id = 'btn-imprimir';
    btnImprimir.type = 'button';
    btnImprimir.prepend(icone('imprimir', 'w-5 h-5 text-white', 'Imprimir'));
    btnImprimir.addEventListener('click', () => window.print());

    const btnNova = el('button', 'btn-secundario w-full text-base', 'Nova anamnese');
    btnNova.id = 'btn-reiniciar-resultado';
    btnNova.type = 'button';
    btnNova.addEventListener('click', iniciar);

    acoesLateral.append(btnImprimir, btnNova);
}

function voltarInicio() {
    telaAnamnese.classList.add('hidden');
    telaInicio.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

const linkLogo = document.getElementById('link-logo');
if (linkLogo) {
    linkLogo.addEventListener('click', (e) => {
        e.preventDefault();
        voltarInicio();
    });
}

btnIniciar.addEventListener('click', iniciar);

btnVerHistorico.addEventListener('click', () => {
    if (estado.historico.length > 0) {
        telaInicio.classList.add('hidden');
        telaAnamnese.classList.remove('hidden');
    } else {
        iniciar();
    }
});

navNovaAnamnese.addEventListener('click', iniciar);

navHistorico.addEventListener('click', () => {
    if (telaAnamnese.classList.contains('hidden')) {
        iniciar();
    } else {
        document.getElementById('painel-lateral')?.scrollIntoView({ behavior: 'smooth' });
    }
});

navBaseRegras.addEventListener('click', () => {
    modalBaseRegras?.showModal();
});

btnFecharModal?.addEventListener('click', () => {
    modalBaseRegras?.close();
});

btnEntendidoModal?.addEventListener('click', () => {
    modalBaseRegras?.close();
});

// Fechar modal ao clicar fora (backdrop)
modalBaseRegras?.addEventListener('click', (e) => {
    const rect = modalBaseRegras.getBoundingClientRect();
    const isInDialog =
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width;
    if (!isInDialog) {
        modalBaseRegras.close();
    }
});
