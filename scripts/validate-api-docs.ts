#!/usr/bin/env tsx

import fs from 'node:fs/promises';
import path from 'node:path';

type Layer = {
  route?: { path: string | string[]; methods: Record<string, boolean> };
  name: string;
  handle?: { stack?: Layer[] };
  regexp?: RegExp & { source: string } & { fast_star?: boolean; fast_slash?: boolean };
};

type Endpoint = { method: string; path: string };

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.REDIS_DISABLED = process.env.REDIS_DISABLED || 'true';
process.env.RATE_LIMIT_DISABLE = process.env.RATE_LIMIT_DISABLE || 'true';

async function loadApiRouter() {
  const modulePath = path.resolve('apps/backend/src/routes/api');
  const mod = await import(modulePath);
  const router = mod.apiRoutes || mod.default;
  if (!router || !router.stack) {
    throw new Error('Não foi possível carregar as rotas da API');
  }
  return router as { stack: Layer[] };
}

function getMountPath(layer: Layer): string {
  const regexp = layer.regexp as (RegExp & { source: string }) | undefined;
  if (!regexp || (regexp as any).fast_slash || (regexp as any).fast_star) {
    return '';
  }
  let source = regexp.source;
  if (!source || source === '\\/?' || source === '(?:)?') {
    return '';
  }
  source = source
    .replace(/\\\/?\(\?=\\\/\|\$\)/g, '')
    .replace(/\(\?=\\\/\|\$\)/g, '')
    .replace(/^\^\\\//, '/')
    .replace(/^\^/, '')
    .replace(/\$$/, '')
    .replace(/\\\//g, '/')
    .replace(/\/\?$/, '');

  if (!source || source === '(.*)' || source.includes('(')) {
    return '';
  }

  return source.startsWith('/') ? source : `/${source}`;
}

function joinPaths(prefix: string, segment: string): string {
  const sanitizedPrefix = prefix === '/' ? '' : prefix.replace(/\/$/, '');
  const cleanSegment = segment.trim();
  if (!cleanSegment || cleanSegment === '/' ) {
    return sanitizedPrefix || '/';
  }
  const withSlash = cleanSegment.startsWith('/') ? cleanSegment : `/${cleanSegment}`;
  return `${sanitizedPrefix}${withSlash}`;
}

function collectEndpoints(stack: Layer[], prefix = '/api'): Endpoint[] {
  const endpoints: Endpoint[] = [];
  for (const layer of stack) {
    if (layer.route) {
      const paths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
      const methods = Object.entries(layer.route.methods)
        .filter(([, enabled]) => enabled)
        .map(([method]) => method.toUpperCase())
        .filter((method) => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method));

      for (const routePath of paths) {
        const fullPath = joinPaths(prefix, typeof routePath === 'string' ? routePath : String(routePath));
        for (const method of methods) {
          endpoints.push({ method, path: fullPath });
        }
      }
    } else if (layer.name === 'router' && layer.handle?.stack) {
      const mount = getMountPath(layer);
      const newPrefix = joinPaths(prefix, mount);
      endpoints.push(...collectEndpoints(layer.handle.stack ?? [], newPrefix));
    }
  }
  return endpoints;
}

function normalizeEndpoint(endpoint: Endpoint): string {
  const normalizedPath = endpoint.path.replace(/\/+$/, '') || '/';
  return `${endpoint.method} ${normalizedPath}`;
}

function parseDocumentedEndpoints(markdown: string): Set<string> {
  const documented = new Set<string>();
  const regex = /`(GET|POST|PUT|PATCH|DELETE)\s+([^`]+)`/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown)) !== null) {
    const method = match[1].toUpperCase();
    const path = match[2].trim().replace(/\/+$/, '') || '/';
    documented.add(`${method} ${path}`);
  }
  return documented;
}

async function main() {
  const router = await loadApiRouter();
  const endpoints = collectEndpoints((router as any).stack);
  const actual = new Set(endpoints.map(normalizeEndpoint));

  const docPath = path.resolve('docs/api/README.md');
  const markdown = await fs.readFile(docPath, 'utf8');
  const documented = parseDocumentedEndpoints(markdown);

  const missingInDocs = [...actual].filter((entry) => !documented.has(entry)).sort();
  const extraInDocs = [...documented].filter((entry) => !actual.has(entry)).sort();

  if (missingInDocs.length || extraInDocs.length) {
    if (missingInDocs.length) {
      console.error('Endpoints ausentes na documentação:');
      for (const entry of missingInDocs) {
        console.error(`  - ${entry}`);
      }
    }
    if (extraInDocs.length) {
      console.error('\nEndpoints listados na documentação mas não encontrados na API:');
      for (const entry of extraInDocs) {
        console.error(`  - ${entry}`);
      }
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Documentação de API sincronizada (${actual.size} endpoints conferidos).`);
}

main().catch((error) => {
  console.error('Erro ao validar documentação da API:', error);
  process.exitCode = 1;
});
