import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { OpenAPIGenerator } from '@asteasolutions/zod-to-openapi';
import { registry } from './routes';
import { apiSpec } from './apiSpec';

const router = express.Router();

// Gera a documentação OpenAPI
const openApiGenerator = new OpenAPIGenerator(registry.definitions, '3.1.0');
const fullSpec = {
  ...apiSpec,
  ...openApiGenerator.generateDocument(apiSpec)
};

// Serve a interface Swagger UI
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(fullSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Assist Move API Docs'
}));

export { router as docsRouter };