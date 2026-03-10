import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    orderBy,
    limit,
    where,
    getDoc,
    setDoc,
    writeBatch,
    increment
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db_firestore, storage, auth } from "./firebase";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    sendPasswordResetEmail,
    updatePassword
} from "firebase/auth";

// Firebase Collections
const COLLECTIONS = {
    USERS: 'users',
    TICKETS: 'tickets',
    COMPUTERS: 'computers',
    INDICATORS: 'indicators',
    SGI_PROCESSES: 'sgi_processes',
    SGI_EVIDENCE: 'sgi_evidence',
    SGI_INDICATOR_TYPES: 'sgi_indicator_types',
    VISITS: 'visits',
    QUOTATIONS: 'quotations',
    CUSTOMERS: 'customers',
    VENTAS: 'ventas',
    CONFIGURACION_GLOBAL: 'configuracionGlobal',
    PRODUCTS: 'products',
    NOTIFICATIONS: 'notifications',
    TERMINOS_CONDICIONES: 'terminos_condiciones',
    CAMPAIGNS: 'campaigns'
};

const db = {
    // File Storage Workaround (Base64 in Firestore to avoid Blaze Plan)
    uploadFile: async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    },
    // Users Management
    // Initialize base users if collection is empty
    initializeDefaults: async () => {
        try {
            console.log("Firebase: Verificando datos iniciales...");
            // Only fetch 1 doc to check existence, saving bandwidth/security
            const q = query(collection(db_firestore, COLLECTIONS.USERS), limit(1));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                console.log("Firebase: Base de datos vacía. Creando usuarios por defecto...");
                const defaults = [
                    { username: 'alejandro', password: 'lucy931205', role: 'admin', name: 'Alejandro', email: 'admin@elspecandina.com' },
                    { username: 'user', password: 'user', role: 'engineer', name: 'Usuario Soporte', email: 'soporte@elspecandina.com' }
                ];
                for (const u of defaults) {
                    await addDoc(collection(db_firestore, COLLECTIONS.USERS), {
                        ...u,
                        createdAt: new Date().toISOString()
                    });
                }
                console.log("Firebase: Usuarios iniciales creados.");
                return true;
            }
            return false;
        } catch (e) {
            console.error("Firebase Initialization Error (Defaults):", e);
            // If it's a permission error, it's very informative
            if (e.code === 'permission-denied') {
                console.warn("PERMISOS DENEGADOS: Verifique las reglas de seguridad de Firestore.");
            }
            return false;
        }
    },

    // Secure login: fetch only the specific user by username
    loginUser: async (username, password) => {
        try {
            // 1. Try Firebase Auth first (for migrated users)
            // If username is email, try direct auth
            if (username.includes('@')) {
                try {
                    const userCredential = await signInWithEmailAndPassword(auth, username, password);
                    const user = userCredential.user;

                    // Fetch role from Firestore 'users' collection using email
                    const q = query(
                        collection(db_firestore, COLLECTIONS.USERS),
                        where('email', '==', user.email),
                        limit(1)
                    );
                    const querySnapshot = await getDocs(q);
                    let dbUser = {};
                    if (!querySnapshot.empty) {
                        dbUser = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
                    }

                    return { uid: user.uid, email: user.email, ...dbUser };
                } catch (authError) {
                    // Continue to legacy check if auth fails (maybe user not migrated yet)
                    console.log("Firebase Auth failed, trying legacy...", authError.code);
                }
            }

            // 2. Legacy Login (original logic)
            const normalizedInput = (username || '').toLowerCase().trim();

            // Search by username OR email in legacy accounts
            const qUsername = query(collection(db_firestore, COLLECTIONS.USERS), where('username', '==', normalizedInput), limit(1));
            const qEmail = query(collection(db_firestore, COLLECTIONS.USERS), where('email', '==', normalizedInput), limit(1));

            const [snapUsername, snapEmail] = await Promise.all([getDocs(qUsername), getDocs(qEmail)]);
            const userDoc = snapUsername.docs[0] || snapEmail.docs[0];

            if (userDoc) {
                const userData = userDoc.data();

                // Simple password check
                if (userData.password === password) {
                    // MIGRATION: Auto-create Firebase Auth account if email exists
                    if (userData.email) {
                        try {
                            console.log("Migrating/Syncing user to Firebase Auth:", userData.email);
                            let userCredential;

                            try {
                                userCredential = await createUserWithEmailAndPassword(auth, userData.email, password);
                            } catch (createError) {
                                if (createError.code === 'auth/email-already-in-use') {
                                    console.log("Account exists in Auth, attempting sync...");
                                    userCredential = await signInWithEmailAndPassword(auth, userData.email, password);
                                } else {
                                    throw createError;
                                }
                            }

                            // Update Firestore with the new UID for permanent sync
                            if (userCredential && userCredential.user) {
                                await updateDoc(doc(db_firestore, COLLECTIONS.USERS, userDoc.id), {
                                    uid: userCredential.user.uid
                                });
                                return { id: userDoc.id, uid: userCredential.user.uid, ...userData };
                            }
                        } catch (migrationError) {
                            console.error("Critical Migration/Sync error:", migrationError);
                            // Even if migration fails, return legacy data so they can enter
                        }
                    }
                    return { id: userDoc.id, ...userData };
                }
            }
            return null;
        } catch (e) {
            console.error("CRITICAL Login Error:", e);
            // Re-throw with more context
            const error = new Error(e.message || "Error desconocido");
            error.code = e.code;
            throw error;
        }
    },

    // Auth Helpers
    logout: async () => {
        await signOut(auth);
        localStorage.removeItem('app_logged_user');
    },

    onAuthStateChanged: (callback) => {
        return onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Fetch full user profile from DB - Ensured case-insensitivity
                const q = query(
                    collection(db_firestore, COLLECTIONS.USERS),
                    where('email', '==', (user.email || '').toLowerCase()),
                    limit(1)
                );
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    callback({ uid: user.uid, email: user.email, id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() });
                } else {
                    callback(user);
                }
            } else {
                callback(null);
            }
        });
    },

    getUsers: async () => {
        const querySnapshot = await getDocs(collection(db_firestore, COLLECTIONS.USERS));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    subscribeUsers: (callback) => {
        try {
            console.log("Firebase: Iniciando suscripción de usuarios...");
            return onSnapshot(collection(db_firestore, COLLECTIONS.USERS), (snapshot) => {
                console.log("Firebase: Usuarios actualizados");
                const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(users);
            }, (error) => {
                console.error("Firebase Error (Usuarios):", error);
                alert("Error de conexión con la base de datos (Usuarios). Verifique su conexión.");
            });
        } catch (e) {
            console.error("Critical Firebase Error:", e);
            return () => { }; // Return safe cleanup function
        }
    },

    addUser: async (userData) => {
        const normalizedData = {
            ...userData,
            email: (userData.email || '').toLowerCase().trim(),
            username: (userData.username || '').toLowerCase().trim(),
            createdAt: new Date().toISOString()
        };
        const docRef = await addDoc(collection(db_firestore, COLLECTIONS.USERS), normalizedData);
        return { id: docRef.id, ...normalizedData };
    },

    updateUser: async (userId, data) => {
        const userRef = doc(db_firestore, COLLECTIONS.USERS, userId);
        const normalizedData = { ...data };
        if (normalizedData.email) normalizedData.email = normalizedData.email.toLowerCase().trim();
        if (normalizedData.username) normalizedData.username = normalizedData.username.toLowerCase().trim();

        await updateDoc(userRef, normalizedData);
    },

    deleteUser: async (userId) => {
        const userRef = doc(db_firestore, COLLECTIONS.USERS, userId);
        await deleteDoc(userRef);
    },

    // Tickets Management
    subscribeTickets: (callback) => {
        try {
            console.log("Firebase: Iniciando suscripción de tickets...");
            // Updated query to filter out soft-deleted tickets
            const q = query(
                collection(db_firestore, COLLECTIONS.TICKETS),
                orderBy("createdAt", "desc")
            );
            return onSnapshot(q, (snapshot) => {
                console.log("Firebase: Tickets actualizados");
                const tickets = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(t => !t.deleted); // Client-side filtering as initial safety, though query should ideally handle it
                callback(tickets);
            }, (error) => {
                console.error("Firebase Error (Tickets):", error);
            });
        } catch (e) {
            console.error("Critical Firebase Error (Tickets):", e);
            return () => { }; // Return safe cleanup function
        }
    },

    addTicket: async (ticket) => {
        const docRef = await addDoc(collection(db_firestore, COLLECTIONS.TICKETS), {
            ...ticket,
            status: 'open',
            deleted: false, // Initializing soft-delete flag
            createdAt: new Date().toISOString()
        });
        return { id: docRef.id, ...ticket };
    },

    updateTicket: async (ticketId, data) => {
        const ticketRef = doc(db_firestore, COLLECTIONS.TICKETS, ticketId);
        await updateDoc(ticketRef, data);
    },

    deleteTicket: async (ticketId) => {
        const ticketRef = doc(db_firestore, COLLECTIONS.TICKETS, ticketId);
        // Soft delete: keep the document but mark as deleted
        await updateDoc(ticketRef, { deleted: true, deletedAt: new Date().toISOString() });
    },

    // Migration: set type='soporte' on all tickets that don't have a type field
    migrateTicketsType: async () => {
        const q = query(collection(db_firestore, COLLECTIONS.TICKETS));
        const snapshot = await getDocs(q);
        let updated = 0;
        const promises = [];
        snapshot.docs.forEach(docSnap => {
            const data = docSnap.data();
            if (!data.type) {
                promises.push(
                    updateDoc(doc(db_firestore, COLLECTIONS.TICKETS, docSnap.id), { type: 'soporte' })
                );
                updated++;
            }
        });
        await Promise.all(promises);
        return updated;
    },


    subscribeComputers: (callback) => {
        try {
            console.log("Firebase: Iniciando suscripción de computadores...");
            const q = query(
                collection(db_firestore, COLLECTIONS.COMPUTERS),
                orderBy("createdAt", "desc")
            );
            return onSnapshot(q, (snapshot) => {
                console.log("Firebase: Computadores actualizados");
                const computers = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(c => !c.deleted);
                callback(computers);
            }, (error) => {
                console.error("Firebase Error (Computers):", error);
            });
        } catch (e) {
            console.error("Critical Firebase Error (Computers):", e);
            return () => { };
        }
    },

    addComputer: async (computer) => {
        const docRef = await addDoc(collection(db_firestore, COLLECTIONS.COMPUTERS), {
            ...computer,
            deleted: false,
            createdAt: new Date().toISOString(),
            maintenanceLog: [] // Initialize empty log
        });
        return { id: docRef.id, ...computer };
    },

    updateComputer: async (computerId, data) => {
        const compRef = doc(db_firestore, COLLECTIONS.COMPUTERS, computerId);
        await updateDoc(compRef, data);
    },

    deleteComputer: async (computerId) => {
        const compRef = doc(db_firestore, COLLECTIONS.COMPUTERS, computerId);
        await updateDoc(compRef, { deleted: true, deletedAt: new Date().toISOString() });
    },

    // Indicators Management
    subscribeIndicators: (callback) => {
        try {
            console.log("Firebase: Iniciando suscripción de indicadores...");
            const q = query(
                collection(db_firestore, COLLECTIONS.INDICATORS),
                orderBy("createdAt", "desc")
            );
            return onSnapshot(q, (snapshot) => {
                console.log("Firebase: Indicadores actualizados");
                const indicators = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(i => !i.deleted);
                callback(indicators);
            }, (error) => {
                console.error("Firebase Error (Indicators):", error);
            });
        } catch (e) {
            console.error("Critical Firebase Error (Indicators):", e);
            return () => { };
        }
    },

    addIndicator: async (indicator) => {
        const docRef = await addDoc(collection(db_firestore, COLLECTIONS.INDICATORS), {
            ...indicator,
            deleted: false,
            createdAt: new Date().toISOString()
        });
        return { id: docRef.id, ...indicator };
    },

    deleteIndicator: async (indicatorId) => {
        const indRef = doc(db_firestore, COLLECTIONS.INDICATORS, indicatorId);
        await updateDoc(indRef, { deleted: true, deletedAt: new Date().toISOString() });
    },

    // SGI Process Management
    subscribeSGIProcesses: (callback) => {
        try {
            console.log("Firebase: Suscribiendo a procesos SGI...");
            const q = query(collection(db_firestore, COLLECTIONS.SGI_PROCESSES), orderBy("name"));
            return onSnapshot(q, (snapshot) => {
                const processes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(processes);
            }, (error) => console.error("Firebase Error (SGI Processes):", error));
        } catch (e) {
            console.error("Critical Firebase Error (SGI Processes):", e);
            return () => { };
        }
    },

    addSGIProcess: async (processData) => {
        const docRef = await addDoc(collection(db_firestore, COLLECTIONS.SGI_PROCESSES), {
            ...processData,
            createdAt: new Date().toISOString()
        });
        return { id: docRef.id, ...processData };
    },

    updateSGIProcess: async (processId, data) => {
        const procRef = doc(db_firestore, COLLECTIONS.SGI_PROCESSES, processId);
        await updateDoc(procRef, data);
    },

    deleteSGIProcess: async (processId) => {
        const procRef = doc(db_firestore, COLLECTIONS.SGI_PROCESSES, processId);
        await deleteDoc(procRef);
    },

    // SGI Indicator Types Management
    subscribeSGIIndicatorTypes: (callback) => {
        const q = query(collection(db_firestore, COLLECTIONS.SGI_INDICATOR_TYPES), orderBy("name"));
        return onSnapshot(q, (snapshot) => {
            const types = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(types);
        });
    },

    addSGIIndicatorType: async (typeData) => {
        const docRef = await addDoc(collection(db_firestore, COLLECTIONS.SGI_INDICATOR_TYPES), {
            ...typeData,
            createdAt: new Date().toISOString()
        });
        return { id: docRef.id, ...typeData };
    },

    deleteSGIIndicatorType: async (typeId) => {
        const docRef = doc(db_firestore, COLLECTIONS.SGI_INDICATOR_TYPES, typeId);
        await deleteDoc(docRef);
    },

    // SGI Evidence Management
    submitSGIEvidence: async (evidenceData) => {
        const docRef = await addDoc(collection(db_firestore, COLLECTIONS.SGI_EVIDENCE), {
            ...evidenceData,
            timestamp: new Date().toISOString()
        });
        return { id: docRef.id, ...evidenceData };
    },

    deleteSGIEvidence: async (evidenceId) => {
        const docRef = doc(db_firestore, COLLECTIONS.SGI_EVIDENCE, evidenceId);
        await deleteDoc(docRef);
    },

    updateSGIEvidence: async (evidenceId, data) => {
        const docRef = doc(db_firestore, COLLECTIONS.SGI_EVIDENCE, evidenceId);
        await updateDoc(docRef, data);
    },

    subscribeSGIEvidence: (processId, callback) => {
        const q = query(
            collection(db_firestore, COLLECTIONS.SGI_EVIDENCE),
            where('processId', '==', processId)
        );
        return onSnapshot(q, (snapshot) => {
            const evidence = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort in-memory to avoid composite index requirement
            const sortedEvidence = evidence.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            callback(sortedEvidence);
        });
    },

    // Auth Sessions (Still in LocalStorage as it's per-device)
    getSession: () => {
        try {
            const session = localStorage.getItem('app_logged_user');
            return session ? JSON.parse(session) : null;
        } catch (e) {
            localStorage.removeItem('app_logged_user');
            return null;
        }
    },

    setSession: (user) => {
        localStorage.setItem('app_logged_user', JSON.stringify(user));
    },

    clearSession: () => {
        localStorage.removeItem('app_logged_user');
    },
    // Visits Management
    getVisits: (callback) => {
        const q = query(collection(db_firestore, COLLECTIONS.VISITS), orderBy('date', 'asc'));
        return onSnapshot(q, (snapshot) => {
            const visits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(visits);
        });
    },
    addVisit: async (visit) => {
        const docRef = await addDoc(collection(db_firestore, COLLECTIONS.VISITS), {
            ...visit,
            createdAt: new Date().toISOString()
        });
        return { id: docRef.id, ...visit };
    },
    updateVisit: async (visitId, data) => {
        const visitRef = doc(db_firestore, COLLECTIONS.VISITS, visitId);
        await updateDoc(visitRef, data);
    },
    deleteVisit: async (visitId) => {
        const visitRef = doc(db_firestore, COLLECTIONS.VISITS, visitId);
        await deleteDoc(visitRef);
    },

    // Customers Management
    subscribeCustomers: (callback) => {
        try {
            console.log("Firebase: Suscribiendo a Clientes...");
            const q = query(collection(db_firestore, COLLECTIONS.CUSTOMERS), orderBy("name"));
            return onSnapshot(q, (snapshot) => {
                const customers = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(c => !c.deleted);
                callback(customers);
            }, (error) => console.error("Firebase Error (Customers):", error));
        } catch (e) {
            console.error("Critical Firebase Error (Customers):", e);
            return () => { };
        }
    },

    addCustomer: async (customerData) => {
        const docRef = await addDoc(collection(db_firestore, COLLECTIONS.CUSTOMERS), {
            ...customerData,
            deleted: false,
            createdAt: new Date().toISOString()
        });
        return { id: docRef.id, ...customerData };
    },

    updateCustomer: async (customerId, data) => {
        const docRef = doc(db_firestore, COLLECTIONS.CUSTOMERS, customerId);
        await updateDoc(docRef, { ...data, updatedAt: new Date().toISOString() });
    },

    deleteCustomer: async (customerId) => {
        const docRef = doc(db_firestore, COLLECTIONS.CUSTOMERS, customerId);
        // Soft delete
        await updateDoc(docRef, { deleted: true, deletedAt: new Date().toISOString() });
    },

    // Sales / Quotations Management
    subscribeQuotations: (callback) => {
        try {
            console.log("Firebase: Suscribiendo a Cotizaciones...");
            const q = query(collection(db_firestore, COLLECTIONS.QUOTATIONS), orderBy("createdAt", "desc"));
            return onSnapshot(q, (snapshot) => {
                console.log("Firebase: Cotizaciones actualizadas");
                const quotations = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(q => !q.deleted);
                callback(quotations);
            }, (error) => console.error("Firebase Error (Quotations):", error));
        } catch (e) {
            console.error("Critical Firebase Error (Quotations):", e);
            return () => { };
        }
    },

    addQuotation: async (quotationData) => {
        const docRef = await addDoc(collection(db_firestore, COLLECTIONS.QUOTATIONS), {
            ...quotationData,
            deleted: false,
            createdAt: new Date().toISOString()
        });
        return { id: docRef.id, ...quotationData };
    },

    updateQuotation: async (quotationId, data) => {
        const docRef = doc(db_firestore, COLLECTIONS.QUOTATIONS, quotationId);
        await updateDoc(docRef, data);
    },

    deleteQuotation: async (quotationId) => {
        const docRef = doc(db_firestore, COLLECTIONS.QUOTATIONS, quotationId);
        await updateDoc(docRef, { deleted: true, deletedAt: new Date().toISOString() });
    },

    promoteToAdmin: async (email) => {
        try {
            const q = query(collection(db_firestore, COLLECTIONS.USERS), where('email', '==', email));
            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                // Create new doc
                await addDoc(collection(db_firestore, COLLECTIONS.USERS), {
                    email,
                    role: 'admin',
                    username: email.split('@')[0],
                    name: 'Admin Rescue',
                    createdAt: new Date().toISOString()
                });
            } else {
                // Update existing
                await updateDoc(doc(db_firestore, COLLECTIONS.USERS, snapshot.docs[0].id), {
                    role: 'admin'
                });
            }
            return true;
        } catch (e) {
            console.error("Error promoting user:", e);
            return false;
        }
    },

    resetPassword: async (email) => {
        try {
            await sendPasswordResetEmail(auth, email);
            return true;
        } catch (e) {
            console.error("Firebase Password Reset Error:", e);
            throw e;
        }
    },
    updateUserPassword: async (userId, newPassword) => {
        try {
            // 1. Update in Firebase Auth if available
            const user = auth.currentUser;
            if (user) {
                await updatePassword(user, newPassword);
            }

            // 2. Update in Firestore for legacy/admin fallback
            const userRef = doc(db_firestore, COLLECTIONS.USERS, userId);
            await updateDoc(userRef, {
                password: newPassword,
                updatedAt: new Date().toISOString()
            });
            return true;
        } catch (e) {
            console.error("Error updating password:", e);
            throw e;
        }
    },

    // Sales ERP Management
    subscribeSales: (callback) => {
        try {
            console.log("Firebase: Suscribiendo a Ventas ERP...");
            const q = query(collection(db_firestore, COLLECTIONS.VENTAS), orderBy("createdAt", "desc"));
            return onSnapshot(q, (snapshot) => {
                const sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(sales);
            }, (error) => console.error("Firebase Error (Sales):", error));
        } catch (e) {
            console.error("Critical Firebase Error (Sales):", e);
            return () => { };
        }
    },

    addSale: async (saleData) => {
        const docRef = await addDoc(collection(db_firestore, COLLECTIONS.VENTAS), {
            ...saleData,
            createdAt: new Date().toISOString()
        });
        return { id: docRef.id, ...saleData };
    },

    updateSale: async (saleId, data) => {
        const docRef = doc(db_firestore, COLLECTIONS.VENTAS, saleId);
        await updateDoc(docRef, { ...data, updatedAt: new Date().toISOString() });
    },

    deleteSale: async (saleId) => {
        const docRef = doc(db_firestore, COLLECTIONS.VENTAS, saleId);
        await deleteDoc(docRef);
    },

    // Global Configuration Management
    getGlobalConfig: async () => {
        try {
            const docRef = doc(db_firestore, COLLECTIONS.CONFIGURACION_GLOBAL, 'default');
            const docSnap = await getDoc(docRef);

            const defaults = {
                IVA: 0.19,
                PORCENTAJE_COMISION_GLOBAL: 0.0025,
                COMISION_MINIMA: 50,
                CARGO_04: 0.004,
                CARGO_04_MINIMO: 220000,
                CARGO_011: 0.0011,
                CARGO_10: 0.10,
                // Nuevas variables Elspec
                trm_actual: 4268.7,
                margen_sistema: 1.66,
                margen_instalacion: 1.15,
                margen_transporte: 1.35,
                factor_imprevistos: 0.04,
                factor_poliza: 0.008,
                factor_negociacion: 0.03,
                TRANSPORTE: {
                    MARITIMO: { FACTOR_1: 90, FACTOR_2: 4, MULTIPLICADOR: 1.2, IVA: 0.19, ADICIONAL: 0.10 },
                    AEREO: { FACTOR_1: 2.2, FACTOR_2: 0.5, MULTIPLICADOR: 1.18 }
                },
                geminiApiKey: '',
                lastUpdated: new Date().toISOString()
            };

            if (docSnap.exists()) {
                const data = docSnap.data();
                // Ensure new default parameters are present even on old documents
                return {
                    ...data,
                    trm_actual: data.trm_actual ?? defaults.trm_actual,
                    margen_sistema: data.margen_sistema ?? defaults.margen_sistema,
                    margen_instalacion: data.margen_instalacion ?? defaults.margen_instalacion,
                    margen_transporte: data.margen_transporte ?? defaults.margen_transporte,
                    factor_imprevistos: data.factor_imprevistos ?? defaults.factor_imprevistos,
                    factor_poliza: data.factor_poliza ?? defaults.factor_poliza,
                    factor_negociacion: data.factor_negociacion ?? defaults.factor_negociacion,
                    TRANSPORTE: data.TRANSPORTE ?? defaults.TRANSPORTE
                };
            } else {
                // Initialize defaults if not exists
                await setDoc(docRef, defaults);
                return defaults;
            }
        } catch (e) {
            console.error("Error fetching global config:", e);
            return null;
        }
    },

    updateGlobalConfig: async (data) => {
        const docRef = doc(db_firestore, COLLECTIONS.CONFIGURACION_GLOBAL, 'default');
        await updateDoc(docRef, { ...data, lastUpdated: new Date().toISOString() });
    },

    // --- PRODUCTS ---
    subscribeProducts: (callback) => {
        try {
            const q = query(collection(db_firestore, COLLECTIONS.PRODUCTS), orderBy("name", "asc"));
            return onSnapshot(q, (snapshot) => {
                const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(products);
            }, (error) => console.error("Firebase Error (Products):", error));
        } catch (e) {
            console.error("Critical Firebase Error (Products):", e);
            return () => { };
        }
    },

    addProductsBulk: async (products) => {
        try {
            const batches = [];
            for (let i = 0; i < products.length; i += 500) {
                const batch = writeBatch(db_firestore);
                const chunk = products.slice(i, i + 500);
                chunk.forEach(p => {
                    const docRef = doc(collection(db_firestore, COLLECTIONS.PRODUCTS));
                    batch.set(docRef, {
                        ...p,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                });
                batches.push(batch.commit());
            }
            await Promise.all(batches);
            return true;
        } catch (e) {
            console.error("Error adding products bulk:", e);
            throw e;
        }
    },

    deleteAllProducts: async () => {
        try {
            const q = query(collection(db_firestore, COLLECTIONS.PRODUCTS));
            const snapshot = await getDocs(q);
            const batch = writeBatch(db_firestore);
            snapshot.docs.forEach((doc) => batch.delete(doc.ref));
            await batch.commit();
            return true;
        } catch (e) {
            console.error("Error deleting all products:", e);
            throw e;
        }
    },

    // --- NOTIFICATIONS ---
    subscribeNotifications: (userRole, userId, callback) => {
        try {
            const normalizedRole = userRole ? String(userRole).toLowerCase() : '';
            console.log("Firebase: Suscribiendo a Notificaciones para rol:", normalizedRole);
            const q = query(
                collection(db_firestore, COLLECTIONS.NOTIFICATIONS),
                orderBy("createdAt", "desc"),
                limit(50)
            );
            return onSnapshot(q, (snapshot) => {
                const allNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Filtrar por rol o por usuario específico en el cliente para evitar el error de índice compuesto en Firebase
                const notifications = allNotifications.filter(n =>
                    (n.targetRoles || []).includes(normalizedRole) ||
                    (n.targetUsers || []).includes(userId)
                );

                // Filter client side to check if specific user has read it
                const unread = notifications.filter(n => !(n.readBy || []).includes(userId));
                callback({ all: notifications, unread });
            }, (error) => console.error("Firebase Error (Notifications):", error));
        } catch (e) {
            console.error("Critical Firebase Error (Notifications):", e);
            return () => { };
        }
    },

    addNotification: async (notificationData) => {
        try {
            const docRef = await addDoc(collection(db_firestore, COLLECTIONS.NOTIFICATIONS), {
                ...notificationData,
                readBy: [],
                createdAt: new Date().toISOString()
            });
            return { id: docRef.id, ...notificationData };
        } catch (e) {
            console.error("Error adding notification:", e);
            throw e;
        }
    },

    markNotificationAsRead: async (notificationId, userId) => {
        try {
            const docRef = doc(db_firestore, COLLECTIONS.NOTIFICATIONS, notificationId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                const readBy = data.readBy || [];
                if (!readBy.includes(userId)) {
                    await updateDoc(docRef, {
                        readBy: [...readBy, userId]
                    });
                }
            }
        } catch (e) {
            console.error("Error marking notification as read:", e);
            throw e;
        }
    },
    // --- TERMS AND CONDITIONS ---
    subscribeTerms: (callback) => {
        try {
            const q = query(collection(db_firestore, COLLECTIONS.TERMINOS_CONDICIONES), orderBy("orden", "asc"));
            return onSnapshot(q, (snapshot) => {
                const terms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(terms);
            }, (error) => console.error("Firebase Error (Terms):", error));
        } catch (e) {
            console.error("Critical Firebase Error (Terms):", e);
            return () => { };
        }
    },

    updateTerm: async (termId, data) => {
        const docRef = doc(db_firestore, COLLECTIONS.TERMINOS_CONDICIONES, termId);
        await updateDoc(docRef, { ...data, updatedAt: new Date().toISOString() });
    },

    addTerm: async (termData) => {
        const docRef = await addDoc(collection(db_firestore, COLLECTIONS.TERMINOS_CONDICIONES), {
            ...termData,
            createdAt: new Date().toISOString()
        });
        return { id: docRef.id, ...termData };
    },

    deleteTerm: async (termId) => {
        const docRef = doc(db_firestore, COLLECTIONS.TERMINOS_CONDICIONES, termId);
        await deleteDoc(docRef);
    },

    // --- CAMPAIGNS ---
    saveCampaign: async (campaignData) => {
        try {
            const docRef = await addDoc(collection(db_firestore, COLLECTIONS.CAMPAIGNS), {
                ...campaignData,
                timestamp: new Date().toISOString(),
                stats: {
                    sent: campaignData.contactsCount || 0,
                    delivered: 0,
                    opened: 0,
                    clicked: 0,
                    replied: 0
                }
            });
            return { id: docRef.id, ...campaignData };
        } catch (e) {
            console.error("Error saving campaign to history:", e);
            throw e;
        }
    },

    getCampaigns: async () => {
        try {
            const q = query(collection(db_firestore, COLLECTIONS.CAMPAIGNS), orderBy("timestamp", "desc"));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (e) {
            console.error("Error getting campaigns history:", e);
            return [];
        }
    },

    // Allows incrementing stats remotely (e.g. from an N8N webhook hit)
    incrementCampaignStat: async (campaignId, statType) => {
        if (!['sent', 'delivered', 'opened', 'clicked', 'replied'].includes(statType)) {
            throw new Error('Invalid stat type');
        }
        try {
            const docRef = doc(db_firestore, COLLECTIONS.CAMPAIGNS, campaignId);
            // Construct the path for incrementing, e.g., 'stats.opened'
            const updateField = `stats.${statType}`;
            await updateDoc(docRef, {
                [updateField]: increment(1),
                lastInteraction: new Date().toISOString()
            });
            return true;
        } catch (error) {
            console.error(`Error incrementing ${statType} for campaign ${campaignId}:`, error);
            throw error;
        }
    }
};

export default db;
