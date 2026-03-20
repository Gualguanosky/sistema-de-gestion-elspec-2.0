const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const JSON_DIR = 'C:\\Users\\gualg\\migracion-elspec';
const SSH_TARGET = 'root@187.124.152.139';
const DB_NAME = 'elspec_db';
const DB_PASS = 'root_password_seguro';

function runSqlBatch(sqlFileName) {
    const cmd = `Get-Content "${sqlFileName}" -Raw | ssh ${SSH_TARGET} "docker exec -i elspec-mariadb mariadb -u root -p${DB_PASS} ${DB_NAME}"`;
    try {
        console.log(`📡 Enviando lote SQL: ${sqlFileName}`);
        execSync(`powershell.exe -Command "${cmd}"`, { stdio: 'inherit' });
    } catch (err) {
        console.error(`❌ Error enviando lote: ${err.message}`);
    }
}

function formatDate(dateStr) {
    if (!dateStr) return 'NULL';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 'NULL';
        return `'${d.toISOString().slice(0, 19).replace('T', ' ')}'`;
    } catch (e) {
        return 'NULL';
    }
}

function escapeSql(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/'/g, "''").replace(/\\/g, "\\\\");
}

function migrateUsers() {
    console.log('--- Generando Usuarios ---');
    const data = JSON.parse(fs.readFileSync(path.join(JSON_DIR, 'users.json'), 'utf8'));
    let sql = "";
    for (const [id, u] of Object.entries(data)) {
        const canManage = u.canManageAssets === true ? 1 : 0;
        sql += `INSERT INTO users (id, username, name, email, password, role, canManageAssets, uid, createdAt) VALUES ('${id}', '${escapeSql(u.username || '')}', '${escapeSql(u.name || '')}', '${escapeSql(u.email || '')}', '${escapeSql(u.password || '')}', '${escapeSql(u.role || '')}', ${canManage}, '${escapeSql(u.uid || '')}', ${formatDate(u.createdAt)}) ON DUPLICATE KEY UPDATE username=VALUES(username);\n`;
    }
    const outputFile = path.join(__dirname, 'users.sql');
    fs.writeFileSync(outputFile, sql);
    // runSqlBatch(outputFile);
    console.log('✅ Usuarios procesados.');
}

function migrateProducts() {
    console.log('--- Generando Productos ---');
    const data = JSON.parse(fs.readFileSync(path.join(JSON_DIR, 'products.json'), 'utf8'));
    let sql = "";
    for (const [id, p] of Object.entries(data)) {
        sql += `INSERT INTO products (id, name, price, discount, category, extraInfo, createdAt, updatedAt) VALUES ('${id}', '${escapeSql(p.name || '')}', ${p.price || 0}, ${p.discount || 0}, '${escapeSql(p.category || '')}', '${escapeSql(p.extraInfo || '')}', ${formatDate(p.createdAt)}, ${formatDate(p.updatedAt)}) ON DUPLICATE KEY UPDATE name=VALUES(name);\n`;
    }
    const outputFile = path.join(__dirname, 'products.sql');
    fs.writeFileSync(outputFile, sql);
    // runSqlBatch(outputFile);
    console.log('✅ Productos procesados.');
}

function migrateTickets() {
    console.log('--- Generando Tickets ---');
    const data = JSON.parse(fs.readFileSync(path.join(JSON_DIR, 'tickets.json'), 'utf8'));
    let sql = "";
    for (const [id, t] of Object.entries(data)) {
        sql += `INSERT INTO tickets (id, title, description, priority, type, author, status, assignedTo, assignedToName, assetId, imageUrl, solution, resolutionAttachments, closedBy, closedAt, createdAt) VALUES ('${id}', '${escapeSql(t.title || '')}', '${escapeSql(t.description || '')}', '${escapeSql(t.priority || '')}', '${escapeSql(t.type || '')}', '${escapeSql(t.author || '')}', '${escapeSql(t.status || '')}', '${escapeSql(JSON.stringify(t.assignedTo || []))}', '${escapeSql(t.assignedToName || '')}', '${escapeSql(t.assetId || '')}', '${escapeSql(t.imageUrl || '')}', '${escapeSql(t.solution || '')}', '${escapeSql(JSON.stringify(t.resolutionAttachments || []))}', '${escapeSql(t.closedBy || '')}', ${formatDate(t.closedAt)}, ${formatDate(t.createdAt)}) ON DUPLICATE KEY UPDATE title=VALUES(title);\n`;
    }
    fs.writeFileSync(path.join(__dirname, 'tickets.sql'), sql);
}

function migrateVentas() {
    console.log('--- Generando Ventas ---');
    const data = JSON.parse(fs.readFileSync(path.join(JSON_DIR, 'ventas.json'), 'utf8'));
    let sql = "";
    for (const [id, v] of Object.entries(data)) {
        sql += `INSERT INTO ventas (id, estado, createdBy, createdByName, lineas, cliente, configuracion, totales, createdAt, updatedAt) VALUES ('${id}', '${escapeSql(v.estado || '')}', '${escapeSql(v.createdBy || '')}', '${escapeSql(v.createdByName || '')}', '${escapeSql(JSON.stringify(v.lineas || []))}', '${escapeSql(JSON.stringify(v.cliente || {}))}', '${escapeSql(JSON.stringify(v.configuracion || {}))}', '${escapeSql(JSON.stringify(v.totales || {}))}', ${formatDate(v.createdAt)}, ${formatDate(v.updatedAt)}) ON DUPLICATE KEY UPDATE estado=VALUES(estado);\n`;
    }
    fs.writeFileSync(path.join(__dirname, 'ventas.sql'), sql);
}

function migrateProjects() {
    console.log('--- Generando Proyectos ---');
    const data = JSON.parse(fs.readFileSync(path.join(JSON_DIR, 'projects.json'), 'utf8'));
    let sql = "";
    for (const [id, p] of Object.entries(data)) {
        sql += `INSERT INTO projects (id, name, customer, status, description, linkedSaleId, targetDate, createdBy, createdByName, createdAt) VALUES ('${id}', '${escapeSql(p.name || '')}', '${escapeSql(p.customer || '')}', '${escapeSql(p.status || '')}', '${escapeSql(p.description || '')}', '${escapeSql(p.linkedSaleId || '')}', ${p.targetDate ? `'${p.targetDate}'` : 'NULL'}, '${escapeSql(p.createdBy || '')}', '${escapeSql(p.createdByName || '')}', ${formatDate(p.createdAt)}) ON DUPLICATE KEY UPDATE name=VALUES(name);\n`;
    }
    fs.writeFileSync(path.join(__dirname, 'projects.sql'), sql);
}

function migrateQuotations() {
    console.log('--- Generando Cotizaciones ---');
    const data = JSON.parse(fs.readFileSync(path.join(JSON_DIR, 'quotations.json'), 'utf8'));
    let sql = "";
    for (const [id, q] of Object.entries(data)) {
        sql += `INSERT INTO quotations (id, number, client, items, notes, total, createdBy, createdByName, deleted, createdAt) VALUES ('${id}', '${escapeSql(q.number || '')}', '${escapeSql(JSON.stringify(q.client || {}))}', '${escapeSql(JSON.stringify(q.items || []))}', '${escapeSql(q.notes || '')}', ${q.total || 0}, '${escapeSql(q.createdBy || '')}', '${escapeSql(q.createdByName || '')}', ${q.deleted ? 1 : 0}, ${formatDate(q.createdAt)}) ON DUPLICATE KEY UPDATE number=VALUES(number);\n`;
    }
    fs.writeFileSync(path.join(__dirname, 'quotations.sql'), sql);
}

function migrateComputers() {
    console.log('--- Generando Computadores ---');
    const data = JSON.parse(fs.readFileSync(path.join(JSON_DIR, 'computers.json'), 'utf8'));
    let sql = "";
    for (const [id, c] of Object.entries(data)) {
        sql += `INSERT INTO computers (id, owner, brand, model, serialNumber, type, processor, ram, storage, os, status, lastMaintenance, notes, createdAt, updatedAt) VALUES ('${id}', '${escapeSql(c.assignedTo || c.owner || '')}', '${escapeSql(c.brand || '')}', '${escapeSql(c.model || '')}', '${escapeSql(c.serial || '')}', '${escapeSql(c.type || '')}', '${escapeSql(c.processor || '')}', '${escapeSql(c.ram || '')}', '${escapeSql(c.storage || '')}', '${escapeSql(c.os || '')}', '${escapeSql(c.status || '')}', ${formatDate(c.purchaseDate)}, '${escapeSql(c.details || c.notes || '')}', ${formatDate(c.createdAt)}, ${formatDate(c.updatedAt)}) ON DUPLICATE KEY UPDATE owner=VALUES(owner);\n`;
    }
    fs.writeFileSync(path.join(__dirname, 'computers.sql'), sql);
}

async function main() {
    migrateUsers();
    migrateProducts();
    migrateTickets();
    migrateVentas();
    migrateProjects();
    migrateQuotations();
    migrateComputers();
    console.log('\n🚀 Todos los archivos SQL generados exitosamente.');
}

main();
