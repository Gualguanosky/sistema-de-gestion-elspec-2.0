
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar .env desde la raíz
dotenv.config({ path: join(__dirname, '../.env') });

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COLLECTIONS = [
    'users', 'tickets', 'computers', 'customers', 'products', 'campaigns', 'ventas', 
    'projects', 'logistics', 'indicators', 'sgi_processes', 'sgi_evidence', 
    'sgi_indicator_types', 'visits', 'quotations', 'configuracionGlobal', 
    'notifications', 'terminos_condiciones'
];

async function extractData() {
    console.log("🚀 Iniciando extracción de datos de Firebase...");
    
    if (!fs.existsSync('migration_data')) {
        fs.mkdirSync('migration_data');
    }

    for (const collName of COLLECTIONS) {
        try {
            console.log(`- Extrayendo colección: ${collName}...`);
            const querySnapshot = await getDocs(collection(db, collName));
            const data = querySnapshot.docs.map(doc => ({
                firebase_id: doc.id,
                ...doc.data()
            }));
            
            fs.writeFileSync(`migration_data/${collName}.json`, JSON.stringify(data, null, 2));
            console.log(`  ✅ ${data.length} documentos guardados.`);
        } catch (error) {
            console.error(`  ❌ Error en ${collName}:`, error.message);
        }
    }

    console.log("\n✨ Extracción completada. Los archivos están en la carpeta 'migration_data'.");
    process.exit(0);
}

extractData();
