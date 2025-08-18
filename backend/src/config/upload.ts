const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Tipos de arquivo permitidos
const MIME_TYPES_PERMITIDOS = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

// Tamanho máximo do arquivo (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Configuração do armazenamento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/documentos');
    
    // Criar diretório se não existir
    if (!fs.existsSync(uploadDir)){
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Gerar nome único para o arquivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = MIME_TYPES_PERMITIDOS[file.mimetype];
    cb(null, `${uniqueSuffix}.${ext}`);
  }
});

// Filtro de arquivos
const fileFilter = (req, file, cb) => {
  if (MIME_TYPES_PERMITIDOS[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido'), false);
  }
};

// Configuração do multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: fileFilter
});

// Função para calcular hash do arquivo
const calcularHashArquivo = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('error', err => reject(err));
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
};

// Função para validar arquivo
const validarArquivo = async (file) => {
  const errors = [];
  
  // Verificar tamanho
  if (file.size > MAX_FILE_SIZE) {
    errors.push('Arquivo muito grande');
  }
  
  // Verificar tipo
  if (!MIME_TYPES_PERMITIDOS[file.mimetype]) {
    errors.push('Tipo de arquivo não permitido');
  }
  
  return {
    valido: errors.length === 0,
    errors
  };
};

// Função para remover arquivo
const removerArquivo = async (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (error) {
    console.error('Erro ao remover arquivo:', error);
  }
};

module.exports = {
  upload,
  calcularHashArquivo,
  validarArquivo,
  removerArquivo,
  MIME_TYPES_PERMITIDOS,
  MAX_FILE_SIZE
};
