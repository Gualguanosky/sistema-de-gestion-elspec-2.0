import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertCircle, XCircle, Filter, PieChart, Download, PlusCircle, Trash2, FileText } from 'lucide-react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/logo.svg';
import useIndicators from '../hooks/useIndicators';
import db from '../services/db';

const SGIDashboard = ({ tickets, user, canManageSGI }) => {
    const { indicators, addIndicator, deleteIndicator } = useIndicators();
    const [timeRange, setTimeRange] = useState('all'); // 'week', 'month', 'year', 'all'
    const [filteredTickets, setFilteredTickets] = useState([]);
    const [sgiProcesses, setSgiProcesses] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newIndicator, setNewIndicator] = useState({ name: '', target: '', current: '', unit: '%', isCustomUnit: false });

    // Monthly Evidence Modal
    const [selectedEvidenceIndicator, setSelectedEvidenceIndicator] = useState(null);
    const [selectedMonthEvidence, setSelectedMonthEvidence] = useState(null);
    const [evidenceData, setEvidenceData] = useState([]);
    const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);

    const handleAddIndicator = (e) => {
        e.preventDefault();
        addIndicator({
            name: newIndicator.name,
            target: parseFloat(newIndicator.target),
            current: parseFloat(newIndicator.current),
            unit: newIndicator.unit
        });
        setNewIndicator({ name: '', target: '', current: '', unit: '%', isCustomUnit: false });
        setIsModalOpen(false);
    };

    const handleDeleteIndicator = (id) => {
        if (window.confirm('¿Eliminar este indicador?')) {
            deleteIndicator(id);
        }
    };

    // SLA Configuration (in hours)
    const SLA_HOURS = {
        high: 24,
        medium: 48,
        low: 72
    };

    useEffect(() => {
        filterTickets();
    }, [tickets, timeRange]);

    useEffect(() => {
        const unsubscribe = db.subscribeSGIProcesses((data) => {
            setSgiProcesses(data);
        });
        return () => unsubscribe && unsubscribe();
    }, []);

    const filterTickets = () => {
        if (!tickets) return;

        const now = new Date();
        const filtered = tickets.filter(t => {
            if (timeRange === 'all') return true;

            const ticketDate = new Date(t.createdAt);
            const diffTime = Math.abs(now - ticketDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (timeRange === 'week') return diffDays <= 7;
            if (timeRange === 'month') return diffDays <= 30;
            if (timeRange === 'year') return diffDays <= 365;
            return true;
        });

        setFilteredTickets(filtered);
    };

    // --- CALCULATE METRICS ---
    const calculateMetrics = () => {
        if (!filteredTickets.length) return null;

        let totalClosed = 0;
        let compliantCount = 0;
        let totalResolutionHours = 0;
        let resolutionCount = 0;

        const ticketsWithMetrics = filteredTickets.map(t => {
            const created = new Date(t.createdAt);
            const closed = t.closedAt ? new Date(t.closedAt) : new Date(); // If open, count vs now for SLA Status
            const isClosed = t.status === 'closed';

            // Calculate hours taken (or current duration)
            const durationMs = closed - created;
            const durationHours = durationMs / (1000 * 60 * 60);

            // Check SLA
            const allowedHours = SLA_HOURS[t.priority] || 48; // Default to medium
            const isCompliant = durationHours <= allowedHours;
            const slaStatus = isCompliant ? 'ontime' : 'overdue';

            if (isClosed) {
                totalClosed++;
                totalResolutionHours += durationHours;
                resolutionCount++;
                if (isCompliant) compliantCount++;
            } else {
                // For open tickets, check if they are ALREADY overdue
                if (!isCompliant) {
                    // Open and Overdue
                }
            }

            return {
                ...t,
                durationHours: durationHours.toFixed(1),
                isCompliant,
                slaStatus,
                slaLimit: allowedHours
            };
        });

        const complianceRate = totalClosed > 0 ? ((compliantCount / totalClosed) * 100).toFixed(1) : 0;
        const avgResolutionTime = resolutionCount > 0 ? (totalResolutionHours / resolutionCount).toFixed(1) : 0;

        return {
            total: filteredTickets.length,
            closed: totalClosed,
            open: filteredTickets.length - totalClosed,
            complianceRate,
            avgResolutionTime,
            ticketsWithMetrics
        };
    };

    const metrics = calculateMetrics();

    // --- CALCULATE PQR METRICS BY MONTH ---
    const calculatePQRMetrics = () => {
        if (!tickets || tickets.length === 0) return {};

        const monthlyStats = {};

        tickets.forEach(t => {
            if (t.type !== 'pqr') return;

            const created = new Date(t.createdAt);
            const monthKey = (created.getMonth() + 1).toString().padStart(2, '0');

            if (!monthlyStats[monthKey]) {
                monthlyStats[monthKey] = {
                    total: 0,
                    closed: 0,
                    compliant: 0,       // closed within SLA
                    opportune: 0,       // first response within 24h (using closedAt as proxy if no firstResponseAt)
                };
            }

            const stats = monthlyStats[monthKey];
            stats.total++;

            const isClosed = t.status === 'closed';
            if (isClosed) {
                stats.closed++;
                const closedAt = t.closedAt ? new Date(t.closedAt) : null;
                if (closedAt) {
                    const durationHours = (closedAt - created) / (1000 * 60 * 60);
                    const allowedHours = SLA_HOURS[t.priority] || 48;
                    if (durationHours <= allowedHours) stats.compliant++;
                    if (durationHours <= 24) stats.opportune++;
                }
            }
        });

        // Convert to percentages
        const result = {};
        Object.entries(monthlyStats).forEach(([month, s]) => {
            result[month] = {
                pqr_compliance: s.closed > 0 ? parseFloat(((s.compliant / s.closed) * 100).toFixed(1)) : 0,
                pqr_opportunity: s.closed > 0 ? parseFloat(((s.opportune / s.closed) * 100).toFixed(1)) : 0,
                pqr_closure: s.total > 0 ? parseFloat(((s.closed / s.total) * 100).toFixed(1)) : 0,
                ticket_volume: s.total,
            };
        });

        return result;
    };

    const pqrMetrics = calculatePQRMetrics();

    // Helper: get auto-calculated value for a given indicator and month
    const getAutoValue = (autoDriver, month) => {
        if (!autoDriver || !pqrMetrics[month]) return null;
        return pqrMetrics[month][autoDriver] ?? null;
    };

    // Enrich sgiProcesses with auto-calculated monthly data
    const enrichedProcesses = sgiProcesses.map(proc => {
        if (!proc.indicators) return proc;
        const enrichedIndicators = proc.indicators.map(ind => {
            if (ind.dataSource !== 'auto' || !ind.autoDriver) return ind;
            const autoMonthlyData = {};
            ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].forEach(month => {
                const val = getAutoValue(ind.autoDriver, month);
                if (val !== null) autoMonthlyData[month] = val;
            });
            return { ...ind, monthlyData: { ...ind.monthlyData, ...autoMonthlyData } };
        });
        return { ...proc, indicators: enrichedIndicators };
    });

    const generatePDF = () => {
        const doc = new jsPDF();
        const primaryColor = [0, 108, 224];

        // Header
        try {
            const img = new Image();
            img.src = logo;
            doc.addImage(img, 'PNG', 14, 10, 40, 15);
        } catch (e) {
            console.warn("Logo error");
        }

        doc.setFontSize(18);
        doc.setTextColor(0);
        doc.setFont('helvetica', 'bold');
        doc.text('INFORME DE GESTIÓN (SGI)', 105, 20, { align: 'center' });

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generado: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 105, 26, { align: 'center' });
        doc.text(`Filtro: ${timeRange === 'all' ? 'Todo el Histórico' : timeRange === 'week' ? 'Últimos 7 días' : timeRange === 'month' ? 'Último Mes' : 'Último Año'}`, 105, 31, { align: 'center' });

        doc.setDrawColor(0, 108, 224);
        doc.setLineWidth(0.5);
        doc.line(14, 35, 196, 35);

        let finalY = 40;

        // Custom Indicators Section
        if (indicators && indicators.length > 0) {
            doc.setFontSize(14);
            doc.setTextColor(...primaryColor);
            doc.text('Indicadores Personalizados / Metas', 14, finalY + 10);

            const customData = indicators.map(ind => [
                ind.name,
                `${ind.target} ${ind.unit}`,
                `${ind.current} ${ind.unit}`,
                ind.current >= ind.target ? 'CUMPLE' : 'NO CUMPLE'
            ]);

            autoTable(doc, {
                head: [['Indicador', 'Meta', 'Actual', 'Estado']],
                body: customData,
                startY: finalY + 15,
                theme: 'grid',
                headStyles: { fillColor: [100, 100, 100] },
                styles: { fontSize: 10 },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index === 3) {
                        data.cell.styles.textColor = data.cell.raw === 'CUMPLE' ? [16, 185, 129] : [220, 38, 38];
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            });
            finalY = doc.lastAutoTable.finalY + 10;
        }

        // SGI Processes Section
        if (enrichedProcesses && enrichedProcesses.length > 0) {
            doc.setFontSize(14);
            doc.setTextColor(...primaryColor);
            doc.text('Monitor de Procesos SGI', 14, finalY + 10);
            finalY += 15;

            enrichedProcesses.forEach(proc => {
                if (proc.indicators && proc.indicators.length > 0) {
                    doc.setFontSize(12);
                    doc.setTextColor(50, 50, 50);
                    doc.text(`Proceso: ${proc.name}`, 14, finalY);

                    // Get current month for report (approximate, or just list most recent)
                    const currentMonth = new Date().getMonth() + 1;
                    const monthKey = currentMonth.toString().padStart(2, '0');

                    const procData = proc.indicators.map(ind => {
                        const currentVal = ind.monthlyData?.[monthKey] || 0;
                        const direction = ind.direction || 'maximize';

                        let isCompliant = false;
                        if (direction === 'minimize') {
                            isCompliant = currentVal <= ind.target;
                        } else {
                            isCompliant = currentVal >= ind.target;
                        }

                        return [
                            ind.name,
                            `${ind.target} ${ind.unit}`,
                            `${currentVal} ${ind.unit}`,
                            isCompliant ? 'CUMPLE' : 'REVISAR'
                        ];
                    });

                    autoTable(doc, {
                        head: [['Indicador', 'Meta', 'Mes Actual', 'Estado']],
                        body: procData,
                        startY: finalY + 5,
                        theme: 'grid',
                        headStyles: { fillColor: [100, 100, 100] },
                        styles: { fontSize: 9 },
                        didParseCell: (data) => {
                            if (data.section === 'body' && data.column.index === 3) {
                                data.cell.styles.textColor = data.cell.raw === 'CUMPLE' ? [16, 185, 129] : [220, 38, 38];
                                data.cell.styles.fontStyle = 'bold';
                            }
                        }
                    });
                    finalY = doc.lastAutoTable.finalY + 10;
                }
            });
        }

        // Automatic KPIs Section
        if (metrics) {
            doc.setFontSize(14);
            doc.setTextColor(...primaryColor);
            doc.text('Resumen Ejecutivo (Tickets)', 14, finalY + 10);

            const summaryData = [
                [' % Cumplimiento SLA', `${metrics.complianceRate}%`],
                ['Tiempo Promedio Resolución', `${metrics.avgResolutionTime} Horas`],
                ['Tickets Cerrados', `${metrics.closed}`],
                ['Tickets Vencidos', `${metrics.ticketsWithMetrics.filter(t => !t.isCompliant).length}`],
                ['Total Solicitudes', `${metrics.total}`]
            ];

            autoTable(doc, {
                body: summaryData,
                startY: finalY + 15,
                theme: 'grid',
                headStyles: { fillColor: primaryColor },
                styles: { fontSize: 11, cellPadding: 4 },
                columnStyles: {
                    0: { fontStyle: 'bold', width: 100 },
                    1: { halign: 'right' }
                }
            });

            // Detailed Table
            doc.setFontSize(14);
            doc.setTextColor(...primaryColor);
            doc.text('Detalle de Tickets y Cumplimiento', 14, doc.lastAutoTable.finalY + 15);

            const tableData = metrics.ticketsWithMetrics.map(t => [
                `#${t.id ? t.id.slice(-6) : 'N/A'}`,
                new Date(t.createdAt).toLocaleDateString(),
                t.priority.toUpperCase(),
                t.status === 'open' ? 'ABIERTO' : 'CERRADO',
                t.closedBy || '---',
                `${t.durationHours} hrs`,
                t.isCompliant ? 'CUMPLE' : 'VENCIDO'
            ]);

            autoTable(doc, {
                head: [['ID', 'Fecha', 'Prioridad', 'Estado', 'Responsable', 'Tiempo', 'SLA']],
                body: tableData,
                startY: doc.lastAutoTable.finalY + 20,
                theme: 'striped',
                headStyles: { fillColor: primaryColor },
                styles: { fontSize: 9 },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index === 6) {
                        if (data.cell.raw === 'VENCIDO') {
                            data.cell.styles.textColor = [220, 38, 38]; // Red
                            data.cell.styles.fontStyle = 'bold';
                        } else {
                            data.cell.styles.textColor = [16, 185, 129]; // Green
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                }
            });
        } else {
            doc.setFontSize(12);
            doc.setTextColor(100);
            doc.text('No hay actividad de tickets registrada en este periodo.', 14, finalY + 20);
        }

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Página ${i} de ${pageCount} - Sistema ELSPEC ANDINA`, 105, 290, { align: 'center' });
        }

        doc.save(`Informe_SGI_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const [selectedProcessId, setSelectedProcessId] = useState('all');
    const [showTicketDetails, setShowTicketDetails] = useState(false);

    // Filter processes based on permissions (Manager or Leader)
    const visibleProcesses = enrichedProcesses.filter(proc => {
        if (canManageSGI) return true;
        // Check if user matches any leader in the array or the legacy leader field
        const isLeader = (proc.leaders?.some(l => l.id === user.uid || l.id === user.id || l.name === user.name)) || proc.leader === user.name;
        return isLeader;
    });

    // Handle Tab Selection
    const handleProcessSelect = (id) => {
        setSelectedProcessId(id);
    };

    return (
        <div style={{ padding: '0 0 40px 0' }}>
            {/* Controls */}
            <div className="glass-card controls-header mobile-column" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <PieChart color="var(--primary)" /> Indicadores de Gestión (SGI)
                </h3>

                <div className="controls-header-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {canManageSGI && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 15px', fontSize: '0.9rem', background: 'var(--success)' }}
                        >
                            <PlusCircle size={16} /> Nuevo
                        </button>
                    )}
                    <button
                        onClick={generatePDF}
                        disabled={!metrics}
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 15px', fontSize: '0.9rem', opacity: !metrics ? 0.5 : 1, cursor: !metrics ? 'not-allowed' : 'pointer' }}
                    >
                        <Download size={16} /> PDF
                    </button>
                    <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 5px' }}></div>
                    <Filter size={16} color="var(--text-muted)" />
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white', padding: '8px', borderRadius: '8px' }}
                    >
                        <option value="all">Todo</option>
                        <option value="week">Semana</option>
                        <option value="month">Mes</option>
                        <option value="year">Año</option>
                    </select>
                </div>
            </div>

            {/* Custom Indicators Grid */}
            {canManageSGI && indicators.length > 0 && (
                <div style={{ marginBottom: '30px' }}>
                    <h4 style={{ color: 'var(--text-muted)', marginBottom: '15px' }}>Indicadores Personalizados</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                        {indicators.map(ind => {
                            const progress = (ind.current / ind.target) * 100;
                            const direction = ind.direction || 'maximize';

                            let statusColor = 'var(--danger)';
                            if (direction === 'minimize') {
                                if (ind.current <= ind.target) statusColor = 'var(--success)';
                                else if (ind.current <= ind.target * 1.2) statusColor = 'var(--warning)';
                            } else {
                                if (progress >= 90) statusColor = 'var(--success)';
                                else if (progress >= 70) statusColor = 'var(--warning)';
                            }

                            return (
                                <div key={ind.id} className="glass-card" style={{ padding: '20px', position: 'relative' }}>
                                    <button
                                        onClick={() => handleDeleteIndicator(ind.id)}
                                        style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: '5px' }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    <div style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.1)', padding: '5px 10px', borderRadius: '15px', fontSize: '0.8rem' }}>
                                        {ind.period}
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '5px' }}>{ind.title}</div>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: statusColor }}>
                                        {ind.current} <span style={{ fontSize: '1rem' }}>{ind.unit}</span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
                                        Meta: {direction === 'minimize' ? '< ' : '> '}{ind.target} {ind.unit}
                                    </div>
                                    <div style={{ marginTop: '10px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${Math.min(direction === 'minimize' ? (ind.target / ind.current) * 100 : progress, 100)}%`,
                                            background: statusColor
                                        }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            {/* PQR Metrics Summary Panel */}
            {(() => {
                const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
                const monthPQR = pqrMetrics[currentMonth];
                if (!monthPQR) return null;
                const pqrTicketsThisMonth = tickets?.filter(t => {
                    if (t.type !== 'pqr') return false;
                    const m = (new Date(t.createdAt).getMonth() + 1).toString().padStart(2, '0');
                    return m === currentMonth;
                }) || [];
                if (pqrTicketsThisMonth.length === 0) return null;

                const kpis = [
                    { label: 'Cumplimiento PQR (SLA)', value: monthPQR.pqr_compliance, unit: '%', good: v => v >= 80 },
                    { label: 'Oportunidad de Respuesta', value: monthPQR.pqr_opportunity, unit: '%', good: v => v >= 70 },
                    { label: 'Tasa de Cierre PQR', value: monthPQR.pqr_closure, unit: '%', good: v => v >= 80 },
                    { label: 'PQR Recibidas (Mes)', value: monthPQR.ticket_volume, unit: '#', good: () => true },
                ];

                return (
                    <div style={{ marginBottom: '30px' }}>
                        <h4 style={{ color: 'var(--text-muted)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertCircle size={16} color="var(--warning)" /> Indicadores PQR — Mes Actual (Automático)
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                            {kpis.map(kpi => {
                                const isGood = kpi.good(kpi.value);
                                const color = isGood ? 'var(--success)' : 'var(--danger)';
                                return (
                                    <div key={kpi.label} className="glass-card" style={{ padding: '20px', borderLeft: `3px solid ${color}` }}>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>{kpi.label}</div>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color }}>{kpi.value}<span style={{ fontSize: '1rem', marginLeft: '4px' }}>{kpi.unit}</span></div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            {/* SGI Processes Grid */}
            {visibleProcesses && visibleProcesses.length > 0 && (
                <div style={{ marginBottom: '40px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Clock color="var(--primary)" /> Monitor de Procesos Corporativos
                        </h3>

                        {/* Process Filter Tabs */}
                        <div className="process-tabs" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {/* Help Desk Tab (Tickets) */}
                            <button
                                onClick={() => handleProcessSelect('help_desk')}
                                style={{
                                    padding: '6px 16px',
                                    borderRadius: '20px',
                                    border: '1px solid ' + (selectedProcessId === 'help_desk' ? 'var(--primary)' : 'var(--border-color)'),
                                    background: selectedProcessId === 'help_desk' ? 'rgba(0, 108, 224, 0.2)' : 'transparent',
                                    color: selectedProcessId === 'help_desk' ? 'white' : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    transition: 'all 0.2s',
                                    display: 'flex', alignItems: 'center', gap: '6px'
                                }}
                            >
                                <AlertCircle size={14} /> Mesa de Ayuda
                            </button>

                            <button
                                onClick={() => handleProcessSelect('all')}
                                style={{
                                    padding: '6px 16px',
                                    borderRadius: '20px',
                                    border: '1px solid ' + (selectedProcessId === 'all' ? 'var(--primary)' : 'var(--border-color)'),
                                    background: selectedProcessId === 'all' ? 'rgba(0, 108, 224, 0.2)' : 'transparent',
                                    color: selectedProcessId === 'all' ? 'white' : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Todos los Procesos
                            </button>

                            {visibleProcesses.map(proc => (
                                <button
                                    key={proc.id}
                                    onClick={() => handleProcessSelect(proc.id)}
                                    style={{
                                        padding: '6px 16px',
                                        borderRadius: '20px',
                                        border: '1px solid ' + (selectedProcessId === proc.id ? 'var(--primary)' : 'var(--border-color)'),
                                        background: selectedProcessId === proc.id ? 'rgba(0, 108, 224, 0.2)' : 'transparent',
                                        color: selectedProcessId === proc.id ? 'white' : 'var(--text-muted)',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        transition: 'all 0.2s',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {proc.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* SGI Processes Grid (Hidden if Help Desk is selected) */}
                    {selectedProcessId !== 'help_desk' && (
                        <div className="process-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '25px' }}>
                            {visibleProcesses
                                .filter(proc => selectedProcessId === 'all' || proc.id === selectedProcessId)
                                .map(proc => (
                                    <div key={proc.id} className="glass-card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                        <div className="process-card-header" style={{ padding: '20px', background: 'rgba(0, 108, 224, 0.1)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{proc.name}</h4>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px' }}>Líder: {proc.leader || 'Sin asignar'}</div>
                                        </div>
                                        <div style={{ padding: '20px', flex: 1 }}>
                                            {proc.indicators && proc.indicators.length > 0 ? (
                                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                    <tbody>
                                                        {proc.indicators.map(ind => {
                                                            // Simple logic: get current month's data
                                                            const currentMonth = new Date().getMonth() + 1;
                                                            const monthKey = currentMonth.toString().padStart(2, '0');
                                                            const currentVal = ind.monthlyData?.[monthKey] || 0;
                                                            const progress = Math.min((currentVal / (ind.target || 1)) * 100, 100);

                                                            return (
                                                                <tr
                                                                    key={ind.id}
                                                                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
                                                                    onClick={() => {
                                                                        setSelectedEvidenceIndicator(ind);
                                                                        setSelectedMonthEvidence(monthKey);
                                                                        setIsEvidenceModalOpen(true);
                                                                        db.subscribeSGIEvidence(proc.id, (data) => {
                                                                            const filtered = data.filter(e => e.indicatorId === ind.id && e.month === monthKey);
                                                                            setEvidenceData(filtered);
                                                                        });
                                                                    }}
                                                                    className="indicator-row"
                                                                >
                                                                    <td style={{ padding: '10px 0' }}>
                                                                        <div style={{ fontSize: '0.9rem', marginBottom: '5px' }}>{ind.name}</div>
                                                                        <div style={{ height: '6px', width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                                                                            <div style={{
                                                                                height: '100%',
                                                                                width: `${progress}%`,
                                                                                background: progress >= 90 ? 'var(--success)' : progress >= 70 ? 'var(--warning)' : 'var(--danger)',
                                                                                borderRadius: '3px',
                                                                                transition: 'width 0.5s ease'
                                                                            }}></div>
                                                                        </div>
                                                                    </td>
                                                                    <td style={{ padding: '10px 0 10px 15px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                                                                            {currentVal} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/ {ind.target} {ind.unit}</span>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                    Sin indicadores configurados
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            )}

            {/* Ticket Metrics (Only visible if 'Mesa de Ayuda' is selected) */}
            {selectedProcessId === 'help_desk' && (
                <>
                    {!metrics ? (
                        <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <div style={{ marginBottom: '15px' }}><PieChart size={48} style={{ opacity: 0.2 }} /></div>
                            No hay actividad de tickets para generar indicadores automáticos en este periodo.
                        </div>
                    ) : (
                        <>
                            {/* KPI Cards */}
                            <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px', animation: 'fadeIn 0.5s ease' }}>
                                <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                                    <div style={{ background: 'rgba(52, 211, 153, 0.15)', padding: '15px', borderRadius: '50%' }}>
                                        <CheckCircle size={32} color="var(--success)" />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Cumplimiento SLA</div>
                                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: metrics.complianceRate >= 80 ? 'var(--success)' : metrics.complianceRate >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                                            {metrics.complianceRate}%
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Meta: &gt; 80%</div>
                                    </div>
                                </div>

                                <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                                    <div style={{ background: 'rgba(0, 108, 224, 0.15)', padding: '15px', borderRadius: '50%' }}>
                                        <Clock size={32} color="var(--primary)" />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Tiempo Promedio Cierre</div>
                                        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{metrics.avgResolutionTime} <span style={{ fontSize: '1rem' }}>hrs</span></div>
                                    </div>
                                </div>

                                <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                                    <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '15px', borderRadius: '50%' }}>
                                        <AlertCircle size={32} color="var(--danger)" />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Tickets Vencidos</div>
                                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger)' }}>
                                            {metrics.ticketsWithMetrics.filter(t => !t.isCompliant).length}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{metrics.ticketsWithMetrics.length} Totales</div>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Table Toggle */}
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <button
                                    onClick={() => setShowTicketDetails(!showTicketDetails)}
                                    className="btn-secondary"
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid var(--border-color)',
                                        padding: '10px 20px',
                                        borderRadius: '20px',
                                        cursor: 'pointer',
                                        color: 'var(--text-muted)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {showTicketDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    {showTicketDetails ? 'Ocultar Detalle por Ticket' : 'Ver Detalle de Cumplimiento por Ticket'}
                                </button>
                            </div>

                            {/* Detailed Table */}
                            {
                                showTicketDetails && (
                                    <div className="glass-card" style={{ padding: '25px', overflowX: 'auto', marginBottom: '30px' }}>
                                        <h4 style={{ marginBottom: '20px' }}>Detalle de Cumplimiento por Ticket</h4>

                                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'left' }}>
                                                    <th style={{ padding: '10px' }}>ID Ticket</th>
                                                    <th style={{ padding: '10px' }}>Fecha Ingreso</th>
                                                    <th style={{ padding: '10px' }}>Prioridad / SLA</th>
                                                    <th style={{ padding: '10px' }}>Responsable (Cierre)</th>
                                                    <th style={{ padding: '10px' }}>Tiempo Transcurrido</th>
                                                    <th style={{ padding: '10px' }}>Estado SLA</th>
                                                    <th style={{ padding: '10px' }}>Estado Ticket</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {metrics.ticketsWithMetrics.map(ticket => (
                                                    <tr key={ticket.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
                                                        <td style={{ padding: '15px 10px', fontFamily: 'monospace', color: 'var(--primary)' }}>
                                                            #{ticket.id ? ticket.id.slice(-6) : 'N/A'}
                                                        </td>
                                                        <td style={{ padding: '15px 10px' }}>
                                                            {new Date(ticket.createdAt).toLocaleDateString()}
                                                        </td>
                                                        <td style={{ padding: '15px 10px' }}>
                                                            <span style={{
                                                                textTransform: 'uppercase', fontWeight: 'bold', fontSize: '0.75rem',
                                                                color: ticket.priority === 'high' ? 'var(--danger)' : ticket.priority === 'medium' ? 'var(--warning)' : 'var(--success)'
                                                            }}>
                                                                {ticket.priority} ({ticket.slaLimit}h)
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '15px 10px' }}>
                                                            {ticket.closedBy || (ticket.status === 'closed' ? 'Admin' : '---')}
                                                        </td>
                                                        <td style={{ padding: '15px 10px' }}>
                                                            {ticket.durationHours} hrs
                                                        </td>
                                                        <td style={{ padding: '15px 10px' }}>
                                                            {ticket.isCompliant ? (
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--success)', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem' }}>
                                                                    <CheckCircle size={12} /> A Tiempo
                                                                </span>
                                                            ) : (
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem' }}>
                                                                    <XCircle size={12} /> Vencido
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '15px 10px', opacity: 0.8 }}>
                                                            {ticket.status === 'open' ? 'Abierto' : 'Cerrado'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )
                            }
                        </>
                    )}
                </>
            )}
            {/* Modal for New Indicator */}
            {
                isModalOpen && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
                        zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center',
                        padding: '20px'
                    }}>
                        <div className="glass-card" style={{ padding: '30px', width: '100%', maxWidth: '500px', border: '1px solid var(--primary)' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Nuevo Indicador / Meta</h3>
                            <form onSubmit={handleAddIndicator}>
                                <div className="input-group">
                                    <label>Nombre del Indicador</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Satisfacción Cliente"
                                        required
                                        value={newIndicator.name}
                                        onChange={e => setNewIndicator({ ...newIndicator, name: e.target.value })}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                                    <div className="input-group">
                                        <label>Meta</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            value={newIndicator.target}
                                            onChange={e => setNewIndicator({ ...newIndicator, target: e.target.value })}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Valor Actual</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            value={newIndicator.current}
                                            onChange={e => setNewIndicator({ ...newIndicator, current: e.target.value })}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Unidad</label>
                                        {newIndicator.isCustomUnit ? (
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type="text"
                                                    value={newIndicator.unit}
                                                    onChange={e => setNewIndicator({ ...newIndicator, unit: e.target.value })}
                                                    placeholder="Escriba unidad..."
                                                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', width: '100%', padding: '10px', color: 'white', borderRadius: '8px' }}
                                                    autoFocus
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setNewIndicator({ ...newIndicator, isCustomUnit: false, unit: '%' })}
                                                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                                                >
                                                    <XCircle size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <select
                                                value={newIndicator.unit}
                                                onChange={e => {
                                                    if (e.target.value === 'custom') {
                                                        setNewIndicator({ ...newIndicator, isCustomUnit: true, unit: '' });
                                                    } else {
                                                        setNewIndicator({ ...newIndicator, unit: e.target.value });
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
                                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                                    <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'white', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" className="btn-primary">Crear Indicador</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Evidence Detail Modal */}
            {
                isEvidenceModalOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                        <div className="glass-card evidence-modal-content" style={{ padding: '30px', width: '100%', maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div>
                                    <h3 style={{ margin: 0 }}>Detalle de Evidencia</h3>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--primary)', marginTop: '4px' }}>{selectedEvidenceIndicator?.name} - Mes {selectedMonthEvidence}</div>
                                </div>
                                <button onClick={() => setIsEvidenceModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><XCircle /></button>
                            </div>

                            {evidenceData.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No se encontró evidencia para este periodo.</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {evidenceData.map(ev => (
                                        <div key={ev.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{ev.leaderName}</span>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(ev.timestamp).toLocaleDateString()}</span>
                                            </div>

                                            <div style={{ marginBottom: '15px' }}>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Valor reportado:</span>
                                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{ev.value}</div>
                                            </div>

                                            {ev.comment && (
                                                <div style={{ marginBottom: '15px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid var(--primary)' }}>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>Comentario / Feedback</div>
                                                    <p style={{ margin: 0, fontSize: '0.95rem' }}>{ev.comment}</p>
                                                </div>
                                            )}

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
                                                                <a href={file.url} download={file.name} style={{ fontSize: '0.7rem', color: 'var(--primary)', textDecoration: 'none' }}>Descargar</a>
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
        </div >
    );
};

export default SGIDashboard;
