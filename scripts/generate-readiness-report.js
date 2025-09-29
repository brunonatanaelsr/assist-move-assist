#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');

const formatDuration = (ms) => {
  if (!Number.isFinite(ms)) return 'n/d';
  if (ms < 1000) {
    return `${ms} ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(2)} s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds - minutes * 60;
  return `${minutes} min ${remaining.toFixed(1)} s`;
};

const runCommand = (label, command, args, options = {}) => {
  const start = Date.now();
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf-8',
    shell: false,
    stdio: 'pipe',
    maxBuffer: 1024 * 1024 * 20,
    ...options
  });
  const durationMs = Date.now() - start;
  const success = result.status === 0;
  const stdout = (result.stdout || '').trim();
  const stderr = (result.stderr || '').trim();
  let summary = success ? 'Execução concluída' : 'Falha durante a execução';
  if (success && stdout) {
    const lines = stdout.split('\n').filter(Boolean);
    summary = lines.slice(-1)[0].trim();
  } else if (!success && stderr) {
    const lines = stderr.split('\n').filter(Boolean);
    summary = lines.slice(-1)[0].trim();
  }
  return { label, command: [command, ...args].join(' '), durationMs, success, stdout, stderr, summary };
};

const countFiles = (dir, predicate, visited = new Set()) => {
  let total = 0;
  if (!fs.existsSync(dir)) return total;
  const realPath = fs.realpathSync(dir);
  if (visited.has(realPath)) return total;
  visited.add(realPath);

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build') continue;
      total += countFiles(fullPath, predicate, visited);
    } else if (predicate(fullPath)) {
      total += 1;
    }
  }
  return total;
};

const listFiles = (dir, predicate) => {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => predicate(path.join(dir, file)))
    .sort();
};

const timestamp = new Date().toISOString();
const branch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repoRoot, encoding: 'utf-8' }).stdout.trim();
const commit = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repoRoot, encoding: 'utf-8' }).stdout.trim();
const status = spawnSync('git', ['status', '--short'], { cwd: repoRoot, encoding: 'utf-8' }).stdout.trim();
const repoClean = status.length === 0;

const checks = [
  runCommand('Build Frontend', 'npm', ['run', 'build:frontend']),
  runCommand('Build Backend', 'npm', ['run', 'build:backend']),
  runCommand('Lint Backend', 'npm', ['run', 'lint:backend']),
  runCommand(
    'Teste Backend (security.setup)',
    'npm',
    ['run', 'test:backend', '--', '--runTestsByPath', 'apps/backend/src/__tests__/security.setup.test.ts']
  ),
  runCommand(
    'Teste Frontend (ErrorBoundary)',
    'npm',
    ['--prefix', 'apps/frontend', 'run', 'test:frontend', '--', 'src/components/__tests__/ErrorBoundary.test.tsx']
  )
];

const checksSucceeded = checks.every((check) => check.success);

const backendRoutesCount = countFiles(path.join(repoRoot, 'apps/backend/src/routes'), (file) => file.endsWith('.ts'));
const backendControllersCount = countFiles(path.join(repoRoot, 'apps/backend/src/controllers'), (file) => file.endsWith('.ts'));
const backendServicesCount = countFiles(path.join(repoRoot, 'apps/backend/src/services'), (file) => file.endsWith('.ts'));
const backendTestsCount = countFiles(
  path.join(repoRoot, 'apps/backend'),
  (file) => /\.test\.ts$/.test(file) || /\.spec\.ts$/.test(file)
);

const frontendPagesCount = countFiles(path.join(repoRoot, 'apps/frontend/src/pages'), (file) => file.endsWith('.tsx'));
const frontendComponentsCount = countFiles(path.join(repoRoot, 'apps/frontend/src/components'), (file) => file.endsWith('.tsx'));
const frontendHooksCount = countFiles(path.join(repoRoot, 'apps/frontend/src/hooks'), (file) => file.endsWith('.ts'));
const frontendTestsCount = countFiles(
  path.join(repoRoot, 'apps/frontend/src'),
  (file) => /\.test\.(t|j)sx?$/.test(file)
);

const totalTsFiles = countFiles(repoRoot, (file) => /\.(ts|tsx)$/.test(file));

const todoMatches = spawnSync('rg', ['--no-heading', '--glob', '!.git', '--glob', '!node_modules', 'TODO|FIXME'], {
  cwd: repoRoot,
  encoding: 'utf-8'
});
const todoLines = (todoMatches.stdout || '').trim();
const todoCount = todoLines ? todoLines.split('\n').filter(Boolean).length : 0;

const migrationsDir = path.join(repoRoot, 'apps/backend/src/database/migrations');
const migrationFiles = listFiles(migrationsDir, (file) => file.endsWith('.sql'));
const latestMigrations = migrationFiles.slice(-5);

const seedsDir = path.join(repoRoot, 'apps/backend/src/database/seeds');
const seedFiles = listFiles(seedsDir, (file) => file.endsWith('.sql'));

const nodeVersion = process.version;
const npmVersion = spawnSync('npm', ['-v'], { cwd: repoRoot, encoding: 'utf-8' }).stdout.trim();

const readinessStatus = checksSucceeded ? '✅ PRONTO PARA PRODUÇÃO' : '⚠️ ATENÇÃO - AJUSTES NECESSÁRIOS';

const checksTable = [
  '| Check | Status | Duração | Última saída |',
  '| ----- | ------ | ------- | ------------ |',
  ...checks.map((check) => `| ${check.label} | ${check.success ? '✅ Sucesso' : '❌ Falha'} | ${formatDuration(check.durationMs)} | ${check.summary.replace(/\|/g, '\\|')} |`)
].join('\n');

const markdown = `# 🚀 Relatório de Prontidão para Produção\n\n_Gerado em ${timestamp}_\n\n## ✅ Resumo Executivo\n- **Status Geral:** ${readinessStatus}\n- **Branch Analisada:** \`${branch}\`\n- **Commit:** \`${commit}\`\n- **Workspace Limpo:** ${repoClean ? 'Sim' : 'Não'}\n- **Node.js / npm:** ${nodeVersion} / ${npmVersion}\n\n## 🧪 Checks Automáticos\n${checksTable}\n\n## 📦 Métricas de Código\n### Backend\n- Rotas (arquivos .ts): **${backendRoutesCount}**\n- Controladores: **${backendControllersCount}**\n- Serviços: **${backendServicesCount}**\n- Arquivos de teste (.test/.spec.ts): **${backendTestsCount}**\n\n### Frontend\n- Páginas (.tsx): **${frontendPagesCount}**\n- Componentes (.tsx): **${frontendComponentsCount}**\n- Hooks (.ts): **${frontendHooksCount}**\n- Arquivos de teste: **${frontendTestsCount}**\n\n### Base do Repositório\n- Total de arquivos TypeScript/TSX: **${totalTsFiles}**\n- TODOs/FIXMEs identificados: **${todoCount}**\n\n## 🗄️ Migrações e Seeds\n- Migrações disponíveis: **${migrationFiles.length}**\n${latestMigrations.length ? latestMigrations.map((file) => `  - ${file}`).join('\n') : '  - Nenhuma migração encontrada'}\n- Seeds disponíveis: **${seedFiles.length}**\n${seedFiles.length ? seedFiles.map((file) => `  - ${file}`).join('\n') : '  - Nenhum seed encontrado'}\n\n## 📌 Observações\n${checksSucceeded ? '- Todas as checagens automatizadas foram executadas com sucesso.' : '- Há falhas nas checagens; revisar os logs acima antes do deploy.'}\n- Relatório gerado automaticamente pelo script \`scripts/generate-readiness-report.js\`.\n\n`;

const reportPath = path.join(repoRoot, 'RELATORIO_PRONTIDAO_PRODUCAO.md');
fs.writeFileSync(reportPath, markdown, 'utf-8');

console.log(`Relatório atualizado em ${reportPath}`);
