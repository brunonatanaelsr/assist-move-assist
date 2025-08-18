/**
 * Validação das variáveis de ambiente necessárias
 */
const requiredEnvVars = [
  'PORT',
  'NODE_ENV',
  'POSTGRES_HOST',
  'POSTGRES_DB',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'JWT_SECRET',
  'CORS_ORIGIN'
];

function validateEnv() {
  const missingVars = [];

  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    console.error('❌ Erro: Variáveis de ambiente obrigatórias não encontradas:');
    console.error(missingVars.map(v => `   - ${v}`).join('\n'));
    process.exit(1);
  }

  console.log('✅ Variáveis de ambiente validadas com sucesso');
}

module.exports = validateEnv;
