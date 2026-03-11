import React, { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import db from '../services/db';
import { PlusCircle, Save, X, Edit, Trash2, Calendar, FileText, Anchor } from 'lucide-react';

const ProjectLogistics = () => {
    const { user } = useAuth();
    const [logistics, setLogistics] = useState([]);
    const [projects, setProjects] = useState([]);
    const [editingId, setEditingId] = useState(null);

    const [editFormData, setEditFormData] = useState({
        order_no: '',
        requisition: '',
        customer: '',
        project: '',
        compliance: 'PROJECT',
        description: '',
        status: 'EN PLANIFICACION',
        date_po: '',
        estimated_delivery: '',
        date_delivered: '',
        delay_time: '',
        delivery_condition: '',
        remarks: ''
    });

    useEffect(() => {
        const unsubscribeLog = db.subscribeLogistics((data) => {
            setLogistics(data);
        });
        const unsubscribeProj = db.subscribeProjects((data) => {
            setProjects(data);
        });

        return () => {
            unsubscribeLog();
            unsubscribeProj();
        };
    }, []);

    const resetForm = () => {
        setEditFormData({
            order_no: '',
            requisition: '',
            customer: '',
            project: '',
            compliance: 'PROJECT',
            description: '',
            status: 'EN PLANIFICACION',
            date_po: '',
            estimated_delivery: '',
            date_delivered: '',
            delay_time: '',
            delivery_condition: '',
            remarks: ''
        });
        setEditingId(null);
    };

    const handleAddClick = () => {
        resetForm();
        setEditingId('NEW');
    };

    const handleEditClick = (logData) => {
        setEditingId(logData.id);
        const formValues = {
            order_no: logData.order_no || '',
            requisition: logData.requisition || '',
            customer: logData.customer || '',
            project: logData.project || '',
            compliance: logData.compliance || 'PROJECT',
            description: logData.description || '',
            status: logData.status || 'EN PLANIFICACION',
            date_po: logData.date_po || '',
            estimated_delivery: logData.estimated_delivery || '',
            date_delivered: logData.date_delivered || '',
            delay_time: logData.delay_time || '',
            delivery_condition: logData.delivery_condition || '',
            remarks: logData.remarks || ''
        };
        setEditFormData(formValues);
    };

    const handleSaveRow = async () => {
        try {
            if (editingId === 'NEW') {
                await db.addLogisticsRow({
                    ...editFormData,
                    author: user.username
                });
            } else {
                await db.updateLogisticsRow(editingId, editFormData);
            }
            resetForm();
        } catch (err) {
            console.error("Error saving logistics row:", err);
            alert("Error al guardar fila de logística.");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("¿Confirma eliminar este registro de importación/logística?")) {
            await db.deleteLogisticsRow(id);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({ ...prev, [name]: value }));
    };

    // Si cambia el ID del Proyecto pre-cargaremos automáticamente el Cliente (si aplica)
    const handleProjectChange = (e) => {
        const projId = e.target.value;
        const linkedProj = projects.find(p => p.id === projId);

        setEditFormData(prev => ({
            ...prev,
            project: projId,
            customer: linkedProj ? linkedProj.customer : prev.customer
        }));
    };

    // Color definitions based on the image provided
    const getRowColorStyles = (status) => {
        switch (status) {
            case 'TERMINADO':
            case 'ENTREGADO':
                return { backgroundColor: 'var(--success)', color: '#000', fontWeight: 'bold' };
            case 'EN TRANSITO':
            case 'EN FABRICACION':
                return { backgroundColor: 'var(--warning)', color: '#000', fontWeight: 'bold' };
            default:
                return { backgroundColor: 'transparent', color: 'inherit' };
        }
    };

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Anchor color="var(--primary)" size={24} /> Planificador de Logística y Transportes
                </h3>
                {editingId !== 'NEW' && (
                    <button onClick={handleAddClick} className="btn-primary" style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
                        <PlusCircle size={18} /> Nueva Solicitud
                    </button>
                )}
            </div>

            <div className="glass-card" style={{ padding: '10px', overflowX: 'auto' }}>
                <table style={{ minWidth: '1500px', borderCollapse: 'collapse', fontSize: '0.8rem', width: '100%' }}>
                    <thead>
                        <tr style={{ background: '#2c3e50', color: 'white', borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                            <th style={{ padding: '10px', border: '1px solid #34495e', width: '60px' }}>Order</th>
                            <th style={{ padding: '10px', border: '1px solid #34495e', width: '80px' }}>Requisition</th>
                            <th style={{ padding: '10px', border: '1px solid #34495e', width: '150px' }}>Customer</th>
                            <th style={{ padding: '10px', border: '1px solid #34495e', width: '150px' }}>Project / Equip.</th>
                            <th style={{ padding: '10px', border: '1px solid #34495e', width: '120px' }}>Compliance</th>
                            <th style={{ padding: '10px', border: '1px solid #34495e', width: '250px' }}>Description</th>
                            <th style={{ padding: '10px', border: '1px solid #34495e', width: '120px' }}>PROJ. STATUS</th>
                            <th style={{ padding: '10px', border: '1px solid #34495e', width: '90px' }}>Date PO</th>
                            <th style={{ padding: '10px', border: '1px solid #34495e', width: '90px' }}>Est. Delivery</th>
                            <th style={{ padding: '10px', border: '1px solid #34495e', width: '90px' }}>Delivered</th>
                            <th style={{ padding: '10px', border: '1px solid #34495e', width: '80px' }}>Delay Time</th>
                            <th style={{ padding: '10px', border: '1px solid #34495e', width: '110px' }}>Del. Condition</th>
                            <th style={{ padding: '10px', border: '1px solid #34495e' }}>Remarks</th>
                            <th style={{ padding: '10px', border: '1px solid #34495e', width: '90px', textAlign: 'center' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {editingId === 'NEW' && (
                            <tr style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                                <td style={{ padding: '8px', border: '1px solid #34495e' }}><input type="text" name="order_no" value={editFormData.order_no} onChange={handleChange} style={{ width: '100%', padding: '5px' }} /></td>
                                <td style={{ padding: '8px', border: '1px solid #34495e' }}><input type="text" name="requisition" value={editFormData.requisition} onChange={handleChange} style={{ width: '100%', padding: '5px' }} /></td>
                                <td style={{ padding: '8px', border: '1px solid #34495e' }}><input type="text" name="customer" value={editFormData.customer} onChange={handleChange} style={{ width: '100%', padding: '5px' }} /></td>

                                {/* Selecting Project Dropdown */}
                                <td style={{ padding: '8px', border: '1px solid #34495e' }}>
                                    <select name="project" value={editFormData.project} onChange={handleProjectChange} style={{ width: '100%', padding: '5px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid var(--border-color)' }}>
                                        <option value="">- Seleccionar -</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </td>

                                <td style={{ padding: '8px', border: '1px solid #34495e' }}>
                                    <select name="compliance" value={editFormData.compliance} onChange={handleChange} style={{ width: '100%', padding: '5px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid var(--border-color)' }}>
                                        <option value="PROJECT">PROJECT</option>
                                        <option value="OPERATIONAL">OPERATIONAL</option>
                                    </select>
                                </td>
                                <td style={{ padding: '8px', border: '1px solid #34495e' }}><textarea name="description" value={editFormData.description} onChange={handleChange} style={{ width: '100%', padding: '5px', height: '35px' }} /></td>

                                {/* Status with color styling directly requested */}
                                <td style={{ padding: '8px', border: '1px solid #34495e' }}>
                                    <select name="status" value={editFormData.status} onChange={handleChange} style={{ width: '100%', padding: '5px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid var(--border-color)', fontWeight: 'bold' }}>
                                        <option value="EN PLANIFICACION">EN PLANIFICACIÓN</option>
                                        <option value="EN FABRICACION">EN FABRICACIÓN</option>
                                        <option value="EN TRANSITO">EN TRANSITO</option>
                                        <option value="TERMINADO">TERMINADO</option>
                                        <option value="ENTREGADO">ENTREGADO</option>
                                    </select>
                                </td>

                                <td style={{ padding: '8px', border: '1px solid #34495e' }}><input type="date" name="date_po" value={editFormData.date_po} onChange={handleChange} style={{ width: '100%', padding: '5px' }} /></td>
                                <td style={{ padding: '8px', border: '1px solid #34495e' }}><input type="date" name="estimated_delivery" value={editFormData.estimated_delivery} onChange={handleChange} style={{ width: '100%', padding: '5px' }} /></td>
                                <td style={{ padding: '8px', border: '1px solid #34495e' }}><input type="date" name="date_delivered" value={editFormData.date_delivered} onChange={handleChange} style={{ width: '100%', padding: '5px' }} /></td>
                                <td style={{ padding: '8px', border: '1px solid #34495e' }}><input type="text" name="delay_time" value={editFormData.delay_time} onChange={handleChange} style={{ width: '100%', padding: '5px' }} /></td>
                                <td style={{ padding: '8px', border: '1px solid #34495e' }}><input type="text" name="delivery_condition" value={editFormData.delivery_condition} onChange={handleChange} style={{ width: '100%', padding: '5px' }} /></td>
                                <td style={{ padding: '8px', border: '1px solid #34495e' }}><textarea name="remarks" value={editFormData.remarks} onChange={handleChange} style={{ width: '100%', padding: '5px', height: '35px' }} /></td>
                                <td style={{ padding: '8px', border: '1px solid #34495e', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '5px' }}>
                                        <button onClick={handleSaveRow} className="action-btn" title="Guardar" style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)' }}><Save size={16} /></button>
                                        <button onClick={resetForm} className="action-btn" title="Cancelar" style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)' }}><X size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        )}
                        {logistics.map(log => {
                            if (editingId === log.id) {
                                return (
                                    <tr key={log.id} style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
                                        {/* Same inputs as NEW row for editing */}
                                        <td style={{ padding: '8px', border: '1px solid #34495e' }}><input type="text" name="order_no" value={editFormData.order_no} onChange={handleChange} style={{ width: '100%', padding: '5px' }} /></td>
                                        <td style={{ padding: '8px', border: '1px solid #34495e' }}><input type="text" name="requisition" value={editFormData.requisition} onChange={handleChange} style={{ width: '100%', padding: '5px' }} /></td>
                                        <td style={{ padding: '8px', border: '1px solid #34495e' }}><input type="text" name="customer" value={editFormData.customer} onChange={handleChange} style={{ width: '100%', padding: '5px' }} /></td>

                                        <td style={{ padding: '8px', border: '1px solid #34495e' }}>
                                            <select name="project" value={editFormData.project} onChange={handleProjectChange} style={{ width: '100%', padding: '5px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid var(--border-color)' }}>
                                                <option value="">- Seleccionar -</option>
                                                {projects.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                        </td>

                                        <td style={{ padding: '8px', border: '1px solid #34495e' }}>
                                            <select name="compliance" value={editFormData.compliance} onChange={handleChange} style={{ width: '100%', padding: '5px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid var(--border-color)' }}>
                                                <option value="PROJECT">PROJECT</option>
                                                <option value="OPERATIONAL">OPERATIONAL</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: '8px', border: '1px solid #34495e' }}><textarea name="description" value={editFormData.description} onChange={handleChange} style={{ width: '100%', padding: '5px', height: '35px' }} /></td>

                                        <td style={{ padding: '8px', border: '1px solid #34495e' }}>
                                            <select name="status" value={editFormData.status} onChange={handleChange} style={{ width: '100%', padding: '5px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid var(--border-color)', fontWeight: 'bold' }}>
                                                <option value="EN PLANIFICACION">EN PLANIFICACIÓN</option>
                                                <option value="EN FABRICACION">EN FABRICACIÓN</option>
                                                <option value="EN TRANSITO">EN TRANSITO</option>
                                                <option value="TERMINADO">TERMINADO</option>
                                                <option value="ENTREGADO">ENTREGADO</option>
                                            </select>
                                        </td>

                                        <td style={{ padding: '8px', border: '1px solid #34495e' }}><input type="date" name="date_po" value={editFormData.date_po} onChange={handleChange} style={{ width: '100%', padding: '5px' }} /></td>
                                        <td style={{ padding: '8px', border: '1px solid #34495e' }}><input type="date" name="estimated_delivery" value={editFormData.estimated_delivery} onChange={handleChange} style={{ width: '100%', padding: '5px' }} /></td>
                                        <td style={{ padding: '8px', border: '1px solid #34495e' }}><input type="date" name="date_delivered" value={editFormData.date_delivered} onChange={handleChange} style={{ width: '100%', padding: '5px' }} /></td>
                                        <td style={{ padding: '8px', border: '1px solid #34495e' }}><input type="text" name="delay_time" value={editFormData.delay_time} onChange={handleChange} style={{ width: '100%', padding: '5px' }} /></td>
                                        <td style={{ padding: '8px', border: '1px solid #34495e' }}><input type="text" name="delivery_condition" value={editFormData.delivery_condition} onChange={handleChange} style={{ width: '100%', padding: '5px' }} /></td>
                                        <td style={{ padding: '8px', border: '1px solid #34495e' }}><textarea name="remarks" value={editFormData.remarks} onChange={handleChange} style={{ width: '100%', padding: '5px', height: '35px' }} /></td>

                                        <td style={{ padding: '8px', border: '1px solid #34495e', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '5px' }}>
                                                <button onClick={handleSaveRow} className="action-btn" title="Guardar" style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)' }}><Save size={16} /></button>
                                                <button onClick={resetForm} className="action-btn" title="Cancelar" style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)' }}><X size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            } else {
                                const linkedProj = projects.find(p => p.id === log.project);
                                return (
                                    <tr key={log.id} style={{ borderBottom: '1px solid #34495e' }}>
                                        <td style={{ padding: '10px', border: '1px solid #34495e' }}>{log.order_no}</td>
                                        <td style={{ padding: '10px', border: '1px solid #34495e' }}>{log.requisition}</td>
                                        <td style={{ padding: '10px', border: '1px solid #34495e', fontWeight: 'bold' }}>{log.customer}</td>
                                        <td style={{ padding: '10px', border: '1px solid #34495e' }}>
                                            {linkedProj ? linkedProj.name : <span style={{ color: 'var(--text-muted)' }}>- INDEPENDIENTE -</span>}
                                        </td>
                                        <td style={{ padding: '10px', border: '1px solid #34495e', fontWeight: 'bold' }}>{log.compliance}</td>
                                        <td style={{ padding: '10px', border: '1px solid #34495e', whiteSpace: 'pre-wrap' }}>{log.description}</td>

                                        <td style={{ padding: '10px', border: '1px solid #34495e', ...getRowColorStyles(log.status), textAlign: 'center' }}>
                                            {log.status}
                                        </td>

                                        <td style={{ padding: '10px', border: '1px solid #34495e' }}>{log.date_po}</td>
                                        <td style={{ padding: '10px', border: '1px solid #34495e' }}>{log.estimated_delivery}</td>
                                        <td style={{ padding: '10px', border: '1px solid #34495e' }}>{log.date_delivered}</td>
                                        <td style={{ padding: '10px', border: '1px solid #34495e' }}>{log.delay_time}</td>
                                        <td style={{ padding: '10px', border: '1px solid #34495e' }}>{log.delivery_condition}</td>
                                        <td style={{ padding: '10px', border: '1px solid #34495e', whiteSpace: 'pre-wrap', minWidth: '200px' }}>{log.remarks}</td>

                                        <td style={{ padding: '10px', border: '1px solid #34495e', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '5px' }}>
                                                <button onClick={() => handleEditClick(log)} className="action-btn" title="Editar" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(log.id)} className="action-btn" title="Eliminar" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            }
                        })}
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: '15px', padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <strong>Nota Técnica:</strong> La información cruzada con el ERP y Logística permite actualizar en tiempo real el estado de una importación. Los colores indican progreso (Verde para Entregas, Amarillo/Naranja en Tránsito y Fabricación).
            </div>
        </div>
    );
};

export default ProjectLogistics;
