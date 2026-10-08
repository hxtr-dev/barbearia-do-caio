@echo off
rem Abre o site da Barbearia do Caio em http://localhost:8001
rem Serve SOMENTE a pasta deste arquivo e SOMENTE para este computador.
cd /d "%~dp0"
start "" http://localhost:8001
python -m http.server 8001 --bind 127.0.0.1 --directory "%~dp0."
