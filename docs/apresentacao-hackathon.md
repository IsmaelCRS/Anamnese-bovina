# Hackathon UFJF 2026
## XXVIII Semana da Computação DCC/UFJF & RERUM Engenharia de Sistemas
### Tema: Uso da IA em Benefício da Pecuária Leiteira — Desenvolvimento de Sistemas Especialistas com Vibe Coding

---

## 1. Visão Geral do Evento
* **Realização:** RERUM Engenharia de Sistemas em parceria com o Departamento de Ciência da Computação (DCC/UFJF).
* **Propósito:** Identificação e seleção de talentos universitários para **estágio e contratação**, avaliando a capacidade de proferir soluções tecnológicas estruturadas em curto espaço de tempo.
* **Proposta:** Utilizar Agentes de IA (*Codex, Claude Code, Copilot, Gemini Code Assist, Opencode, AntiGravity*, etc.) como tecnologia para análise, planejamento e apoio ao desenvolvimento de **Sistemas Especialistas com motor de inferência determinístico**.

---

## 2. Regulamento e Diretrizes Principais

1. **Formação dos Grupos:** 1 a 3 participantes (alunos inscritos e presentes).
2. **Escolha dos Temas:** Livre escolha entre os 3 temas propostos.
3. **Uso Mandatório de IA e Open Source:** O desenvolvimento deve ser obrigatoriamente apoiado por agentes de IA e utilizar tecnologias/códigos *open source*.
4. **Regra de Ouro (Proibição de LLM no Diagnóstico):** **Não use a LLM como o sistema especialista.** A IA ajuda a construir, analisar e extrair regras; a tomada de decisão final **deve vir de uma base explícita de conhecimento com um motor de inferência** — determinístico e auditável.
5. **Critérios de Avaliação (Nota de 1 a 10):**
   - Potencial real da solução resolver o problema.
   - Complexidade e grau de assertividade.
   - Habilidade no uso de agentes de codificação com IA.
   - Trabalho em equipe, liderança e controle emocional.
6. **Execução em Localhost:** O sistema final e sua demonstração devem rodar **100% em LOCALHOST**.

---

## 3. Cronograma Oficial

* **20/10 (Terça-feira) — 09:00:** Início do Hackathon e Apresentação dos Temas.
* **22/10 (Quinta-feira) — Até 20:00:** Término do desenvolvimento e envio da documentação, apresentação e código-fonte.
* **23/10 (Sexta-feira) — 09:00:** Apresentação e Demonstração dos Protótipos ao vivo em Localhost.
* **Resultado Final:** Divulgado na festa de encerramento da Semana da Computação.

---

## 4. Premiação (Por Grupo)

* 🥇 **1º Lugar:** R$ 1.500,00
* 🥈 **2º Lugar:** R$ 900,00
* 🥉 **3º Lugar:** R$ 600,00

---

## 5. Temas Propostos (Escolha de 1 Tema)

| Código | Tema | Aplicação Esperada |
| :---: | :--- | :--- |
| **T1** | **Anamnese** | Coleta estruturada de sinais e histórico de bovinos leiteiros em lactação, com triagem explicável e tratamento de incerteza. |
| **T2** | **Dietas** | Formulação e verificação de dietas para bovinos leiteiros conforme raça, peso médio por lote, idade, estado produtivo, destinação e produção. |
| **T3** | **Economia** | Análise econômica e financeira integrando dados zootécnicos e custos de insumos na propriedade. |

---

## 6. Modelo Conceitual do Sistema Especialista Exigido

1. **Interface do Usuário (UI):** Exibe perguntas, coleta respostas e apresenta o parecer final.
2. **Módulo de Explicação:** Responde *por quê?* e *como?* a partir do traço de regras disparadas.
3. **Base de Conhecimento (KB):** Guardas as regras, variáveis e pesos (CF) de forma declarativa e versionada.
4. **Motor de Inferência (ENGINE):** Casa regras com fatos da sessão, resolve conflito (saliência) e dispara as conclusões.
5. **Memória de Trabalho (WM):** Armazena em RAM os fatos e respostas da sessão atual.
6. **Fontes de Dados / Banco de Dados (DB):** Persistência relacional em disco para cadastros e histórico.

---

## 7. Informações de Suporte e Entrega

* **Suporte Técnico RERUM:** Carlos Lima
  - WhatsApp: `11 9.8323-9910`
  - E-mail: `carlos.lima@rerum.com.br`
* **Entrega do Projeto:** Enviar código-fonte, apresentação e documentação identificando todos os membros do grupo até Quinta-feira (22/10) às 20:00h.
