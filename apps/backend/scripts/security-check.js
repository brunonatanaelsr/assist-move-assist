#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Configurações
const SECRETS_PATTERNS = [
  /(password|passwd|pwd|secret|key|token|auth).*[=:].*['"][^'"]+['"]/, // Senhas e tokens
  /(\w+:\/\/)[^@]+@/, // URLs com credenciais
  /-----BEGIN [A-Z ]+ PRIVATE KEY-----/, // Chaves privadas
  /[A-Za-z0-9+/]{40,}/, // Possíveis tokens/hashes
];

const EXCLUDED_DIRS = [
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.git',
];

const EXCLUDED_FILES = [
  '.env.example',
  'package-lock.json',
  'yarn.lock',
];

// Cores para output
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  reset: '\x1b[0m',
};

function log(message, color = colors.reset) {
  console.log(color + message + colors.reset);
}

// Verifica se um arquivo deve ser analisado
function shouldScanFile(filePath) {
  const basename = path.basename(filePath);
  if (EXCLUDED_FILES.includes(basename)) return false;
  
  const relativePath = path.relative(process.cwd(), filePath);
  return !EXCLUDED_DIRS.some(dir => relativePath.includes(dir));
}

// Verifica um arquivo em busca de secrets
function scanFile(filePath) {
  const issues = [];
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    SECRETS_PATTERNS.forEach(pattern => {
      if (pattern.test(line)) {
        issues.push({
          file: filePath,
          line: index + 1,
          content: line.trim(),
          type: 'secret',
        });
      }
    });
  });

  return issues;
}

// Verifica permissões de arquivos
function checkFilePermissions(filePath) {
  const issues = [];
  const stats = fs.statSync(filePath);
  const mode = stats.mode & 0o777;

  if ((mode & 0o777) === 0o777) {
    issues.push({
      file: filePath,
      type: 'permission',
      message: `Permissões muito abertas: ${mode.toString(8)}`,
    });
  }

  return issues;
}

// Função principal de verificação
function runSecurityCheck() {
  let allIssues = [];

  // Verifica se .env está no .gitignore
  try {
    const gitignore = fs.readFileSync('.gitignore', 'utf8');
    if (!gitignore.includes('.env')) {
      allIssues.push({
        file: '.gitignore',
        type: 'config',
        message: '.env não está listado no .gitignore',
      });
    }
  } catch (error) {
    allIssues.push({
      file: '.gitignore',
      type: 'config',
      message: 'Arquivo .gitignore não encontrado',
    });
  }

  // Verifica se .env.example existe
  if (!fs.existsSync('.env.example')) {
    allIssues.push({
      file: '.env.example',
      type: 'config',
      message: 'Arquivo .env.example não encontrado',
    });
  }

  // Escaneia arquivos recursivamente
  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && shouldScanFile(fullPath)) {
        scanDir(fullPath);
      } else if (entry.isFile() && shouldScanFile(fullPath)) {
        allIssues = [
          ...allIssues,
          ...scanFile(fullPath),
          ...checkFilePermissions(fullPath),
        ];
      }
    }
  }

  scanDir(process.cwd());

  // Exibe resultados
  if (allIssues.length === 0) {
    log('✅ Nenhum problema de segurança encontrado', colors.green);
    return;
  }

  log('\n🚨 Problemas de segurança encontrados:', colors.red);
  
  allIssues.forEach(issue => {
    log('\n-----------------------------------', colors.yellow);
    log(`Arquivo: ${issue.file}`);
    if (issue.line) log(`Linha: ${issue.line}`);
    if (issue.content) log(`Conteúdo: ${issue.content}`);
    log(`Tipo: ${issue.type}`);
    if (issue.message) log(`Mensagem: ${issue.message}`);
  });

  process.exit(1);
}

// Executa a verificação
runSecurityCheck();
