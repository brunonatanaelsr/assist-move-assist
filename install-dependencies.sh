#!/bin/bash

# Instalar dependências do backend
echo "Instalando dependências do backend..."
cd backend
npm install --save typeorm reflect-metadata pg class-validator express cors dotenv
npm install --save-dev @types/node @types/express @types/cors typescript ts-node-dev

# Instalar dependências do frontend
echo "Instalando dependências do frontend..."
cd ../frontend
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled
npm install @reduxjs/toolkit react-redux axios formik yup react-router-dom
npm install --save-dev @types/react-redux @types/react-router-dom typescript

# Voltar para a raiz do projeto
cd ..
