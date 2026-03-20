import mysql from 'mysql2/promise';

async function tryConnect(config) {
    try {
        const connection = await mysql.createConnection(config);
        console.log(`[CONECTADO] Host: ${config.host}, User: ${config.user}, Pass: ${config.password ? '***' : '(vacío)'}`);
        
        // Verificar si la base de datos existe
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${config.database}`);
        await connection.query(`USE ${config.database}`);

        const [tables] = await connection.execute('SHOW TABLES LIKE "leads"');
        if (tables.length === 0) {
            console.log(`[ALERTA] La tabla "leads" no existe en la base de datos ${config.database}`);
            await connection.end();
            return false;
        }

        const [rows] = await connection.execute('SELECT COUNT(*) as count FROM leads');
        console.log(`Total Leads: ${rows[0].count}`);
        
        if (rows[0].count > 0) {
            const [data] = await connection.execute('SELECT * FROM leads LIMIT 3');
            console.log("Ejemplo de datos:", JSON.stringify(data, null, 2));
            await connection.end();
            return true; // Encontramos datos!
        }
        await connection.end();
        return false;
    } catch (error) {
        // console.log(`[FALLO] User: ${config.user}, Pass: ${config.password ? '***' : '(vacío)'} - Error: ${error.message}`);
        return false;
    }
}

async function start() {
    const creds = [
        { host: 'localhost', user: 'root', password: '', database: 'elspec_db' },
        { host: 'localhost', user: 'root', password: 'root_password_elspec_unified', database: 'elspec_db' },
        { host: 'localhost', user: 'n8n_user', password: 'n8n_password_elspec', database: 'elspec_db' },
        { host: 'localhost', user: 'root', password: '', database: 'sistema_tickets_elspec' }
    ];

    console.log("Buscando leads en MariaDB LOCAL...");
    let found = false;
    for (const c of creds) {
        if (await tryConnect(c)) {
            found = true;
            break;
        }
    }
    
    if (!found) {
        console.log("No se encontraron leads con datos en ninguna de las bases de datos locales probadas.");
    }
}

await start();
