import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z as baseZ, ZodError } from 'zod';
import type { ZodIssue } from 'zod';

// Estende o Zod com o plugin OpenAPI
extendZodWithOpenApi(baseZ);

export const z = baseZ;
export { ZodError };
export type { ZodIssue };