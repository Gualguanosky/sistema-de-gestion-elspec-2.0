import db from './src/services/db.js';
import { collection, getDocs, updateDoc, doc, deleteDoc, writeBatch } from "firebase/firestore";
import { db_firestore } from './src/services/firebase.js';

async function fixProducts() {
    console.log("Iniciando reparación de productos...");
    try {
        const q = collection(db_firestore, 'products');
        const snapshot = await getDocs(q);

        const batch = writeBatch(db_firestore);
        let countFixed = 0;
        let countDeleted = 0;

        snapshot.docs.forEach((document) => {
            const data = document.data();

            // Si tiene las claves de CatalogConverter en vez de las de ProductManager
            if (data['REFERENCIA'] && !data.name) {
                const docRef = doc(db_firestore, 'products', document.id);
                batch.update(docRef, {
                    name: String(data['REFERENCIA']).trim(),
                    price: parseFloat(data['PRECIO USD MSRP']) || 0,
                    category: String(data['FAMILIA'] || 'General').trim(),
                    discount: parseFloat(data['Factory Discount2']) || 0,
                    extraInfo: String(data['APERTURA'] || '').trim(),
                });
                countFixed++;
            }
        });

        if (countFixed > 0) {
            await batch.commit();
            console.log(`¡Reparados ${countFixed} productos defectuosos!`);
        } else {
            console.log("No se encontraron productos defectuosos.");
        }
    } catch (e) {
        console.error("Error reparando productos:", e);
    }
}

fixProducts().then(() => process.exit(0));
