import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request } from 'express';
import { AppError } from '../utils';
import { logger } from '../utils/logger';

// Configurações básicas
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// Configuração dos diretórios
const BASE_UPLOAD_DIR = path.resolve(__dirname, '..', '..', 'uploads');
const TEMP_DIR = path.join(BASE_UPLOAD_DIR, 'temp');

// Criar diretórios se não existirem
[BASE_UPLOAD_DIR, TEMP_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configuração do Storage
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    // Usar diretório temporário inicialmente
    cb(null, TEMP_DIR);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    // Gerar nome único para evitar conflitos
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// Filtro de arquivos
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  try {
    // Verificar tipo do arquivo
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      return cb(new AppError('Tipo de arquivo não permitido', 400));
    }

    // Verificar extensão
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx'];
    if (!allowedExts.includes(ext)) {
      return cb(new AppError('Extensão de arquivo não permitida', 400));
    }

    // Verificar nome do arquivo
    if (file.originalname.length > 200) {
      return cb(new AppError('Nome do arquivo muito longo', 400));
    }

    cb(null, true);
  } catch (error) {
    logger.error('Erro no filtro de upload:', error);
    cb(new AppError('Erro ao processar arquivo', 500));
  }
};

// Configuração do Multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
});

// Função para mover arquivo do temp para destino final
export const moveUploadedFile = async (
  tempPath: string,
  beneficiariaId: number,
  filename: string
): Promise<string> => {
  try {
    // Criar diretório da beneficiária se não existir
    const beneficiariaDir = path.join(BASE_UPLOAD_DIR, beneficiariaId.toString());
    if (!fs.existsSync(beneficiariaDir)) {
      fs.mkdirSync(beneficiariaDir, { recursive: true });
    }

    // Caminho final do arquivo
    const finalPath = path.join(beneficiariaDir, filename);

    // Mover arquivo
    await fs.promises.rename(tempPath, finalPath);

    return finalPath;
  } catch (error) {
    logger.error('Erro ao mover arquivo:', error);
    throw new AppError('Erro ao processar upload', 500);
  }
};

// Função para limpar arquivos temporários antigos
export const cleanupTempFiles = async () => {
  try {
    const files = await fs.promises.readdir(TEMP_DIR);
    const now = Date.now();

    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      const stats = await fs.promises.stat(filePath);

      // Remover arquivos mais antigos que 1 hora
      if (now - stats.mtimeMs > 3600000) {
        await fs.promises.unlink(filePath);
        logger.info(`Arquivo temporário removido: ${file}`);
      }
    }
  } catch (error) {
    logger.error('Erro ao limpar arquivos temporários:', error);
  }
};

// Agendar limpeza periódica
setInterval(cleanupTempFiles, 3600000); // A cada hora
