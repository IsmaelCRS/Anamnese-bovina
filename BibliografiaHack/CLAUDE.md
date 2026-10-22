# Diretrizes do Projeto: LactaExpert — Sistema Especialista de Anamnese Bovina

**Hackathon UFJF 2026 — XXVIII Semana da Computação DCC/UFJF & RERUM**  
**Tema T1:** Anamnese e Triagem Animal (Pecuária Leiteira em Lactação)  
**Ambiente:** 100% Localhost (`http://localhost:8080`)

---

## 1. Regra de Ouro do Evento
> **ATENÇÃO:** Modelos de Linguagem (LLMs) **NÃO TOMAM DECISÕES DIAGNÓSTICAS EM TEMPO DE EXECUÇÃO**.  
> O diagnóstico clínico e a triagem são gerados **exclusivamente de forma determinística e auditável** pelo Motor de Inferência (`src/engine/`) a partir das regras formais da Base de Conhecimento (`src/kb/`). Agentes de IA auxiliam exclusivamente na arquitetura, geração de código, testes e documentação.

---

## 2. Arquitetura Desacoplada em 5 Camadas

O código-fonte reside em `src/` e segue rigorosamente o desacoplamento de responsabilidades:

```
src/
├── ui/         # Camada 1: Interface do Usuário (Telas, componentes visuais, diálogo e laudos)
├── app/        # Camada 2: Aplicação, Validação de Inputs e Controladores (PR + CTRL)
├── engine/     # Camada 3: Motor de Inferência (Forward Chaining, Saliência e Cálculo de CF MYCIN)
├── wm/         # Camada 4: Memória de Trabalho temporária em RAM (Working Memory)
├── kb/         # Camada 5a: Base de Conhecimento declarativa (Regras em JSON ou CLIPS .clp)
├── db/         # Camada 5b: Persistência local SQLite (Histórico de atendimentos e cadastros)
└── main.py     # Ponto de entrada do servidor web (FastAPI/Uvicorn rodando na porta 8080)
```

### Detalhamento das Camadas:
1. **`src/ui/` (Interface):** Responsável apenas por renderizar formulários, coletar respostas e exibir o laudo explicativo (Por quê? e Como?). Não valida dados e não acessa o banco diretamente.
2. **`src/app/` (Aplicação e Orquestração):**
   - **Validador (PR):** Sanitização e verificação de limites fisiológicos (ex.: temperatura entre 35,0 °C e 43,0 °C).
   - **Controlador (CTRL):** Gerencia o ciclo de vida da sessão de anamnese, injeta fatos na WM, aciona o ENGINE e persiste o histórico no DB.
3. **`src/engine/` (Motor de Inferência):**
   - Encadeamento para frente (*Forward Chaining*) com ciclo *Match-Resolve-Act*.
   - Tratamento de incerteza pelo modelo clássico **MYCIN**:
     $$CF_{\text{acumulado}} = CF_1 + CF_2 \cdot (1 - CF_1)$$
   - Resolução de conflito por hierarquia de saliência clínica (100 Emergência a 1 Resumo).
4. **`src/wm/` (Memória de Trabalho - RAM):** Armazena fatos primitivos e inferências derivadas da sessão atual. Reiniciada a cada nova consulta.
5. **`src/kb/` (Base de Conhecimento):** Arquivos declarativos de regras (`.clp` ou `.json`) contendo premissas, ações e Fatores de Certeza.
6. **`src/db/` (Banco de Dados):** SQLite local (`dados.db`) para persistência relacional de fichas cadastrais e histórico de laudos.

---

## 3. Comandos Úteis

### Inicialização Rápida com Docker (Porta 8080)
- **Windows:** Duplo-clique em `executar.bat`
- **Linux/Mac:** `./executar.sh`
- **Terminal:**
  ```bash
  docker compose up --build -d
  ```
- **Parar containers:**
  ```bash
  docker compose down
  ```

### Execução Local (sem Docker)
```bash
python -m venv venv
# Windows: venv\Scripts\activate | Linux: source venv/bin/activate
pip install -r requirements.txt
python src/main.py
```

### Execução de Testes Automatizados
```bash
pytest tests/ -v
```

---

## 4. Endpoints Principais
- `GET /` -> Status do sistema (`{"status": "online", "sistema": "...", "ambiente": "localhost:8080"}`)
- `GET /health` -> Status de saúde e verificação das 5 camadas
- `GET /docs` -> Documentação interativa Swagger/OpenAPI
