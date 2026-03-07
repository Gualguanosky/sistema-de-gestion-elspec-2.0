// ═══════════════════════════════════════════════════════════════
// setup-bot-user.js — Crea el usuario de Firebase para el bot
// Ejecuta SOLO UNA VEZ: node setup-bot-user.js
// ═══════════════════════════════════════════════════════════════
require('dotenv').config();
const fetch = require('node-fetch');

const API_KEY = process.env.FIREBASE_API_KEY;
const EMAIL = process.env.BOT_EMAIL;
const PASSWORD = process.env.BOT_PASSWORD;

async function createBotUser() {
    console.log(`\n🤖 Creando usuario bot: ${EMAIL}\n`);

    try {
        const res = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true })
            }
        );
        const data = await res.json();

        if (data.error) {
            if (data.error.message === 'EMAIL_EXISTS') {
                console.log('⚠️  El usuario ya existe. Probando login...');
                await testLogin();
            } else {
                throw new Error(data.error.message);
            }
        } else {
            console.log('✅ Usuario creado exitosamente!');
            console.log(`   Email: ${data.email}`);
            console.log(`   UID:   ${data.localId}`);
            console.log('\n📌 Guarda el UID — el admin de ELSPEC debe asignarle rol en el sistema si es necesario.');
            console.log('\n✅ Setup completo. Ahora ejecuta: npm run dev\n');
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

async function testLogin() {
    const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true })
        }
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    console.log('✅ Login exitoso. El usuario ya existe y funciona correctamente.');
    console.log(`   UID: ${data.localId}`);
    console.log('\n✅ Setup completo. Ahora ejecuta: npm run dev\n');
}

createBotUser();
