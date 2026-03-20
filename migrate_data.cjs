const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const config = {
    host: 'localhost',
    user: 'elspec_user',
    password: 'elspec_password_seguro',
    database: 'elspec_db'
};

const JSON_DIR = 'C:\\Users\\gualg\\migracion-elspec';

async function migrate() {
    const connection = await mysql.createConnection(config);
    console.log('✅ Conectado a MariaDB');

    try {
        // 1. Migrar USUARIOS
        await migrateCollection(connection, 'users.json', 'users', (id, data) => [
            id, data.username, data.name, data.email, data.password, 
            data.role, data.canManageAssets || false, data.uid, 
            data.createdAt ? new Date(data.createdAt).toISOString().slice(0, 19).replace('T', ' ') : null
        ], 'id, username, name, email, password, role, canManageAssets, uid, createdAt');

        // 2. Migrar PRODUCTOS
        await migrateCollection(connection, 'products.json', 'products', (id, data) => [
            id, data.name, data.price, data.discount, data.category, 
            data.extraInfo, 
            data.createdAt ? new Date(data.createdAt).toISOString().slice(0, 19).replace('T', ' ') : null,
            data.updatedAt ? new Date(data.updatedAt).toISOString().slice(0, 19).replace('T', ' ') : null
        ], 'id, name, price, discount, category, extraInfo, createdAt, updatedAt');

        // 3. Migrar TICKETS
        await migrateCollection(connection, 'tickets.json', 'tickets', (id, data) => [
            id, data.title, data.description, data.priority, data.type, 
            data.author, data.status, JSON.stringify(data.assignedTo), 
            data.assignedToName, data.assetId, data.imageUrl, 
            data.solution, JSON.stringify(data.resolutionAttachments),
            data.closedBy, data.closedAt ? new Date(data.closedAt).toISOString().slice(0, 19).replace('T', ' ') : null,
            data.createdAt ? new Date(data.createdAt).toISOString().slice(0, 19).replace('T', ' ') : null
        ], 'id, title, description, priority, type, author, status, assignedTo, assignedToName, assetId, imageUrl, solution, resolutionAttachments, closedBy, closedAt, createdAt');

        // 4. Migrar VENTAS
        await migrateCollection(connection, 'ventas.json', 'ventas', (id, data) => [
            id, data.estado, data.createdBy, data.createdByName, 
            JSON.stringify(data.lineas), JSON.stringify(data.cliente), 
            JSON.stringify(data.configuracion), JSON.stringify(data.totales),
            data.createdAt ? new Date(data.createdAt).toISOString().slice(0, 19).replace('T', ' ') : null,
            data.updatedAt ? new Date(data.updatedAt).toISOString().slice(0, 19).replace('T', ' ') : null
        ], 'id, estado, createdBy, createdByName, lineas, cliente, configuracion, totales, createdAt, updatedAt');

        // 5. Migrar PROYECTOS
        await migrateCollection(connection, 'projects.json', 'projects', (id, data) => [
            id, data.name, data.customer, data.status, data.description, 
            data.linkedSaleId, data.targetDate, data.createdBy, data.createdByName,
            data.createdAt ? new Date(data.createdAt).toISOString().slice(0, 19).replace('T', ' ') : null
        ], 'id, name, customer, status, description, linkedSaleId, targetDate, createdBy, createdByName, createdAt');

        // 6. Migrar COTIZACIONES
        await migrateCollection(connection, 'quotations.json', 'quotations', (id, data) => [
            id, data.number, JSON.stringify(data.client), JSON.stringify(data.items), 
            data.notes, data.total, data.createdBy, data.createdByName, 
            data.deleted || false,
            data.createdAt ? new Date(data.createdAt).toISOString().slice(0, 19).replace('T', ' ') : null
        ], 'id, number, client, items, notes, total, createdBy, createdByName, deleted, createdAt');

        // 7. Migrar COMPUTADORES
        await migrateCollection(connection, 'computers.json', 'computers', (id, data) => [
            id, data.assignedTo || data.owner, data.brand, data.model, data.serial, 
            data.type, data.processor, data.ram, data.storage, data.os, data.status,
            data.purchaseDate || null, data.details || data.notes,
            data.createdAt ? new Date(data.createdAt).toISOString().slice(0, 19).replace('T', ' ') : null
        ], 'id, owner, brand, model, serialNumber, type, processor, ram, storage, os, status, lastMaintenance, notes, createdAt');

        console.log('\n🚀 MIGRACIÓN COMPLETADA CON ÉXITO');

    } catch (error) {
        console.error('❌ Error durante la migración:', error);
    } finally {
        await connection.end();
    }
}

async function migrateCollection(connection, fileName, tableName, mapFn, columns) {
    const filePath = path.join(JSON_DIR, fileName);
    if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ Archivo no encontrado: ${fileName}`);
        return;
    }

    console.log(`\n--- Migrando ${tableName} ---`);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const entries = Object.entries(content);
    
    let count = 0;
    for (const [id, data] of entries) {
        try {
            const values = mapFn(id, data);
            const placeholders = values.map(() => '?').join(', ');
            const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE id=id`;
            await connection.execute(query, values);
            count++;
        } catch (err) {
            console.error(`❌ Error en registro ${id}:`, err.message);
        }
    }
    console.log(`✅ ${tableName}: ${count} registros procesados.`);
}

migrate();

