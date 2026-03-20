import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testConnection() {
    console.log(`🔍 Intentando conectar a MariaDB en ${process.env.DB_HOST}...`);
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            connectTimeout: 10000 // 10s
        });

        console.log("✅ ¡CONEXIÓN EXITOSA!");
        const [rows] = await connection.execute('SELECT COUNT(*) as count FROM products');
        console.log(`📊 Tabla 'products' tiene ${rows[0].count} registros.`);
        
        const [leads] = await connection.execute('SELECT COUNT(*) as count FROM leads');
        console.log(`📋 Tabla 'leads' tiene ${leads[0].count} registros.`);

        await connection.end();
        process.exit(0);
    } catch (error) {
        console.error("❌ ERROR DE CONEXIÓN:");
        console.error(error.message);
        if (error.code === 'ETIMEDOUT') {
            console.log("\n💡 Posible causa: El puerto 3306 está bloqueado en el firewall del VPS.");
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log("\n💡 Posible causa: El usuario MariaDB no permite conexiones externas o la contraseña es incorrecta.");
        }
        process.exit(1);
    }
}

testConnection();
