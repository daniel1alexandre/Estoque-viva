@echo off
title Estoque Diario Pro - Servidor
chcp 65001 > nul
echo ======================================================
echo    ESTOQUE DIÁRIO PRO - CONTROLE E CONFERÊNCIA
echo ======================================================
echo.
echo Iniciando o servidor backend e a aplicacao web...
echo.

REM Inicia o sistema
start "" http://localhost:5173
npm.cmd run dev

pause

