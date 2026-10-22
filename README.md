# LactaExpert — Sistema Especialista em Pecuária Leiteira

**Hackathon UFJF 2026 — XXVIII Semana da Computação DCC/UFJF & RERUM**  
**Tema T1:** Anamnese e Triagem Animal  
**Ambiente:** 100% Localhost na porta 8080 (`http://localhost:8080`)

---

## 📖 Documentação Completa da Arquitetura
Consulte o arquivo detalhado: **[ARQUITETURA_E_FLUXO.md](file:///c:/Users/joaom/Anamnese-bovina/ARQUITETURA_E_FLUXO.md)** para visualizar:
- Diagramas visuais da arquitetura em 5 camadas (Mermaid);
- Ciclo de vida completo e diagrama de sequência de uma consulta clínica;
- Relacionamento entre containers, volumes locais e persistência de dados;
- Responsabilidades estritas de cada camada do sistema.

---

## 🚀 Como Executar

### 1. Inicialização em 1 Clique (Docker)
- **Windows:** Duplo-clique em `executar.bat`
- **Linux / macOS:**
  ```bash
  chmod +x executar.sh
  ./executar.sh
  ```
- **Ou via Terminal:**
  ```bash
  docker compose up --build -d
  ```

### 2. Acessos
- **Aplicação:** [http://localhost:8080](http://localhost:8080)
- **Documentação da API (Swagger):** [http://localhost:8080/docs](http://localhost:8080/docs)
- **Health Check da Arquitetura:** [http://localhost:8080/health](http://localhost:8080/health)

### 3. Rodar Testes
```bash
pytest tests/ -v
```

---

## 🏛️ Estrutura Resumida das Camadas
- **`src/ui/`** — Camada 1: Interface do Usuário (Telas e Laudo Explicável)
- **`src/app/`** — Camada 2: Validação de Inputs e Controladores de Sessão (PR + CTRL)
- **`src/engine/`** — Camada 3: Motor de Inferência determinístico com Fatores de Certeza (MYCIN)
- **`src/wm/`** — Camada 4: Memória de Trabalho temporária em RAM (Working Memory)
- **`src/kb/`** — Camada 5a: Base de Conhecimento declarativa (Regras CLIPS / JSON montadas via volume)
- **`src/db/`** — Camada 5b: Banco de Dados SQLite local (`dados.db` montado via volume)
- **`docs/`** — Documentos e especificações clínicas do projeto
- **`tests/`** — Suíte de testes automatizados com pytest
