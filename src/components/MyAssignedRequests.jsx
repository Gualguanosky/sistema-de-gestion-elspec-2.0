import React, { useState } from 'react';
import { Inbox, Clock, CheckCircle, AlertCircle, Tag, User, Calendar, PlusCircle, ClipboardList, Send, Edit2, Trash2, X, Image as ImageIcon, Star, RotateCcw, Paperclip } from 'lucide-react';


import useAuth from '../hooks/useAuth';
import useTickets from '../hooks/useTickets';
import useComputers from '../hooks/useComputers';
import db from '../services/db';


const TYPE_LABELS = {
    pqr: { label: 'PQR', color: '#f59e0b' },
    info: { label: 'Información', color: '#06b6d4' },
    otro: { label: 'Otro', color: '#8b5cf6' },
    soporte: { label: 'Soporte Técnico', color: '#006ce0' },
};

const PRIORITY_COLORS = {
    high: { bg: 'rgba(239,68,68,0.2)', color: 'var(--danger)', label: 'HIGH' },
    medium: { bg: 'rgba(245,158,11,0.2)', color: 'var(--warning)', label: 'MEDIUM' },
    low: { bg: 'rgba(16,185,129,0.2)', color: 'var(--success)', label: 'LOW' },
};

const STATUS_INFO = {
    open: { label: 'Abierto', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', Icon: Clock },
    in_progress: { label: 'En Progreso', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', Icon: AlertCircle },
    closed: { label: 'Resuelto', color: '#10b981', bg: 'rgba(16,185,129,0.1)', Icon: CheckCircle },
};

const TicketCard = ({ ticket, isAssignedToMe, isMyTicket, onClick }) => {
    const typeInfo = TYPE_LABELS[ticket.type] || TYPE_LABELS.soporte;
    const priorityInfo = PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.medium;
    const statusInfo = STATUS_INFO[ticket.status] || STATUS_INFO.open;
    const StatusIcon = statusInfo.Icon;

    const createdDate = ticket.createdAt
        ? new Date(ticket.createdAt).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : 'Fecha N/A';

    const assignedNames = Array.isArray(ticket.assignedTo)
        ? ticket.assignedTo.map(a => (typeof a === 'object' ? a.name : a)).filter(Boolean).join(', ')
        : ticket.assignedToName || null;

    return (
        <div
            onClick={() => onClick(ticket)}
            style={{
                padding: '20px 25px',
                background: 'rgba(255,255,255,0.01)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.05)',
                transition: 'all 0.2s',
                cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                e.currentTarget.style.borderColor = 'var(--primary)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.01)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
            }}
        >
            {/* Top row: title + status indicator */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', gap: '15px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '1.15rem', margin: '0 0 10px 0', color: 'white', fontWeight: 700 }}>
                        {ticket.title}
                    </h4>
                    {/* Badges row */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                        {/* Status */}
                        <span style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            fontSize: '0.75rem', padding: '4px 12px', borderRadius: '20px', fontWeight: 700,
                            background: statusInfo.bg, color: statusInfo.color,
                            border: `1px solid ${statusInfo.color}44`,
                        }}>
                            <StatusIcon size={12} /> {statusInfo.label}
                        </span>
                        {/* Priority */}
                        <span style={{
                            fontSize: '0.75rem', padding: '4px 12px', borderRadius: '20px', fontWeight: 800,
                            background: priorityInfo.bg, color: priorityInfo.color,
                            textTransform: 'uppercase', letterSpacing: '0.5px',
                        }}>
                            {priorityInfo.label}
                        </span>
                        {/* Origin badges */}
                        {isAssignedToMe && (
                            <span style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: '20px', fontWeight: 700, background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>
                                📥 Asignada
                            </span>
                        )}
                        {isMyTicket && (
                            <span style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: '20px', fontWeight: 700, background: 'rgba(0,108,224,0.15)', color: '#60a5fa', border: '1px solid rgba(0,108,224,0.3)' }}>
                                📤 Creada
                            </span>
                        )}
                    </div>
                </div>

                <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    color: statusInfo.color, fontWeight: 600, fontSize: '0.85rem',
                    background: statusInfo.bg, padding: '6px 14px', borderRadius: '30px',
                    border: `1px solid ${statusInfo.color}33`,
                }}>
                    <StatusIcon size={14} />
                    {ticket.status === 'open' ? 'Pendiente' : ticket.status === 'in_progress' ? 'En Progreso' : 'Resuelto'}
                </div>
            </div>

            {/* Description Preview */}
            {ticket.description && (
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: '0 0 14px 0', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {ticket.description}
                </p>
            )}

            {/* Meta row */}
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-muted)', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Clock size={12} /> {createdDate}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <User size={12} /> {ticket.author || '—'}
                </span>
                {assignedNames && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Send size={12} /> {assignedNames}
                    </span>
                )}
            </div>
        </div>
    );
};

const MyAssignedRequests = ({ onCreateTicket, isAdmin, onEdit, onDelete }) => {
    const { user } = useAuth();
    const { tickets, updateTicketStatus } = useTickets();
    const { addSupportLog } = useComputers();
    const [activeSection, setActiveSection] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');

    const [selectedTicket, setSelectedTicket] = useState(null);
    const [isResolving, setIsResolving] = useState(false);
    const [resolutionData, setResolutionData] = useState({ text: '', files: [] });
    const [isUploadingResolution, setIsUploadingResolution] = useState(false);


    const isAssignedToMe = (t) => {
        if (!t?.assignedTo) return false;

        // Handle legacy case where assignedTo might be a string
        if (typeof t.assignedTo === 'string') {
            return t.assignedTo === user.id || t.assignedTo === user.uid || t.assignedTo === user.username;
        }

        if (!Array.isArray(t.assignedTo)) return false;

        return t.assignedTo.some(a => {
            const assignedId = typeof a === 'string' ? a : a?.id;
            const assignedName = typeof a === 'object' ? a?.name : null;

            return (
                assignedId === user.id ||
                assignedId === user.uid ||
                assignedId === user.username ||
                (assignedName && assignedName === user.name)
            );
        });
    };


    const isMyTicket = (t) => t.author === user.username || t.author === user.name;

    const allMyTickets = (tickets || []).filter(t => isAdmin || isMyTicket(t) || isAssignedToMe(t));
    const assignedToMe = (tickets || []).filter(t => isAssignedToMe(t));
    const createdByMe = (tickets || []).filter(t => isMyTicket(t));

    const sourceList = activeSection === 'assigned' ? assignedToMe
        : activeSection === 'created' ? createdByMe
            : allMyTickets;

    const filtered = sourceList.filter(t => {
        const statusOk = filterStatus === 'all' || t.status === filterStatus;
        const typeOk = filterType === 'all' || t.type === filterType;
        return statusOk && typeOk;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const counts = {
        all: allMyTickets.length,
        assigned: assignedToMe.length,
        created: createdByMe.length,
        open: allMyTickets.filter(t => t.status === 'open').length,
        in_progress: allMyTickets.filter(t => t.status === 'in_progress').length,
        closed: allMyTickets.filter(t => t.status === 'closed').length,
    };

    const handleMarkResolved = async (id) => {
        const comment = resolutionData.text.trim();
        if (!comment) {
            alert("⚠️ La descripción de la solución es obligatoria para finalizar el servicio.");
            return;
        }

        setIsUploadingResolution(true);
        try {
            const uploadedAttachments = [];
            for (const file of resolutionData.files) {
                const url = await db.uploadFile(file);
                uploadedAttachments.push({ name: file.name, url, type: file.type });
            }

            await updateTicketStatus(id, 'closed', {
                solution: comment,
                resolutionAttachments: uploadedAttachments,
                closedAt: new Date().toISOString(),
                closedBy: user.name || user.username
            });

            // Recording in asset support history if linked
            if (selectedTicket?.assetId) {
                await addSupportLog(selectedTicket.assetId, {
                    activity: comment,
                    technician: user.name || user.username,
                    ticketId: id,
                    ticketTitle: selectedTicket.title
                });
            }

            if (selectedTicket?.id === id) {
                setSelectedTicket(prev => ({
                    ...prev,
                    status: 'closed',
                    solution: comment,
                    resolutionAttachments: uploadedAttachments
                }));
            }
            setIsResolving(false);
            setResolutionData({ text: '', files: [] });
        } catch (e) {
            console.error(e);
            alert("Error al finalizar la solicitud.");
        } finally {
            setIsUploadingResolution(false);
        }
    };

    const handleReopen = async (id) => {
        if (!window.confirm("¿Está seguro de que desea reabrir esta solicitud? El estado volverá a 'Abierto' y se borrará la resolución anterior.")) return;

        try {
            await updateTicketStatus(id, 'open', {
                reopenedAt: new Date().toISOString(),
                reopenedBy: user.name || user.username,
                solution: null,
                resolutionAttachments: null,
                closedAt: null,
                closedBy: null
            });

            if (selectedTicket?.id === id) {
                setSelectedTicket(prev => ({
                    ...prev,
                    status: 'open',
                    solution: null,
                    resolutionAttachments: null
                }));
            }
            alert("Solicitud reabierta correctamente.");
        } catch (e) {
            console.error(e);
            alert("Error al reabrir la solicitud.");
        }
    };


    const handleMarkInProgress = async (id) => {
        try {
            await updateTicketStatus(id, 'in_progress');
            if (selectedTicket?.id === id) {
                setSelectedTicket(prev => ({ ...prev, status: 'in_progress' }));
            }
            setIsResolving(true); // Automatically show the form as requested
        } catch (e) { console.error(e); }
    };


    const tabStyle = (id) => ({
        padding: '8px 18px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s',
        background: activeSection === id ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
        color: activeSection === id ? 'white' : 'var(--text-muted)',
        boxShadow: activeSection === id ? '0 4px 15px rgba(0,108,224,0.3)' : 'none',
    });

    const onCloseModal = () => {
        setSelectedTicket(null);
        setIsResolving(false);
        setResolutionData({ text: '', files: [] });
    };


    return (
        <div style={{ padding: '0 0 40px 0' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px', marginBottom: '25px' }}>
                <div>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.8rem' }}>
                        <ClipboardList color="var(--primary)" size={32} />
                        {isAdmin ? 'Gestión de Atenciones' : 'Módulo de Atención'}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '6px' }}>
                        {isAdmin ? 'Todas las atenciones del sistema.' : 'Atenciones que creaste o que te han asignado.'}
                    </p>

                </div>
                {onCreateTicket && (
                    <button onClick={onCreateTicket} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}>
                        <PlusCircle size={18} /> Nueva Solicitud
                    </button>
                )}
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '25px' }}>
                {[
                    { label: 'Total', value: counts.all, color: 'var(--primary)' },
                    { label: 'Abiertas', value: counts.open, color: '#f59e0b' },
                    { label: 'En Progreso', value: counts.in_progress, color: '#06b6d4' },
                    { label: 'Resueltas', value: counts.closed, color: '#10b981' },
                ].map(k => (
                    <div key={k.label} className="glass-card" style={{ padding: '16px 18px', borderLeft: `3px solid ${k.color}` }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', fontWeight: 700 }}>{k.label}</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: k.color }}>{k.value}</div>
                    </div>
                ))}
            </div>

            {/* Section Tabs */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                <button style={tabStyle('all')} onClick={() => setActiveSection('all')}>Todas ({counts.all})</button>
                <button style={tabStyle('assigned')} onClick={() => setActiveSection('assigned')}>📥 Asignadas a mí ({counts.assigned})</button>
                <button style={tabStyle('created')} onClick={() => setActiveSection('created')}>📤 Mis Solicitudes ({counts.created})</button>

            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white', padding: '8px 14px', borderRadius: '10px', fontSize: '0.85rem' }}>
                    <option value="all">Todos los estados</option>
                    <option value="open">Abierto</option>
                    <option value="in_progress">En Progreso</option>
                    <option value="closed">Resuelto</option>
                </select>
                <select value={filterType} onChange={e => setFilterType(e.target.value)}
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white', padding: '8px 14px', borderRadius: '10px', fontSize: '0.85rem' }}>
                    <option value="all">Todos los tipos</option>
                    <option value="pqr">PQR</option>
                    <option value="info">Información</option>
                    <option value="otro">Otro</option>
                    <option value="soporte">Soporte Técnico</option>
                </select>
            </div>

            {/* Ticket List */}
            {filtered.length === 0 ? (
                <div className="glass-card" style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Inbox size={48} style={{ opacity: 0.3, marginBottom: '15px' }} />
                    <p style={{ fontSize: '1.1rem' }}>No hay solicitudes{filterStatus !== 'all' || filterType !== 'all' ? ' con estos filtros' : ''}.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filtered.map(ticket => (
                        <TicketCard
                            key={ticket.id}
                            ticket={ticket}
                            isAssignedToMe={isAssignedToMe(ticket)}
                            isMyTicket={isMyTicket(ticket)}
                            onClick={setSelectedTicket}
                        />
                    ))}
                </div>
            )}

            {/* Modal */}
            {selectedTicket && (
                <TicketDetailModal
                    ticket={selectedTicket}
                    onClose={onCloseModal}
                    isAdmin={isAdmin}
                    isMyTicket={isMyTicket}
                    isAssignedToMe={isAssignedToMe}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    handleMarkInProgress={handleMarkInProgress}
                    handleMarkResolved={handleMarkResolved}
                    handleReopen={handleReopen}
                    isResolving={isResolving}
                    setIsResolving={setIsResolving}
                    resolutionData={resolutionData}
                    setResolutionData={setResolutionData}
                    isUploadingResolution={isUploadingResolution}
                />
            )}
        </div>
    );
};

// standalone component outside
const TicketDetailModal = ({
    ticket, onClose, isAdmin, isMyTicket, isAssignedToMe,
    onEdit, onDelete, handleMarkInProgress, handleMarkResolved, handleReopen,
    isResolving, setIsResolving, resolutionData, setResolutionData,
    isUploadingResolution
}) => {
    if (!ticket) return null;

    const typeInfo = TYPE_LABELS[ticket.type] || TYPE_LABELS.soporte;
    const priorityInfo = PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.medium;
    const statusInfo = STATUS_INFO[ticket.status] || STATUS_INFO.open;
    const StatusIcon = statusInfo.Icon;
    const canAct = isAssignedToMe(ticket) || isAdmin;
    const ownsTicket = isMyTicket(ticket) || isAdmin;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
            zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: '20px'
        }} onClick={onClose}>
            <div
                className="glass-card animate-scale-up"
                style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '0', position: 'relative' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ padding: '25px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'rgba(23, 23, 23, 0.95)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ background: statusInfo.bg, p: '10px', borderRadius: '12px', color: statusInfo.color, display: 'flex' }}>
                            <StatusIcon size={24} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'white' }}>Detalles de Solicitud</h3>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {ticket.id}</div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '10px', borderRadius: '50%', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '30px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px', flexWrap: 'wrap', gap: '20px' }}>
                        <div style={{ flex: 1, minWidth: '300px' }}>
                            <h2 style={{ margin: '0 0 15px 0', fontSize: '1.8rem', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>{ticket.title}</h2>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.8rem', padding: '5px 15px', borderRadius: '30px', fontWeight: 700, background: statusInfo.bg, color: statusInfo.color, border: `1px solid ${statusInfo.color}33` }}>
                                    {statusInfo.label}
                                </span>
                                <span style={{ fontSize: '0.8rem', padding: '5px 15px', borderRadius: '30px', fontWeight: 700, background: priorityInfo.bg, color: priorityInfo.color }}>
                                    Prioridad {priorityInfo.label}
                                </span>
                                <span style={{ fontSize: '0.8rem', padding: '5px 15px', borderRadius: '30px', fontWeight: 700, background: `${typeInfo.color}22`, color: typeInfo.color, border: `1px solid ${typeInfo.color}33` }}>
                                    {typeInfo.label}
                                </span>
                            </div>
                        </div>

                        {/* Actions Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '180px' }}>
                            {canAct && ticket.status !== 'closed' && !isResolving && (
                                <>
                                    {ticket.status === 'open' && (
                                        <button
                                            onClick={() => handleMarkInProgress(ticket.id)}
                                            className="btn-primary"
                                            style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', color: '#06b6d4', width: '100%', padding: '12px' }}
                                        >
                                            Comenzar Atención
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setIsResolving(true)}
                                        className="btn-primary"
                                        style={{ background: '#10b981', color: 'black', width: '100%', padding: '12px' }}
                                    >
                                        <CheckCircle size={18} /> Finalizar Servicio
                                    </button>
                                </>
                            )}
                            {ticket.status === 'closed' && (isAdmin || ownsTicket) && (
                                <button
                                    onClick={() => handleReopen(ticket.id)}
                                    className="btn-primary"
                                    style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', width: '100%', padding: '12px' }}
                                >
                                    <RotateCcw size={18} /> Reabrir Ticket
                                </button>
                            )}

                            {isResolving && (
                                <div style={{ textAlign: 'center', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                    <Edit2 size={16} /> Completando Resolución...
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {ownsTicket && !isResolving && (
                                    <>
                                        <button
                                            onClick={() => { onEdit(ticket); onClose(); }}
                                            style={{ flex: 1, padding: '10px', background: 'rgba(0,108,224,0.1)', color: 'var(--primary)', border: '1px solid rgba(0,108,224,0.2)', borderRadius: '10px', cursor: 'pointer' }}
                                            title="Editar"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => { onDelete(ticket.id); onClose(); }}

                                            style={{ flex: 1, padding: '10px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', cursor: 'pointer' }}
                                            title="Eliminar"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Resolution Form */}
                    {isResolving && ticket.status !== 'closed' && (
                        <div style={{ marginBottom: '30px', background: 'rgba(16, 185, 129, 0.05)', padding: '25px', borderRadius: '15px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            <h4 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#10b981', fontWeight: 800 }}>Finalizar Solicitud</h4>

                            <div className="input-group">
                                <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>Solución / Respuesta Final</label>
                                <textarea
                                    placeholder="Describa cómo se resolvió la solicitud..."
                                    style={{ minHeight: '100px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '12px', borderRadius: '8px', width: '100%' }}
                                    value={resolutionData.text}
                                    onChange={(e) => setResolutionData({ ...resolutionData, text: e.target.value })}
                                />
                            </div>

                            <div className="input-group">
                                <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>Evidencia (PDF / Fotos)</label>
                                <div style={{
                                    border: '2px dashed #10b981',
                                    padding: '20px',
                                    borderRadius: '12px',
                                    textAlign: 'center',
                                    position: 'relative',
                                    background: 'rgba(16, 185, 129, 0.05)',
                                    transition: 'all 0.2s',
                                    color: '#10b981'
                                }}>
                                    <Paperclip size={20} style={{ marginBottom: '8px' }} />

                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*,.pdf"
                                        onChange={(e) => {
                                            const files = Array.from(e.target.files);
                                            if (files.some(f => f.size > 1024 * 1024)) {
                                                alert("⚠️ Archivos deben ser < 1MB");
                                                return;
                                            }
                                            setResolutionData({ ...resolutionData, files });
                                        }}
                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                    />
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {resolutionData.files.length > 0 ? `${resolutionData.files.length} archivos seleccionados` : 'Haga clic para subir evidencias'}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button
                                    onClick={() => handleMarkResolved(ticket.id)}
                                    disabled={isUploadingResolution || !resolutionData.text.trim()}
                                    className="btn-primary"
                                    style={{
                                        flex: 2,
                                        background: (!resolutionData.text.trim() || isUploadingResolution) ? 'rgba(255,255,255,0.05)' : '#10b981',
                                        color: (!resolutionData.text.trim() || isUploadingResolution) ? 'rgba(255,255,255,0.3)' : 'black',
                                        cursor: (!resolutionData.text.trim() || isUploadingResolution) ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {isUploadingResolution ? 'Guardando...' : 'Confirmar Cierre'}
                                </button>

                                <button
                                    onClick={() => setIsResolving(false)}
                                    className="btn-secondary"
                                    style={{ flex: 1 }}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Description Section */}
                    {!isResolving && (
                        <div style={{ marginBottom: '30px', background: 'rgba(255,255,255,0.02)', padding: '25px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Descripción</h4>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, fontSize: '1.05rem', whiteSpace: 'pre-wrap' }}>
                                {ticket.description}
                            </p>
                        </div>
                    )}


                    {/* Image Attachment */}
                    {ticket.imageUrl && !isResolving && (
                        <div style={{ marginBottom: '30px' }}>
                            <h4 style={{ margin: '0 0 15px 0', fontSize: '0.8rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Imagen Adjunta</h4>
                            <a href={ticket.imageUrl} target="_blank" rel="noopener noreferrer">
                                <div style={{ borderRadius: '15px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: 'black' }}>
                                    <img src={ticket.imageUrl} alt="Adjunto" style={{ width: '100%', maxHeight: '400px', objectFit: 'contain' }} />
                                </div>
                            </a>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>Haga clic para expandir</p>
                        </div>
                    )}

                    {/* Author & Info */}
                    {!isResolving && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                            <div className="glass-card" style={{ padding: '15px', background: 'rgba(255,255,255,0.03)' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '5px' }}>Solicitado por</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: 700 }}>
                                    <User size={14} color="var(--primary)" /> {ticket.author}
                                </div>
                            </div>
                            <div className="glass-card" style={{ padding: '15px', background: 'rgba(255,255,255,0.03)' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '5px' }}>Fecha de Creación</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: 700 }}>
                                    <Calendar size={14} color="var(--primary)" /> {new Date(ticket.createdAt).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Resolution Section if Closed */}
                    {ticket.status === 'closed' && (
                        <div style={{ marginTop: '30px', padding: '25px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '15px', borderLeft: '4px solid #10b981' }}>
                            <h4 style={{ margin: '0 0 15px 0', fontSize: '0.9rem', color: '#10b981', fontWeight: 800, textTransform: 'uppercase' }}>Resolución Final</h4>
                            <p style={{ color: 'white', fontSize: '1rem', lineHeight: 1.6, marginBottom: '15px' }}>{ticket.solution || 'Sin solución especificada.'}</p>

                            {ticket.resolutionAttachments && ticket.resolutionAttachments.length > 0 && (
                                <div style={{ marginTop: '15px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    {ticket.resolutionAttachments.map((file, idx) => (
                                        <a
                                            key={idx}
                                            href={file.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                background: 'rgba(255,255,255,0.05)', padding: '8px 15px',
                                                borderRadius: '8px', color: 'var(--primary)', textDecoration: 'none',
                                                fontSize: '0.8rem', border: '1px solid rgba(0,108,224,0.2)'
                                            }}
                                        >
                                            <Paperclip size={14} /> {file.name}
                                        </a>
                                    ))}
                                </div>
                            )}

                            {ticket.recommendation && (
                                <div style={{ marginTop: '15px' }}>
                                    <h5 style={{ margin: '0 0 5px 0', fontSize: '0.8rem', color: '#10b981', opacity: 0.8 }}>Recomendaciones</h5>
                                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: 0 }}>{ticket.recommendation}</p>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default MyAssignedRequests;
