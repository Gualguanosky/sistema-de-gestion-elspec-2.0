import React, { useState, useEffect } from 'react';
import useTickets from '../hooks/useTickets';
import useAuth from '../hooks/useAuth';
import useComputers from '../hooks/useComputers';
import useIndicators from '../hooks/useIndicators';
import UserManagement from './UserManagement';
import ReportGenerator from './ReportGenerator';
import ComputerManagement from './ComputerManagement';
import UserAssetsView from './UserAssetsView';
import SGIUnifiedView from './SGIUnifiedView';
import OperationsSchedule from './OperationsSchedule';
import SalesManagement from './SalesManagement';
import CatalogConverter from './CatalogConverter';
import CampaignManagement from './CampaignManagement';
import Settings from './Settings';
import AnalyticsDashboard from './AnalyticsDashboard';
import NotificationBell from './NotificationBell';
import MyAssignedRequests from './MyAssignedRequests';
import { ROLES, PERMISSIONS, checkPermission } from '../config/roles'; // Import Permissions
import db from '../services/db';
import { version } from '../../package.json';
import {
    PlusCircle,
    ClipboardList,
    LogOut,
    CheckCircle,
    Clock,
    Users,
    FileText,
    LayoutDashboard,
    AlertCircle,
    Maximize,
    Minimize,
    Edit,
    Trash2,
    X,
    Star,
    Monitor,
    Calendar,
    Activity,
    Image,
    Home,
    ShieldCheck,
    DollarSign,
    Menu,
    Inbox,
    Settings as SettingsIcon,
    RefreshCw,
    Send,
    BarChart2
} from 'lucide-react';
import logo from '../assets/logo.svg';

const Dashboard = () => {
    const { user, logout, users } = useAuth();
    const { tickets, addTicket, updateTicketStatus, deleteTicket } = useTickets();
    const { computers } = useComputers();
    const [activeTab, setActiveTab] = useState('home'); // 'home', 'view_tickets', 'create_ticket', 'users', 'reports', 'assets', 'maintenance', 'operations', 'converter'
    const [newTicket, setNewTicket] = useState({ title: '', description: '', priority: 'medium', type: 'soporte', assignedTo: [], assetId: '' });
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isCreateTicketModalOpen, setIsCreateTicketModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [imageFile, setImageFile] = useState(null);

    const [editingTicket, setEditingTicket] = useState(null); // ticket object being edited

    // State for feedback
    const [feedbackTicketId, setFeedbackTicketId] = useState(null);
    const [feedbackData, setFeedbackData] = useState({ rating: 5, comment: '' });

    // Drawer State
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Alerts Data
    const [visits, setVisits] = useState([]);
    const { indicators } = useIndicators();

    useEffect(() => {
        const unsubscribeVisits = db.getVisits((data) => {
            setVisits(data);
        });
        return () => {
            if (typeof unsubscribeVisits === 'function') unsubscribeVisits();
        };
    }, []);

    // State for filters
    const [filterLimit, setFilterLimit] = useState(10);
    const [filterDateStart, setFilterDateStart] = useState('');
    const [filterDateEnd, setFilterDateEnd] = useState('');

    const handleFeedbackSubmit = (e) => {
        e.preventDefault();
        if (feedbackTicketId) {
            updateTicketStatus(feedbackTicketId, 'closed', { // Re-saving 'closed' status but adding feedback
                feedback: {
                    rating: parseInt(feedbackData.rating),
                    comment: feedbackData.comment,
                    createdAt: new Date().toISOString()
                }
            });
            setFeedbackTicketId(null);
            setFeedbackData({ rating: 5, comment: '' });
        }
    };

    // Safety check for user
    if (!user) return null;

    console.log('Dashboard loaded - Version: 2.2.0 (Home Dashboard + Ticket Modal)');

    const toggleFullscreen = () => {
        try {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
                setIsFullscreen(true);
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                    setIsFullscreen(false);
                }
            }
        } catch (e) {
            console.error("Fullscreen error", e);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation: For non-support tickets, at least one person must be assigned
        if (newTicket.type !== 'soporte' && (!newTicket.assignedTo || newTicket.assignedTo.length === 0)) {
            alert("⚠️ Por favor asigne al menos a una persona para este tipo de solicitud.");
            return;
        }

        setUploading(true);

        try {
            let imageUrl = '';
            if (imageFile) {
                // Determine file type to separate images from other files if needed, 
                // but for now we treat all as 'attachments' or just images as requested.
                // Using db service if it had a direct storage method, but verified firebase.js exports storage.
                // We'll use the db.js utility if it exists or direct firebase storage.
                // db.js has `uploadFile` which returns base64. 
                // The user prompt said: "que suban a la base de datos como lo hicimos en el otro modulo"
                // checking db.js 'uploadFile' implementation:
                // 31:     uploadFile: async (file) => {
                // 32:         return new Promise((resolve, reject) => {
                // ... returns base64 reader.result

                // Using Base64 as per existing `db.js` pattern to avoid configuration issues or if that's the preferred method.
                // However implementation_plan said "Firebase Storage". 
                // Let's check `ComputerManagement.jsx` usage first. 
                // I didn't see image upload in ComputerManagement usage in the previous view_file.
                // BUT `db.js` has `uploadFile` converting to Base64.
                // I'll stick to Base64 for consistency with `db.js` if that's what "como lo hicimos en el otro modulo" refers to (likely the Asset module).
                // Wait, `db.js` comments say: "File Storage Workaround (Base64 in Firestore to avoid Blaze Plan)"
                // SO I MUST USE BASE64.

                imageUrl = await db.uploadFile(imageFile);
            }

            const assignedUsers = newTicket.assignedTo?.length > 0
                ? newTicket.assignedTo.map(id => {
                    const u = users?.find(u => u.id === id);
                    return u ? { id: u.id, name: u.name } : { id };
                })
                : [];

            const newTicketData = await addTicket({
                ...newTicket,
                author: user.username,
                imageUrl: imageUrl || null,
                assignedTo: assignedUsers,
                assignedToName: assignedUsers.map(u => u.name).join(', ') || null,
                assetId: newTicket.assetId || null,
            });

            // Notificar a los usuarios asignados (si hay)
            if (assignedUsers && assignedUsers.length > 0) {
                await db.addNotification({
                    title: 'Ticket Asignado',
                    message: `${user.name || user.username} te ha asignado el ticket: ${newTicket.title}`,
                    targetRoles: [],
                    targetUsers: assignedUsers.map(u => u.id),
                    type: 'ticket_assigned',
                    ticketId: newTicketData.id || ''
                });
            }

            setNewTicket({ title: '', description: '', priority: 'medium', type: 'soporte', assignedTo: [], assetId: '' });
            setImageFile(null);
            setIsCreateTicketModalOpen(false);
            // setActiveTab('view_tickets'); // No longer needed as we stay on current tab or go to view
        } catch (error) {
            console.error("Error creating ticket:", error);
            alert("Error al crear el ticket. Por favor intente nuevamente.");
        } finally {
            setUploading(false);
        }
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        if (editingTicket) {
            updateTicketStatus(editingTicket.id, editingTicket.status, {
                title: editingTicket.title,
                description: editingTicket.description,
                priority: editingTicket.priority,
                ...(isAdmin && {
                    solution: editingTicket.solution,
                    recommendation: editingTicket.recommendation
                })
            });
            setEditingTicket(null);
        }
    };

    const handleDeleteTicket = (ticketId) => {
        if (window.confirm('¿Está seguro de que desea eliminar este ticket?')) {
            deleteTicket(ticketId);
        }
    };



    const canManageAssets = checkPermission(user, 'CAN_MANAGE_ASSETS');
    const canViewAssets = checkPermission(user, 'CAN_VIEW_ASSETS');
    const canViewOperations = checkPermission(user, 'CAN_VIEW_OPERATIONS');
    const canManageSGI = checkPermission(user, 'CAN_MANAGE_SGI');
    const canViewSGIDashboard = checkPermission(user, 'CAN_VIEW_SGI_DASHBOARD'); // NEW CHECK
    const canManageUsers = checkPermission(user, 'CAN_MANAGE_USERS'); // Renamed used to check for admin only for user tab
    const canViewReports = checkPermission(user, 'CAN_VIEW_REPORTS');
    const canManageSales = checkPermission(user, 'CAN_MANAGE_SALES');
    const canManageCampaigns = checkPermission(user, 'CAN_MANAGE_CAMPAIGNS');

    const normalizeString = (str) => {
        if (!str) return '';
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    };

    const isAdmin = user.role === ROLES.ADMIN;

    // Metrics for Admin/User
    const isMyTicket = (t) => t.author === user.username || t.author === user.name;
    const isAssignedToMe = (t) => {
        if (!t?.assignedTo) return false;
        const userIdents = [user.id, user.uid, user.username].filter(Boolean);
        if (typeof t.assignedTo === 'string') return userIdents.includes(t.assignedTo);
        if (Array.isArray(t.assignedTo)) {
            return t.assignedTo.some(a => {
                const assignedId = typeof a === 'string' ? a : a?.id;
                const assignedName = typeof a === 'object' ? a?.name : null;
                return userIdents.includes(assignedId) || (assignedName && assignedName === user.name);
            });
        }
        return false;
    };

    const myTickets = tickets.filter(t => isMyTicket(t) && t.status !== 'closed');
    const assignedToMe = tickets.filter(t => isAssignedToMe(t) && t.status !== 'closed');
    const openTickets = tickets.filter(t => t.status !== 'closed');

    const allTabs = [
        { id: 'home', label: 'Inicio', icon: <Home size={18} /> },
        { id: 'assigned', label: 'Módulo de Atención', icon: <Inbox size={18} /> },

        ...(canManageUsers ? [{ id: 'users', label: 'Usuarios', icon: <Users size={18} /> }] : []),
        ...(canViewReports ? [{ id: 'reports', label: 'Reportes', icon: <FileText size={18} /> }] : []),
        ...(canViewAssets ? [{ id: 'assets', label: 'Activos', icon: <Monitor size={18} /> }] : []),
        ...(canViewOperations ? [{ id: 'operations', label: 'Operaciones', icon: <Activity size={18} /> }] : []),
        ...(canManageSGI ? [{ id: 'sgi', label: 'Calidad', icon: <ShieldCheck size={18} /> }] : []),
        ...(canManageSales ? [
            { id: 'sales', label: 'Ventas', icon: <DollarSign size={18} /> },
            { id: 'converter', label: 'Convertidor', icon: <RefreshCw size={18} /> }
        ] : []),
        ...(canManageCampaigns ? [{ id: 'campaigns', label: 'Campañas', icon: <Send size={18} /> }] : []),
        { id: 'settings', label: 'Ajustes', icon: <SettingsIcon size={18} /> },
    ];

    const handleNotificationClick = (notification) => {
        if (notification.type === 'sale_created') {
            setActiveTab('sales');
        } else if (notification.type === 'ticket_assigned') {
            setActiveTab('assigned');
        }
    };

    const NavigationItems = ({ inDrawer = false }) => (
        <>
            <div style={{ flex: 1, overflowY: 'auto', padding: inDrawer ? '0' : '20px 0' }}>
                {allTabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); if (inDrawer) setIsDrawerOpen(false); }}
                        className={`nav-item-premium ${activeTab === tab.id ? 'active' : ''}`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            <div style={{ marginTop: 'auto', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '15px' }}>
                <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'white' }}>{user.name || user.username}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{user.role}</div>
                    </div>
                </div>
                <button
                    onClick={() => { logout(); window.location.reload(); }}
                    className="btn-primary"
                    style={{ width: '100%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px' }}
                >
                    <LogOut size={18} /> Cerrar Sesión
                </button>

                <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px', opacity: 0.7 }}>
                    Designed with ❤️ by <a href="https://gualguanosky.web.app" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold' }}>Gualguanosky</a>
                </div>
            </div>
        </>
    );

    return (
        <div className="layout-container">
            {/* Modal for Creating Ticket */}
            {isCreateTicketModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
                    zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center',
                    padding: '20px'
                }}>
                    <div className="glass-card" style={{ padding: 'clamp(20px, 5vw, 40px)', width: '100%', maxWidth: '600px', border: '1px solid var(--primary)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <PlusCircle color="var(--primary)" size={32} /> Nueva Solicitud
                            </h3>
                            <button onClick={() => setIsCreateTicketModalOpen(false)} style={{ background: 'transparent', color: 'var(--text-muted)' }}>
                                <X size={24} />
                            </button>
                        </div>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '25px' }}>Complete los detalles para crear un nuevo ticket de soporte.</p>
                        <form onSubmit={handleSubmit}>
                            <div className="input-group">
                                <label>Asunto / Título</label>
                                <input type="text" required value={newTicket.title} placeholder="Ej: Falla en impresora, Error de software..." onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <label>Prioridad</label>
                                <select value={newTicket.priority} onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}>
                                    <option value="low">Baja</option>
                                    <option value="medium">Media</option>
                                    <option value="high">Alta</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Descripción del Problema</label>
                                <textarea rows="5" required value={newTicket.description} onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })} placeholder="Describa detalladamente el problema..."></textarea>
                            </div>
                            <div className="input-group">
                                <label>Tipo de Solicitud</label>
                                <select value={newTicket.type || 'soporte'} onChange={(e) => setNewTicket({ ...newTicket, type: e.target.value, assignedTo: [] })} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white', padding: '10px', borderRadius: '8px', width: '100%' }}>

                                    <option value="soporte">Soporte Técnico</option>
                                    <option value="pqr">PQR (Petición, Queja, Reclamo)</option>
                                    <option value="info">Solicitud de Información</option>
                                    <option value="otro">Otro</option>
                                </select>
                            </div>

                            {newTicket.type === 'soporte' && (
                                <div className="input-group">
                                    <label>Vincular a Equipo (Opcional)</label>
                                    <select
                                        value={newTicket.assetId || ''}
                                        onChange={(e) => setNewTicket({ ...newTicket, assetId: e.target.value })}
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white', padding: '10px', borderRadius: '8px', width: '100%' }}
                                    >
                                        <option value="">-- No vincular a equipo --</option>
                                        {computers && computers
                                            .filter(comp => {
                                                if (isAdmin || canManageAssets) return true;
                                                const normalizedAssignedTo = normalizeString(comp.assignedTo);
                                                const userIdentifiers = [
                                                    normalizeString(user.username),
                                                    normalizeString(user.name),
                                                    normalizeString(user.email)
                                                ].filter(Boolean);

                                                return userIdentifiers.includes(normalizedAssignedTo);
                                            })
                                            .map(comp => (
                                                <option key={comp.id} value={comp.id}>
                                                    {comp.brand} {comp.model} ({comp.serial})
                                                </option>
                                            ))}
                                    </select>
                                    <small style={{ color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                                        Si el problema es con un equipo específico, selecciónelo para mantener el historial de soporte del activo.
                                    </small>
                                </div>
                            )}

                            {newTicket.type === 'soporte' ? (
                                <div style={{ padding: '10px 14px', background: 'rgba(0,108,224,0.08)', border: '1px solid rgba(0,108,224,0.2)', borderRadius: '10px', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <AlertCircle size={14} color="var(--primary)" />
                                    Esta solicitud será atendida por el equipo de soporte técnico (Administradores).
                                </div>
                            ) : (
                                <div className="input-group">
                                    <label>Asignar a</label>
                                    {/* Chips de usuarios seleccionados */}
                                    {(newTicket.assignedTo || []).length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                                            {(newTicket.assignedTo || []).map(id => {
                                                const u = users?.find(u => u.id === id);
                                                if (!u) return null;
                                                return (
                                                    <span key={id} style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                        background: 'rgba(0,108,224,0.2)', border: '1px solid rgba(0,108,224,0.4)',
                                                        borderRadius: '20px', padding: '4px 12px', fontSize: '0.85rem', color: 'white'
                                                    }}>
                                                        {u.name}
                                                        <button
                                                            type="button"
                                                            onClick={() => setNewTicket({ ...newTicket, assignedTo: (newTicket.assignedTo || []).filter(i => i !== id) })}
                                                            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '0', lineHeight: 1, fontSize: '1rem', display: 'flex' }}
                                                        >×</button>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {/* Dropdown para agregar */}
                                    <select
                                        value=""
                                        onChange={(e) => {
                                            if (!e.target.value) return;
                                            const current = newTicket.assignedTo || [];
                                            if (!current.includes(e.target.value)) {
                                                setNewTicket({ ...newTicket, assignedTo: [...current, e.target.value] });
                                            }
                                        }}
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white', padding: '10px', borderRadius: '8px', width: '100%' }}
                                    >
                                        <option value="">+ Agregar persona...</option>
                                        {users && users
                                            .filter(u => u.id !== user.id && !(newTicket.assignedTo || []).includes(u.id))
                                            .map(u => (
                                                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                            ))
                                        }
                                    </select>
                                    <small style={{ color: (newTicket.type !== 'soporte' && (newTicket.assignedTo || []).length === 0) ? 'var(--danger)' : 'var(--text-muted)', marginTop: '4px', display: 'block', fontWeight: (newTicket.type !== 'soporte' && (newTicket.assignedTo || []).length === 0) ? 700 : 400 }}>
                                        {(newTicket.assignedTo || []).length === 0
                                            ? (newTicket.type === 'soporte' ? 'Opcional — los administradores verán esta solicitud.' : '⚠️ Obligatorio — debe asignar a alguien.')
                                            : `${(newTicket.assignedTo || []).length} persona(s) asignada(s)`}
                                    </small>

                                </div>

                            )}
                            <div className="input-group">
                                <label>Adjuntar Imagen (Opcional)</label>
                                <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid var(--border-color)', width: '100%' }} />
                                {imageFile && <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '5px' }}>Imagen seleccionada: {imageFile.name}</div>}
                            </div>
                            <div style={{ display: 'flex', flexDirection: window.innerWidth < 600 ? 'column' : 'row', gap: '15px', marginTop: '30px' }}>
                                <button type="submit" className="btn-primary" disabled={uploading} style={{ flex: 1.5, padding: '15px' }}>{uploading ? 'Subiendo...' : 'Crear Ticket'}</button>
                                <button type="button" onClick={() => setIsCreateTicketModalOpen(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal for editing ticket */}
            {editingTicket && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
                    zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center',
                    padding: '20px'
                }}>
                    <div className="glass-card" style={{ padding: 'clamp(20px, 5vw, 40px)', width: '100%', maxWidth: '600px', border: '1px solid var(--primary)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><Edit color="var(--primary)" size={24} /> Editar Ticket</h3>
                            <button onClick={() => setEditingTicket(null)} style={{ background: 'transparent', color: 'var(--text-muted)' }}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleEditSubmit}>
                            <div className="input-group"><label>Título / Asunto</label><input type="text" required value={editingTicket.title} onChange={(e) => setEditingTicket({ ...editingTicket, title: e.target.value })} /></div>
                            <div className="input-group">
                                <label>Prioridad</label>
                                <select value={editingTicket.priority} onChange={(e) => setEditingTicket({ ...editingTicket, priority: e.target.value })}>
                                    <option value="low">Baja</option>
                                    <option value="medium">Media</option>
                                    <option value="high">Alta</option>
                                </select>
                            </div>
                            <div className="input-group"><label>Descripción del Problema</label><textarea rows="5" required value={editingTicket.description} onChange={(e) => setEditingTicket({ ...editingTicket, description: e.target.value })}></textarea></div>
                            {isAdmin && (
                                <>
                                    <div className="input-group"><label>Resolución Técnica (Admin)</label><textarea rows="4" value={editingTicket.solution || ''} onChange={(e) => setEditingTicket({ ...editingTicket, solution: e.target.value })} placeholder="Detalle técnico de la solución..."></textarea></div>
                                    <div className="input-group"><label>Recomendaciones (Admin)</label><textarea rows="3" value={editingTicket.recommendation || ''} onChange={(e) => setEditingTicket({ ...editingTicket, recommendation: e.target.value })} placeholder="Recomendaciones para el cliente..."></textarea></div>
                                </>
                            )}
                            <div style={{ display: 'flex', flexDirection: window.innerWidth < 600 ? 'column' : 'row', gap: '15px', marginTop: '30px' }}>
                                <button type="submit" className="btn-primary" style={{ flex: 1.5, padding: '15px' }}>Guardar Cambios</button>
                                <button type="button" onClick={() => setEditingTicket(null)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}


            {/* Modal for User Feedback */}
            {feedbackTicketId && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
                    zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center',
                    padding: '20px'
                }}>
                    <div className="glass-card" style={{ padding: 'clamp(20px, 5vw, 40px)', width: '100%', maxWidth: '500px', border: '1px solid var(--warning)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--warning)' }}><Star size={24} fill="var(--warning)" /> Calificar Servicio</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '25px', fontSize: '0.9rem' }}>Su opinión es importante para mejorar nuestro servicio de soporte.</p>
                        <form onSubmit={handleFeedbackSubmit}>
                            <div className="input-group" style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <label style={{ marginBottom: '10px', display: 'block' }}>Calificación General</label>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button key={star} type="button" onClick={() => setFeedbackData({ ...feedbackData, rating: star })} style={{ background: 'transparent', border: 'none', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                                            <Star size={32} color={star <= feedbackData.rating ? "var(--warning)" : "gray"} fill={star <= feedbackData.rating ? "var(--warning)" : "transparent"} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="input-group"><label>Comentarios Adicionales (Opcional)</label><textarea rows="3" value={feedbackData.comment} onChange={(e) => setFeedbackData({ ...feedbackData, comment: e.target.value })} placeholder="¿Qué le pareció la atención?..."></textarea></div>
                            <div style={{ display: 'flex', flexDirection: window.innerWidth < 600 ? 'column' : 'row', gap: '15px', marginTop: '30px' }}>
                                <button type="submit" className="btn-primary" style={{ flex: 1.5, background: 'var(--warning)', color: 'black', fontWeight: 'bold', padding: '15px' }}>Enviar Calificación</button>
                                <button type="button" onClick={() => setFeedbackTicketId(null)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>Omitir</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Desktop Sidebar */}
            <aside className="sidebar-desktop">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px', padding: '0 10px' }}>
                    <div style={{ background: 'linear-gradient(135deg, var(--primary), #004da1)', width: '35px', height: '35px', borderRadius: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><ShieldCheck color="white" size={20} /></div>
                    <h1 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>ELSPEC <span style={{ color: 'var(--primary)' }}>ANDINA</span></h1>
                </div>
                <NavigationItems />
            </aside>

            {/* Mobile Drawer */}
            <div className={`drawer-overlay ${isDrawerOpen ? 'active' : ''}`} onClick={() => setIsDrawerOpen(false)} />
            <div className={`side-drawer ${isDrawerOpen ? 'active' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ShieldCheck color="var(--primary)" size={24} /><h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 900 }}>ELSPEC</h2>
                    </div>
                    <button onClick={() => setIsDrawerOpen(false)} style={{ background: 'transparent', padding: '5px' }}><X size={24} color="var(--text-muted)" /></button>
                </div>
                <NavigationItems inDrawer />
            </div>

            <main className="main-content">
                {/* Mobile Top Bar */}
                <div className="top-bar-mobile" style={{ display: window.innerWidth <= 768 ? 'flex' : 'none' }}>
                    <button className="hamburger-btn" onClick={() => setIsDrawerOpen(true)}><Menu size={22} /></button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><h1 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 900 }}>ELSPEC</h1></div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <NotificationBell onNotificationClick={handleNotificationClick} />
                        <button onClick={toggleFullscreen} style={{ background: 'transparent', padding: '5px' }}>{isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}</button>
                    </div>
                </div>

                {/* Dashboard Tools */}
                <div style={{ display: window.innerWidth > 768 ? 'flex' : 'none', justifyContent: 'flex-end', marginBottom: '20px', gap: '15px', alignItems: 'center' }}>
                    <NotificationBell onNotificationClick={handleNotificationClick} />
                    <button onClick={toggleFullscreen} className="glass-card" style={{ padding: '8px 15px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />} Fullscreen
                    </button>
                </div>

                <div className="animate-slide-up" style={{ padding: 'clamp(15px, 4vw, 30px)' }}>
                    {/* Header Section */}
                    <header style={{ marginBottom: '30px', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
                            <div>
                                <h2 style={{ fontSize: 'clamp(1.2rem, 4vw, 1.8rem)', marginBottom: '5px' }}>
                                    {activeTab === 'home' ? 'Servicios Corporativos' :
                                        activeTab === 'users' ? 'Control Accesos' :
                                            activeTab === 'reports' ? 'Reportes' :
                                                activeTab === 'assets' ? 'Activos y Equipos' :
                                                    activeTab === 'maintenance' ? 'Mantenimiento' :
                                                        activeTab === 'sgi' ? 'Calidad (SGI)' :
                                                            activeTab === 'operations' ? 'Operaciones' :
                                                                activeTab === 'sales' ? 'Ventas y Cotizaciones' :
                                                                    activeTab === 'converter' ? 'Convertidor de Catálogos' :
                                                                        activeTab === 'campaigns' ? 'Marketing y Campañas' :
                                                                            'Panel Control'}
                                </h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: 'clamp(0.8rem, 2vw, 1rem)' }}>Mesa de servicios corporativa - ELSPEC ANDINA v2.1</p>
                            </div>
                        </div>
                    </header>





                    {/* Home Dashboard */}
                    {activeTab === 'home' && (
                        <div style={{ width: '100%', padding: 'clamp(10px, 3vw, 20px)' }}>
                            <div style={{ marginBottom: '30px' }}>
                                <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', marginBottom: '8px', fontWeight: 800 }}>Bienvenido, {user.name || user.username}</h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Resumen de actividad y gestión de servicios.</p>
                            </div>

                            {/* Quick Stats Row */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
                                <div
                                    onClick={() => setActiveTab('assigned')}
                                    className="glass-card"
                                    style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px', borderLeft: '4px solid var(--primary)', cursor: 'pointer', transition: 'transform 0.2s' }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    <div style={{ background: 'rgba(0,108,224,0.1)', padding: '12px', borderRadius: '12px', color: 'var(--primary)' }}><Inbox size={24} /></div>
                                    <div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{myTickets.length}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Mis Solicitudes</div>
                                    </div>
                                </div>
                                <div
                                    onClick={() => setActiveTab('assigned')}
                                    className="glass-card"
                                    style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px', borderLeft: '4px solid var(--success)', cursor: 'pointer', transition: 'transform 0.2s' }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    <div style={{ background: 'rgba(16,185,129,0.1)', padding: '12px', borderRadius: '12px', color: 'var(--success)' }}><ClipboardList size={24} /></div>
                                    <div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{assignedToMe.length}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Por Resolver</div>
                                    </div>
                                </div>
                                {isAdmin && (
                                    <div
                                        onClick={() => setActiveTab('assigned')}
                                        className="glass-card"
                                        style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px', borderLeft: '4px solid var(--warning)', cursor: 'pointer', transition: 'transform 0.2s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        <div style={{ background: 'rgba(245,158,11,0.1)', padding: '12px', borderRadius: '12px', color: 'var(--warning)' }}><Activity size={24} /></div>
                                        <div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{openTickets.length}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Tickets Globales</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Unified Smart Alerts */}
                            <div style={{ marginBottom: '30px' }}>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary)' }}>
                                    <AlertCircle size={18} /> ALERTAS Y TAREAS PENDIENTES
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '15px' }}>
                                    {/* Visits Alerts */}
                                    {visits
                                        .filter(v => {
                                            if (v.status !== 'scheduled') return false;
                                            const personnel = Array.isArray(v.personnel) ? v.personnel : [v.personnel];
                                            return personnel.some(p => (p || '').includes(user.name) || (p || '').includes(user.username));
                                        })
                                        .sort((a, b) => new Date(a.date) - new Date(b.date))
                                        .slice(0, 3)
                                        .map(v => (
                                            <div
                                                key={v.id}
                                                onClick={() => setActiveTab('operations')}
                                                className="glass-card"
                                                style={{ padding: '15px', borderLeft: '3px solid #06b6d4', display: 'flex', gap: '15px', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}
                                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                            >
                                                <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '10px', borderRadius: '10px', color: '#06b6d4' }}><Calendar size={20} /></div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Próxima Visita</div>
                                                    <div style={{ fontSize: '0.95rem', fontWeight: 700, margin: '2px 0' }}>{v.location}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>{new Date(v.date).toLocaleDateString()} - {v.client || 'Sin cliente'}</div>
                                                </div>
                                            </div>
                                        ))}

                                    {/* High Priority Tickets Assigned to Me */}
                                    {assignedToMe
                                        .filter(t => t.priority === 'high' || t.priority === 'urgent')
                                        .slice(0, 2)
                                        .map(t => (
                                            <div
                                                key={t.id}
                                                onClick={() => setActiveTab('assigned')}
                                                className="glass-card"
                                                style={{ padding: '15px', borderLeft: '3px solid var(--danger)', display: 'flex', gap: '15px', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}
                                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                            >
                                                <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '10px', color: 'var(--danger)' }}><AlertCircle size={20} /></div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--danger)', textTransform: 'uppercase', fontWeight: 600 }}>Ticket Urgente</div>
                                                    <div style={{ fontSize: '0.95rem', fontWeight: 700, margin: '2px 0' }}>{t.title}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ticket #{t.id.slice(-5)}</div>
                                                </div>
                                            </div>
                                        ))}

                                    {/* SGI Alerts (If applicable) */}
                                    {isAdmin && indicators.filter(i => i.current === 0 || !i.current).slice(0, 1).map(i => (
                                        <div
                                            key={i.id}
                                            onClick={() => setActiveTab('sgi')}
                                            className="glass-card"
                                            style={{ padding: '15px', borderLeft: '3px solid var(--warning)', display: 'flex', gap: '15px', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                        >
                                            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '10px', borderRadius: '10px', color: 'var(--warning)' }}><Activity size={20} /></div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--warning)', textTransform: 'uppercase', fontWeight: 600 }}>SGI / Calidad</div>
                                                <div style={{ fontSize: '0.95rem', fontWeight: 700, margin: '2px 0' }}>{i.name}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sin datos registrados</div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Empty State for Alerts */}
                                    {(visits.filter(v => v.status === 'scheduled' && (Array.isArray(v.personnel) ? v.personnel : [v.personnel]).some(p => (p || '').includes(user.name) || (p || '').includes(user.username))).length === 0 &&
                                        assignedToMe.filter(t => t.priority === 'high' || t.priority === 'urgent').length === 0 &&
                                        (!isAdmin || indicators.filter(i => i.current === 0 || !i.current).length === 0)) && (
                                            <div className="glass-card" style={{ padding: '20px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)', gridColumn: '1 / -1' }}>
                                                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>No tienes tareas urgentes o eventos próximos para hoy.</p>
                                            </div>
                                        )}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' }}>
                                {/* Navigation Cards Redesigned - More Compact */}
                                <div
                                    onClick={() => setIsCreateTicketModalOpen(true)}
                                    className="glass-card"
                                    style={{ padding: '20px', cursor: 'pointer', transition: 'var(--transition)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '15px' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
                                >
                                    <div style={{ background: 'rgba(0,108,224,0.15)', padding: '12px', borderRadius: '12px', color: 'var(--primary)' }}><PlusCircle size={24} /></div>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '1rem' }}>Nueva Solicitud</h4>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Crear ticket</span>
                                    </div>
                                </div>

                                <div
                                    onClick={() => setActiveTab('assigned')}
                                    className="glass-card"
                                    style={{ padding: '20px', cursor: 'pointer', transition: 'var(--transition)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '15px' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'var(--success)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
                                >
                                    <div style={{ background: 'rgba(16,185,129,0.15)', padding: '12px', borderRadius: '12px', color: 'var(--success)' }}><ClipboardList size={24} /></div>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '1rem' }}>Mis Solicitudes</h4>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Seguimiento</span>
                                    </div>
                                </div>

                                {canManageUsers && (
                                    <div
                                        onClick={() => setActiveTab('users')}
                                        className="glass-card"
                                        style={{ padding: '20px', cursor: 'pointer', transition: 'var(--transition)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '15px' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'var(--warning)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
                                    >
                                        <div style={{ background: 'rgba(245,158,11,0.15)', padding: '12px', borderRadius: '12px', color: 'var(--warning)' }}><Users size={24} /></div>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '1rem' }}>Usuarios</h4>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Accesos</span>
                                        </div>
                                    </div>
                                )}

                                {canViewAssets && (
                                    <div
                                        onClick={() => setActiveTab('assets')}
                                        className="glass-card"
                                        style={{ padding: '20px', cursor: 'pointer', transition: 'var(--transition)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '15px' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
                                    >
                                        <div style={{ background: 'rgba(139, 92, 246, 0.15)', padding: '12px', borderRadius: '12px', color: '#8b5cf6' }}><Monitor size={24} /></div>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '1rem' }}>Activos IT</h4>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Inventario</span>
                                        </div>
                                    </div>
                                )}

                                {canViewOperations && (
                                    <div
                                        onClick={() => setActiveTab('operations')}
                                        className="glass-card"
                                        style={{ padding: '20px', cursor: 'pointer', transition: 'var(--transition)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '15px' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = '#06b6d4'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
                                    >
                                        <div style={{ background: 'rgba(6, 182, 212, 0.15)', padding: '12px', borderRadius: '12px', color: '#06b6d4' }}><Activity size={24} /></div>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '1rem' }}>Operaciones</h4>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Visitas</span>
                                        </div>
                                    </div>
                                )}
                                {canManageSGI && (
                                    <div
                                        onClick={() => setActiveTab('sgi')}
                                        className="glass-card"
                                        style={{ padding: '20px', cursor: 'pointer', transition: 'var(--transition)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '15px' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'var(--success)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
                                    >
                                        <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '12px', borderRadius: '12px', color: 'var(--success)' }}><ShieldCheck size={24} /></div>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '1rem' }}>SGI / Calidad</h4>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gestión</span>
                                        </div>
                                    </div>
                                )}

                                {canManageSales && (
                                    <div
                                        onClick={() => setActiveTab('sales')}
                                        className="glass-card"
                                        style={{ padding: '20px', cursor: 'pointer', transition: 'var(--transition)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '15px' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'var(--warning)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
                                    >
                                        <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '12px', borderRadius: '12px', color: 'var(--warning)' }}><DollarSign size={24} /></div>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '1rem' }}>Ventas</h4>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Comercial</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Analytics Section Integrated directly into Home */}
                            {canViewReports && (
                                <div style={{ marginTop: '40px', paddingBottom: '20px' }} className="animate-slide-up">
                                    <AnalyticsDashboard />
                                </div>
                            )}
                        </div>
                    )}



                    {(activeTab === 'users' || activeTab === 'reports' || activeTab === 'assets' || activeTab === 'sgi' || activeTab === 'operations' || activeTab === 'assigned') && (
                        <div style={{ width: '100%' }}>
                            {activeTab === 'assigned' && (
                                <MyAssignedRequests
                                    isAdmin={isAdmin}
                                    onCreateTicket={() => setIsCreateTicketModalOpen(true)}
                                    onEdit={setEditingTicket}
                                    onDelete={handleDeleteTicket}
                                />
                            )}
                            {activeTab === 'users' && <UserManagement />}
                            {activeTab === 'reports' && <ReportGenerator tickets={tickets} computers={computers} />}
                            {activeTab === 'assets' && (
                                canManageAssets
                                    ? <ComputerManagement />
                                    : <UserAssetsView computers={computers} currentUser={user} />
                            )}
                            {activeTab === 'sgi' && (
                                <SGIUnifiedView
                                    user={user}
                                    tickets={tickets}
                                    canManageSGI={canManageSGI}
                                />
                            )}
                            {activeTab === 'operations' && <OperationsSchedule />}
                        </div>
                    )}

                    {/* Sales Dashboard */}
                    {activeTab === 'sales' && canManageSales && <SalesManagement />}

                    {/* Catalog Converter */}
                    {activeTab === 'converter' && canManageSales && <CatalogConverter />}

                    {/* Campaign Management */}
                    {activeTab === 'campaigns' && canManageCampaigns && <CampaignManagement />}

                    {/* Settings Dashboard */}
                    {activeTab === 'settings' && <Settings user={user} />}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
