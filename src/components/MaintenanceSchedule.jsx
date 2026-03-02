import React, { useState } from 'react';
import useComputers from '../hooks/useComputers';
import {
    Calendar,
    Clock,
    AlertTriangle,
    CheckCircle,
    Search
} from 'lucide-react';

const MaintenanceSchedule = () => {
    const { computers, addMaintenanceLog } = useComputers();
    const [maintenanceMode, setMaintenanceMode] = useState(null); // computer object to add log
    const [newLog, setNewLog] = useState({ activity: '', technician: '' });
    const [searchTerm, setSearchTerm] = useState('');

    const handleMaintenanceSave = async (e) => {
        e.preventDefault();
        if (maintenanceMode && newLog.activity) {
            await addMaintenanceLog(maintenanceMode.id, newLog);
            setMaintenanceMode(null);
            setNewLog({ activity: '', technician: '' });
        }
    };

    // Maintenance Logic
    const getMaintenanceStatus = (computer) => {
        const now = new Date();
        let nextDate;
        let lastDate;

        if (!computer.maintenanceLog || computer.maintenanceLog.length === 0) {
            // No history: Next deadline is the nearest specific date (July 15 or Nov 15)
            const year = now.getFullYear();
            const juneDeadline = new Date(year, 5, 15); // June 15
            const novDeadline = new Date(year, 10, 15); // Nov 15

            if (now < juneDeadline) nextDate = juneDeadline;
            else if (now < novDeadline) nextDate = novDeadline;
            else nextDate = new Date(year + 1, 5, 15); // June next year

            lastDate = new Date(computer.purchaseDate || computer.createdAt); // Use purchase/creation date as a fallback for 'lastDate' display
        } else {
            const lastEntry = computer.maintenanceLog[computer.maintenanceLog.length - 1];
            const lastDateStr = lastEntry.createdAt || lastEntry.date;
            lastDate = new Date(lastDateStr);

            // Fixed Deadlines Logic: June 15 and Nov 15
            const currentYear = now.getFullYear();

            if (lastDate.getFullYear() < currentYear) {
                // Last maint was last year or earlier -> Due June 15 this year
                nextDate = new Date(currentYear, 5, 15);
                if (now > nextDate) { // If June 15 has passed, next is Nov 15
                    nextDate = new Date(currentYear, 10, 15);
                }
                if (now > nextDate) { // If Nov 15 has passed, next is June 15 next year
                    nextDate = new Date(currentYear + 1, 5, 15);
                }
            } else {
                // Last maint was this year
                // If done Jan-June (Month <= 5) -> Due Nov 15 this year
                if (lastDate.getMonth() <= 5) {
                    nextDate = new Date(currentYear, 10, 15);
                    if (now > nextDate) { // If Nov 15 has passed, next is June 15 next year
                        nextDate = new Date(currentYear + 1, 5, 15);
                    }
                } else {
                    // Done July-Dec -> Due June 15 next year
                    nextDate = new Date(currentYear + 1, 5, 15);
                }
            }
        }

        const diffTime = nextDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let status = 'ok'; // > 30 days
        if (diffDays < 0) status = 'overdue';
        else if (diffDays <= 30) status = 'warning';

        return { nextDate, diffDays, status, lastDate };
    };

    const scheduleData = computers
        .map(c => ({ ...c, ...getMaintenanceStatus(c) }))
        .filter(c =>
            (c.brand?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (c.model?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (c.serial?.toLowerCase() || '').includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => a.diffDays - b.diffDays);

    return (
        <div className="glass-card" style={{ padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Calendar color="var(--primary)" size={24} /> Cronograma de Mantenimiento Preventivo
                </h3>
                <div style={{ position: 'relative', width: '300px' }}>
                    <input
                        type="text"
                        placeholder="Buscar equipo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '10px 15px 10px 40px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'white' }}
                    />
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                            <th style={{ padding: '15px' }}>Equipo / Serial</th>
                            <th style={{ padding: '15px' }}>Último Mantenimiento</th>
                            <th style={{ padding: '15px' }}>Próximo Mantenimiento</th>
                            <th style={{ padding: '15px' }}>Estado Actual</th>
                            <th style={{ padding: '15px' }}>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {scheduleData.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No se encontraron equipos para el criterio de búsqueda.
                                </td>
                            </tr>
                        ) : (
                            scheduleData.map(item => (
                                <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '15px' }}>
                                        <div style={{ fontWeight: 'bold' }}>{item.brand} {item.model}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '5px', alignItems: 'center' }}>
                                            <span style={{ color: 'var(--primary)' }}>{item.serial}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '15px', color: 'var(--text-muted)' }}>
                                        {item.lastDate.toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '15px', fontWeight: 'bold' }}>
                                        {item.nextDate.toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '15px' }}>
                                        {item.status === 'overdue' && (
                                            <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(239, 68, 68, 0.1)', padding: '5px 10px', borderRadius: '15px', width: 'fit-content' }}>
                                                <AlertTriangle size={16} /> Vencido ({Math.abs(item.diffDays)} días)
                                            </span>
                                        )}
                                        {item.status === 'warning' && (
                                            <span style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(245, 158, 11, 0.1)', padding: '5px 10px', borderRadius: '15px', width: 'fit-content' }}>
                                                <Clock size={16} /> Atención ({item.diffDays} días)
                                            </span>
                                        )}
                                        {item.status === 'ok' && (
                                            <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(16, 185, 129, 0.1)', padding: '5px 10px', borderRadius: '15px', width: 'fit-content' }}>
                                                <CheckCircle size={16} /> OK ({item.diffDays} días)
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ padding: '15px' }}>
                                        <button
                                            onClick={() => setMaintenanceMode(item)}
                                            className="btn-primary"
                                            style={{
                                                padding: '8px 15px', fontSize: '0.85rem'
                                            }}
                                        >Registrar</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Maintenance Log Modal */}
            {maintenanceMode && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div className="glass-card" style={{ width: '90%', maxWidth: '500px', padding: '30px', border: '1px solid var(--primary)' }}>
                        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <CheckCircle size={24} color="var(--success)" /> Registrar Mantenimiento
                        </h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                            Equipo: <span style={{ color: 'white', fontWeight: 'bold' }}>{maintenanceMode.brand} {maintenanceMode.model}</span> <br />
                            Serial: {maintenanceMode.serial}
                        </p>
                        <form onSubmit={handleMaintenanceSave}>
                            <div className="input-group">
                                <label>Actividad Realizada</label>
                                <textarea
                                    required
                                    rows="4"
                                    value={newLog.activity}
                                    onChange={e => setNewLog({ ...newLog, activity: e.target.value })}
                                    placeholder="Detalle el trabajo realizado (Ej: Limpieza interna, Cambio de pasta térmica, Formateo...)"
                                ></textarea>
                            </div>
                            <div className="input-group">
                                <label>Técnico Responsable</label>
                                <input
                                    required
                                    value={newLog.technician}
                                    onChange={e => setNewLog({ ...newLog, technician: e.target.value })}
                                    placeholder="Nombre del técnico"
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                                <button type="submit" className="btn-primary" style={{ flex: 1.5, padding: '12px' }}>Guardar Registro</button>
                                <button type="button" onClick={() => setMaintenanceMode(null)} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '10px', color: 'white', cursor: 'pointer' }}>Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MaintenanceSchedule;
