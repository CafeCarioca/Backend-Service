// Corre un archivo .sql contra la base configurada en el entorno
// (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME; en local los toma del .env).
// Uso: node BDD/run-migration.js BDD/migrations/006_add_discount_weekday.sql
require('dotenv').config();
const fs = require('fs');
const mysql = require('mysql2/promise');

(async () => {
  const file = process.argv[2];
  if (!file) throw new Error('Falta el archivo .sql a ejecutar');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });
  try {
    await connection.query(fs.readFileSync(file, 'utf8'));
    console.log(`Migración aplicada: ${file}`);
  } finally {
    await connection.end();
  }
})().catch((error) => {
  console.error('ERROR:', error.message);
  process.exit(1);
});
