import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

async function importLeads() {
    const filePath = path.join(process.cwd(), 'tmp', 'leads_template.json');
    
    try {
        const rawData = await fs.readFile(filePath, 'utf8');
        const leads = JSON.parse(rawData);

        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log(`Conectado a MariaDB en ${process.env.DB_HOST}`);

        let count = 0;
        for (const lead of leads) {
            const [result] = await connection.execute(
                `INSERT INTO leads (id, title, description, customerDetails, assignedTo, assignedToName, status, priority, value, createdAt, updatedAt) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                 ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW()`,
                [
                    lead.id || Math.random().toString(36).substring(2, 11),
                    lead.title,
                    lead.description,
                    JSON.stringify(lead.customerDetails),
                    lead.assignedTo,
                    lead.assignedToName,
                    lead.status || 'NUEVO',
                    lead.priority || 'media',
                    lead.value || 0
                ]
            );
            if (result.affectedRows > 0) count++;
        }

        console.log(`¡Éxito! Se importaron/actualizaron ${count} prospectos.`);
        await connection.end();
    } catch (error) {
        console.error("Error durante la importación:", error.message);
    }
}

importLeads();
