import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { generator, registry } from './schemas';
import { apiSpec } from './apiSpec';

const router = express.Router();

// Gera o documento OpenAPI
const document = generator.generateDocument(registry, apiSpec);
const fullSpec = {
  ...apiSpec,
  ...document
};

// Serve a interface Swagger UI
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(fullSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Assist Move API Docs'
}));

export { router as docsRouter };