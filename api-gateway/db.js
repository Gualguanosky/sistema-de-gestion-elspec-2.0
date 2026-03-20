import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar .env desde la raÃ­z del proyecto
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'n8n_user',
    password: process.env.DB_PASSWORD || 'n8n_password_elspec',
    database: process.env.DB_NAME || 'elspec_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

export default pool;
