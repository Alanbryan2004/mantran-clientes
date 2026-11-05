@echo off
title Servico Mantran - Sincronizacao SQL Server para Supabase
color 0A
echo ========================================================
echo  MANTRAN CLIENTES - SERVICO DE SINCRONIZACAO SHOPEE
echo ========================================================
echo.
echo Conectando a porta 3333...
node scripts\servidor_sincronizacao.mjs
pause
