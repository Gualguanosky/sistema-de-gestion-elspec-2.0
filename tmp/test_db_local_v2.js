const mysql = require('mysql2/promise');

async function tryConnect(config) {
    try {
        const connection = await mysql.createConnection(config);
        console.log(`[CONECTADO] Host: ${config.host}, User: ${config.user}, Pass: ${config.password ? '***' : '(vacío)'}`);
        const [rows] = await connection.execute('SELECT COUNT(*) as count FROM leads');
        console.log(`Total Leads: ${rows[0].count}`);
        
        if (rows[0].count > 0) {
            const [data] = await connection.execute('SELECT * FROM leads LIMIT 5');
            console.log("Ejemplo de datos:", JSON.stringify(data, null, 2));
        }
        await connection.end();
        return true;
    } catch (error) {
        console.log(`[FALLO] User: ${config.user}, Pass: ${config.password ? '***' : '(vacío)'} - Error: ${error.message}`);
        return false;
    }
}

async function start() {
    const creds = [
        { host: 'localhost', user: 'root', password: '', database: 'elspec_db' },
        { host: 'localhost', user: 'root', password: 'root_password_elspec_unified', database: 'elspec_db' },
        { host: 'localhost', user: 'n8n_user', password: 'n8n_password_elspec', database: 'elspec_db' }
    ];

    for (const c of creds) {
        if (await tryConnect(c)) break;
    }
}

start();
