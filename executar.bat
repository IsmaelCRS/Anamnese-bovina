@echo off
chcp 65001 > nul
echo ===============================================================================
echo   LactaExpert - Sistema Especialista de Anamnese Bovina (Hackathon UFJF 2026)
echo ===============================================================================
echo.
echo [1/2] Construindo e subindo containers via Docker Compose...
docker compose up --build -d

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===============================================================================
    echo   [SUCESSO] Sistema Especialista rodando com sucesso em localhost!
    echo.
    echo   - Acesso Principal:         http://localhost:8080
    echo   - Documentacao da API:       http://localhost:8080/docs
    echo   - Container Docker:          sistema_anamnese_local
    echo.
    echo   Para parar o container, execute: docker compose down
    echo ===============================================================================
) else (
    echo.
    echo [ERRO] Ocorreu uma falha ao executar o Docker Compose.
    echo Verifique se o servico do Docker Desktop esta aberto e ativo na maquina.
)

echo.
pause
