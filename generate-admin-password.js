const bcrypt = require('bcryptjs');

async function generatePassword() {
  const password = '123456';
  const saltRounds = 12;
  
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Senha:', password);
    console.log('Hash:', hash);
    
    // Teste se o hash funciona
    const isValid = await bcrypt.compare(password, hash);
    console.log('Hash válido:', isValid);
  } catch (error) {
    console.error('Erro:', error);
  }
}

generatePassword();
