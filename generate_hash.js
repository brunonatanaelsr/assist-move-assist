const bcrypt = require('bcryptjs');
const password = '15002031';
const hash = bcrypt.hashSync(password, 12);
console.log(hash);
