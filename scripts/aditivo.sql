-- Script para criar o campo possui_aditivo na tabela clientes
ALTER TABLE clientes ADD COLUMN possui_aditivo BOOLEAN DEFAULT false;
