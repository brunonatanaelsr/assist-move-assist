import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Estende o Zod com o plugin OpenAPI
extendZodWithOpenApi(z);

export { z };