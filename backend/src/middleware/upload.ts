import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { AppError } from '../utils/AppError';

// Criar diretório de uploads se não existir
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração do armazenamento
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, uploadDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    // Gerar nome único para o arquivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Filtro de arquivos
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Permitir apenas imagens
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new AppError('Apenas imagens são permitidas', 400));
  }
};

// Configuração do multer (imagens)
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limite de 5MB
    files: 5 // Máximo de 5 arquivos por vez
  }
});

// Middleware para upload único
export const uploadSingle = (fieldName: string) => upload.single(fieldName);

// Middleware para múltiplos uploads
export const uploadMultiple = (fieldName: string, maxCount: number = 5) => upload.array(fieldName, maxCount);

// Middleware para campos múltiplos
export const uploadFields = (fields: { name: string; maxCount: number }[]) => upload.fields(fields);

// Configuração para aceitar arquivos genéricos (ex.: PDF)
const uploadAny = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // até 20MB para documentos
    files: 5
  }
});

export const uploadAnySingle = (fieldName: string) => uploadAny.single(fieldName);

// Função para excluir arquivo
export const deleteFile = async (filename: string): Promise<void> => {
  const filePath = path.join(uploadDir, filename);
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    throw new AppError('Erro ao excluir arquivo', 500);
  }
};

// Função para obter URL do arquivo
export const getFileUrl = (filename: string): string => {
  return `/uploads/${filename}`;
};

// Função para validar mime type
export const validateMimeType = (file: Express.Multer.File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.mimetype);
};

// Exportar caminho do diretório de uploads
export const UPLOAD_DIR = uploadDir;
