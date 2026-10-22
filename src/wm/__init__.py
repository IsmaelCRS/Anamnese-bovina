"""
Camada 4: Memória de Trabalho (Working Memory - WM)
Responsabilidade: Armazenamento volátil em memória RAM dos fatos ativos,
sintomas coletados na sessão corrente e conclusões intermediárias geradas pelo motor.
"""

from src.wm.memory import FatoResposta, WorkingMemory, WorkingMemoryStore

__all__ = ["FatoResposta", "WorkingMemory", "WorkingMemoryStore"]
