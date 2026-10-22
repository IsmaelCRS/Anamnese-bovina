# LactaExpert
## Sistema Especialista para Anamnese e Triagem Explicável de Bovinos Leiteiros em Lactação

**Evento:** Hackathon UFJF 2026 — XXVIII Semana da Computação DCC/UFJF  
**Tema:** T1 — Anamnese  
**Instituição:** Universidade Federal de Juiz de Fora (UFJF)  
**Data:** Outubro de 2026  

---

## Sumário
1. [Nome, Propósito e Escopo do Software](#1-nome-propósito-e-escopo-do-software)
2. [Identificação dos Tipos de Usuários](#2-identificação-dos-tipos-de-usuários)
3. [Requisitos Funcionais](#3-requisitos-funcionais)
4. [Diagrama de Casos de Uso](#4-diagrama-de-casos-de-uso)
5. [Arquitetura de Software](#5-arquitetura-de-software)
   - 5.1 [Visão Geral das Camadas e Pacotes](#51-visão-geral-das-camadas-e-pacotes)
   - 5.2 [Detalhamento dos Pacotes e Responsabilidades](#52-detalhamento-dos-pacotes-e-responsabilidades)
6. [Base de Conhecimento e Regras de Produção](#6-base-de-conhecimento-e-regras-de-produção)
7. [Motor de Inferência](#7-motor-de-inferência)
8. [Verificação e Validação](#8-verificação-e-validação)
9. [Execução em Localhost](#9-execução-em-localhost)
10. [Considerações Finais](#10-considerações-finais)
11. [Referências](#11-referências)

---

## 1. Nome, Propósito e Escopo do Software

* **Nome:** LactaExpert
* **Propósito:** Apoiar o produtor rural e o médico-veterinário na coleta estruturada de sinais clínicos e do histórico de bovinos leiteiros em lactação (anamnese) e na triagem das possíveis causas do problema, por meio de uma base de conhecimento explícita de regras de produção e de um motor de inferência determinístico, de modo que cada conclusão seja acompanhada de uma explicação auditável (por quê? e como?).
* **Escopo do Sistema:** Aplicação monolítica que roda integralmente em `localhost`. O usuário informa os dados do animal e responde a um diálogo interativo conduzido pelo motor de inferência. A cada resposta, os fatos são inseridos na Memória de Trabalho (RAM) e as regras de produção da Base de Conhecimento são avaliadas por encadeamento para frente (*Forward Chaining*), com tratamento de incerteza por Fatores de Certeza (CF - modelo MYCIN). Ao final, o sistema apresenta as hipóteses diagnósticas ranqueadas por probabilidade/confiança, o grau de urgência, a conduta recomendada e o traço de regras disparadas, salvando o atendimento no histórico do banco de dados local.
* **Fora do Escopo:** O sistema **não prescreve medicamentos nem dosagens**. Agentes de IA (LLMs) foram utilizados exclusivamente para apoiar a construção (análise, planejamento, extração de regras e geração de código), mas **não participam da tomada de decisão em tempo de execução**: quem decide é a base de conhecimento com o motor de inferência, garantindo determinismo e auditabilidade.

---

## 2. Identificação dos Tipos de Usuários

* **Produtor / Operador de Fazenda / Veterinário:** Usuário final que realiza a anamnese do animal. Registra os dados cadastrais do bovino, responde às perguntas da triagem clínica, consulta o parecer final com o grau de incerteza (CF), analisa a explicação sintomática e acessa o histórico dos atendimentos passados.

---

## 3. Requisitos Funcionais

| ID | Categoria | Descrição |
| :--- | :--- | :--- |
| **RF01** | Gestão de Sessão | O sistema deve permitir iniciar uma nova anamnese, reiniciando a memória de trabalho com os dados do novo atendimento. |
| **RF02** | Interação | O sistema deve permitir que o usuário responda a perguntas de múltipla escolha sobre os sinais clínicos e histórico do animal. |
| **RF03** | Interação | O sistema deve permitir que o usuário informe o grau de confiabilidade (Fator de Certeza - CF) de suas respostas. |
| **RF04** | Interação | O sistema deve tratar a opção de resposta "Não Sei", mantendo o encadeamento do motor de inferência sem interrupções. |
| **RF05** | Memória de Trabalho | O sistema deve atualizar a memória de trabalho com os fatos fornecidos pelo usuário e com as conclusões intermediárias deduzidas. |
| **RF06** | Base de Regras | O sistema deve carregar e consultar a base de regras de produção explícita para avaliação das condições clínicas. |
| **RF07** | Motor de Inferência | O sistema deve acionar o motor de inferência determinístico para relacionar os fatos da memória de trabalho às regras de produção. |
| **RF08** | Inferência | O sistema deve calcular e acumular os Fatores de Certeza (CF) das hipóteses diagnósticas avaliadas a cada fato inserido. |
| **RF09** | Exibição | O sistema deve apresentar na interface o diagnóstico/parecer final ordenado pelo Fator de Certeza (probabilidade). |
| **RF10** | Explicabilidade | O sistema deve disponibilizar o traço de inferência no módulo de explicação, detalhando visualmente como e por que o diagnóstico foi alcançado. |
| **RF11** | Relatório | O sistema deve permitir a geração e impressão/exportação de um relatório detalhado com o laudo do atendimento e o histórico de regras ativadas. |

---

## 4. Diagrama de Casos de Uso

* **Ator Principal:** Usuário Final (Produtor / Veterinário)
* **Casos de Uso Principais:**
  - `Iniciar Nova Anamnese`
  - `Responder Perguntas (Múltipla Escolha)` *(inclui Informar Confiabilidade CF e Atualizar Memória de Trabalho)*
  - `Visualizar Diagnóstico / Parecer Final` *(aciona Motor de Inferência e consulta Base de Regras)*
  - `Visualizar Explicação (Como e Por quê)` *(estende Visualizar Diagnóstico)*
  - `Gerar e Imprimir Relatório`

---

## 5. Arquitetura de Software

### 5.1 Visão Geral das Camadas e Pacotes
A arquitetura organiza-se em uma aplicação de execução local (`localhost`) estruturada em **5 pacotes independentes** para garantir o desacoplamento estrito de responsabilidades:

1. **Pacote 1: Camada de Interface (UI)** — Renderização visual e captura de eventos.
2. **Pacote 2: Camada de Aplicação e Orquestração (PR + CTRL)** — Validação sintática e gerenciamento da sessão.
3. **Pacote 3: Núcleo do Motor de Inferência (ENGINE)** — Algoritmo de raciocínio dedutivo e resolução de conflitos.
4. **Pacote 4: Memória de Trabalho (WM)** — Estado temporário e volátil em memória RAM.
5. **Pacote 5: Camada de Conhecimento e Dados (KB + DB)** — Base de regras declarativa e banco de dados relacional SQLite.

### 5.2 Detalhamento dos Pacotes e Responsabilidades

* **5.2.1 Pacote 1 (UI):** Responsável por exibir formulários, capturar cliques e renderizar laudos. *Não valida dados nem consulta o banco.*
* **5.2.2 Pacote 2 (PR + CTRL):** 
  - **PR (Validação):** Sanitiza entradas (ex.: valida se a temperatura está entre 35,0 °C e 43,0 °C).
  - **CTRL (Controlador):** Gerencia a sessão de atendimento, carrega dados do animal do banco e coordena o fluxo entre UI, WM e ENGINE.
* **5.2.3 Pacote 3 (ENGINE):** Executa o ciclo *Match-Resolve-Act* por encadeamento para frente (*Forward Chaining*), aplicando busca heurística por saliência/prioridade para definir a ordem das perguntas e acumular o CF MYCIN.
* **5.2.4 Pacote 4 (WM):** Armazena em RAM os fatos brutos informados e as deduções intermediárias da sessão atual.
* **5.2.5 Pacote 5 (KB + DB):**
  - **KB:** Arquivo declarativo JSON ou CLIPS com as regras no formato `SE ... ENTÃO`.
  - **DB:** Banco de dados relacional SQLite (`dados.db`) para registro permanente de cadastros e histórico.

---

## 6. Base de Conhecimento e Regras de Produção
Mapeia o conhecimento de sanidade em bovinos leiteiros dividido em 3 pilares estratégicos:
1. **Afecções da Glândula Mamária:** Mastite Clínica Aguda e Mastite Subclínica.
2. **Distúrbios Metabólicos do Periparto:** Hipocalcemia (Febre do Leite), Cetose (Acetonemia) e Acidose Ruminal.
3. **Enfermidades Infecciosas / Parasitárias:** Tristeza Parasitária Bovina (TPB - Anaplasmose / Babesiose).

---

## 7. Motor de Inferência
Utiliza busca em profundidade guiada por prioridade (*Salience*), encadeamento para frente e cálculo de combinação de evidências independentes do modelo MYCIN:
$$CF_{\text{acumulado}} = CF_1 + CF_2 \cdot (1 - CF_1)$$

---

## 8. Verificação e Validação
Validação do motor com cenários de testes clínicos automatizados (`pytest`) cobrindo casos confirmatórios e casos com respostas incompletas ("Não Sei").

---

## 9. Execução em Localhost
Aplicação empacotada via Docker Container (`Dockerfile` + `docker-compose.yml`) com porta `8080` exposta, rodando 100% offline e sem dependências externas de APIs.

---

## 10. Considerações Finais
Demonstração da viabilidade de alinhar a agilidade de desenvolvimento com agentes de IA (*Vibe Coding*) a uma arquitetura rigorosa, auditável e determinística baseada em sistemas especialistas clássicos.

---

## 11. Referências
1. GIARRATANO, J.; RILEY, G. *Expert Systems: Principles and Programming*. 4. ed. Boston: Thomson, 2005.
2. BUCHANAN, B. G.; SHORTLIFFE, E. H. *Rule-Based Expert Systems: The MYCIN Experiments of the Stanford Heuristic Programming Project*. Reading: Addison-Wesley, 1984.
3. RADOSTITS, O. M. et al. *Veterinary Medicine: A Textbook of the Diseases of Cattle, Horses, Sheep, Pigs and Goats*. 10. ed. Saunders, 2007.
4. EMBRAPA GADO DE LEITE. *Publicações Técnicas e Manuais de Sanidade Bovino-Leiteira*. Juiz de Fora, MG.
