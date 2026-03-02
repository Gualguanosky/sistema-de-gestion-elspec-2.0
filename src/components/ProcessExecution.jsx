import React, { useState, useEffect } from 'react';
import { Camera, Paperclip, MessageSquare, CheckCircle, Clock, Upload, Send, FileText, Trash2, Pencil, X, AlertTriangle } from 'lucide-react';
import db from '../services/db';

const ProcessExecution = ({ user }) => {
    const [myProcesses, setMyProcesses] = useState([]);
    const [selectedProcess, setSelectedProcess] = useState(null);
    const [loading, setLoading] = useState(true);
    const currentUser = user || db.getSession();

    // Form state for submission
    const [submissionData, setSubmissionData] = useState({
        indicatorId: '',
        value: '',
        comment: '',
        files: []
    });
    const [isUploading, setIsUploading] = useState(false);
    const [evidenceHistory, setEvidenceHistory] = useState([]);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingEvidenceId, setEditingEvidenceId] = useState(null);
    const [editData, setEditData] = useState({
        indicatorId: '',
        value: '',
        comment: '',
        files: [] // For new files
    });

    const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default open on desktop

    useEffect(() => {
        if (!currentUser) return;

        const unsubscribe = db.subscribeSGIProcesses((allProcesses) => {
            // Filter processes where the current user is one of the leaders
            const assigned = allProcesses.filter(p =>
                p.leaders?.some(l => l.id === currentUser.id) ||
                p.leaderId === currentUser.id ||
                p.leader === currentUser.name
            );
            setMyProcesses(assigned);
            setLoading(false);

            // If selecting a process, refresh its data from the new snapshot
            if (selectedProcess) {
                const updated = assigned.find(p => p.id === selectedProcess.id);
                setSelectedProcess(updated || null);
            }
        });

        return () => unsubscribe();
    }, [currentUser, selectedProcess?.id]);

    useEffect(() => {
        if (!selectedProcess) return;

        const unsubscribeEvidence = db.subscribeSGIEvidence(selectedProcess.id, (data) => {
            setEvidenceHistory(data);
        });

        return () => unsubscribeEvidence();
    }, [selectedProcess?.id]);

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        const oversized = selectedFiles.some(f => f.size > 1024 * 1024);

        if (oversized) {
            alert("⚠️ Uno o más archivos exceden el límite de 1MB.\n\nPara esta versión gratuita (sin tarjeta vinculada), los archivos deben ser pequeños (<1MB). Por favor comprima el archivo e intente de nuevo.");
            e.target.value = ""; // Clear input
            return;
        }

        setSubmissionData({ ...submissionData, files: selectedFiles });
    };

    const handleSubmitFulfillment = async (indicatorId, isEdit = false) => {
        const data = isEdit ? editData : submissionData;

        if (!data.value && !data.comment && data.files.length === 0) {
            alert("Por favor ingrese algún dato o evidencia.");
            return;
        }

        setIsUploading(true);
        try {
            const currentMonth = new Date().getMonth() + 1;
            const monthKey = currentMonth.toString().padStart(2, '0');

            // 1. Upload files if any (Base64)
            const uploadedUrls = [];
            for (const file of data.files) {
                if (file.size > 1024 * 1024) {
                    throw new Error(`El archivo ${file.name} es demasiado grande. El límite es 1MB.`);
                }
                const url = await db.uploadFile(file);
                uploadedUrls.push({ name: file.name, url, type: file.type });
            }

            if (isEdit && editingEvidenceId) {
                // Update Logic
                const oldEvidence = evidenceHistory.find(e => e.id === editingEvidenceId);
                const combinedAttachments = [...(oldEvidence.attachments || []), ...uploadedUrls];

                await db.updateSGIEvidence(editingEvidenceId, {
                    value: data.value,
                    comment: data.comment,
                    attachments: combinedAttachments
                });

                // Update Indicator Cumulative
                if (data.value) {
                    const oldValue = parseFloat(oldEvidence.value || 0);
                    const diff = parseFloat(data.value) - oldValue;

                    await updateIndicatorValue(indicatorId, monthKey, diff);
                }

                alert("Evidencia actualizada.");
                closeEditModal();

            } else {
                // New Submission Logic
                await db.submitSGIEvidence({
                    processId: selectedProcess.id,
                    indicatorId,
                    leaderId: currentUser.id,
                    leaderName: currentUser.name,
                    month: monthKey,
                    year: new Date().getFullYear(),
                    value: data.value,
                    comment: data.comment,
                    attachments: uploadedUrls
                });

                if (data.value) {
                    await updateIndicatorValue(indicatorId, monthKey, parseFloat(data.value));
                }

                // Cleanup New Submission Form
                setSubmissionData({ indicatorId: '', value: '', comment: '', files: [] });
                alert("Evidencia enviada correctamente.");
            }

        } catch (error) {
            console.error("Error submitting:", error);
            alert(error.message || "Error al procesar la solicitud.");
        } finally {
            setIsUploading(false);
        }
    };

    const updateIndicatorValue = async (indicatorId, monthKey, amountToAdd) => {
        const updatedIndicators = selectedProcess.indicators.map(ind => {
            if (ind.id === indicatorId) {
                const currentVal = parseFloat(ind.monthlyData?.[monthKey] || 0);
                let finalVal = currentVal + amountToAdd;

                if (ind.target) {
                    const targetVal = parseFloat(ind.target);
                    if (finalVal > targetVal) finalVal = targetVal;
                }
                if (finalVal < 0) finalVal = 0;

                return {
                    ...ind,
                    monthlyData: {
                        ...(ind.monthlyData || {}),
                        [monthKey]: finalVal
                    }
                };
            }
            return ind;
        });
        await db.updateSGIProcess(selectedProcess.id, { indicators: updatedIndicators });
    };

    const openEditModal = (evidence, indicatorId) => {
        // console.log("Abriendo editor...", evidence); 
        alert("Abriendo editor...");
        setEditingEvidenceId(evidence.id);
        setEditData({
            indicatorId: indicatorId,
            value: evidence.value || '',
            comment: evidence.comment || '',
            files: []
        });
        setIsEditModalOpen(true);
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setEditingEvidenceId(null);
        setEditData({ indicatorId: '', value: '', comment: '', files: [] });
    };

    const handleEditFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        const oversized = selectedFiles.some(f => f.size > 1024 * 1024);

        if (oversized) {
            alert("⚠️ Archivo > 1MB. Comprima e intente de nuevo.");
            e.target.value = "";
            return;
        }
        setEditData({ ...editData, files: selectedFiles });
    };



    const handleDeleteEvidence = async (evidenceItem, indicator) => {
        if (!window.confirm("¿Seguro que deseas eliminar esta entrega? El valor se restará del acumulado.")) return;

        try {
            // 1. Delete from Evidence Collection
            await db.deleteSGIEvidence(evidenceItem.id);

            // 2. Subtract value from Process Indicator monthly total
            if (evidenceItem.value) {
                const monthKey = evidenceItem.month;
                const toSubtract = parseFloat(evidenceItem.value);

                const updatedIndicators = selectedProcess.indicators.map(ind => {
                    if (ind.id === indicator.id) {
                        const currentVal = parseFloat(ind.monthlyData?.[monthKey] || 0);
                        let finalVal = currentVal - toSubtract;
                        if (finalVal < 0) finalVal = 0; // Prevent negative values

                        return {
                            ...ind,
                            monthlyData: {
                                ...(ind.monthlyData || {}),
                                [monthKey]: finalVal
                            }
                        };
                    }
                    return ind;
                });
                await db.updateSGIProcess(selectedProcess.id, { indicators: updatedIndicators });
            }
            alert("Evidencia eliminada y valor ajustado.");
        } catch (error) {
            console.error("Error deleting evidence:", error);
            alert("Error al eliminar la evidencia.");
        }
    };


    if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'white' }}>Cargando procesos...</div>;

    // Auto-close sidebar on mobile selection
    const handleProcessSelect = (proc) => {
        setSelectedProcess(proc);
        if (window.innerWidth <= 768) {
            setIsSidebarOpen(false);
        }
    };

    return (
        <div className="mobile-column" style={{ padding: '20px', display: 'flex', gap: '30px', minHeight: '80vh', position: 'relative' }}>
            {/* Mobile Sidebar Toggle */}
            <div style={{ display: 'none' }} className="mobile-only-toggle">
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="btn-secondary"
                    style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <Clock size={16} /> {isSidebarOpen ? 'Ocultar Menú Procesos' : 'Mostrar Menú Procesos'}
                </button>
            </div>

            {/* Sidebar: Assigned Processes */}
            <div className={`sidebar-responsive ${!isSidebarOpen ? 'sidebar-hidden' : ''}`} style={{ width: '300px', flexShrink: 0 }}>
                <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Clock color="var(--primary)" /> Mis Procesos SGI
                </h3>
                {myProcesses.length === 0 ? (
                    <div className="glass-card" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No tienes procesos asignados en este momento.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {myProcesses.map(proc => (
                            <div
                                key={proc.id}
                                onClick={() => handleProcessSelect(proc)}
                                className="glass-card"
                                style={{
                                    padding: '15px',
                                    cursor: 'pointer',
                                    border: selectedProcess?.id === proc.id ? '1px solid var(--primary)' : '1px solid transparent',
                                    background: selectedProcess?.id === proc.id ? 'rgba(0, 108, 224, 0.15)' : 'rgba(255,255,255,0.05)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <div style={{ fontWeight: 'bold' }}>{proc.name}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px' }}>
                                    {proc.indicators?.length || 0} Indicadores definidos
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Main: Execution Area */}
            <div style={{ flex: 1 }}>
                {selectedProcess ? (
                    <div>
                        <div className="glass-card" style={{ padding: '25px', marginBottom: '30px' }}>
                            <h2 style={{ margin: 0 }}>{selectedProcess.name}</h2>
                            <p style={{ color: 'var(--text-muted)', margin: '10px 0 0 0' }}>{selectedProcess.description}</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {(() => {
                                const groupedIndicators = (selectedProcess.indicators || []).reduce((acc, ind) => {
                                    const folder = ind.folder || 'General';
                                    if (!acc[folder]) acc[folder] = [];
                                    acc[folder].push(ind);
                                    return acc;
                                }, {});

                                return Object.entries(groupedIndicators).map(([folderName, indicators]) => (
                                    <div key={folderName} style={{ marginBottom: '30px' }}>
                                        <h3 style={{
                                            color: 'var(--primary)',
                                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                                            paddingBottom: '10px',
                                            marginBottom: '20px',
                                            fontSize: '1.2rem',
                                            fontWeight: '500'
                                        }}>
                                            {folderName}
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                            {indicators.map(ind => (
                                                <div key={ind.id} className="glass-card" style={{ padding: '25px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                                        <div>
                                                            <h4 style={{ margin: 0, fontSize: '1.2rem' }}>{ind.name}</h4>
                                                            <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                                                                {ind.requiresPhoto && <span className="badge-blue"><Camera size={12} /> Foto</span>}
                                                                {ind.requiresFile && <span className="badge-blue"><Paperclip size={12} /> Archivo</span>}
                                                                {ind.requiresComment && <span className="badge-blue"><MessageSquare size={12} /> Comentario</span>}
                                                            </div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Meta {ind.frequency || 'Mensual'}</div>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                                                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                                                    {ind.direction === 'minimize' ? '< ' : '> '}{ind.target} {ind.unit}
                                                                </div>
                                                                {(() => {
                                                                    const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
                                                                    const currentVal = ind.monthlyData?.[currentMonth];
                                                                    if (currentVal !== undefined) {
                                                                        const direction = ind.direction || 'maximize';
                                                                        const isCompliant = direction === 'minimize'
                                                                            ? parseFloat(currentVal) <= parseFloat(ind.target)
                                                                            : parseFloat(currentVal) >= parseFloat(ind.target);

                                                                        return isCompliant
                                                                            ? <CheckCircle size={24} color="var(--success)" title="Cumple la meta este mes" />
                                                                            : <AlertTriangle size={24} color="var(--danger)" title="No cumple la meta este mes" />;
                                                                    }
                                                                    return null;
                                                                })()}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px' }}>
                                                        {/* Inputs Section */}
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                                            <div className="input-group" style={{ margin: 0 }}>
                                                                <label>Valor Real (Mes Actual)</label>
                                                                <input
                                                                    type="number"
                                                                    placeholder={`0.00 ${ind.unit}`}
                                                                    onChange={(e) => setSubmissionData({ ...submissionData, value: e.target.value })}
                                                                />
                                                            </div>

                                                            {ind.requiresComment && (
                                                                <div className="input-group" style={{ margin: 0 }}>
                                                                    <label>Comentarios / Observaciones</label>
                                                                    <textarea
                                                                        placeholder="Describa el progreso o hallazgos..."
                                                                        style={{ minHeight: '80px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', padding: '10px', borderRadius: '8px' }}
                                                                        onChange={(e) => setSubmissionData({ ...submissionData, comment: e.target.value })}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Uploads Section */}
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                                            {(ind.requiresPhoto || ind.requiresFile) && (
                                                                <div className="input-group" style={{ margin: 0 }}>
                                                                    <label>Evidencia (Fotos/Archivos)</label>
                                                                    <div style={{
                                                                        border: '2px dashed var(--border-color)',
                                                                        padding: '20px',
                                                                        borderRadius: '12px',
                                                                        textAlign: 'center',
                                                                        position: 'relative',
                                                                        cursor: 'pointer',
                                                                        background: submissionData.files.length > 0 ? 'rgba(52, 211, 153, 0.05)' : 'transparent'
                                                                    }}>
                                                                        <input
                                                                            type="file"
                                                                            multiple
                                                                            accept={ind.requiresPhoto ? "image/*,.pdf,.doc,.docx" : "*"}
                                                                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                                                            onChange={handleFileChange}
                                                                        />
                                                                        <Upload size={24} color="var(--primary)" style={{ marginBottom: '10px' }} />
                                                                        <div style={{ fontSize: '0.9rem' }}>
                                                                            {submissionData.files.length > 0
                                                                                ? `${submissionData.files.length} archivos seleccionados`
                                                                                : "Haga clic o arrastre para subir evidencia"}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                                                                <button
                                                                    disabled={isUploading}
                                                                    onClick={() => handleSubmitFulfillment(ind.id)}
                                                                    className="btn-primary"
                                                                    style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '10px' }}
                                                                >
                                                                    {isUploading ? "Enviando..." : <><Send size={18} /> Enviar Cumplimiento</>}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* History Section */}
                                                    <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px' }}>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <Clock size={14} /> Historial de Entregas
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                            {evidenceHistory.filter(h => h.indicatorId === ind.id).length === 0 ? (
                                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin entregas previas este mes.</div>
                                                            ) : (
                                                                evidenceHistory.filter(h => h.indicatorId === ind.id).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map(history => (
                                                                    <div key={history.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', fontSize: '0.85rem' }}>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '5px' }}>
                                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                                <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{history.value} {ind.unit}</span>
                                                                                <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{new Date(history.timestamp).toLocaleString()}</span>
                                                                            </div>
                                                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                                                <button
                                                                                    onClick={() => openEditModal(history, ind.id)}
                                                                                    style={{ background: 'rgba(59, 130, 246, 0.1)', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '5px', borderRadius: '4px' }}
                                                                                    title="Editar esta entrega"
                                                                                >
                                                                                    <Pencil size={16} />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDeleteEvidence(history, ind)}
                                                                                    style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '5px', borderRadius: '4px' }}
                                                                                    title="Eliminar esta entrega"
                                                                                >
                                                                                    <Trash2 size={16} />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                        {history.comment && <p style={{ margin: '0 0 5px 0', opacity: 0.8 }}>{history.comment}</p>}
                                                                        {history.attachments && history.attachments.length > 0 && (
                                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                                                {history.attachments.map((file, idx) => (
                                                                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                                                                                        <a href={file.url} download={file.name} style={{ color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                                                                                            <Paperclip size={12} /> {file.name}
                                                                                        </a>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.3 }}>
                        <FileText size={80} style={{ marginBottom: '20px' }} />
                        <h2>Selecciona un proceso para comenzar</h2>
                    </div>
                )}
            </div>


            {/* Edit Modal */}
            {
                isEditModalOpen && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                        background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999
                    }}>
                        <div className="glass-card" style={{ width: '90%', maxWidth: '500px', padding: '25px', position: 'relative' }}>
                            <button
                                onClick={closeEditModal}
                                style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
                            >
                                <X size={24} />
                            </button>
                            <h3 style={{ marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Pencil size={20} color="var(--primary)" /> Editar Entrega
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div className="input-group" style={{ margin: 0 }}>
                                    <label>Valor Real (Corrección)</label>
                                    <input
                                        type="number"
                                        value={editData.value}
                                        onChange={(e) => setEditData({ ...editData, value: e.target.value })}
                                    />
                                </div>

                                <div className="input-group" style={{ margin: 0 }}>
                                    <label>Comentarios / Observaciones</label>
                                    <textarea
                                        value={editData.comment}
                                        onChange={(e) => setEditData({ ...editData, comment: e.target.value })}
                                        style={{ minHeight: '80px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', padding: '10px', borderRadius: '8px' }}
                                    />
                                </div>

                                <div className="input-group" style={{ margin: 0 }}>
                                    <label>Agregar Evidencia Adicional</label>
                                    <input
                                        type="file"
                                        multiple
                                        onChange={handleEditFileChange}
                                        style={{ color: 'white' }}
                                    />
                                </div>

                                <button
                                    disabled={isUploading}
                                    onClick={() => handleSubmitFulfillment(editData.indicatorId, true)}
                                    className="btn-primary"
                                    style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '10px' }}
                                >
                                    {isUploading ? "Actualizando..." : <><CheckCircle size={18} /> Guardar Cambios</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default ProcessExecution;
