import { setupTestDatabase, teardownTestDatabase, truncateAllTables } from './__tests__/helpers/database';

// Somente executa se explicitamente habilitado
const enabled = process.env.RUN_INTEGRATION === '1';

beforeAll(async () => {
  if (!enabled) {
    console.warn('Integration tests disabled. Set RUN_INTEGRATION=1 to enable.');
    return;
  }
  await setupTestDatabase();
});

afterEach(async () => {
  if (!enabled) return;
  await truncateAllTables();
});

afterAll(async () => {
  if (!enabled) return;
  await teardownTestDatabase();
});

