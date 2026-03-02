import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Calendar, Clock, MapPin, User, CheckCircle, AlertTriangle, Plus, X, Trash2, Edit, FileText, Link } from 'lucide-react';
import db from '../services/db';
import useAuth from '../hooks/useAuth';
import useIndicators from '../hooks/useIndicators';

const OperationsSchedule = () => {
    const { indicators } = useIndicators();
    const { user } = useAuth();
    const [visits, setVisits] = useState([]);
    const [users, setUsers] = useState([]); // All users for dropdown
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVisit, setEditingVisit] = useState(null);
    const [viewMode, setViewMode] = useState('calendar'); // 'list' or 'calendar'
    const [currentDate, setCurrentDate] = useState(new Date());

    // Report Generation State
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportData, setReportData] = useState({ findings: '', conclusions: '', recommendations: '' });
    const [selectedVisitForReport, setSelectedVisitForReport] = useState(null);

    // Aggregate Report State
    const [isAggregateModalOpen, setIsAggregateModalOpen] = useState(false);
    const [reportDateRange, setReportDateRange] = useState({ start: '', end: '' });

    const [newVisit, setNewVisit] = useState({
        date: '',
        location: '',
        client: '',
        description: '',
        personnel: [], // Array of strings
        status: 'scheduled',
        type: 'Medición', // Default type
        linkedIndicatorId: '' // Optional SGI Indicator ID
    });

    useEffect(() => {
        const unsubscribeVisits = db.getVisits((data) => {
            setVisits(data);
            setLoading(false);
        });
        const unsubscribeUsers = db.subscribeUsers(setUsers);

        return () => {
            unsubscribeVisits();
            unsubscribeUsers();
        };
    }, []);

    const isAdmin = user?.role === 'admin';
    const canEdit = isAdmin || user?.role === 'operator' || user?.role === 'technician' || user?.role === 'operaciones';

    // Filter users for the dropdown (exclude sales, clients if any)
    const operationalUsers = users.filter(u =>
        ['sgi', 'operaciones', 'technician', 'operator'].includes(u.role)
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingVisit) {
                await db.updateVisit(editingVisit.id, newVisit);
            } else {
                await db.addVisit({
                    ...newVisit,
                    createdBy: user.username
                });
            }
            setIsModalOpen(false);
            setEditingVisit(null);
            setNewVisit({ date: '', location: '', client: '', description: '', personnel: '', status: 'scheduled' });
        } catch (error) {
            console.error("Error saving visit:", error);
            alert("Error al guardar la visita.");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Está seguro de eliminar esta visita?')) {
            await db.deleteVisit(id);
        }
    };

    const openEditModal = (visit) => {
        setEditingVisit(visit);
        setNewVisit({
            date: visit.date,
            location: visit.location,
            client: visit.client || '',
            description: visit.description,
            personnel: Array.isArray(visit.personnel) ? visit.personnel : (visit.personnel ? [visit.personnel] : []),
            status: visit.status,
            type: visit.type || 'Medición',
            linkedIndicatorId: visit.linkedIndicatorId || ''
        });
        setIsModalOpen(true);
    };

    const handleDayClick = (dayStr) => {
        if (!canEdit) return;
        setNewVisit({
            date: dayStr,
            location: '',
            client: '',
            description: '',
            personnel: [],
            status: 'scheduled',
            type: 'Medición',
            linkedIndicatorId: ''
        });
        setEditingVisit(null);
        setIsModalOpen(true);
    };

    // Calendar Helpers
    const getDaysInMonth = (year, month) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year, month) => {
        return new Date(year, month, 1).getDay(); // 0 = Sunday
    };

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

        const days = [];
        // Empty slots for days before the 1st
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', minHeight: '100px' }}></div>);
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayVisits = visits.filter(v => v.date === dateStr);
            const isToday = new Date().toISOString().split('T')[0] === dateStr;

            days.push(
                <div
                    key={day}
                    onClick={() => handleDayClick(dateStr)}
                    style={{
                        background: isToday ? 'rgba(37, 99, 235, 0.1)' : 'rgba(255,255,255,0.05)',
                        border: isToday ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)',
                        minHeight: '100px',
                        padding: '5px',
                        cursor: canEdit ? 'pointer' : 'default',
                        position: 'relative'
                    }}
                >
                    <div style={{ fontWeight: 'bold', marginBottom: '5px', color: isToday ? 'var(--primary)' : 'white' }}>{day}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {dayVisits.map(v => (
                            <div
                                key={v.id}
                                onClick={(e) => { e.stopPropagation(); openEditModal(v); }}
                                style={{
                                    fontSize: '0.75rem',
                                    padding: '2px 4px',
                                    borderRadius: '4px',
                                    background: v.status === 'completed' ? 'var(--success)' : v.status === 'cancelled' ? 'var(--danger)' : 'var(--primary)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis'
                                }}
                                title={`${v.location} - ${Array.isArray(v.personnel) ? v.personnel.join(', ') : v.personnel}`}
                            >
                                {v.location}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>◀ Anterior</button>
                    <h3 style={{ textTransform: 'capitalize', margin: 0 }}>{monthName}</h3>
                    <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>Siguiente ▶</button>
                </div>
                <div className="responsive-table" style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '15px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(100px, 1fr))', gap: '5px', minWidth: '700px' }}>
                        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                            <div key={d} style={{ textAlign: 'center', fontWeight: 'bold', padding: '10px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{d}</div>
                        ))}
                        {days}
                    </div>
                </div>
            </div>
        );
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'var(--success)';
            case 'cancelled': return 'var(--danger)';
            default: return 'var(--primary)';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'completed': return 'Completada';
            case 'cancelled': return 'Cancelada';
            default: return 'Programada';
        }
    };

    // Calculate urgency
    const getUrgency = (dateString, status) => {
        if (status !== 'scheduled') return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const visitDate = new Date(dateString);
        visitDate.setHours(0, 0, 0, 0); // compare dates only

        const diffTime = visitDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { color: 'var(--danger)', text: 'Vencida' };
        if (diffDays === 0) return { color: 'var(--warning)', text: 'Hoy' };
        if (diffDays <= 3) return { color: 'var(--warning)', text: `En ${diffDays} días` };
        return null;
    };

    const generateReportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text(`Reporte de Visita: ${selectedVisitForReport.type}`, 20, 20);

        doc.setFontSize(12);
        doc.text(`Fecha: ${new Date(selectedVisitForReport.date).toLocaleDateString()}`, 20, 35);
        doc.text(`Ubicación: ${selectedVisitForReport.location}`, 20, 42);
        doc.text(`Cliente: ${selectedVisitForReport.client || 'N/A'}`, 20, 49);
        doc.text(`Personal: ${Array.isArray(selectedVisitForReport.personnel) ? selectedVisitForReport.personnel.join(', ') : selectedVisitForReport.personnel}`, 20, 56);

        doc.setLineWidth(0.5);
        doc.line(20, 65, 190, 65);

        let yPos = 75;

        doc.setFontSize(14);
        doc.text('Hallazgos:', 20, yPos);
        yPos += 7;
        doc.setFontSize(11);
        const splitFindings = doc.splitTextToSize(reportData.findings || 'Sin registros.', 170);
        doc.text(splitFindings, 20, yPos);
        yPos += splitFindings.length * 5 + 10;

        doc.setFontSize(14);
        doc.text('Conclusiones:', 20, yPos);
        yPos += 7;
        doc.setFontSize(11);
        const splitConclusions = doc.splitTextToSize(reportData.conclusions || 'Sin registros.', 170);
        doc.text(splitConclusions, 20, yPos);
        yPos += splitConclusions.length * 5 + 10;

        doc.setFontSize(14);
        doc.text('Recomendaciones:', 20, yPos);
        yPos += 7;
        doc.setFontSize(11);
        const splitRecommendations = doc.splitTextToSize(reportData.recommendations || 'Sin registros.', 170);
        doc.text(splitRecommendations, 20, yPos);

        doc.save(`Reporte_Visita_${selectedVisitForReport.date}_${selectedVisitForReport.location}.pdf`);

        setIsReportModalOpen(false);
    };

    const generateAggregateReport = () => {
        if (!reportDateRange.start || !reportDateRange.end) {
            alert("Por favor seleccione fecha de inicio y fin.");
            return;
        }

        const filteredVisits = visits.filter(v =>
            v.date >= reportDateRange.start && v.date <= reportDateRange.end
        );

        if (filteredVisits.length === 0) {
            alert("No hay visitas en el rango seleccionado.");
            return;
        }

        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Reporte de Gestión Operativa', 14, 20);
        doc.setFontSize(12);
        doc.text(`Desde: ${reportDateRange.start}  Hasta: ${reportDateRange.end}`, 14, 30);
        doc.text(`Total Visitas: ${filteredVisits.length}`, 14, 37);

        const tableData = filteredVisits.map(v => {
            const linkedIndicator = indicators.find(i => i.id === v.linkedIndicatorId);
            return [
                v.date,
                v.type,
                v.location,
                v.status === 'completed' ? 'Completada' : v.status === 'cancelled' ? 'Cancelada' : 'Programada',
                linkedIndicator ? `${linkedIndicator.name} (${linkedIndicator.current})` : 'N/A'
            ];
        });

        autoTable(doc, {
            startY: 45,
            head: [['Fecha', 'Tipo', 'Ubicación', 'Estado', 'Indicador SGI']],
            body: tableData,
            styles: { fontSize: 10 },
            headStyles: { fillColor: [66, 133, 244] } // Primary blue
        });

        // Add Counts by Type
        const typeCounts = filteredVisits.reduce((acc, v) => {
            acc[v.type] = (acc[v.type] || 0) + 1;
            return acc;
        }, {});

        let yPos = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.text('Resumen por Tipo de Visita:', 14, yPos);
        yPos += 10;
        doc.setFontSize(11);
        Object.entries(typeCounts).forEach(([type, count]) => {
            doc.text(`- ${type}: ${count}`, 14, yPos);
            yPos += 7;
        });

        doc.save(`Reporte_Gestion_Operaciones_${reportDateRange.start}_${reportDateRange.end}.pdf`);
        setIsAggregateModalOpen(false);
    };

    return (
        <div style={{ padding: 'clamp(10px, 3vw, 20px)', color: 'white', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h2 style={{ fontSize: 'clamp(1.4rem, 4vw, 1.8rem)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                        <Calendar color="var(--primary)" size={28} /> <span className="hide-mobile">Cronograma </span>Operaciones
                    </h2>
                    <p style={{ color: 'var(--text-muted)', margin: '5px 0 0 0', fontSize: '0.9rem' }}>Planificación de visitas técnicas y mantenimientos.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setIsAggregateModalOpen(true)}
                        className="glass-card"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }}
                        title="Reporte General"
                    >
                        <FileText size={18} /> Reportes
                    </button>
                    <button
                        onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
                        className="glass-card"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                        {viewMode === 'list' ? 'Ver Calendario' : 'Ver Lista'}
                    </button>
                    {canEdit && (
                        <button
                            onClick={() => {
                                setEditingVisit(null);
                                setNewVisit({ date: '', location: '', client: '', description: '', personnel: [], status: 'scheduled', type: 'Medición', linkedIndicatorId: '' });
                                setIsModalOpen(true);
                            }}
                            className="btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Plus size={18} /> Agendar Visita
                        </button>
                    )}
                </div>
            </div>

            {viewMode === 'calendar' ? renderCalendar() : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {visits.map(visit => {
                        const urgency = getUrgency(visit.date, visit.status);
                        return (
                            <div key={visit.id} className="glass-card" style={{ padding: '20px', position: 'relative', borderLeft: `4px solid ${getStatusColor(visit.status)}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '5px 10px', borderRadius: '15px' }}>
                                        <Clock size={14} color={getStatusColor(visit.status)} />
                                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                                            {new Date(visit.date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    {urgency && (
                                        <span style={{ color: urgency.color, fontWeight: 'bold', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <AlertTriangle size={14} /> {urgency.text}
                                        </span>
                                    )}
                                </div>

                                <h4 style={{ fontSize: '1.2rem', margin: '0 0 10px 0' }}>{visit.location}</h4>
                                {visit.client && <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Cliente: {visit.client}</div>}

                                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '15px' }}>
                                    {visit.description}
                                </p>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    <User size={16} />
                                    <span>Personal: {Array.isArray(visit.personnel) ? visit.personnel.join(', ') : visit.personnel}</span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                        <span style={{
                                            fontSize: '0.8rem',
                                            padding: '4px 10px',
                                            borderRadius: '10px',
                                            background: visit.status === 'completed' ? 'rgba(16, 185, 129, 0.2)' : visit.status === 'cancelled' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(37, 99, 235, 0.2)',
                                            color: getStatusColor(visit.status)
                                        }}>
                                            {getStatusLabel(visit.status)}
                                        </span>
                                        <span style={{
                                            fontSize: '0.8rem',
                                            padding: '4px 10px',
                                            borderRadius: '10px',
                                            background: 'rgba(255, 255, 255, 0.1)',
                                            color: 'white',
                                            border: '1px solid rgba(255,255,255,0.2)'
                                        }}>
                                            {visit.type}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => {
                                            setSelectedVisitForReport(visit);
                                            setReportData({ findings: '', conclusions: '', recommendations: '' });
                                            setIsReportModalOpen(true);
                                        }} style={{ background: 'transparent', color: 'var(--text-light)', border: 'none', cursor: 'pointer', padding: '5px' }} title="Generar Reporte">
                                            <FileText size={18} />
                                        </button>
                                        {canEdit && (
                                            <>
                                                <button onClick={() => openEditModal(visit)} style={{ background: 'transparent', color: 'var(--primary)', border: 'none', cursor: 'pointer', padding: '5px' }} title="Editar">
                                                    <Edit size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(visit.id)} style={{ background: 'transparent', color: 'var(--danger)', border: 'none', cursor: 'pointer', padding: '5px' }} title="Eliminar">
                                                    <Trash2 size={18} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {isReportModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)',
                    zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center',
                    padding: '10px'
                }}>
                    <div className="glass-card" style={{
                        padding: '20px',
                        width: '100%',
                        maxWidth: '600px',
                        border: '1px solid var(--primary)',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <FileText size={24} /> Informe de Visita
                        </h3>
                        <div className="input-group">
                            <label>Hallazgos</label>
                            <textarea rows="4" placeholder="Describa los hallazgos encontrados..." value={reportData.findings} onChange={e => setReportData({ ...reportData, findings: e.target.value })}></textarea>
                        </div>
                        <div className="input-group">
                            <label>Conclusiones</label>
                            <textarea rows="3" placeholder="Conclusiones principales..." value={reportData.conclusions} onChange={e => setReportData({ ...reportData, conclusions: e.target.value })}></textarea>
                        </div>
                        <div className="input-group">
                            <label>Recomendaciones</label>
                            <textarea rows="3" placeholder="Recomendaciones para el cliente..." value={reportData.recommendations} onChange={e => setReportData({ ...reportData, recommendations: e.target.value })}></textarea>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            <button onClick={generateReportPDF} className="btn-primary" style={{ flex: 1 }}>Generar PDF</button>
                            <button onClick={() => setIsReportModalOpen(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {isAggregateModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)',
                    zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center',
                    padding: '10px'
                }}>
                    <div className="glass-card" style={{
                        padding: '20px',
                        width: '100%',
                        maxWidth: '400px',
                        border: '1px solid var(--primary)',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <FileText size={24} /> Reporte de Gestión
                        </h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '15px', fontSize: '0.9rem' }}>
                            Seleccione el rango de fechas para generar el reporte consolidado de visitas e indicadores.
                        </p>
                        <div className="input-group">
                            <label>Fecha Inicio</label>
                            <input type="date" value={reportDateRange.start} onChange={e => setReportDateRange({ ...reportDateRange, start: e.target.value })} />
                        </div>
                        <div className="input-group">
                            <label>Fecha Fin</label>
                            <input type="date" value={reportDateRange.end} onChange={e => setReportDateRange({ ...reportDateRange, end: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            <button onClick={generateAggregateReport} className="btn-primary" style={{ flex: 1 }}>Generar Reporte</button>
                            <button onClick={() => setIsAggregateModalOpen(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)',
                    zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center',
                    padding: '10px'
                }}>
                    <div className="glass-card" style={{
                        padding: '20px',
                        width: '100%',
                        maxWidth: '500px',
                        border: '1px solid var(--primary)',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {editingVisit ? <Edit size={24} /> : <Plus size={24} />}
                            {editingVisit ? 'Editar Visita' : 'Nueva Visita'}
                        </h3>
                        <form onSubmit={handleSubmit}>
                            <div className="input-group">
                                <label>Tipo de Visita</label>
                                <select value={newVisit.type} onChange={e => setNewVisit({ ...newVisit, type: e.target.value })}>
                                    <option value="Medición">Medición</option>
                                    <option value="Servicio">Servicio</option>
                                    <option value="Soporte">Soporte</option>
                                    <option value="Comisionamiento">Comisionamiento</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Fecha de Visita</label>
                                <input type="date" required value={newVisit.date} onChange={e => setNewVisit({ ...newVisit, date: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <label>Ubicación / Proyecto</label>
                                <input type="text" required placeholder="Ej: Planta Principal, Sala de Servidores..." value={newVisit.location} onChange={e => setNewVisit({ ...newVisit, location: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <label>Cliente (Opcional)</label>
                                <input type="text" placeholder="Nombre del cliente" value={newVisit.client} onChange={e => setNewVisit({ ...newVisit, client: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <label>Personal Asignado</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px', minHeight: '38px', padding: '5px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', background: 'rgba(0,0,0,0.2)' }}>
                                    {newVisit.personnel.map((p, index) => (
                                        <div key={index} style={{ background: 'var(--primary)', color: 'white', padding: '2px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem' }}>
                                            {p}
                                            <button
                                                type="button"
                                                onClick={() => setNewVisit({ ...newVisit, personnel: newVisit.personnel.filter(item => item !== p) })}
                                                style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    <select
                                        value=""
                                        onChange={e => {
                                            if (e.target.value && !newVisit.personnel.includes(e.target.value)) {
                                                setNewVisit({ ...newVisit, personnel: [...newVisit.personnel, e.target.value] });
                                            }
                                        }}
                                        style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', flex: 1, minWidth: '150px' }}
                                    >
                                        <option value="" style={{ color: 'black' }}>+ Agregar Personal...</option>
                                        {operationalUsers.map(u => (
                                            <option key={u.id} value={u.name || u.username} style={{ color: 'black' }}>
                                                {u.name || u.username} ({u.role})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Descripción de Actividades</label>
                                <textarea rows="3" required placeholder="Detalle de tareas a realizar..." value={newVisit.description} onChange={e => setNewVisit({ ...newVisit, description: e.target.value })}></textarea>
                            </div>
                            <div className="input-group">
                                <label>Estado</label>
                                <select value={newVisit.status} onChange={e => setNewVisit({ ...newVisit, status: e.target.value })}>
                                    <option value="scheduled">Programada</option>
                                    <option value="completed">Completada</option>
                                    <option value="cancelled">Cancelada</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Vincular a Indicador SGI (Opcional)</label>
                                <select
                                    value={newVisit.linkedIndicatorId}
                                    onChange={e => setNewVisit({ ...newVisit, linkedIndicatorId: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
                                >
                                    <option value="">-- Sin Vinculación --</option>
                                    {indicators.map(ind => (
                                        <option key={ind.id} value={ind.id} style={{ color: 'black' }}>
                                            {ind.name} (Actual: {ind.current} {ind.unit})
                                        </option>
                                    ))}
                                </select>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '5px' }}>
                                    Al completar la visita, se podrá actualizar este indicador.
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Guardar</button>
                                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OperationsSchedule;
