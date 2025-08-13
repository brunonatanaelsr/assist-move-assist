import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import beneficiariasRoutes from './routes/beneficiarias';
import dashboardRoutes from './routes/dashboard';
import healthRoutes from './routes/health';

dotenv.config();

const app = express();

app.use(helmet());
app.use(compression());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(morgan('dev'));
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/beneficiarias', beneficiariasRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/health', healthRoutes);

export default app;
