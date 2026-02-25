/**
 * Генерация bcrypt-хеша пароля для таблицы login_users (вход по логину).
 * Запуск: node scripts/hash-password.js "ваш_пароль"
 * Вывод — одна строка с хешем, её вставляют в INSERT в login_users.password_hash.
 */
import bcrypt from 'bcryptjs';

const password = process.argv[2];
if (!password) {
  console.error('Использование: node scripts/hash-password.js "ваш_пароль"');
  process.exit(1);
}

const rounds = 10;
const hash = bcrypt.hashSync(password, rounds);
console.log(hash);
