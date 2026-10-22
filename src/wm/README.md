# Camada 4: Memória de Trabalho (Working Memory - WM)

## Responsabilidades:
- Manter o estado volátil da sessão em execução em memória RAM.
- Registrar os fatos primitivos informados pelo usuário (ex.: `(sintoma febre sim)`, `(escore 3.0)`).
- Registrar os fatos derivados produzidos pelas regras durante o disparo (*assert*).
- Reiniciar o estado a cada novo atendimento (RF01: Gestão de Sessão).
