export const ROLES = {
    ADMIN: 'admin',
    SGI: 'sgi',
    LOGISTICA: 'logistica',
    OPERACIONES: 'operaciones',
    TECHNICIAN: 'technician',
    OPERATOR: 'operator',
    USER: 'user',
    VENTAS: 'ventas',
    LIDER_VENTAS: 'lider_ventas',
    ENGINEER: 'engineer'
};

export const PERMISSIONS = {
    // Admin has access to everything by default, but we list specific capabilities for clarity
    CAN_MANAGE_USERS: [ROLES.ADMIN],

    // Assets & Inventory
    CAN_MANAGE_ASSETS: [ROLES.ADMIN, ROLES.LOGISTICA],
    CAN_VIEW_ASSETS: Object.values(ROLES),

    // SGI Module
    CAN_MANAGE_SGI: [ROLES.ADMIN, ROLES.SGI, ROLES.OPERACIONES],
    CAN_VIEW_SGI_DASHBOARD: [ROLES.ADMIN, ROLES.SGI, ROLES.OPERACIONES, ROLES.TECHNICIAN, ROLES.OPERATOR, ROLES.LIDER_VENTAS, ROLES.ENGINEER],

    // Operations & Field Visits
    CAN_VIEW_OPERATIONS: [ROLES.ADMIN, ROLES.OPERACIONES, ROLES.TECHNICIAN, ROLES.OPERATOR, ROLES.SGI, ROLES.LIDER_VENTAS, ROLES.ENGINEER],
    CAN_MANAGE_OPERATIONS: [ROLES.ADMIN, ROLES.OPERACIONES],

    // Tickets
    CAN_MANAGE_ALL_TICKETS: [ROLES.ADMIN],
    CAN_VIEW_OWN_TICKETS: Object.values(ROLES), // Everyone
    CAN_CREATE_TICKETS: Object.values(ROLES),   // Everyone

    // Reports
    CAN_VIEW_REPORTS: [ROLES.ADMIN, ROLES.LIDER_VENTAS],

    // Sales Module
    CAN_MANAGE_SALES: [ROLES.ADMIN, ROLES.VENTAS, ROLES.LIDER_VENTAS, ROLES.LOGISTICA],
    CAN_VIEW_ALL_SALES: [ROLES.ADMIN, ROLES.LIDER_VENTAS, ROLES.LOGISTICA]
};

/**
 * Checks if a user has a specific permission.
 * @param {Object} user - The user object containing a 'role' property.
 * @param {string} permission - The permission key to check (from PERMISSIONS).
 * @returns {boolean}
 */
export const checkPermission = (user, permission) => {
    if (!user || !user.role) return false;

    // Super admin override (optional, but good for safety)
    if (user.role === ROLES.ADMIN) return true;

    const allowedRoles = PERMISSIONS[permission];
    if (!allowedRoles) {
        console.warn(`Permission ${permission} not defined.`);
        return false;
    }

    const currentRole = user.role.toLowerCase();
    return allowedRoles.includes(currentRole);
};
