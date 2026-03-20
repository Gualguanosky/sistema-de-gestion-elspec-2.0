/**
 * DB Service - Unificado MariaDB VPS (v2.1 - COMPLETO)
 * Este archivo centraliza todas las llamadas a la base de datos MariaDB a través del api-gateway.
 * Firebase SDK ha sido removido por completo.
 */

const API_BASE_URL = '/api';

const api = {
    get: async (table) => {
        const res = await fetch(`${API_BASE_URL}/db/${table}`);
        if (!res.ok) throw new Error(`Error API (${table}): ${res.statusText}`);
        return res.json();
    },
    post: async (table, data) => {
        const res = await fetch(`${API_BASE_URL}/db/${table}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(`Error API POST (${table}): ${res.statusText}`);
        return res.json();
    },
    put: async (table, id, data) => {
        const res = await fetch(`${API_BASE_URL}/db/${table}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(`Error API PUT (${table}): ${res.statusText}`);
        return res.json();
    },
    delete: async (table, id) => {
        const res = await fetch(`${API_BASE_URL}/db/${table}/${id}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error(`Error API DELETE (${table}): ${res.statusText}`);
        return res.json();
    },
    login: async (username, password) => {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!res.ok) {
            if (res.status === 401) return null;
            throw new Error('Error de autenticación servidor');
        }
        return res.json();
    }
};

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
    CONFIGURACION_GLOBAL: 'configuracion_global',
    PRODUCTS: 'products',
    NOTIFICATIONS: 'notifications',
    TERMINOS_CONDICIONES: 'terminos_condiciones',
    CAMPAIGNS: 'campaigns',
    PROJECTS: 'projects',
    LOGISTICS: 'logistics',
    LEADS: 'leads'
};

const db = {
    // --- AUTH & SESSIONS ---
    loginUser: async (username, password) => {
        try {
            const user = await api.login(username, password);
            if (user) {
                db.setSession(user);
                return user;
            }
            return null;
        } catch (e) {
            console.error("Login Error:", e);
            throw new Error("Error de conexión con la base de datos.");
        }
    },
    logout: () => {
        db.clearSession();
        window.dispatchEvent(new Event('auth-status-changed'));
    },
    onAuthStateChanged: (callback) => {
        const checkAuth = async () => {
            const sessionUser = db.getSession();
            callback(sessionUser);
        };
        checkAuth();
        const listener = () => checkAuth();
        window.addEventListener('auth-status-changed', listener);
        return () => window.removeEventListener('auth-status-changed', listener);
    },
    getSession: () => {
        try {
            const session = localStorage.getItem('app_logged_user');
            return session ? JSON.parse(session) : null;
        } catch (e) { return null; }
    },
    setSession: (user) => localStorage.setItem('app_logged_user', JSON.stringify(user)),
    clearSession: () => localStorage.removeItem('app_logged_user'),

    // --- USERS ---
    getUsers: () => api.get(COLLECTIONS.USERS),
    subscribeUsers: (callback) => {
        api.get(COLLECTIONS.USERS).then(callback).catch(console.error);
        const interval = setInterval(() => api.get(COLLECTIONS.USERS).then(callback).catch(console.error), 30000);
        return () => clearInterval(interval);
    },
    addUser: (userData) => api.post(COLLECTIONS.USERS, userData),
    updateUser: (userId, data) => api.put(COLLECTIONS.USERS, userId, data),
    deleteUser: (userId) => api.delete(COLLECTIONS.USERS, userId),

    // --- TICKETS ---
    subscribeTickets: (callback) => {
        api.get(COLLECTIONS.TICKETS).then(callback);
        const interval = setInterval(() => api.get(COLLECTIONS.TICKETS).then(callback), 30000);
        return () => clearInterval(interval);
    },
    addTicket: (ticket) => api.post(COLLECTIONS.TICKETS, { ...ticket, status: 'open', createdAt: new Date().toISOString() }),
    updateTicket: (ticketId, data) => api.put(COLLECTIONS.TICKETS, ticketId, data),
    deleteTicket: (ticketId) => api.delete(COLLECTIONS.TICKETS, ticketId),

    // --- COMPUTERS ---
    subscribeComputers: (callback) => {
        api.get(COLLECTIONS.COMPUTERS).then(callback);
        const interval = setInterval(() => api.get(COLLECTIONS.COMPUTERS).then(callback), 30000);
        return () => clearInterval(interval);
    },
    addComputer: (data) => api.post(COLLECTIONS.COMPUTERS, { ...data, createdAt: new Date().toISOString() }),
    updateComputer: (id, data) => api.put(COLLECTIONS.COMPUTERS, id, data),
    deleteComputer: (id) => api.delete(COLLECTIONS.COMPUTERS, id),

    // --- PRODUCTS ---
    getProducts: () => api.get(COLLECTIONS.PRODUCTS),
    subscribeProducts: (callback) => {
        api.get(COLLECTIONS.PRODUCTS).then(callback);
        const interval = setInterval(() => api.get(COLLECTIONS.PRODUCTS).then(callback), 60000);
        return () => clearInterval(interval);
    },

    // --- SGI / INDICATORS ---
    subscribeIndicators: (callback) => {
        api.get(COLLECTIONS.INDICATORS).then(callback);
        const interval = setInterval(() => api.get(COLLECTIONS.INDICATORS).then(callback), 30000);
        return () => clearInterval(interval);
    },
    addIndicator: (data) => api.post(COLLECTIONS.INDICATORS, { ...data, createdAt: new Date().toISOString() }),
    deleteIndicator: (id) => api.delete(COLLECTIONS.INDICATORS, id),

    subscribeSGIProcesses: (callback) => {
        api.get(COLLECTIONS.SGI_PROCESSES).then(callback);
        const interval = setInterval(() => api.get(COLLECTIONS.SGI_PROCESSES).then(callback), 30000);
        return () => clearInterval(interval);
    },
    addSGIProcess: (data) => api.post(COLLECTIONS.SGI_PROCESSES, data),
    updateSGIProcess: (id, data) => api.put(COLLECTIONS.SGI_PROCESSES, id, data),
    deleteSGIProcess: (id) => api.delete(COLLECTIONS.SGI_PROCESSES, id),

    subscribeSGIIndicatorTypes: (callback) => {
        api.get(COLLECTIONS.SGI_INDICATOR_TYPES).then(callback);
        const interval = setInterval(() => api.get(COLLECTIONS.SGI_INDICATOR_TYPES).then(callback), 30000);
        return () => clearInterval(interval);
    },
    addSGIIndicatorType: (data) => api.post(COLLECTIONS.SGI_INDICATOR_TYPES, data),
    deleteSGIIndicatorType: (id) => api.delete(COLLECTIONS.SGI_INDICATOR_TYPES, id),

    subscribeSGIEvidence: (processId, callback) => {
        const fetch = () => api.get(COLLECTIONS.SGI_EVIDENCE).then(data => {
            const filtered = data.filter(e => e.processId === processId);
            callback(filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
        });
        fetch();
        const interval = setInterval(fetch, 30000);
        return () => clearInterval(interval);
    },
    submitSGIEvidence: (data) => api.post(COLLECTIONS.SGI_EVIDENCE, { ...data, timestamp: new Date().toISOString() }),
    updateSGIEvidence: (id, data) => api.put(COLLECTIONS.SGI_EVIDENCE, id, data),
    deleteSGIEvidence: (id) => api.delete(COLLECTIONS.SGI_EVIDENCE, id),

    // --- VISITS ---
    getVisits: (callback) => {
        api.get(COLLECTIONS.VISITS).then(callback);
        const interval = setInterval(() => api.get(COLLECTIONS.VISITS).then(callback), 30000);
        return () => clearInterval(interval);
    },
    addVisit: (data) => api.post(COLLECTIONS.VISITS, { ...data, createdAt: new Date().toISOString() }),
    updateVisit: (id, data) => api.put(COLLECTIONS.VISITS, id, data),
    deleteVisit: (id) => api.delete(COLLECTIONS.VISITS, id),

    // --- CUSTOMERS & SALES ---
    subscribeCustomers: (callback) => {
        api.get(COLLECTIONS.CUSTOMERS).then(callback);
        const interval = setInterval(() => api.get(COLLECTIONS.CUSTOMERS).then(callback), 60000);
        return () => clearInterval(interval);
    },
    addCustomer: (data) => api.post(COLLECTIONS.CUSTOMERS, { ...data, createdAt: new Date().toISOString() }),
    updateCustomer: (id, data) => api.put(COLLECTIONS.CUSTOMERS, id, data),
    deleteCustomer: (id) => api.delete(COLLECTIONS.CUSTOMERS, id),

    subscribeSales: (callback) => {
        api.get(COLLECTIONS.VENTAS).then(callback);
        const interval = setInterval(() => api.get(COLLECTIONS.VENTAS).then(callback), 30000);
        return () => clearInterval(interval);
    },
    addSale: (data) => api.post(COLLECTIONS.VENTAS, { ...data, createdAt: new Date().toISOString() }),
    updateSale: (id, data) => api.put(COLLECTIONS.VENTAS, id, data),
    deleteSale: (id) => api.delete(COLLECTIONS.VENTAS, id),

    subscribeQuotations: (callback) => {
        api.get(COLLECTIONS.QUOTATIONS).then(callback);
        const interval = setInterval(() => api.get(COLLECTIONS.QUOTATIONS).then(callback), 30000);
        return () => clearInterval(interval);
    },
    addQuotation: (data) => api.post(COLLECTIONS.QUOTATIONS, data),
    updateQuotation: (id, data) => api.put(COLLECTIONS.QUOTATIONS, id, data),
    deleteQuotation: (id) => api.delete(COLLECTIONS.QUOTATIONS, id),

    // --- LEADS / CRM ---
    subscribeLeads: (callback) => {
        api.get(COLLECTIONS.LEADS).then(callback);
        const interval = setInterval(() => api.get(COLLECTIONS.LEADS).then(callback), 15000);
        return () => clearInterval(interval);
    },
    addLead: (data) => api.post(COLLECTIONS.LEADS, { ...data, status: data.status || 'NUEVO', createdAt: new Date().toISOString() }),
    updateLead: (id, data) => api.put(COLLECTIONS.LEADS, id, data),
    deleteLead: (id) => api.delete(COLLECTIONS.LEADS, id),

    // --- CONFIG GLOBAL & TERMS ---
    getGlobalConfig: () => api.get(COLLECTIONS.CONFIGURACION_GLOBAL).then(rows => rows[0] || {}),
    updateGlobalConfig: (data) => api.put(COLLECTIONS.CONFIGURACION_GLOBAL, 1, data),

    subscribeTerms: (callback) => {
        api.get(COLLECTIONS.TERMINOS_CONDICIONES).then(callback);
        const interval = setInterval(() => api.get(COLLECTIONS.TERMINOS_CONDICIONES).then(callback), 60000);
        return () => clearInterval(interval);
    },
    addTerm: (data) => api.post(COLLECTIONS.TERMINOS_CONDICIONES, { ...data, createdAt: new Date().toISOString() }),
    updateTerm: (id, data) => api.put(COLLECTIONS.TERMINOS_CONDICIONES, id, data),
    deleteTerm: (id) => api.delete(COLLECTIONS.TERMINOS_CONDICIONES, id),

    // --- PROJECTS & LOGISTICS ---
    subscribeProjects: (callback) => {
        api.get(COLLECTIONS.PROJECTS).then(callback);
        const interval = setInterval(() => api.get(COLLECTIONS.PROJECTS).then(callback), 30000);
        return () => clearInterval(interval);
    },
    addProject: (data) => api.post(COLLECTIONS.PROJECTS, { ...data, createdAt: new Date().toISOString() }),
    updateProject: (id, data) => api.put(COLLECTIONS.PROJECTS, id, data),

    subscribeLogistics: (callback) => {
        api.get(COLLECTIONS.LOGISTICS).then(callback);
        const interval = setInterval(() => api.get(COLLECTIONS.LOGISTICS).then(callback), 30000);
        return () => clearInterval(interval);
    },
    addLogisticsRow: (data) => api.post(COLLECTIONS.LOGISTICS, { ...data, createdAt: new Date().toISOString() }),
    updateLogisticsRow: (id, data) => api.put(COLLECTIONS.LOGISTICS, id, data),

    // --- NOTIFICATIONS ---
    subscribeNotifications: (userRole, userId, callback) => {
        const fetchNotifs = async () => {
            try {
                const all = await api.get(COLLECTIONS.NOTIFICATIONS);
                const filtered = all.filter(n => 
                    (n.targetRoles || '').includes(userRole) || 
                    (n.targetUsers || '').includes(userId)
                );
                callback({ all: filtered, unread: filtered.filter(n => !(n.readBy || '').includes(userId)) });
            } catch (e) { console.error(e); }
        };
        fetchNotifs();
        const interval = setInterval(fetchNotifs, 30000);
        return () => clearInterval(interval);
    },

    // --- CAMPAIGNS ---
    getCampaigns: () => api.get(COLLECTIONS.CAMPAIGNS),
    saveCampaign: (data) => api.post(COLLECTIONS.CAMPAIGNS, { ...data, timestamp: new Date().toISOString() }),

    // --- UTILS ---
    uploadFile: async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    },
    initializeDefaults: () => {
        // Legacy method for compatibility with Login.jsx
        console.log("DB Defaults initialized (Legacy)");
    }
};

export default db;
