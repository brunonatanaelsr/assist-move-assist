const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Criar diretório de uploads se não existir
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(path.join(uploadsDir, 'images'))) {
  fs.mkdirSync(path.join(uploadsDir, 'images'), { recursive: true });
}
if (!fs.existsSync(path.join(uploadsDir, 'documentos'))) {
  fs.mkdirSync(path.join(uploadsDir, 'documentos'), { recursive: true });
}

// Configuração do storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Decide o diretório com base no tipo de upload
    const isDocument = req.baseUrl.includes('documentos');
    const uploadPath = isDocument ? path.join(uploadsDir, 'documentos') : path.join(uploadsDir, 'images');
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Gerar nome único: timestamp + nome original
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = file.originalname.replace(/[^a-zA-Z0-9]/g, '_').split('.')[0];
    cb(null, `${name}_${uniqueSuffix}${ext}`);
  }
});

// Filtro para aceitar arquivos permitidos
const fileFilter = (req, file, cb) => {
  // Define os tipos permitidos com base no tipo de upload
  const isDocument = req.baseUrl.includes('documentos');
  const allowedTypes = isDocument
    ? /jpeg|jpg|png|gif|webp|pdf|doc|docx|xls|xlsx|txt/
    : /jpeg|jpg|png|gif|webp/;

  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error(isDocument 
      ? 'Tipo de arquivo não permitido. Formatos aceitos: jpg, png, gif, webp, pdf, doc, docx, xls, xlsx, txt'
      : 'Apenas arquivos de imagem são permitidos (jpeg, jpg, png, gif, webp)'));
  }
};

// Configuração do multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
  },
  fileFilter: fileFilter
});

// Middleware para upload de uma única imagem
const uploadSingle = upload.single('image');

// Middleware customizado com tratamento de erro
const uploadMiddleware = (req, res, next) => {
  uploadSingle(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Arquivo muito grande. Tamanho máximo: 10MB'
        });
      }
      return res.status(400).json({
        success: false,
        message: `Erro no upload: ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
};

// Função para calcular hash do arquivo
const calcularHashArquivo = async (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', error => reject(error));
  });
};

// Função para validar arquivo
const validarArquivo = async (file) => {
  const errors = [];
  
  // Verificar tamanho (10MB máximo)
  if (file.size > 10 * 1024 * 1024) {
    errors.push('Arquivo muito grande. Tamanho máximo: 10MB');
  }

  // Verificar tipo/extensão
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|xls|xlsx|txt/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (!extname || !mimetype) {
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
    throw error;
  }
};

module.exports = {
  upload,
  uploadMiddleware,
  calcularHashArquivo,
  validarArquivo,
  removerArquivo,
  uploadsDir
};
