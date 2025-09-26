import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { AppError } from '../utils';

// Diretório único de uploads baseado no CWD do processo
const uploadDir = path.resolve(process.cwd(), 'uploads');
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

// Filtro de arquivos (somente imagens)
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

// Configuração para aceitar documentos (PDF) e imagens com lista branca de MIME types
const ALLOWED_DOC_MIME: readonly string[] = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp'
];

const uploadAny = multer({
  storage,
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (ALLOWED_DOC_MIME.includes(file.mimetype)) return cb(null, true);
    return cb(new AppError('Tipo de arquivo não permitido', 400));
  },
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
  // As URLs públicas passaram a ser servidas por rotas autenticadas
  return `/api/feed/images/${filename}`;
};

// Função para validar mime type
export const validateMimeType = (file: Express.Multer.File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.mimetype);
};

// Exportar caminho do diretório de uploads
export const UPLOAD_DIR = uploadDir;
