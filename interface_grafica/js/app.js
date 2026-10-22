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
const btnAbrirComoFunciona = document.getElementById('btn-abrir-como-funciona');
const gridCatalogoDoencas = document.getElementById('grid-catalogo-doencas');
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
// Catálogo das 8 Enfermidades (v3.1.0) nos 4 Pilares Clínicos
// ---------------------------------------------------------------------------
const CATALOGO_PILARES = [
    {
        pilar: 'Glândula Mamária',
        icone: '🍼',
        descricao: 'Infecções e inflamações do úbere e do leite.',
        doencas: [
            {
                nome: 'Mastite Clínica',
                sintomas: 'Leite com grumos, pus ou sangue no caneco preto; úbere inchado, quente ou dolorido.',
                conduta: 'Isolar a ordenha, ordenhar por último e acionar veterinário para coleta e cultura.',
            },
            {
                nome: 'Mastite Subclínica',
                sintomas: 'Leite visualmente normal, mas com CMT positivo (formação de gel) ou CCS > 200 mil.',
                conduta: 'Realizar CMT individual em todos os tetos, avaliar CCS e revisar rotina de pré/pós-dipping.',
            },
        ],
    },
    {
        pilar: 'Metabólico & Periparto',
        icone: '⚡',
        descricao: 'Distúrbios energéticos e minerais em vacas de alta produção.',
        doencas: [
            {
                nome: 'Hipocalcemia (Febre do Leite)',
                sintomas: 'Vaca caída (decúbito) no periparto, tremores, cabeça no flanco (pescoço em S), extremidades frias.',
                conduta: 'EMERGÊNCIA: acionar médico-veterinário imediatamente. Apoiar em decúbito esternal com sombra.',
            },
            {
                nome: 'Cetose (Acetonemia)',
                sintomas: 'Hálito/leite com odor adocicado de acetona, perda rápida de peso, inapetência e queda de leite.',
                conduta: 'Confirmar com fita de corpos cetônicos (BHB sangue/urina) e revisar nutrição de transição.',
            },
            {
                nome: 'Acidose Ruminal',
                sintomas: 'Fezes líquidas/espumosas com cheiro azedo, timpanismo, atonia do rúmen e queda da gordura do leite.',
                conduta: 'Suspender concentrado excessivo, fornecer volumoso de fibra longa e solicitar suporte clínico.',
            },
        ],
    },
    {
        pilar: 'Infeccioso & Podal',
        icone: '🩺',
        descricao: 'Doenças transmitidas por vetores e afecções locomotoras.',
        doencas: [
            {
                nome: 'Tristeza Parasitária (TPB)',
                sintomas: 'Febre alta (>40°C), mucosas pálidas ou amareladas (anemia/icterícia), urina escura e carrapatos.',
                conduta: 'EMERGÊNCIA: chamar veterinário urgente. Proteger da insolação, evitar estresse e locomoção.',
            },
            {
                nome: 'Afecção Podal (Casco)',
                sintomas: 'Claudicação (manqueira), lesão interdigital ou no talão, dor e calor na coroa do casco.',
                conduta: 'Conter o animal, inspecionar cascos, realizar casqueamento curativo e higienizar piso/pedilúvio.',
            },
        ],
    },
    {
        pilar: 'Ambiência & Conforto',
        icone: '🌡️',
        descricao: 'Fatores bioclimáticos que limitam a homeostase e produtividade.',
        doencas: [
            {
                nome: 'Estresse Térmico',
                sintomas: 'Dia com ITU > 72, respiração acelerada ofegante (>60 mov/min), salivação e busca intensa por sombra.',
                conduta: 'Ativar ventiladores e aspersores na linha de alimentação e sala de espera; garantir água fresca à vontade.',
            },
        ],
    },
];

function renderizarCatalogoDoencas() {
    if (!gridCatalogoDoencas) return;
    gridCatalogoDoencas.replaceChildren();

    CATALOGO_PILARES.forEach((grupo) => {
        const cardPilar = el('div', 'card-bio p-5 flex flex-col justify-between border-t-4 border-t-[#9A3F25]');
        
        // 1. Box de resumo com o detalhamento das doenças na PARTE DE CIMA
        const listaDoencas = el('div', 'flex flex-col gap-3 mb-4');
        grupo.doencas.forEach((d) => {
            const caixaD = el('div', 'bg-[#F7F2EC] rounded-xl p-3 border border-[#E7DDD3]/80');
            const nomeD = el('h4', 'text-[13px] font-bold text-[#7E2F18] m-0 mb-1', d.nome);
            const sintD = el('p', 'text-xs text-[#2A211C] m-0 mb-1.5 leading-snug', `🔍 ${d.sintomas}`);
            const condD = el('p', 'text-[11px] text-[#5F5148] m-0 leading-snug', `🩺 Conduta: ${d.conduta}`);
            caixaD.append(nomeD, sintD, condD);
            listaDoencas.append(caixaD);
        });

        // 2. Identificação e descrição do Pilar Clínico
        const topo = el('div', 'flex flex-col gap-2 pt-3 border-t border-[#E7DDD3]/70');
        const titPilar = el('div', 'flex items-center gap-2');
        titPilar.append(
            el('span', 'text-2xl', grupo.icone),
            el('h3', 'text-base font-bold text-[#2A211C] m-0', grupo.pilar)
        );
        const descPilar = el('p', 'text-xs text-[#5F5148] m-0 leading-normal', grupo.descricao);
        topo.append(titPilar, descPilar);

        cardPilar.append(listaDoencas, topo);
        gridCatalogoDoencas.append(cardPilar);
    });
}
renderizarCatalogoDoencas();

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

    // 1. Linha superior: "Pergunta x" (dinâmico, sem menção a limite máximo) e categoria
    const linhaTopo = el('div', 'flex items-center justify-between text-[13px] font-semibold text-[#5F5148] w-full px-1');
    linhaTopo.append(el('span', '', `Pergunta ${numeroPergunta}`), el('span', '', categoria));

    // 2. Barra de progresso dinâmica contínua (sem teto fixo de 20 perguntas)
    const respondidas = numeroPergunta - 1;
    const totalVisual = Math.max(respondidas + 3, 5);
    const progresso = respondidas === 0 ? 5 : Math.min(94, Math.round((respondidas / totalVisual) * 100));
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

    // Grid de opções intuitivas com 5 graus de indício
    const gridOpcoes = el('div', 'grid grid-cols-2 min-[900px]:grid-cols-5 gap-3 w-full');

    const OPCOES_5 = [
        { rotulo: 'Sim', sub: 'Confirma o sinal', valor: 's' },
        { rotulo: 'Provavelmente sim', sub: 'Forte suspeita', valor: 'p' },
        { rotulo: 'Não sei', sub: 'Sem observação', valor: '?' },
        { rotulo: 'Provavelmente não', sub: 'Pouco provável', valor: 'pn' },
        { rotulo: 'Não', sub: 'Sinal ausente', valor: 'n' },
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

    // Nota explicativa humanizada
    const nota = el(
        'p',
        'text-sm text-[#5F5148] mt-8 mb-0 flex items-center gap-2 border-t border-[#E7DDD3]/60 pt-4',
        'Cada resposta alimenta a árvore dedutiva de regras clínicas em tempo real.'
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

function obterBadgeClassificacao(certeza) {
    if (certeza >= 0.8) {
        return {
            rotulo: '🚨 Forte Indício (Ação Imediata)',
            classe: 'badge-forte',
            nivel: 'alto',
        };
    }
    if (certeza >= 0.4) {
        return {
            rotulo: '⚠️ Provável (Atenção & Acompanhamento)',
            classe: 'badge-provavel',
            nivel: 'medio',
        };
    }
    return {
        rotulo: '🟢 Inconclusivo / Baixa Probabilidade',
        classe: 'badge-inconclusivo',
        nivel: 'baixo',
    };
}

function mostrarDiagnostico(resposta) {
    painelPrincipal.replaceChildren();

    const hipoteses = resposta.diagnosticos || [];
    const top = hipoteses[0] || {
        doenca: 'Sem diagnóstico conclusivo',
        certeza: 0,
        cf_percentual: 0,
        explicacao: [],
        justificativa: [],
        recomendacao: 'Coletar mais evidências clínicas.',
    };

    const pctTop = Math.round((top.certeza || 0) * 100);
    const badgeTop = obterBadgeClassificacao(top.certeza);

    // Container geral do Laudo Completo
    const containerResultado = el('div', 'w-full flex flex-col gap-6 surgir');

    // Cabeçalho da tela de resultado
    const cabecalho = el('div', 'flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7DDD3] pb-4');
    const titEsq = el('div', 'flex flex-col items-start');
    titEsq.append(
        el('span', 'eyebrow mb-1', 'LAUDO CLÍNICO & PARECER DE TRIAGEM'),
        el('h1', 'font-serif text-[28px] sm:text-[34px] font-bold text-[#2A211C] m-0', 'Resultado da Avaliação'),
        el('p', 'text-sm text-[#5F5148] m-0 mt-0.5', `Triagem baseada em ${estado.historico.length} evidências clínicas coletadas`)
    );
    const acoesCabecalho = el('div', 'flex items-center gap-3');
    const badgeNivelTopo = el(
        'span',
        `px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${badgeTop.classe}`,
        badgeTop.rotulo
    );
    acoesCabecalho.append(badgeNivelTopo);
    cabecalho.append(titEsq, acoesCabecalho);

    // Card Principal: Hipótese Líder
    const cardPrincipal = el('div', 'card-bio p-7 sm:p-8');

    const topoCard = el('div', 'flex items-start justify-between gap-4');
    const esqCard = el('div', 'flex flex-col');
    esqCard.append(
        el('span', 'eyebrow block mb-1', 'HIPÓTESE PRINCIPAL DETECTADA'),
        el('h2', 'text-[24px] sm:text-[28px] font-bold text-[#2A211C] m-0', top.doenca),
        el('span', 'text-xs font-semibold text-[#5F5148] mt-1', `Pilar: ${top.pilar || 'Clínico'} · Sistema: ${top.sistema || 'Geral'}`)
    );
    const dirCard = el('div', 'flex flex-col items-end shrink-0');
    dirCard.append(
        el('span', 'text-xs font-bold text-[#5F5148] uppercase tracking-wider', 'Indício Estimado'),
        el('span', 'text-[32px] sm:text-[38px] font-bold text-[#9A3F25]', `${pctTop}%`)
    );
    topoCard.append(esqCard, dirCard);

    // Barra de estimativa principal
    const trackPrincipal = el('div', 'h-3 bg-[#EADFD3] rounded-full overflow-hidden my-4');
    const fillPrincipal = el('div', 'h-full bg-[#9A3F25] rounded-full transition-all duration-700');
    fillPrincipal.style.width = '0%';
    trackPrincipal.append(fillPrincipal);
    requestAnimationFrame(() => requestAnimationFrame(() => (fillPrincipal.style.width = `${pctTop}%`)));

    cardPrincipal.append(topoCard, trackPrincipal);

    // Alerta de Urgência em destaque
    if (top.alerta || top.certeza >= 0.75 || top.urgencia >= 2.5) {
        const caixaAlerta = el('div', 'bg-[#FFF1D6] border border-[#E8C877] text-[#5C3D00] rounded-xl p-4 my-4 flex items-start gap-3');
        const iconeAlerta = icone('alerta', 'w-5 h-5 text-[#5C3D00] shrink-0 mt-0.5', 'Alerta');
        const corpoAlerta = el('div', 'flex flex-col');
        corpoAlerta.append(
            el('h3', 'text-sm font-bold m-0 mb-1', 'Atenção Veterinária Urgente'),
            el('p', 'text-sm m-0 leading-relaxed', top.alerta || 'Quadro com alta probabilidade clínica de emergência. Acionar o médico-veterinário imediatamente.')
        );
        caixaAlerta.append(iconeAlerta, corpoAlerta);
        cardPrincipal.append(caixaAlerta);
    }

    // Plano de Ação & Conduta Sugerida para o Manejo da Fazenda
    const caixaConduta = el('div', 'border border-[#E7DDD3] rounded-xl p-5 bg-[#F7F2EC] my-4');
    caixaConduta.append(
        el('h4', 'text-sm font-bold text-[#7E2F18] m-0 mb-1 flex items-center gap-1.5', '🩺 Conduta Recomendada para a Propriedade'),
        el('p', 'text-[14px] text-[#2A211C] m-0 leading-relaxed font-medium', top.conduta || top.recomendacao || 'Consultar avaliação presencial de médico-veterinário e monitorar evolução do animal.')
    );
    cardPrincipal.append(caixaConduta);

    // Trilha Explicativa de Evidências (Por quê? Marcadores & Contra-evidências)
    const sessaoExplicacao = el('div', 'mt-6');
    sessaoExplicacao.append(
        el('h3', 'text-base font-bold text-[#2A211C] m-0 mb-1', 'Trilha de Raciocínio Clínico (Por que este diagnóstico?)'),
        el('p', 'text-xs text-[#5F5148] m-0 mb-3', 'Sinais que confirmaram a suspeita e regras dedutivas validadas.')
    );

    const listaEvidencias = el('div', 'flex flex-col gap-2');
    const passos = top.explicacao && top.explicacao.length > 0 ? top.explicacao : null;

    if (passos) {
        passos.forEach((p) => {
            const ehReforco = p.efeito === 'reforca';
            const linha = el('div', 'bg-[#F7F2EC] rounded-[10px] p-3 text-sm flex items-start sm:items-center justify-between gap-3 border border-[#E7DDD3]/70');
            const esqLinha = el('div', 'flex flex-col');
            esqLinha.append(
                el('span', 'text-[#2A211C] font-semibold text-sm', p.pergunta),
                el('span', 'text-xs text-[#5F5148] mt-0.5 leading-normal', p.justificativa || (ehReforco ? 'Evidência clínica confirmatória.' : 'Fator de atenuação ou descarte.'))
            );
            const badgeEfeito = el(
                'span',
                `font-bold text-xs uppercase tracking-wide px-2.5 py-1 rounded-md shrink-0 ${ehReforco ? 'text-[#7E2F18] bg-[#F3E3DA]' : 'text-emerald-800 bg-emerald-100'}`,
                ehReforco ? 'Confirmou suspeita' : 'Atenuou suspeita'
            );
            linha.append(esqLinha, badgeEfeito);
            listaEvidencias.append(linha);
        });
    } else if (top.justificativa && top.justificativa.length > 0) {
        top.justificativa.forEach((just) => {
            const linha = el('div', 'bg-[#F7F2EC] rounded-[10px] p-3 text-sm flex items-center justify-between gap-3 border border-[#E7DDD3]/60');
            linha.append(
                el('span', 'text-[#2A211C] text-sm leading-normal', String(just)),
                el('span', 'font-bold text-xs uppercase tracking-wide text-[#7E2F18] bg-[#F3E3DA] px-2.5 py-1 rounded-md shrink-0', 'Confirmou suspeita')
            );
            listaEvidencias.append(linha);
        });
    } else {
        const linhaVazia = el('div', 'bg-[#F7F2EC] rounded-[10px] p-3 text-sm text-[#5F5148] italic border border-[#E7DDD3]/60', 'Evidências acumuladas através das respostas fornecidas.');
        listaEvidencias.append(linhaVazia);
    }
    sessaoExplicacao.append(listaEvidencias);
    cardPrincipal.append(sessaoExplicacao);

    // Diagnóstico Diferencial Explicativo (Por que a 1ª superou a 2ª)
    if (hipoteses.length > 1) {
        const segundo = hipoteses[1];
        const pctSegundo = Math.round((segundo.certeza || 0) * 100);
        const diferenca = pctTop - pctSegundo;

        const caixaDiferencial = el('div', 'mt-6 p-4 rounded-xl border border-dashed border-[#B9A798] bg-white');
        caixaDiferencial.append(
            el('h4', 'text-xs font-bold text-[#5F5148] uppercase tracking-wider m-0 mb-1', 'Diagnóstico Diferencial'),
            el(
                'p',
                'text-sm text-[#2A211C] m-0 leading-relaxed',
                `A hipótese de ${top.doenca} (${pctTop}%) apresentou vantagem de ${diferenca}% em relação a ${segundo.doenca} (${pctSegundo}%), pois os sintomas relatados demonstraram maior compatibilidade com as regras cardinais de ${top.doenca}.`
            )
        );
        cardPrincipal.append(caixaDiferencial);
    }

    containerResultado.append(cabecalho, cardPrincipal);

    // Card "Outras Hipóteses Avaliadas" (da 2ª em diante)
    if (hipoteses.length > 1) {
        const cardOutras = el('div', 'card-bio p-7');
        cardOutras.append(
            el('span', 'eyebrow block mb-1', 'DIAGNÓSTICOS DIFERENCIAIS'),
            el('h3', 'text-lg font-bold text-[#2A211C] m-0 mb-4', 'Outras Hipóteses Monitoradas')
        );

        for (let i = 1; i < hipoteses.length; i++) {
            const h = hipoteses[i];
            const pct = Math.round((h.certeza || 0) * 100);
            const b = obterBadgeClassificacao(h.certeza);

            const bloco = el('div', 'mb-4 last:mb-0 p-3 bg-[#F7F2EC] rounded-xl border border-[#E7DDD3]/70');
            const linhaInfo = el('div', 'flex items-center justify-between text-sm mb-2');
            const titD = el('div', 'flex items-center gap-2');
            titD.append(
                el('span', 'font-semibold text-[#2A211C]', h.doenca),
                el('span', `text-[10px] px-2 py-0.5 rounded-full font-bold ${b.classe}`, `${pct}%`)
            );
            linhaInfo.append(titD, el('span', 'text-xs text-[#5F5148]', h.pilar || ''));

            const trackH = el('div', 'h-2 bg-[#EADFD3] rounded-full overflow-hidden');
            const fillH = el('div', 'h-full bg-[#C98A73] rounded-full');
            fillH.style.width = `${pct}%`;
            trackH.append(fillH);

            bloco.append(linhaInfo, trackH);
            cardOutras.append(bloco);
        }
        containerResultado.append(cardOutras);
    }

    // Histórico Sequencial Completo de Perguntas da Anamnese (Auditabilidade)
    if (estado.historico.length > 0) {
        const cardHistoricoSequencial = el('div', 'card-bio p-7');
        cardHistoricoSequencial.append(
            el('span', 'eyebrow block mb-1', 'AUDITORIA DA ANAMNESE'),
            el('h3', 'text-lg font-bold text-[#2A211C] m-0 mb-4', 'Histórico Sequencial de Perguntas Respondidas')
        );

        const tabela = el('div', 'flex flex-col gap-2');
        estado.historico.forEach((item, index) => {
            const linhaHist = el('div', 'p-3 bg-[#F7F2EC] rounded-xl border border-[#E7DDD3]/70 flex items-start justify-between gap-4');
            const esqHist = el('div', 'flex flex-col');
            esqHist.append(
                el('span', 'text-xs font-bold text-[#9A3F25]', `Pergunta ${index + 1}`),
                el('p', 'text-sm text-[#2A211C] font-medium m-0 mt-0.5', item.pergunta.texto)
            );
            const respPill = el(
                'span',
                'px-3 py-1 bg-white border border-[#E7DDD3] rounded-lg text-xs font-bold text-[#7E2F18] shrink-0 mt-1',
                item.opcao.rotulo
            );
            linhaHist.append(esqHist, respPill);
            tabela.append(linhaHist);
        });

        cardHistoricoSequencial.append(tabela);
        containerResultado.append(cardHistoricoSequencial);
    }

    // ====== B. Trilha Dedutiva de Inferência — Diagrama de Árvore de Decisão ======
    const cardSintra = el('div', 'card-bio p-7');
    cardSintra.append(
        el('span', 'eyebrow block mb-1', 'TRILHA DEDUTIVA DE INFERÊNCIA'),
        el('h3', 'text-lg font-bold text-[#2A211C] m-0 mb-1', 'Encadeamento de Regras'),
        el('p', 'text-xs text-[#5F5148] m-0 mb-5', 'Genealogia visual do raciocínio determinístico: sintomas avaliados interligados às regras disparadas e impacto acumulado.')
    );

    let temRegras = false;
    hipoteses.forEach((h, idx) => {
        const evidencias = h.explicacao || [];
        if (evidencias.length === 0) return;
        temRegras = true;

        const blocoDoenca = el('div', `mb-6 ${idx > 0 ? 'pt-6 border-t border-[#E7DDD3]' : ''}`);
        const pctH = Math.round((h.certeza || 0) * 100);
        
        const headerDoenca = el('div', 'flex items-center justify-between mb-4');
        headerDoenca.append(
            el('h4', 'text-sm font-bold text-[#7E2F18] m-0', h.doenca),
            el('span', 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F3E3DA] text-[#7E2F18]', `Certeza Final: ${pctH}%`)
        );
        blocoDoenca.append(headerDoenca);

        const containerArvore = el('div', 'arvore-container');

        evidencias.forEach((ev, rIdx) => {
            const doencaTag = (h.id || h.doenca || '').replace(/[\s/]+/g, '_').substring(0, 14).toUpperCase();
            const paramTag = (ev.parametro || '').toUpperCase();
            const ruleId = `R${String(rIdx + 1).padStart(2, '0')}_${doencaTag}_${paramTag}`;
            const ehReforco = ev.efeito === 'reforca';
            const cfResp = ev.cf_resposta ?? 0;
            const cfCrit = ev.cf_criterio ?? 0;
            const cfAntes = ev.cf_antes != null ? Math.round(ev.cf_antes * 100) : '?';
            const cfDepois = ev.cf_depois != null ? Math.round(ev.cf_depois * 100) : '?';
            const respLabel = cfResp > 0 ? 'Sim (Confirmado)' : cfResp === 0 ? 'Não sei (Neutro)' : 'Não (Ausente)';
            const deltaLabel = (cfCrit >= 0 ? '+' : '') + Math.round(cfCrit * 100) + '%';

            const cardRamo = el('div', 'arvore-ramo');
            const fluxo = el('div', 'arvore-fluxo');

            // 🟢 Nó 1: Raiz / Pergunta & Resposta do Usuário
            const noRaiz = el('div', 'arvore-no arvore-no--raiz');
            noRaiz.append(
                el('span', 'arvore-badge-meta', '🟢 Marcador Avaliado'),
                el('span', 'arvore-texto-principal', ev.parametro.replace(/_/g, ' ')),
                el('span', 'arvore-texto-sub', `Resposta: ${respLabel}`)
            );

            // ➔ Conector 1
            const conector1 = el('div', 'arvore-conector', '➔');

            // 🔶 Nó 2: Ramo / Regra Ativada (Motor)
            const noRegra = el('div', 'arvore-no arvore-no--regra');
            noRegra.append(
                el('span', 'arvore-badge-meta', `Regra [${ruleId}]`),
                el('span', 'arvore-texto-principal', `SE '${ev.parametro}'`),
                el('span', 'arvore-texto-sub', `Critério MYCIN: ${cfCrit >= 0 ? '+' : ''}${cfCrit.toFixed(2)}`)
            );

            // ➔ Conector 2
            const conector2 = el('div', 'arvore-conector', '➔');

            // 🔵 Nó 3: Folha / Impacto no Diagnóstico e Delta
            const folhaClasse = ehReforco ? 'arvore-no--folha-reforco' : 'arvore-no--folha-penalidade';
            const noFolha = el('div', `arvore-no ${folhaClasse}`);
            noFolha.append(
                el('span', 'arvore-badge-meta', ehReforco ? '📈 Impacto: Reforço' : '📉 Impacto: Atenuação'),
                el('span', 'arvore-texto-principal', `${h.doenca} (${deltaLabel})`),
                el('span', 'arvore-texto-sub', `Certeza: ${cfAntes}% ➔ ${cfDepois}%`)
            );

            fluxo.append(noRaiz, conector1, noRegra, conector2, noFolha);
            cardRamo.append(fluxo);
            containerArvore.append(cardRamo);
        });

        blocoDoenca.append(containerArvore);
        cardSintra.append(blocoDoenca);
    });

    if (temRegras) {
        containerResultado.append(cardSintra);
    }

    painelPrincipal.append(containerResultado);

    // Botões de Ação no Rodapé Lateral (Imprimir + Compartilhar WhatsApp + Nova Anamnese)
    acoesLateral.replaceChildren();

    // 1. Botão Imprimir / Salvar PDF
    const btnImprimir = el('button', 'btn-primario w-full text-base flex items-center justify-center gap-2 mb-2', 'Imprimir / Salvar PDF');
    btnImprimir.id = 'btn-imprimir';
    btnImprimir.type = 'button';
    btnImprimir.prepend(icone('imprimir', 'w-5 h-5 text-white', 'Imprimir'));
    btnImprimir.addEventListener('click', () => window.print());

    // 2. Botão Compartilhar via WhatsApp
    const textoWhatsApp = encodeURIComponent(
        `*LactaExpert — Triagem de Anamnese Bovina*\n\n` +
        `🐄 *Hipótese Principal:* ${top.doenca} (Indício Estimado: ${pctTop}%)\n` +
        `📋 *Classificação:* ${badgeTop.rotulo.replace(/🚨|⚠️|🟢/g, '').trim()}\n` +
        `🩺 *Conduta:* ${top.conduta || top.recomendacao}\n\n` +
        `_Triagem realizada com ${estado.historico.length} evidências clínicas via regras especializadas._`
    );
    const linkWhatsApp = el('a', 'btn-whatsapp w-full h-12 rounded-xl text-base font-semibold flex items-center justify-center gap-2 mb-2 text-decoration-none transition shadow-sm hover:opacity-95');
    linkWhatsApp.id = 'btn-whatsapp';
    linkWhatsApp.href = `https://api.whatsapp.com/send?text=${textoWhatsApp}`;
    linkWhatsApp.target = '_blank';
    linkWhatsApp.rel = 'noopener noreferrer';
    linkWhatsApp.append(icone('whatsapp', 'w-5 h-5 text-white', 'WhatsApp'), el('span', '', 'Compartilhar no WhatsApp'));

    // 3. Botão Nova Anamnese
    const btnNova = el('button', 'btn-secundario w-full text-base', 'Nova anamnese');
    btnNova.id = 'btn-reiniciar-resultado';
    btnNova.type = 'button';
    btnNova.addEventListener('click', iniciar);

    acoesLateral.append(btnImprimir, linkWhatsApp, btnNova);
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

navNovaAnamnese?.addEventListener('click', iniciar);

navHistorico?.addEventListener('click', () => {
    if (telaAnamnese.classList.contains('hidden')) {
        iniciar();
    } else {
        document.getElementById('painel-lateral')?.scrollIntoView({ behavior: 'smooth' });
    }
});

navBaseRegras?.addEventListener('click', () => {
    modalBaseRegras?.showModal();
});

btnAbrirComoFunciona?.addEventListener('click', () => {
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
