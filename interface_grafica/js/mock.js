/**
 * mock.js — Back-end SIMULADO, apenas para testar o front-end.
 *
 * Imita o comportamento que o sistema especialista em CLIPS terá:
 *   - cada resposta vira um "fato" (ex.: febre = sim);
 *   - a próxima pergunta depende dos fatos já conhecidos;
 *   - no fim, as "regras" de cada doença calculam um grau de certeza.
 *
 * ATENÇÃO: perguntas, regras e pesos são ILUSTRATIVOS e NÃO foram validados
 * por um médico veterinário. A base de conhecimento real ficará no CLIPS.
 */

// ---------------------------------------------------------------------------
// Configurações da simulação
// ---------------------------------------------------------------------------
const LATENCIA_MS = 400;     // atraso artificial, para ver o "carregando"
const TAXA_DE_ERRO = 0;      // ex.: 0.3 = 30% das chamadas falham (testa a tela de erro)
const CERTEZA_MINIMA = 0.5;  // diagnósticos abaixo disso não são exibidos

// ---------------------------------------------------------------------------
// Perguntas
// ---------------------------------------------------------------------------
const SIM_NAO = [
    { valor: 'sim', rotulo: 'Sim' },
    { valor: 'nao', rotulo: 'Não' },
];
const SIM_NAO_NAOSEI = [...SIM_NAO, { valor: 'nao_sei', rotulo: 'Não sei' }];

const PERGUNTAS = {
    febre: {
        texto: 'O animal está com febre?',
        ajuda: 'Temperatura retal acima de 39,5 °C.',
        resumo: 'Febre',
    },
    apetite: { texto: 'O animal apresenta perda de apetite?', resumo: 'Perda de apetite' },
    prostracao: { texto: 'O animal está prostrado (apático, isolado do rebanho)?', resumo: 'Prostração' },
    carrapatos: { texto: 'Há presença de carrapatos no animal ou no rebanho?', resumo: 'Carrapatos' },
    mucosas: {
        texto: 'As mucosas (olhos, gengiva, vulva) estão pálidas ou amareladas?',
        resumo: 'Mucosas pálidas/amareladas',
    },
    urina_escura: { texto: 'A urina está escura (cor de café ou avermelhada)?', resumo: 'Urina escura' },
    tosse: { texto: 'O animal está tossindo?', resumo: 'Tosse' },
    secrecao_nasal: { texto: 'Há secreção nasal?', resumo: 'Secreção nasal' },
    respiracao: {
        texto: 'A respiração está difícil ou acelerada?',
        resumo: 'Dificuldade respiratória',
    },
    feridas_boca: {
        texto: 'Há feridas ou bolhas (vesículas) na boca, língua ou entre os cascos?',
        resumo: 'Feridas na boca/cascos',
    },
    salivacao: { texto: 'O animal está babando (salivação excessiva)?', resumo: 'Salivação excessiva' },
    manqueira: { texto: 'O animal está mancando?', resumo: 'Manqueira' },
    lactacao: { texto: 'O animal é uma fêmea em lactação?', resumo: 'Em lactação', opcoes: SIM_NAO },
    ubere: { texto: 'O úbere está inchado, quente ou dolorido?', resumo: 'Úbere inflamado' },
    leite_alterado: {
        texto: 'O leite apresenta grumos, pus, sangue ou aspecto aguado?',
        resumo: 'Leite alterado',
    },
    abdomen_inchado: {
        texto: 'O abdômen está inchado, principalmente do lado esquerdo?',
        resumo: 'Abdômen inchado (esq.)',
    },
    desconforto: {
        texto: 'O animal demonstra dor abdominal (escoiceia a barriga, deita e levanta)?',
        resumo: 'Dor abdominal',
    },
    paralisia: {
        texto: 'O animal tem fraqueza muscular ou dificuldade para se levantar e andar?',
        resumo: 'Fraqueza/paralisia',
    },
    dificuldade_engolir: {
        texto: 'O animal tem dificuldade para mastigar ou engolir (língua para fora)?',
        resumo: 'Dificuldade de engolir',
    },
    emagrecimento: { texto: 'O animal está emagrecendo progressivamente?', resumo: 'Emagrecimento' },
    diarreia: { texto: 'O animal apresenta diarreia?', resumo: 'Diarreia' },
    pelos_arrepiados: { texto: 'Os pelos estão arrepiados e sem brilho?', resumo: 'Pelos arrepiados' },
};

// ---------------------------------------------------------------------------
// Fluxo de perguntas
// Ordem de prioridade + condição para a pergunta ser feita.
// No CLIPS isso vira regras do tipo: (febre sim) => (perguntar carrapatos)
// Obs.: "não sei" na febre faz o sistema seguir pelos dois ramos.
// ---------------------------------------------------------------------------
const temFebre = (f) => f.febre !== 'nao';
const semFebre = (f) => f.febre !== 'sim';
const sim = (f, id) => f[id] === 'sim';

const FLUXO = [
    { pergunta: 'febre' },
    { pergunta: 'apetite' },
    { pergunta: 'prostracao', quando: temFebre },
    { pergunta: 'carrapatos', quando: temFebre },
    { pergunta: 'mucosas', quando: temFebre },
    { pergunta: 'urina_escura', quando: (f) => sim(f, 'mucosas') || sim(f, 'carrapatos') },
    { pergunta: 'tosse', quando: temFebre },
    { pergunta: 'secrecao_nasal', quando: (f) => sim(f, 'tosse') },
    { pergunta: 'respiracao', quando: (f) => sim(f, 'tosse') },
    { pergunta: 'feridas_boca', quando: temFebre },
    { pergunta: 'salivacao', quando: (f) => sim(f, 'feridas_boca') },
    { pergunta: 'manqueira', quando: (f) => sim(f, 'feridas_boca') },
    { pergunta: 'lactacao' },
    { pergunta: 'ubere', quando: (f) => sim(f, 'lactacao') },
    { pergunta: 'leite_alterado', quando: (f) => sim(f, 'lactacao') },
    { pergunta: 'abdomen_inchado', quando: semFebre },
    { pergunta: 'desconforto', quando: (f) => sim(f, 'abdomen_inchado') },
    { pergunta: 'paralisia', quando: semFebre },
    { pergunta: 'dificuldade_engolir', quando: (f) => sim(f, 'paralisia') },
    { pergunta: 'emagrecimento', quando: semFebre },
    { pergunta: 'diarreia', quando: (f) => sim(f, 'emagrecimento') },
    { pergunta: 'pelos_arrepiados', quando: (f) => sim(f, 'emagrecimento') },
];

// ---------------------------------------------------------------------------
// "Regras" das doenças
// certeza = soma dos pesos das evidências presentes / soma de todos os pesos
// Se uma evidência "obrigatoria" não estiver presente, a doença é descartada.
// ---------------------------------------------------------------------------
const DOENCAS = [
    {
        id: 'tristeza_parasitaria',
        nome: 'Tristeza Parasitária Bovina',
        recomendacao:
            'Isolar o animal e chamar um médico veterinário para confirmar por esfregaço sanguíneo e definir o tratamento. Revisar o controle de carrapatos do rebanho.',
        evidencias: [
            { fato: 'febre', valor: 'sim', peso: 3, obrigatoria: true, texto: 'Febre' },
            { fato: 'mucosas', valor: 'sim', peso: 3, texto: 'Mucosas pálidas ou amareladas' },
            { fato: 'carrapatos', valor: 'sim', peso: 2, texto: 'Presença de carrapatos' },
            { fato: 'urina_escura', valor: 'sim', peso: 2, texto: 'Urina escura' },
            { fato: 'prostracao', valor: 'sim', peso: 1, texto: 'Prostração' },
            { fato: 'apetite', valor: 'sim', peso: 1, texto: 'Perda de apetite' },
        ],
    },
    {
        id: 'pneumonia',
        nome: 'Pneumonia (Doença Respiratória Bovina)',
        recomendacao:
            'Manter o animal em local arejado e sem correntes de ar, e consultar o veterinário para exame clínico e tratamento.',
        evidencias: [
            { fato: 'tosse', valor: 'sim', peso: 3, obrigatoria: true, texto: 'Tosse' },
            { fato: 'respiracao', valor: 'sim', peso: 3, texto: 'Dificuldade respiratória' },
            { fato: 'febre', valor: 'sim', peso: 2, texto: 'Febre' },
            { fato: 'secrecao_nasal', valor: 'sim', peso: 2, texto: 'Secreção nasal' },
            { fato: 'apetite', valor: 'sim', peso: 1, texto: 'Perda de apetite' },
        ],
    },
    {
        id: 'febre_aftosa',
        nome: 'Suspeita de Febre Aftosa',
        alerta:
            'Doença de notificação obrigatória. Não movimente animais da propriedade e comunique imediatamente o serviço veterinário oficial.',
        recomendacao: 'Isolar o animal e aguardar a orientação do serviço veterinário oficial.',
        evidencias: [
            { fato: 'feridas_boca', valor: 'sim', peso: 4, obrigatoria: true, texto: 'Feridas/vesículas na boca ou cascos' },
            { fato: 'febre', valor: 'sim', peso: 2, texto: 'Febre' },
            { fato: 'salivacao', valor: 'sim', peso: 2, texto: 'Salivação excessiva' },
            { fato: 'manqueira', valor: 'sim', peso: 2, texto: 'Manqueira' },
        ],
    },
    {
        id: 'mastite',
        nome: 'Mastite Clínica',
        recomendacao:
            'Fazer o teste da caneca de fundo escuro e o CMT, descartar o leite do quarto afetado e consultar o veterinário sobre o tratamento.',
        evidencias: [
            { fato: 'leite_alterado', valor: 'sim', peso: 4, obrigatoria: true, texto: 'Leite com alterações' },
            { fato: 'ubere', valor: 'sim', peso: 3, texto: 'Úbere inchado, quente ou dolorido' },
            { fato: 'febre', valor: 'sim', peso: 1, texto: 'Febre' },
        ],
    },
    {
        id: 'timpanismo',
        nome: 'Timpanismo (empanzinamento)',
        alerta: 'Emergência: pode evoluir rapidamente e levar à morte. Chame o veterinário imediatamente.',
        recomendacao: 'Retirar o animal do pasto ou alimento suspeito e mantê-lo em pé e em movimento até o atendimento.',
        evidencias: [
            { fato: 'abdomen_inchado', valor: 'sim', peso: 4, obrigatoria: true, texto: 'Abdômen inchado do lado esquerdo' },
            { fato: 'desconforto', valor: 'sim', peso: 2, texto: 'Sinais de dor abdominal' },
            { fato: 'apetite', valor: 'sim', peso: 1, texto: 'Perda de apetite' },
        ],
    },
    {
        id: 'botulismo',
        nome: 'Botulismo',
        recomendacao:
            'Chamar o veterinário com urgência. Verificar a qualidade da água, da silagem/ração e a presença de ossos ou carcaças no pasto.',
        evidencias: [
            { fato: 'paralisia', valor: 'sim', peso: 4, obrigatoria: true, texto: 'Fraqueza muscular / paralisia' },
            { fato: 'dificuldade_engolir', valor: 'sim', peso: 3, texto: 'Dificuldade de mastigar ou engolir' },
            { fato: 'febre', valor: 'nao', peso: 1, texto: 'Ausência de febre' },
        ],
    },
    {
        id: 'verminose',
        nome: 'Verminose',
        recomendacao:
            'Coletar fezes para exame (OPG) e consultar o veterinário sobre o vermífugo adequado e o manejo das pastagens.',
        evidencias: [
            { fato: 'emagrecimento', valor: 'sim', peso: 3, obrigatoria: true, texto: 'Emagrecimento progressivo' },
            { fato: 'diarreia', valor: 'sim', peso: 2, texto: 'Diarreia' },
            { fato: 'pelos_arrepiados', valor: 'sim', peso: 1, texto: 'Pelos arrepiados e sem brilho' },
            { fato: 'febre', valor: 'nao', peso: 1, texto: 'Ausência de febre' },
        ],
    },
];

// ---------------------------------------------------------------------------
// "Motor" simulado
// ---------------------------------------------------------------------------
const sessoes = new Map(); // id da sessão -> { fatos, pendente }

function gerarId() {
    return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

function montarPergunta(id) {
    const { texto, ajuda, resumo, opcoes = SIM_NAO_NAOSEI } = PERGUNTAS[id];
    return { id, texto, ajuda, resumo, opcoes };
}

function calcularDiagnosticos(fatos) {
    return DOENCAS.map((doenca) => {
        const presente = (e) => fatos[e.fato] === e.valor;
        const descartada = doenca.evidencias.some((e) => e.obrigatoria && !presente(e));
        const atendidas = doenca.evidencias.filter(presente);
        const total = doenca.evidencias.reduce((soma, e) => soma + e.peso, 0);
        const pontos = atendidas.reduce((soma, e) => soma + e.peso, 0);
        return { doenca, atendidas, certeza: descartada ? 0 : pontos / total };
    })
        .filter((r) => r.certeza >= CERTEZA_MINIMA)
        .sort((a, b) => b.certeza - a.certeza)
        .map(({ doenca, atendidas, certeza }) => ({
            id: doenca.id,
            doenca: doenca.nome,
            certeza: Math.round(certeza * 100) / 100,
            justificativa: atendidas.map((e) => e.texto),
            recomendacao: doenca.recomendacao,
            alerta: doenca.alerta,
        }));
}

function proximoPasso(idSessao) {
    const sessao = sessoes.get(idSessao);
    const proxima = FLUXO.find(
        (regra) => !(regra.pergunta in sessao.fatos) && (!regra.quando || regra.quando(sessao.fatos))
    );

    if (proxima) {
        sessao.pendente = proxima.pergunta;
        return { sessao: idSessao, tipo: 'pergunta', pergunta: montarPergunta(proxima.pergunta) };
    }

    sessao.pendente = null;
    const diagnosticos = calcularDiagnosticos(sessao.fatos);
    return {
        sessao: idSessao,
        tipo: 'diagnostico',
        diagnosticos,
        mensagem:
            diagnosticos.length === 0
                ? 'Nenhuma doença da base de conhecimento atingiu a certeza mínima. Recomenda-se avaliação presencial por um médico veterinário.'
                : undefined,
    };
}

/** Simula a ida e volta pela rede: atraso, falhas aleatórias e cópia via JSON. */
async function simularRede(gerarResposta) {
    await new Promise((resolver) => setTimeout(resolver, LATENCIA_MS));
    if (Math.random() < TAXA_DE_ERRO) {
        throw new Error('Falha simulada de conexão (mock).');
    }
    return JSON.parse(JSON.stringify(gerarResposta()));
}

// ---------------------------------------------------------------------------
// Mesma interface que o back-end real terá (ver API.md)
// ---------------------------------------------------------------------------

/** Equivale a: POST /api/anamnese */
export function iniciarAnamnese() {
    return simularRede(() => {
        const id = gerarId();
        sessoes.set(id, { fatos: {}, pendente: null });
        return proximoPasso(id);
    });
}

/** Equivale a: POST /api/anamnese/{sessao}/resposta  com corpo { id, valor } */
export function enviarResposta(idSessao, idPergunta, valor) {
    return simularRede(() => {
        const sessao = sessoes.get(idSessao);
        if (!sessao) throw new Error('Sessão não encontrada (404).');
        if (sessao.pendente !== idPergunta) throw new Error(`Pergunta inesperada: "${idPergunta}" (400).`);

        const valido = montarPergunta(idPergunta).opcoes.some((op) => op.valor === valor);
        if (!valido) throw new Error(`Valor inválido para "${idPergunta}": "${valor}" (400).`);

        sessao.fatos[idPergunta] = valor; // no CLIPS: (assert (resposta febre sim))
        return proximoPasso(idSessao);
    });
}
