import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});

const DATA_DIR = './migration_data';

async function importData() {
  const client = await pool.connect();
  try {
    console.log('--- Starting Migration ---');

    // 1. Users
    console.log('Importing Users...');
    const usersJson = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'users.json'), 'utf8'));
    const userMap = new Map(); // firebase_id -> uuid
    const usernameMap = new Map(); // username -> uuid

    for (const u of usersJson) {
      const res = await client.query(
        `INSERT INTO elspec.users (firebase_id, username, email, full_name, role)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (firebase_id) DO UPDATE SET
         username = EXCLUDED.username, email = EXCLUDED.email, full_name = EXCLUDED.full_name, role = EXCLUDED.role
         RETURNING id`,
        [u.firebase_id, u.username || u.email?.split('@')[0], u.email, u.name || u.displayName, u.role || 'user']
      );
      userMap.set(u.firebase_id, res.rows[0].id);
      usernameMap.set(u.username || u.email?.split('@')[0], res.rows[0].id);
    }

    // 2. Customers
    console.log('Importing Customers...');
    const customersJson = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'customers.json'), 'utf8'));
    const customerMap = new Map(); // firebase_id -> uuid
    const customerNitMap = new Map(); // nit -> uuid

    for (const c of customersJson) {
      const res = await client.query(
        `INSERT INTO elspec.customers (firebase_id, name, tax_id, email, phone, address, contact_person)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (firebase_id) DO UPDATE SET
         name = EXCLUDED.name, tax_id = EXCLUDED.tax_id, email = EXCLUDED.email
         RETURNING id`,
        [c.firebase_id, c.name, c.nit || c.tax_id, c.email, c.phone, c.address, c.contact]
      );
      customerMap.set(c.firebase_id, res.rows[0].id);
      if (c.nit) customerNitMap.set(String(c.nit), res.rows[0].id);
    }

    // 3. Products
    console.log('Importing Products...');
    const productsJson = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'products.json'), 'utf8'));
    for (const p of productsJson) {
      await client.query(
        `INSERT INTO elspec.products (firebase_id, name, sku, description, category, price)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (firebase_id) DO NOTHING`,
        [p.firebase_id, p.name, p.sku, p.extraInfo || p.description, p.category, parseFloat(p.price || 0)]
      );
    }

    // 4. Tickets
    console.log('Importing Tickets...');
    const ticketsJson = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'tickets.json'), 'utf8'));
    for (const t of ticketsJson) {
        let userId = userMap.get(t.authorId);
        if (!userId && t.author) {
            userId = usernameMap.get(t.author);
        }

        let customerId = customerMap.get(t.customerId);
        if (!customerId && t.customer) {
            const custRes = await client.query('SELECT id FROM elspec.customers WHERE name = $1 LIMIT 1', [t.customer]);
            if (custRes.rows.length > 0) customerId = custRes.rows[0].id;
        }

        const res = await client.query(
            `INSERT INTO elspec.tickets (firebase_id, title, description, status, priority, user_id, customer_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (firebase_id) DO NOTHING
             RETURNING id`,
            [t.firebase_id, t.title || 'Untitled', t.description || '', t.status || 'open', t.priority || 'medium', userId, customerId]
        );

        if (res.rows.length > 0) {
            const ticketUuid = res.rows[0].id;
            if (t.assignedTo && Array.isArray(t.assignedTo)) {
                for (const assign of t.assignedTo) {
                    const assignedUserUuid = userMap.get(assign.id);
                    if (assignedUserUuid) {
                        await client.query(
                            `INSERT INTO elspec.ticket_assignments (ticket_id, user_id)
                             VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                            [ticketUuid, assignedUserUuid]
                        );
                    }
                }
            }
        }
    }

    // 5. Computers
    console.log('Importing Computers...');
    const computersJson = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'computers.json'), 'utf8'));
    for (const comp of computersJson) {
        let assignedId = usernameMap.get(comp.assignedTo);
        const res = await client.query(
            `INSERT INTO elspec.computers (firebase_id, serial_number, brand, model, assigned_user_id, status)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (firebase_id) DO NOTHING
             RETURNING id`,
            [comp.firebase_id, comp.serial, comp.brand, comp.model, assignedId, comp.status]
        );

        if (res.rows.length > 0 && comp.maintenanceLog) {
            const compUuid = res.rows[0].id;
            for (const log of comp.maintenanceLog) {
                let techId = usernameMap.get(log.technician);
                await client.query(
                    `INSERT INTO elspec.computer_maintenance (computer_id, date, technician_id, description)
                     VALUES ($1, $2, $3, $4)`,
                    [compUuid, log.createdAt || new Date(), techId, log.activity]
                );
            }
        }
    }

    // 6. Sales (Ventas)
    console.log('Importing Sales...');
    const salesJson = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'ventas.json'), 'utf8'));
    for (const s of salesJson) {
        let custId = customerNitMap.get(String(s.cliente?.nit));
        let createdById = usernameMap.get(s.createdBy);

        const res = await client.query(
            `INSERT INTO elspec.sales (firebase_id, customer_id, created_by, total_amount, status)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (firebase_id) DO NOTHING
             RETURNING id`,
            [s.firebase_id, custId, createdById, s.totales?.total || 0, s.estado]
        );

        if (res.rows.length > 0 && s.lineas) {
            const saleUuid = res.rows[0].id;
            for (const item of s.lineas) {
                await client.query(
                    `INSERT INTO elspec.sale_items (sale_id, description, quantity, unit_price)
                     VALUES ($1, $2, $3, $4)`,
                    [saleUuid, item.descripcion, item.cantidad, item.precioNeto]
                );
            }
        }
    }

    // 7. SGI
    console.log('Importing SGI Processes...');
    const sgiJson = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'sgi_processes.json'), 'utf8'));
    for (const proc of sgiJson) {
        const res = await client.query(
            `INSERT INTO elspec.sgi_processes (firebase_id, name, description)
             VALUES ($1, $2, $3)
             ON CONFLICT (firebase_id) DO UPDATE SET name = EXCLUDED.name
             RETURNING id`,
            [proc.firebase_id, proc.name, proc.description]
        );
        const processUuid = res.rows[0].id;

        if (proc.leaders && Array.isArray(proc.leaders)) {
            for (const leader of proc.leaders) {
                const userUuid = userMap.get(leader.id);
                if (userUuid) {
                    await client.query(
                        `INSERT INTO elspec.sgi_process_leaders (process_id, user_id)
                         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                        [processUuid, userUuid]
                    );
                }
            }
        }

        if (proc.indicators) {
            for (const ind of proc.indicators) {
                await client.query(
                    `INSERT INTO elspec.sgi_indicators (firebase_id, process_id, name, target, unit, requires_photo, requires_file, requires_comment)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                     ON CONFLICT (firebase_id) DO NOTHING`,
                    [ind.id, processUuid, ind.name, parseFloat(ind.target || 0), ind.unit, ind.requiresPhoto || false, ind.requiresFile || false, ind.requiresComment || false]
                );
            }
        }
    }

    console.log('--- Migration Completed Successfully ---');
  } catch (err) {
    console.error('Error during migration:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

importData();
