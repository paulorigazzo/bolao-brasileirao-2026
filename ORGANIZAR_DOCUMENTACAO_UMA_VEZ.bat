@echo off
setlocal
cd /d "%~dp0"

echo Organizando documentos antigos da raiz...
if not exist "docs\archive" mkdir "docs\archive"

for %%F in (ATUALIZACAO_*.txt) do (
  if exist "%%F" move /Y "%%F" "docs\archive\" >nul
)

if exist "LEIA-ME-DEPLOY-NETLIFY.txt" move /Y "LEIA-ME-DEPLOY-NETLIFY.txt" "docs\archive\" >nul
if exist "PROJECT_WORKFLOW.md" move /Y "PROJECT_WORKFLOW.md" "docs\archive\" >nul

echo.
echo Documentacao organizada com sucesso.
echo Os arquivos vivos permanecem na raiz e em docs\.
pause
