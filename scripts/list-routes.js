const fs = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(process.cwd());
const ROUTES_DIR = path.join(ROOT, 'apps', 'backend', 'src', 'routes');
const API_FILE = path.join(ROUTES_DIR, 'api.ts');

async function getRouteFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      files.push(...await getRouteFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

const ROUTE_METHOD_REGEX = /router\.(get|post|put|delete|patch)\s*\(\s*(["'`])([^"'`]+)\2/gi;

function normalizeRelative(fullPath) {
  return path.relative(ROOT, fullPath).replace(/\\/g, '/');
}

async function resolveRegisteredRoutes() {
  const apiContent = await fs.readFile(API_FILE, 'utf8');
  const importRegex = /import\s+(\w+)\s+from\s+["']\.\/(.+?)["'];/g;
  const importMap = new Map();
  let importMatch;
  while ((importMatch = importRegex.exec(apiContent)) !== null) {
    const identifier = importMatch[1];
    const relPath = importMatch[2];
    importMap.set(identifier, path.join(ROUTES_DIR, relPath + (relPath.endsWith('.ts') ? '' : '.ts')));
  }

  const useRegex = /router\.use\(\s*(["'`])([^"'`]+)\1\s*,([\s\S]+?)\);/g;
  const registered = new Map();
  let useMatch;
  while ((useMatch = useRegex.exec(apiContent)) !== null) {
    const basePath = useMatch[2];
    const args = useMatch[3].split(',');
    const lastArg = args[args.length - 1].trim();
    const identifier = lastArg.replace(/\)$/g, '').trim();
    const filePath = importMap.get(identifier);
    if (filePath) {
      registered.set(filePath, basePath);
    }
  }

  return registered;
}

async function main() {
  const registeredRoutes = await resolveRegisteredRoutes();
  const files = (await getRouteFiles(ROUTES_DIR)).sort();
  const inventory = [];

  for (const file of files) {
    const includeFile = file === API_FILE || registeredRoutes.has(file);
    if (!includeFile) continue;

    const content = await fs.readFile(file, 'utf8');
    const matches = [...content.matchAll(ROUTE_METHOD_REGEX)];
    if (matches.length === 0) continue;
    const basePath = registeredRoutes.get(file) || '/api';
    const record = {
      file: normalizeRelative(file),
      basePath,
      routes: matches.map((match) => ({
        method: match[1].toUpperCase(),
        path: match[3]
      }))
    };
    inventory.push(record);
  }

  inventory.sort((a, b) => a.file.localeCompare(b.file));

  await fs.writeFile(
    path.join(ROOT, 'docs', 'api', 'ROUTES_INVENTORY.json'),
    JSON.stringify(inventory, null, 2),
    'utf8'
  );

  const markdownLines = [
    '# Inventário de Rotas',
    '',
    'Este documento foi gerado automaticamente pelo script `scripts/list-routes.js`.',
    '',
    '| Arquivo | Base | Método | Caminho |',
    '| --- | --- | --- | --- |'
  ];

  for (const item of inventory) {
    for (const route of item.routes) {
      markdownLines.push(`| ${item.file} | ${item.basePath} | ${route.method} | \`${route.path}\` |`);
    }
  }

  await fs.writeFile(
    path.join(ROOT, 'docs', 'api', 'ROUTES_INVENTORY.md'),
    markdownLines.join('\n') + '\n',
    'utf8'
  );
}

main().catch((error) => {
  console.error('Failed to list routes', error);
  process.exit(1);
});
