const bcrypt = require('bcryptjs');

const password = '15002031';
const hash = bcrypt.hashSync(password, 12);
console.log('Hash:', hash);
console.log('Is Match:', bcrypt.compareSync(password, hash));
