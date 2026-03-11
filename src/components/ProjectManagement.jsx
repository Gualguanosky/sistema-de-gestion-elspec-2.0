import React, { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import db from '../services/db';
import { PlusCircle, Search, Edit, Trash2, Link as LinkIcon, Briefcase } from 'lucide-react';

const ProjectManagement = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [sales, setSales] = useState([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        customer: '',
        status: 'PLANIFICACION', // PLANIFICACION, EN EJECUCION, PAUSADO, COMPLETADO
        description: '',
        linkedSaleId: '',
        targetDate: ''
    });

    useEffect(() => {
        const unsubscribeProj = db.subscribeProjects((data) => {
            setProjects(data);
        });
        const unsubscribeSales = db.subscribeSales((data) => {
            setSales(data);
        });

        return () => {
            unsubscribeProj();
            unsubscribeSales();
        };
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingProject) {
                await db.updateProject(editingProject.id, formData);
            } else {
                // Generar una Venta/ERP en blanco asociada a este cliente
                const emptySale = await db.addSale({
                    cliente: {
                        razon_social: formData.customer,
                        nit: '',
                        email: '',
                        telefono: '',
                        direccion: '',
                        ciudad: ''
                    },
                    estado: 'BORRADOR',
                    lineas: [], // Empieza sin equipos
                    configuracion: {
                        aplicarIVA: true,
                        tipoTransporte: 'NINGUNO',
                        unidadTransporte: 'KG',
                        tarifaCosto1: 0,
                        tarifaCosto2: 0,
                        aplicarSeguro: false,
                        tasaSeguro: 0
                    },
                    totales: { subtotalNeto: 0, total: 0 },
                    createdBy: user.username,
                    createdByName: user.name || user.username
                });

                // Crear el proyecto vinculando el nuevo ERP
                await db.addProject({
                    ...formData,
                    linkedSaleId: emptySale.id, // Vinculación automática
                    createdBy: user.username,
                    createdByName: user.name || user.username
                });
            }
            setIsFormOpen(false);
            setEditingProject(null);
            resetForm();
        } catch (error) {
            console.error("Error saving project:", error);
            alert("Error al guardar el proyecto.");
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            customer: '',
            status: 'PLANIFICACION',
            description: '',
            linkedSaleId: '',
            targetDate: ''
        });
    };

    const handleEdit = (proj) => {
        setEditingProject(proj);
        setFormData({
            name: proj.name || '',
            customer: proj.customer || '',
            status: proj.status || 'PLANIFICACION',
            description: proj.description || '',
            linkedSaleId: proj.linkedSaleId || '',
            targetDate: proj.targetDate || ''
        });
        setIsFormOpen(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm("¿Está seguro de eliminar este proyecto? Se perderá el historial y vínculos.")) {
            await db.deleteProject(id);
        }
    };

    const StatusBadge = ({ status }) => {
        const statusColors = {
            'PLANIFICACION': { bg: 'rgba(59, 130, 246, 0.2)', text: '#60a5fa' }, // Blue
            'EN EJECUCION': { bg: 'rgba(245, 158, 11, 0.2)', text: '#fbbf24' },   // Warning Yellow
            'PAUSADO': { bg: 'rgba(239, 68, 68, 0.2)', text: '#f87171' },         // Red
            'COMPLETADO': { bg: 'rgba(16, 185, 129, 0.2)', text: '#34d399' }      // Green
        };
        const colorStyle = statusColors[status] || statusColors['PLANIFICACION'];
        return (
            <span style={{
                background: colorStyle.bg,
                color: colorStyle.text,
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                whiteSpace: 'nowrap'
            }}>
                {status}
            </span>
        );
    };

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.customer.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isFormOpen) {
        return (
            <div className="glass-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Briefcase color="var(--primary)" size={24} />
                        {editingProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}
                    </h3>
                    <button onClick={() => { setIsFormOpen(false); resetForm(); setEditingProject(null); }} className="btn-primary" style={{ background: 'rgba(255,255,255,0.05)' }}>Volver</button>
                </div>

                <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '15px' }}>
                    <div className="input-group">
                        <label>Nombre del Proyecto *</label>
                        <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                    </div>

                    <div className="input-group">
                        <label>Cliente / Empresa *</label>
                        <input type="text" value={formData.customer} onChange={e => setFormData({ ...formData, customer: e.target.value })} required />
                    </div>

                    <div className="input-group">
                        <label>Estado del Proyecto</label>
                        <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                            <option value="PLANIFICACION">Planificación</option>
                            <option value="EN EJECUCION">En Ejecución</option>
                            <option value="PAUSADO">Pausado</option>
                            <option value="COMPLETADO">Completado</option>
                        </select>
                    </div>

                    <div className="input-group">
                        <label>Vincular a ERP (Cotización/Venta)</label>
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                            <LinkIcon size={18} color="var(--primary)" />
                            <select value={formData.linkedSaleId} onChange={e => setFormData({ ...formData, linkedSaleId: e.target.value })}>
                                <option value="">-- Sin Vincular --</option>
                                {sales.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.cliente.razon_social} (Total: ${new Intl.NumberFormat('es-CO').format(s.totales.total)})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="input-group">
                        <label>Fecha Objetivo / Límite</label>
                        <input type="date" value={formData.targetDate} onChange={e => setFormData({ ...formData, targetDate: e.target.value })} />
                    </div>

                    <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                        <label>Descripción y Requerimientos</label>
                        <textarea rows="4" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Ej: Importación de equipos serie S, incluye paneles..."></textarea>
                    </div>

                    <div style={{ gridColumn: '1 / -1', marginTop: '20px', display: 'flex', gap: '15px' }}>
                        <button type="submit" className="btn-primary" style={{ padding: '12px 30px', fontSize: '1rem' }}>Guardar Proyecto</button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: '1 1 auto', minWidth: '250px' }}>
                    <div className="search-box-premium" style={{ width: '100%' }}>
                        <Search size={18} />
                        <input type="text" placeholder="Buscar proyecto o cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ padding: '10px' }} />
                    </div>
                </div>
                <button onClick={() => setIsFormOpen(true)} className="btn-primary" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
                    <PlusCircle size={20} /> <span className="hide-mobile">Crear Proyecto</span><span className="show-mobile">Nuevo</span>
                </button>
            </div>

            <div className="glass-card" style={{ padding: '15px' }}>
                <div className="responsive-table">
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                <th style={{ padding: '15px' }}>Proyecto</th>
                                <th style={{ padding: '15px' }}>Cliente</th>
                                <th style={{ padding: '15px' }}>Estado</th>
                                <th style={{ padding: '15px' }}>Venta Asoc.</th>
                                <th style={{ padding: '15px' }}>Fecha Límite</th>
                                <th style={{ padding: '15px', textAlign: 'center' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProjects.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No hay proyectos registrados. Crea uno nuevo para comenzar la gestión operativa.
                                    </td>
                                </tr>
                            ) : (
                                filteredProjects.map(proj => {
                                    const linkedSale = sales.find(s => s.id === proj.linkedSaleId);

                                    return (
                                        <tr key={proj.id} className="table-row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '15px' }}>
                                                <div style={{ fontWeight: 'bold' }}>{proj.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {new Date(proj.createdAt).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td style={{ padding: '15px' }}>{proj.customer}</td>
                                            <td style={{ padding: '15px' }}>
                                                <StatusBadge status={proj.status} />
                                            </td>
                                            <td style={{ padding: '15px', fontSize: '0.85rem' }}>
                                                {linkedSale ? (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--primary)' }}>
                                                        <LinkIcon size={14} /> ERP Vinculado
                                                    </span>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)' }}>Sin Vínculo</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '15px' }}>{proj.targetDate || 'No definida'}</td>
                                            <td style={{ padding: '15px', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                    <button onClick={() => handleEdit(proj)} className="action-btn" title="Editar" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
                                                        <Edit size={16} />
                                                    </button>
                                                    <button onClick={() => handleDelete(proj.id)} className="action-btn" title="Eliminar" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ProjectManagement;
