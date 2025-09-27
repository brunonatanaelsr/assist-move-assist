import { prisma } from '../services/prisma';

describe('Prisma client smoke test', () => {
  it('exposes repositories for principais domínios', () => {
    expect(prisma.beneficiaria).toBeDefined();
    expect(prisma.oficina).toBeDefined();
    expect(prisma.projeto).toBeDefined();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
