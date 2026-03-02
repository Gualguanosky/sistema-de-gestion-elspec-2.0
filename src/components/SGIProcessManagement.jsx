import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit, Trash2, FileText, CheckCircle, XCircle, Camera, Paperclip, MessageSquare, Download } from 'lucide-react';
import { db_firestore } from '../services/firebase';
import db from '../services/db';

const SGIProcessManagement = () => {
    const [processes, setProcesses] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedProcess, setSelectedProcess] = useState(null);
    const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
    const [isIndicatorModalOpen, setIsIndicatorModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    // Process Form State
    const [processForm, setProcessForm] = useState({ name: '', description: '', leaders: [] });

    // Indicator Form State
    const [selectedIndicator, setSelectedIndicator] = useState(null);
    const [indicatorForm, setIndicatorForm] = useState({
        name: '',
        target: '',
        unit: '%',
        direction: 'maximize', // 'maximize' (default) or 'minimize'
        requiresPhoto: false,
        requiresFile: false,
        requiresComment: false,
        folder: '', // New Folder Field
        frequency: 'Mensual', // New Frequency Field
        isCustomUnit: false
    });

    const [evidenceList, setEvidenceList] = useState([]);
    const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
    const [viewingIndicator, setViewingIndicator] = useState(null);
    const [viewingMonth, setViewingMonth] = useState(null);


    // Indicator Types State
    const [indicatorTypes, setIndicatorTypes] = useState([]);
    const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
    const [newType, setNewType] = useState('');

    useEffect(() => {
        const unsubscribe = db.subscribeSGIProcesses((data) => {
            setProcesses(data);
            setLoading(false);
        });

        // Fetch users for leader selection
        const fetchUsers = async () => {
            const usersData = await db.getUsers();
            setUsers(usersData);
        };
        fetchUsers();

        const unsubscribeTypes = db.subscribeSGIIndicatorTypes((data) => {
            setIndicatorTypes(data);
        });

        return () => {
            unsubscribe();
            unsubscribeTypes();
        };
    }, []);

    const handleSaveProcess = async (e) => {
        e.preventDefault();
        try {
            if (processForm.leaders.length === 0) {
                alert("Debe seleccionar al menos un líder para el proceso.");
                return;
            }

            if (selectedProcess && !selectedProcess.isNew) {
                await db.updateSGIProcess(selectedProcess.id, processForm);
            } else {
                await db.addSGIProcess({ ...processForm, indicators: [] });
            }
            setIsProcessModalOpen(false);
            setProcessForm({ name: '', description: '', leaders: [] });
            setSelectedProcess(null);
        } catch (error) {
            console.error("Error saving process:", error);
        }
    };

    const handleDeleteProcess = async (id) => {
        if (window.confirm("¿Seguro que desea eliminar este proceso?")) {
            await db.deleteSGIProcess(id);
            if (selectedProcess?.id === id) setSelectedProcess(null);
        }
    };

    const handleSaveIndicator = async (e) => {
        e.preventDefault();
        if (!selectedProcess) return;

        let updatedIndicators;
        if (selectedIndicator) {
            // Update existing indicator
            updatedIndicators = selectedProcess.indicators.map(ind =>
                ind.id === selectedIndicator.id ? { ...ind, ...indicatorForm } : ind
            );
        } else {
            // Add new indicator
            const newIndicator = {
                id: Date.now().toString(),
                ...indicatorForm,
                monthlyData: {}
            };
            updatedIndicators = [...(selectedProcess.indicators || []), newIndicator];
        }

        try {
            await db.updateSGIProcess(selectedProcess.id, { indicators: updatedIndicators });
            setSelectedProcess({ ...selectedProcess, indicators: updatedIndicators });
            setIsIndicatorModalOpen(false);
            setIndicatorForm({
                name: '', target: '', unit: '%', direction: 'maximize',
                requiresPhoto: false, requiresFile: false, requiresComment: false,
                folder: '', frequency: 'Mensual', isCustomUnit: false
            });
            setSelectedIndicator(null);
        } catch (error) {
            console.error("Error saving indicator:", error);
        }
    };

    const handleDeleteIndicator = async (indicatorId) => {
        if (!window.confirm("¿Está seguro de eliminar este indicador?")) return;
        const updatedIndicators = selectedProcess.indicators.filter(i => i.id !== indicatorId);
        await db.updateSGIProcess(selectedProcess.id, { indicators: updatedIndicators });
        setSelectedProcess({ ...selectedProcess, indicators: updatedIndicators });
    };

    const handleViewEvidence = (indicator, month = null) => {
        setViewingIndicator(indicator);
        setViewingMonth(month);
        setIsEvidenceModalOpen(true);
        const unsubscribe = db.subscribeSGIEvidence(selectedProcess.id, (data) => {
            let indicatorEvidence = data.filter(e => e.indicatorId === indicator.id);
            if (month) {
                indicatorEvidence = indicatorEvidence.filter(e => e.month === month);
            }
            setEvidenceList(indicatorEvidence);
        });
        return unsubscribe;
    };

    const handleUpdateMonthData = async (indicatorId, month, value) => {
        if (!selectedProcess) return;

        const updatedIndicators = selectedProcess.indicators.map(ind => {
            if (ind.id === indicatorId) {
                return {
                    ...ind,
                    monthlyData: {
                        ...ind.monthlyData,
                        [month]: parseFloat(value)
                    }
                };
            }
            return ind;
        });

        // We don't await this one to make UI snappy, relying on eventual consistency or local state
        // Ideally should debounce or wait
        try {
            await db.updateSGIProcess(selectedProcess.id, { indicators: updatedIndicators });
            setSelectedProcess({ ...selectedProcess, indicators: updatedIndicators });
        } catch (error) {
            console.error("Error updating data:", error);
        }
    };

    const handleDownloadReport = () => {
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Proceso,Indicador,Tipo,Meta,Ene,Feb,Mar,Abr,May,Jun,Jul,Ago,Sep,Oct,Nov,Dic\n";

        processes.forEach(proc => {
            if (proc.indicators) {
                proc.indicators.forEach(ind => {
                    const typeName = indicatorTypes.find(t => t.id === ind.typeId)?.name || 'General';
                    const row = [
                        `"${proc.name}"`,
                        `"${ind.name}"`,
                        `"${typeName}"`,
                        `"${ind.target} ${ind.unit}"`,
                        ind.monthlyData?.['01'] || 0,
                        ind.monthlyData?.['02'] || 0,
                        ind.monthlyData?.['03'] || 0,
                        ind.monthlyData?.['04'] || 0,
                        ind.monthlyData?.['05'] || 0,
                        ind.monthlyData?.['06'] || 0,
                        ind.monthlyData?.['07'] || 0,
                        ind.monthlyData?.['08'] || 0,
                        ind.monthlyData?.['09'] || 0,
                        ind.monthlyData?.['10'] || 0,
                        ind.monthlyData?.['11'] || 0,
                        ind.monthlyData?.['12'] || 0
                    ].join(",");
                    csvContent += row + "\n";
                });
            }
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "reporte_sgi_acumulado.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getIndicatorStatusColor = (value, target, direction = 'maximize') => {
        if (!value || !target) return 'rgba(255,255,255,0.05)';
        const val = parseFloat(value);
        const tgt = parseFloat(target);

        if (direction === 'minimize') {
            // Lower is Better
            if (val <= tgt) return 'rgba(16, 185, 129, 0.2)'; // Success Green
            if (val <= tgt * 1.2) return 'rgba(245, 158, 11, 0.2)'; // Warning Yellow
            return 'rgba(239, 68, 68, 0.2)'; // Danger Red
        } else {
            // Higher is Better (default)
            const progress = (val / tgt) * 100;
            if (progress >= 90) return 'rgba(16, 185, 129, 0.2)'; // Success Green
            if (progress >= 70) return 'rgba(245, 158, 11, 0.2)'; // Warning Yellow
            return 'rgba(239, 68, 68, 0.2)'; // Danger Red
        }
    };

    const getIndicatorBorderColor = (value, target, direction = 'maximize') => {
        if (!value || !target) return 'rgba(255,255,255,0.1)';
        const val = parseFloat(value);
        const tgt = parseFloat(target);

        if (direction === 'minimize') {
            if (val <= tgt) return '#10b981';
            if (val <= tgt * 1.2) return '#f59e0b';
            return '#ef4444';
        } else {
            const progress = (val / tgt) * 100;
            if (progress >= 90) return '#10b981';
            if (progress >= 70) return '#f59e0b';
            return '#ef4444';
        }
    };

    return (
        <div style={{ padding: '20px', width: '100%', margin: '0 auto' }}>
            <style>
                {`
                @media (max-width: 1024px) {
                    .sgi-management-layout {
                        grid-template-columns: 1fr !important;
                    }
                    .sidebar-processes {
                        order: -1;
                    }
                }
                @media (max-width: 768px) {
                    .header-management {
                        flex-direction: column;
                        align-items: stretch !important;
                        gap: 15px;
                    }
                    .process-detail-header {
                        flex-direction: column;
                        gap: 15px;
                    }
                    .indicators-table-container {
                        margin: 0 -15px;
                        border-radius: 0 !important;
                    }
                }
                `}
            </style>
            <div className="header-management" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText color="var(--primary)" /> Gestión de Procesos SGI
                </h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={handleDownloadReport}
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--success)' }}
                    >
                        <Download size={18} /> Reporte
                    </button>
                    <button
                        onClick={() => setIsTypeModalOpen(true)}
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--secondary)' }}
                    >
                        <Edit size={18} /> Tipos
                    </button>
                    <button
                        onClick={() => {
                            setSelectedProcess({ isNew: true });
                            setProcessForm({ name: '', description: '', leaders: [] });
                            setIsProcessModalOpen(true);
                        }}
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <PlusCircle size={18} /> Proceso
                    </button>
                </div>
            </div>

            <div className="sgi-management-layout mobile-column" style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 4fr', gap: '30px' }}>
                <style>
                    {`
                    @media (max-width: 1024px) {
                        .sgi-management-layout {
                            grid-template-columns: 1fr !important;
                            display: flex !important;
                            flex-direction: column !important;
                        }
                    }
                    `}
                </style>
                {/* Process List Sidebar */}
                <div className="glass-card sidebar-processes sidebar-responsive" style={{ padding: '20px', height: 'fit-content' }}>
                    <h4 style={{ color: 'var(--text-muted)', marginBottom: '15px' }}>Procesos</h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {processes.map(proc => (
                            <li key={proc.id} style={{ marginBottom: '10px' }}>
                                <div
                                    onClick={() => setSelectedProcess(proc)}
                                    style={{
                                        padding: '12px', borderRadius: '8px', cursor: 'pointer',
                                        background: selectedProcess?.id === proc.id ? 'rgba(0, 108, 224, 0.2)' : 'rgba(255,255,255,0.05)',
                                        border: selectedProcess?.id === proc.id ? '1px solid var(--primary)' : '1px solid transparent',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}
                                >
                                    <span style={{ fontWeight: 500 }}>{proc.name}</span>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedProcess(proc);
                                                setProcessForm({
                                                    name: proc.name,
                                                    description: proc.description || '',
                                                    leaders: proc.leaders || (proc.leader ? [{ id: proc.leaderId || '', name: proc.leader }] : [])
                                                });
                                                setIsProcessModalOpen(true);
                                            }}
                                            style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
                                            title="Editar Proceso"
                                        >
                                            <Edit size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteProcess(proc.id); }}
                                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                                            title="Eliminar Proceso"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Main Content Areas: Indicators for Selected Process */}
                <div className="glass-card main-process-content" style={{ padding: '30px' }}>
                    {selectedProcess && !selectedProcess.isNew ? (
                        <>
                            <div className="process-detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--primary)' }}>{selectedProcess.name}</h3>
                                    <p style={{ color: 'var(--text-muted)', marginTop: '5px' }}>{selectedProcess.description || 'Sin descripción'}</p>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '5px', display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
                                        Líderes:
                                        {selectedProcess.leaders?.map(l => (
                                            <span key={l.id} className="badge-blue" style={{ fontSize: '0.7rem' }}>{l.name}</span>
                                        )) || (selectedProcess.leader && <span className="badge-blue" style={{ fontSize: '0.7rem' }}>{selectedProcess.leader}</span>) || 'N/A'}
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedIndicator(null);
                                        setIndicatorForm({
                                            name: '',
                                            target: '',
                                            unit: '%',
                                            requiresPhoto: false,
                                            requiresFile: false,
                                            requiresComment: false,
                                            folder: '',
                                            frequency: 'Mensual',
                                            dataSource: 'manual',
                                            autoDriver: ''
                                        });
                                        setIsIndicatorModalOpen(true);
                                    }}
                                    className="btn-primary"
                                    style={{ background: 'var(--success)', fontSize: '0.9rem', padding: '8px 15px' }}
                                >
                                    <PlusCircle size={16} style={{ marginRight: '5px' }} /> Agregar Indicador
                                </button>
                            </div>

                            {/* Indicators Table */}
                            <div className="glass-card indicators-table-container table-responsive" style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '12px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                                            <th style={{ padding: '10px' }}>Indicador</th>
                                            <th style={{ padding: '10px' }}>Meta</th>
                                            {/* Generate columns for last 6 months dynamically? Or just show input fields for recent months */}
                                            <th style={{ padding: '10px' }}>Ene</th>
                                            <th style={{ padding: '10px' }}>Feb</th>
                                            <th style={{ padding: '10px' }}>Mar</th>
                                            <th style={{ padding: '10px' }}>Abr</th>
                                            <th style={{ padding: '10px' }}>May</th>
                                            <th style={{ padding: '10px' }}>Jun</th>
                                            <th style={{ padding: '10px' }}>Jul</th>
                                            <th style={{ padding: '10px' }}>Ago</th>
                                            <th style={{ padding: '10px' }}>Sep</th>
                                            <th style={{ padding: '10px' }}>Oct</th>
                                            <th style={{ padding: '10px' }}>Nov</th>
                                            <th style={{ padding: '10px' }}>Dic</th>
                                            <th style={{ padding: '10px' }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            const groupedIndicators = (selectedProcess.indicators || []).reduce((acc, ind) => {
                                                const folder = ind.folder || 'General';
                                                if (!acc[folder]) acc[folder] = [];
                                                acc[folder].push(ind);
                                                return acc;
                                            }, {});

                                            const hasIndicators = (selectedProcess.indicators || []).length > 0;

                                            if (!hasIndicators) {
                                                return (
                                                    <tr>
                                                        <td colSpan="15" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                            No hay indicadores configurados para este proceso.
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            return Object.entries(groupedIndicators).map(([folderName, indicators]) => (
                                                <React.Fragment key={folderName}>
                                                    <tr style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                                                        <td colSpan="15" style={{ padding: '10px', color: 'var(--primary)', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                            {folderName}
                                                        </td>
                                                    </tr>
                                                    {indicators.map(ind => (
                                                        <tr key={ind.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                            <td style={{ padding: '15px 10px', paddingLeft: '20px' }}>
                                                                <div style={{ fontWeight: 'bold' }}>{ind.name}</div>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                    {ind.dataSource === 'auto' ? (
                                                                        <span style={{ color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                            <Activity size={12} /> Auto: {ind.autoDriver}
                                                                        </span>
                                                                    ) : 'Manual'}
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '8px', marginTop: '5px', opacity: 0.6 }}>
                                                                    {ind.requiresPhoto && <Camera size={14} title="Requiere Foto" />}
                                                                    {ind.requiresFile && <Paperclip size={14} title="Requiere Archivo" />}
                                                                    {ind.requiresComment && <MessageSquare size={14} title="Requiere Comentario" />}
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '15px 10px' }}>
                                                                <div>{ind.target || '-'} {ind.unit}</div>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{ind.frequency || 'Mensual'}</div>
                                                            </td>
                                                            {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(month => (
                                                                <td key={month} style={{ padding: '5px' }}>
                                                                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                                        <input
                                                                            type="number"
                                                                            style={{
                                                                                width: '50px',
                                                                                background: getIndicatorStatusColor(ind.monthlyData?.[month], ind.target, ind.direction),
                                                                                border: `1px solid ${getIndicatorBorderColor(ind.monthlyData?.[month], ind.target, ind.direction)}`,
                                                                                color: 'white',
                                                                                padding: '4px',
                                                                                borderRadius: '4px',
                                                                                fontSize: '0.85rem',
                                                                                transition: 'all 0.3s ease'
                                                                            }}
                                                                            value={ind.monthlyData?.[month] || ''}
                                                                            onChange={(e) => handleUpdateMonthData(ind.id, month, e.target.value)}
                                                                            disabled={ind.dataSource === 'auto'}
                                                                            title={ind.dataSource === 'auto' ? 'Valor calculado automáticamente' : ''}
                                                                        />
                                                                        {ind.monthlyData?.[month] !== undefined && (
                                                                            <button
                                                                                onClick={() => handleViewEvidence(ind, month)}
                                                                                style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '2px', marginTop: '2px' }}
                                                                                title="Ver evidencia del mes"
                                                                            >
                                                                                <FileText size={10} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            ))}
                                                            <td style={{ padding: '15px 10px', display: 'flex', gap: '10px' }}>
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedIndicator(ind);
                                                                        setIndicatorForm({
                                                                            name: ind.name,
                                                                            target: ind.target,
                                                                            unit: ind.unit,
                                                                            direction: ind.direction || 'maximize',
                                                                            requiresPhoto: ind.requiresPhoto,
                                                                            requiresFile: ind.requiresFile,
                                                                            requiresComment: ind.requiresComment,
                                                                            folder: ind.folder || '',
                                                                            frequency: ind.frequency || 'Mensual',
                                                                            dataSource: ind.dataSource || 'manual',
                                                                            autoDriver: ind.autoDriver || '',
                                                                            isCustomUnit: !['%', '#', '$', 'm³', 'kg', 'kWh', 'Unidades', 'Horas', 'Días', 'Meses'].includes(ind.unit)
                                                                        });
                                                                        setIsIndicatorModalOpen(true);
                                                                    }}
                                                                    title="Editar Indicador"
                                                                    style={{ background: 'rgba(0, 108, 224, 0.1)', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '5px', borderRadius: '4px' }}
                                                                >
                                                                    <Edit size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleViewEvidence(ind)}
                                                                    title="Ver Evidencia"
                                                                    style={{ background: 'rgba(0, 108, 224, 0.1)', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '5px', borderRadius: '4px' }}
                                                                >
                                                                    <FileText size={16} />
                                                                </button>
                                                                <button onClick={() => handleDeleteIndicator(ind.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </React.Fragment>
                                            ));
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                            <FileText size={48} style={{ opacity: 0.2, marginBottom: '20px' }} />
                            <p>Seleccione un proceso para ver sus indicadores o cree uno nuevo.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {
                isProcessModalOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <div className="glass-card" style={{ padding: '30px', width: '400px' }}>
                            <h3>{selectedProcess?.id ? 'Editar Proceso' : 'Nuevo Proceso'}</h3>
                            <form onSubmit={handleSaveProcess}>
                                <div className="input-group">
                                    <label>Nombre del Proceso</label>
                                    <input type="text" required value={processForm.name} onChange={e => setProcessForm({ ...processForm, name: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <label>Descripción</label>
                                    <textarea value={processForm.description} onChange={e => setProcessForm({ ...processForm, description: e.target.value })} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', width: '100%', padding: '10px', color: 'white', borderRadius: '8px' }} />
                                </div>
                                <div className="input-group">
                                    <label>Seleccionar Líderes (Puede seleccionar varios)</label>
                                    <div style={{
                                        maxHeight: '150px',
                                        overflowY: 'auto',
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px',
                                        padding: '10px'
                                    }}>
                                        {users.map(u => {
                                            const isSelected = processForm.leaders?.some(l => l.id === u.id);
                                            return (
                                                <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '5px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            let newLeaders = [...(processForm.leaders || [])];
                                                            if (e.target.checked) {
                                                                newLeaders.push({ id: u.id, name: u.name });
                                                            } else {
                                                                newLeaders = newLeaders.filter(l => l.id !== u.id);
                                                            }
                                                            setProcessForm({ ...processForm, leaders: newLeaders });
                                                        }}
                                                    />
                                                    <span style={{ fontSize: '0.9rem' }}>{u.name} <small style={{ opacity: 0.5 }}>({u.role})</small></span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                    <button type="button" onClick={() => setIsProcessModalOpen(false)} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'white', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
                                    <button type="submit" className="btn-primary">Guardar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {
                isIndicatorModalOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <div className="glass-card" style={{ padding: '30px', width: '450px' }}>
                            <h3>{selectedIndicator ? 'Editar Indicador' : 'Nuevo Indicador de Proceso'}</h3>
                            <form onSubmit={handleSaveIndicator}>
                                <div className="input-group">
                                    <label>Nombre del Indicador / Tarea</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Entrega de Reportes"
                                        required
                                        value={indicatorForm.name}
                                        onChange={e => setIndicatorForm({ ...indicatorForm, name: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Carpeta / Grupo (Opcional)</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Seguridad, Calidad, etc."
                                        value={indicatorForm.folder || ''}
                                        onChange={e => setIndicatorForm({ ...indicatorForm, folder: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Tipo de Indicador</label>
                                    <select
                                        value={indicatorForm.typeId || ''}
                                        onChange={e => setIndicatorForm({ ...indicatorForm, typeId: e.target.value })}
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', width: '100%', padding: '10px', color: 'white', borderRadius: '8px' }}
                                    >
                                        <option value="">-- Seleccionar Tipo --</option>
                                        {indicatorTypes.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div className="input-group">
                                        <label>Meta</label>
                                        <input
                                            type="number"
                                            required
                                            value={indicatorForm.target}
                                            onChange={e => setIndicatorForm({ ...indicatorForm, target: e.target.value })}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Unidad</label>
                                        {indicatorForm.isCustomUnit ? (
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type="text"
                                                    value={indicatorForm.unit}
                                                    onChange={e => setIndicatorForm({ ...indicatorForm, unit: e.target.value })}
                                                    placeholder="Escriba unidad..."
                                                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', width: '100%', padding: '10px', color: 'white', borderRadius: '8px' }}
                                                    autoFocus
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setIndicatorForm({ ...indicatorForm, isCustomUnit: false, unit: '%' })}
                                                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                                                >
                                                    <XCircle size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <select
                                                value={indicatorForm.unit}
                                                onChange={e => {
                                                    if (e.target.value === 'custom') {
                                                        setIndicatorForm({ ...indicatorForm, isCustomUnit: true, unit: '' });
                                                    } else {
                                                        setIndicatorForm({ ...indicatorForm, unit: e.target.value });
                                                    }
                                                }}
                                                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', width: '100%', padding: '10px', color: 'white', borderRadius: '8px' }}
                                            >
                                                <option value="%">% (Porcentaje)</option>
                                                <option value="#"># (Cantidad)</option>
                                                <option value="$">$ (Pesos)</option>
                                                <option value="m³">m³ (Metros cúbicos)</option>
                                                <option value="kg">kg (Kilogramos)</option>
                                                <option value="kWh">kWh (Kilovatios hora)</option>
                                                <option value="Unidades">Unidades</option>
                                                <option value="Horas">Horas</option>
                                                <option value="Días">Días</option>
                                                <option value="Meses">Meses</option>
                                                <option value="custom">-- Otra unidad... --</option>
                                            </select>
                                        )}
                                    </div>
                                </div>

                                <div style={{ margin: '15px 0' }}>
                                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Requerimientos de Evidencia:</label>
                                    <div style={{ display: 'flex', gap: '20px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={indicatorForm.requiresPhoto}
                                                onChange={e => setIndicatorForm({ ...indicatorForm, requiresPhoto: e.target.checked })}
                                            />
                                            <span>Foto</span>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={indicatorForm.requiresFile}
                                                onChange={e => setIndicatorForm({ ...indicatorForm, requiresFile: e.target.checked })}
                                            />
                                            <span>Archivo</span>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={indicatorForm.requiresComment}
                                                onChange={e => setIndicatorForm({ ...indicatorForm, requiresComment: e.target.checked })}
                                            />
                                            <span>Comentario</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label>Fuente de Datos</label>
                                    <select
                                        value={indicatorForm.dataSource || 'manual'}
                                        onChange={e => setIndicatorForm({ ...indicatorForm, dataSource: e.target.value })}
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', width: '100%', padding: '10px', color: 'white', borderRadius: '8px' }}
                                    >
                                        <option value="manual">Manual</option>
                                        <option value="auto">Automático (Tickets)</option>
                                    </select>
                                </div>

                                {indicatorForm.dataSource === 'auto' && (
                                    <div className="input-group">
                                        <label>Métrica Automática</label>
                                        <select
                                            value={indicatorForm.autoDriver || ''}
                                            onChange={e => setIndicatorForm({ ...indicatorForm, autoDriver: e.target.value })}
                                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', width: '100%', padding: '10px', color: 'white', borderRadius: '8px' }}
                                        >
                                            <option value="">-- Seleccionar Métrica --</option>
                                            <option value="pqr_compliance">Cumplimiento PQR (SLA)</option>
                                            <option value="pqr_opportunity">Oportunidad PQR ( Respuesta en 24h )</option>
                                            <option value="pqr_closure">Cierre PQR ( % Cerrados )</option>
                                            <option value="ticket_volume">Volumen Total de Tickets</option>
                                        </select>
                                        <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '5px' }}>
                                            Este indicador se actualizará automáticamente basado en la actividad de tickets.
                                        </small>
                                    </div>
                                )}

                                <div className="input-group">
                                    <label>Frecuencia de Medición</label>
                                    <select
                                        value={indicatorForm.frequency || 'Mensual'}
                                        onChange={e => setIndicatorForm({ ...indicatorForm, frequency: e.target.value })}
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', width: '100%', padding: '10px', color: 'white', borderRadius: '8px' }}
                                    >
                                        <option value="Mensual">Mensual</option>
                                        <option value="Bimestral">Bimestral</option>
                                        <option value="Trimestral">Trimestral</option>
                                        <option value="Semestral">Semestral</option>
                                        <option value="Anual">Anual</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>Dirección de la Meta</label>
                                    <select
                                        value={indicatorForm.direction}
                                        onChange={e => setIndicatorForm({ ...indicatorForm, direction: e.target.value })}
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', width: '100%', padding: '10px', color: 'white', borderRadius: '8px' }}
                                    >
                                        <option value="maximize">Maximizar (Mayor es mejor)</option>
                                        <option value="minimize">Minimizar (Menor es mejor)</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                    <button type="button" onClick={() => { setIsIndicatorModalOpen(false); setSelectedIndicator(null); }} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'white', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
                                    <button type="submit" className="btn-primary">{selectedIndicator ? 'Guardar Cambios' : 'Agregar'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
            {/* Evidence Viewer Modal */}
            {
                isEvidenceModalOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <div className="glass-card" style={{ padding: '30px', width: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div>
                                    <h3 style={{ margin: 0 }}>Evidencia: {viewingIndicator?.name}</h3>
                                    {viewingMonth && <div style={{ fontSize: '0.9rem', color: 'var(--primary)', marginTop: '4px' }}>Filtrado por Mes: {viewingMonth}</div>}
                                </div>
                                <button onClick={() => { setIsEvidenceModalOpen(false); setViewingMonth(null); }} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><XCircle /></button>
                            </div>

                            {evidenceList.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No se ha cargado evidencia para este indicador aún.</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {evidenceList.map(ev => (
                                        <div key={ev.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px', borderLeft: '4px solid var(--primary)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                                <span style={{ fontWeight: 'bold' }}>{ev.leaderName}</span>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(ev.timestamp).toLocaleString()}</span>
                                            </div>
                                            {ev.value && <div style={{ marginBottom: '10px' }}>Valor reportado: <b style={{ color: 'var(--primary)' }}>{ev.value}</b></div>}
                                            {ev.comment && <p style={{ fontSize: '0.9rem', margin: '0 0 10px 0', fontStyle: 'italic' }}>"{ev.comment}"</p>}
                                            {ev.attachments && ev.attachments.length > 0 && (
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Archivos adjuntos</div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
                                                        {ev.attachments.map((file, idx) => (
                                                            <div key={idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                                                                {file.type?.includes('image') ? (
                                                                    <img src={file.url} alt="Evidencia" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px', marginBottom: '5px', cursor: 'pointer' }} onClick={() => window.open(file.url, '_blank')} />
                                                                ) : (
                                                                    <div style={{ height: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <FileText size={32} color="var(--primary)" />
                                                                    </div>
                                                                )}
                                                                <div style={{ fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                                                                <a href={file.url} download={file.name} style={{ fontSize: '0.7rem', color: 'var(--primary)', textDecoration: 'none', display: 'block', marginTop: '5px' }}>Descargar</a>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {
                isTypeModalOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 1200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <div className="glass-card" style={{ padding: '30px', width: '400px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ margin: 0 }}>Tipos de Indicadores</h3>
                                <button onClick={() => setIsTypeModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><XCircle /></button>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                <input
                                    type="text"
                                    placeholder="Nuevo Tipo (ej: Seguridad)"
                                    value={newType}
                                    onChange={(e) => setNewType(e.target.value)}
                                    style={{ flex: 1, padding: '8px', borderRadius: '4px', border: 'none' }}
                                />
                                <button
                                    onClick={async () => {
                                        if (!newType.trim()) return;
                                        await db.addSGIIndicatorType({ name: newType.trim() });
                                        setNewType('');
                                    }}
                                    className="btn-primary"
                                    style={{ padding: '8px 15px' }}
                                >
                                    <PlusCircle size={16} />
                                </button>
                            </div>

                            <ul style={{ listStyle: 'none', padding: 0, maxHeight: '300px', overflowY: 'auto' }}>
                                {indicatorTypes.map(type => (
                                    <li key={type.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                        <span>{type.name}</span>
                                        <button
                                            onClick={() => {
                                                if (window.confirm('¿Eliminar este tipo?')) db.deleteSGIIndicatorType(type.id);
                                            }}
                                            style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </li>
                                ))}
                                {indicatorTypes.length === 0 && <li style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '10px' }}>No hay tipos definidos.</li>}
                            </ul>
                        </div>
                    </div>
                )
            }
        </div>
    );
};

export default SGIProcessManagement;
