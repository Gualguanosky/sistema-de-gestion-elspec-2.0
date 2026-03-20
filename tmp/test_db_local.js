const mysql = require('mysql2/promise');
require('dotenv').config();

async function testLocalDB() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log("Conectado a MariaDB LOCAL");
        const [rows] = await connection.execute('SELECT COUNT(*) as count FROM leads');
        console.log(`Total Leads en LOCAL: ${rows[0].count}`);
        
        if (rows[0].count > 0) {
            const [data] = await connection.execute('SELECT * FROM leads LIMIT 5');
            console.log("Ejemplo de datos:", JSON.stringify(data, null, 2));
        }

        await connection.end();
    } catch (error) {
        console.error("Error conectando a LOCAL:", error.message);
    }
}

testLocalDB();
