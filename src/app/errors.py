"""
Exceções de domínio da camada de aplicação.

São independentes de HTTP: a Camada 1 (UI) é quem as traduz para códigos de
status (404, 422...). Isso mantém o controlador reutilizável em outras
interfaces (CLI, TUI, testes).
"""


class AppError(Exception):
    """Base das exceções de aplicação."""

    def __init__(self, mensagem: str):
        self.mensagem = mensagem
        super().__init__(mensagem)


class SessaoNaoEncontrada(AppError):
    """O ``session_id`` não existe no banco nem na memória de trabalho."""


class EntradaInvalida(AppError):
    """Entrada sintaticamente válida, mas semanticamente inválida para a KB."""
