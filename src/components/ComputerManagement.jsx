import React, { useState } from 'react';
import useComputers from '../hooks/useComputers';
import useAuth from '../hooks/useAuth';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    Monitor,
    PlusCircle,
    Edit,
    Trash2,
    FileText,
    Search,
    Cpu,
    Save,
    User,
    Activity,
    Briefcase,
    AlertCircle
} from 'lucide-react';
import logo from '../assets/logo.svg';
import { checkPermission, ROLES } from '../config/roles';

const PROCESSORS = [
    'Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'Intel Core i9',
    'AMD Ryzen 3', 'AMD Ryzen 5', 'AMD Ryzen 7', 'AMD Ryzen 9',
    'Apple M1', 'Apple M1 Pro', 'Apple M1 Max',
    'Apple M2', 'Apple M2 Pro', 'Apple M2 Max',
    'Apple M3', 'Apple M3 Pro', 'Apple M3 Max',
    'Intel Xeon', 'AMD Threadripper', 'Otro'
];

const RAM_SIZES = ['4GB', '8GB', '12GB', '16GB', '24GB', '32GB', '64GB', '128GB'];
const STORAGE_SIZES = ['128GB SSD', '256GB SSD', '512GB SSD', '1TB SSD', '2TB SSD', '500GB HDD', '1TB HDD', '2TB HDD', '4TB HDD'];

const ASSET_TYPES = [
    'Laptop', 'Desktop', 'Servidor', 'Impresora', 'Router', 'Switch',
    'Modem', 'Tablet', 'Smartphone', 'Scanner', 'Otro'
];

const COMPUTING_TYPES = ['Laptop', 'Desktop', 'Servidor', 'Tablet', 'Smartphone', 'Otro'];

import MaintenanceSchedule from './MaintenanceSchedule';

const ComputerManagement = () => {
    const { computers, loading, addComputer, updateComputer, deleteComputer, addMaintenanceLog } = useComputers();
    const { user, users } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTypes, setSelectedTypes] = useState([]); // Multi-select filter
    const [isFilterOpen, setIsFilterOpen] = useState(false); // Toggle for filter dropdown
    const [editingComputer, setEditingComputer] = useState(null); // null = list, object = edit/create
    const [maintenanceMode, setMaintenanceMode] = useState(null); // computer object to add log (Quick Access)
    const [newLog, setNewLog] = useState({ activity: '', technician: '' });
    const [showMaintenanceSchedule, setShowMaintenanceSchedule] = useState(false); // Toggle for Maintenance View

    const [formData, setFormData] = useState({
        type: 'Laptop',
        brand: '',
        model: '',
        serial: '',
        processor: '',
        ram: '',
        storage: '',
        os: '',
        assignedTo: '',
        location: '',
        status: 'Active', // Active, Maintenance, Retired
        purchaseDate: '',
        hasFault: false,
        faultDescription: '',
        details: '' // Added details field
    });

    const handleEditClick = (comp) => {
        setFormData(comp);
        setEditingComputer(comp);
    };

    const handleCreateClick = () => {
        setFormData({
            type: 'Laptop', brand: '', model: '', serial: '',
            processor: '', ram: '', storage: '', os: '',
            assignedTo: '', location: '', status: 'Active', purchaseDate: '',
            hasFault: false, faultDescription: '', details: ''
        });
        setEditingComputer({ id: 'new' });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (editingComputer.id === 'new') {
            await addComputer({ ...formData, createdAt: new Date().toISOString() });
        } else {
            await updateComputer(editingComputer.id, formData);
        }
        setEditingComputer(null);
    };

    const handleDelete = (id) => {
        if (window.confirm('¿Está seguro de eliminar este equipo?')) {
            deleteComputer(id);
        }
    };

    // Quick Maintenance Log from Inventory
    const handleMaintenanceSave = async (e) => {
        e.preventDefault();
        if (maintenanceMode && newLog.activity) {
            await addMaintenanceLog(maintenanceMode.id, newLog);
            setMaintenanceMode(null);
            setNewLog({ activity: '', technician: '' });
        }
    };

    const generatePDF = (comp) => {
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
        doc.text('HOJA DE VIDA', 150, 18, { align: 'center' });
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('EQUIPO DE CÓMPUTO', 150, 23, { align: 'center' });

        doc.setDrawColor(0, 108, 224);
        doc.setLineWidth(1);
        doc.line(14, 30, 196, 30);

        // Asset Info Box
        doc.setDrawColor(200);
        doc.setFillColor(245, 247, 250);
        doc.roundedRect(14, 35, 182, 35, 3, 3, 'FD');

        doc.setFontSize(10); doc.setTextColor(100);
        doc.text('TIPO DE EQUIPO', 20, 42);
        doc.text('MARCA', 80, 42);
        doc.text('MODELO', 140, 42);

        doc.setFontSize(12); doc.setTextColor(0); doc.setFont('helvetica', 'bold');
        doc.text(comp.type.toUpperCase(), 20, 48);
        doc.text(comp.brand.toUpperCase(), 80, 48);
        doc.text(comp.model.toUpperCase(), 140, 48);

        doc.setFontSize(10); doc.setTextColor(100); doc.setFont('helvetica', 'normal');
        doc.text('SERIAL', 20, 58);
        doc.text('ESTADO ACTUAL', 80, 58);
        doc.text('FECHA COMPRA', 140, 58);

        doc.setFontSize(12); doc.setTextColor(0); doc.setFont('helvetica', 'bold');
        doc.text(comp.serial || 'N/A', 20, 64);
        doc.text(comp.status.toUpperCase(), 80, 64);
        doc.text(comp.purchaseDate || 'N/A', 140, 64);


        // Specs Section
        doc.setFontSize(14); doc.setTextColor(...primaryColor);
        doc.text('Especificaciones Técnicas', 14, 85);

        const specsData = [
            ['Tipo de Equipo', comp.type],
            ['Marca', comp.brand],
            ['Modelo', comp.model],
            ['Serial', comp.serial],
        ];

        if (COMPUTING_TYPES.includes(comp.type)) {
            specsData.push(
                ['Procesador', comp.processor],
                ['Memoria RAM', comp.ram],
                ['Almacenamiento', comp.storage],
                ['Sistema Operativo', comp.os]
            );
        }

        specsData.push(
            ['Ubicación', comp.location],
            ['Asignado a', comp.assignedTo],
            ['Estado Funcional', comp.hasFault ? 'CON FALLAS / AVERÍAS' : 'Operativo Correctamente']
        );

        if (comp.hasFault) {
            specsData.push(['Descripción de Falla', comp.faultDescription || 'Sin detalles registrados']);
        }
        if (comp.details) {
            specsData.push(['Detalles Adicionales', comp.details]);
        }


        autoTable(doc, {
            body: specsData,
            startY: 90,
            theme: 'grid',
            styles: { fontSize: 10, cellPadding: 5 },
            columnStyles: {
                0: { fontStyle: 'bold', width: 60, fillColor: [240, 240, 240] },
                1: { textColor: (row) => (row.raw[0] === 'Estado Funcional' && comp.hasFault) ? [220, 38, 38] : [0, 0, 0] }
            },
            didParseCell: (data) => {
                if (data.section === 'body' && data.row.raw[0] === 'Estado Funcional' && comp.hasFault) {
                    data.cell.styles.textColor = [220, 38, 38];
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        });

        // Maintenance History
        const maintY = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(14); doc.setTextColor(...primaryColor);
        doc.text('Historial de Mantenimientos', 14, maintY);

        const logData = (comp.maintenanceLog || []).map(log => [
            new Date(log.createdAt).toLocaleDateString(),
            log.activity,
            log.technician || 'Admin'
        ]);

        if (logData.length > 0) {
            autoTable(doc, {
                head: [['Fecha', 'Actividad Realizada', 'Técnico']],
                body: logData,
                startY: maintY + 5,
                theme: 'striped',
                headStyles: { fillColor: primaryColor }
            });
        } else {
            doc.setFontSize(10); doc.setTextColor(100);
            doc.text('No hay registros de mantenimiento.', 14, maintY + 10);
        }

        // Support History
        const supportY = (doc.lastAutoTable?.finalY || (maintY + 10)) + 15;
        doc.setFontSize(14); doc.setTextColor(...primaryColor);
        doc.text('Historial de Soporte Técnico', 14, supportY);

        const supportData = (comp.supportLog || []).map(log => [
            new Date(log.createdAt).toLocaleDateString(),
            `${log.ticketTitle || 'Ticket'}: ${log.activity}`,
            log.technician || 'Admin'
        ]);

        if (supportData.length > 0) {
            autoTable(doc, {
                head: [['Fecha', 'Detalle de Atención', 'Técnico']],
                body: supportData,
                startY: supportY + 5,
                theme: 'striped',
                headStyles: { fillColor: [6, 182, 212] }
            });
        } else {
            doc.setFontSize(10); doc.setTextColor(100);
            doc.text('No hay registros de soporte técnico.', 14, supportY + 10);
        }

        // Footer
        doc.setFontSize(8); doc.setTextColor(150);
        doc.text(`Generado el ${new Date().toLocaleDateString()} - Sistema de Gestión ELSPEC ANDINA`, 105, 290, { align: 'center' });

        doc.save(`HojaVida_${comp.serial || 'Equipo'}.pdf`);
    };

    const normalizeString = (str) => {
        if (!str) return '';
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    };

    const canManageAssets = checkPermission(user, 'CAN_MANAGE_ASSETS');

    const filteredComputers = computers.filter(c => {
        // High level filter: standard users only see their own assets
        if (!canManageAssets) {
            const normalizedAssignedTo = normalizeString(c.assignedTo);
            const userIdentifiers = [
                normalizeString(user.username),
                normalizeString(user.name),
                normalizeString(user.email)
            ].filter(Boolean);

            if (!userIdentifiers.includes(normalizedAssignedTo)) return false;
        }

        const matchesSearch = (
            (c.assignedTo?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (c.serial?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (c.brand?.toLowerCase() || '').includes(searchTerm.toLowerCase())
        );
        const matchesType = selectedTypes.length === 0 || selectedTypes.includes(c.type);
        return matchesSearch && matchesType;
    });

    const toggleTypeFilter = (type) => {
        setSelectedTypes(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        );
    };

    if (showMaintenanceSchedule) {
        return (
            <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
                    <button
                        onClick={() => setShowMaintenanceSchedule(false)}
                        className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}
                    >
                        <Monitor size={18} /> Volver al Inventario
                    </button>
                </div>
                <MaintenanceSchedule />
            </div>
        );
    }

    return (
        <div className="glass-card" style={{ padding: 'clamp(15px, 4vw, 30px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)' }}>
                    <Monitor color="var(--primary)" size={24} /> Inventario General
                </h3>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-start', flex: '1 1 auto' }}>

                    {/* Toggle Maintenance View */}
                    <button
                        onClick={() => setShowMaintenanceSchedule(true)}
                        className="btn-secondary" // Reusing styling
                        style={{ padding: '10px 15px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(236, 72, 153, 0.2)', border: '1px solid #ec4899', color: '#fbcfe8', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                        <Activity size={18} /> <span className="hide-mobile">Mantenimiento</span>
                    </button>

                    {/* Multi-Select Type Filter */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className="btn-secondary"
                            style={{ padding: '10px 15px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            <Search size={16} />
                            {selectedTypes.length === 0 ? 'Filtros' : `${selectedTypes.length} Filtros`}
                        </button>

                        {isFilterOpen && (
                            <div style={{
                                position: 'absolute', top: '100%', right: 0, marginTop: '5px',
                                background: '#1e293b', border: '1px solid var(--border-color)', borderRadius: '8px',
                                padding: '10px', width: '200px', zIndex: 50, boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                            }}>
                                <div style={{ marginBottom: '10px', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Filtrar por Tipo:</span>
                                    <span style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => setSelectedTypes([])}>Limpiar</span>
                                </div>
                                {ASSET_TYPES.map(type => (
                                    <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0', cursor: 'pointer', fontSize: '0.9rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedTypes.includes(type)}
                                            onChange={() => toggleTypeFilter(type)}
                                        />
                                        {type}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {canManageAssets && (
                        <button onClick={handleCreateClick} className="btn-primary" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <PlusCircle size={18} /> Nuevo Equipo
                        </button>
                    )}
                </div>
            </div>

            {/* Editing / Creating Form MOdal */}
            {editingComputer && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '20px', paddingTop: '80px', overflowY: 'auto' }}>
                    <div className="glass-card" style={{ width: '100%', maxWidth: '800px', marginBottom: '50px', padding: '30px', border: '1px solid var(--primary)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
                        <h4 style={{ marginTop: 0, marginBottom: '25px', fontSize: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px' }}>
                            {editingComputer.id === 'new' ? 'Registrar Nuevo Equipo' : 'Editar Información del Equipo'}
                        </h4>
                        <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                            <div className="input-group">
                                <label>Tipo</label>
                                <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                    {ASSET_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                                </select>
                            </div>
                            <div className="input-group"><label>Marca</label><input required value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} /></div>
                            <div className="input-group"><label>Modelo</label><input required value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} /></div>
                            <div className="input-group"><label>Serial / Service Tag</label><input required value={formData.serial} onChange={e => setFormData({ ...formData, serial: e.target.value })} /></div>

                            {COMPUTING_TYPES.includes(formData.type) && (
                                <>
                                    <div className="input-group">
                                        <label>Procesador</label>
                                        <input list="processor-list" value={formData.processor} onChange={e => setFormData({ ...formData, processor: e.target.value })} />
                                        <datalist id="processor-list">
                                            {PROCESSORS.map(p => <option key={p} value={p} />)}
                                        </datalist>
                                    </div>
                                    <div className="input-group">
                                        <label>RAM</label>
                                        <input list="ram-list" value={formData.ram} onChange={e => setFormData({ ...formData, ram: e.target.value })} />
                                        <datalist id="ram-list">
                                            {RAM_SIZES.map(r => <option key={r} value={r} />)}
                                        </datalist>
                                    </div>
                                    <div className="input-group">
                                        <label>Almacenamiento</label>
                                        <input list="storage-list" value={formData.storage} onChange={e => setFormData({ ...formData, storage: e.target.value })} />
                                        <datalist id="storage-list">
                                            {STORAGE_SIZES.map(s => <option key={s} value={s} />)}
                                        </datalist>
                                    </div>
                                    <div className="input-group"><label>Sistema Operativo</label><input value={formData.os} onChange={e => setFormData({ ...formData, os: e.target.value })} /></div>
                                </>
                            )}

                            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                                <label>Observaciones / Detalles Técnicos Adicionales (IP, MAC, Puertos, etc.)</label>
                                <textarea
                                    rows="2"
                                    value={formData.details || ''}
                                    onChange={e => setFormData({ ...formData, details: e.target.value })}
                                    placeholder="Ej: Dirección IP fija, Dirección MAC, Número de Puertos..."
                                />
                            </div>

                            <div className="input-group">
                                <label>Asignado A (Usuario/Area)</label>
                                <select
                                    value={formData.assignedTo}
                                    onChange={e => {
                                        const newVal = e.target.value;
                                        setFormData({
                                            ...formData,
                                            assignedTo: newVal,
                                            status: newVal ? 'Active' : 'Stock' // Auto-update status based on assignment
                                        });
                                    }}
                                >
                                    <option value="">-- Disponible / En Stock --</option>
                                    {users && users.map(u => (
                                        <option key={u.id} value={u.username}>{u.name || u.username}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="input-group"><label>Ubicación</label><input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} /></div>
                            <div className="input-group"><label>Fecha Compra</label><input type="date" value={formData.purchaseDate} onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })} /></div>
                            <div className="input-group">
                                <label>Estado</label>
                                <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                    <option value="Active">En Uso (Activo)</option>
                                    <option value="Stock">Disponible (Stock)</option>
                                    <option value="Maintenance">En Mantenimiento</option>
                                    <option value="Retired">Retirado / De Baja</option>
                                </select>
                            </div>

                            <div style={{ gridColumn: '1 / -1', background: 'rgba(255, 0, 0, 0.05)', padding: '15px', borderRadius: '10px', border: '1px solid rgba(255, 0, 0, 0.2)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: formData.hasFault ? '15px' : '0' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.hasFault}
                                        onChange={e => setFormData({ ...formData, hasFault: e.target.checked })}
                                        style={{ width: '20px', height: '20px' }}
                                    />
                                    <span style={{ fontWeight: 'bold', color: formData.hasFault ? 'var(--danger)' : 'inherit' }}>
                                        ¿El equipo presenta fallas o averías?
                                    </span>
                                </label>

                                {formData.hasFault && (
                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                        <label>Descripción de la Falla / Avería</label>
                                        <textarea
                                            required={formData.hasFault}
                                            value={formData.faultDescription}
                                            onChange={e => setFormData({ ...formData, faultDescription: e.target.value })}
                                            placeholder="Describa el problema técnico, daño físico o mal funcionamiento..."
                                            rows="3"
                                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--danger)' }}
                                        ></textarea>
                                    </div>
                                )}
                            </div>

                            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '15px', marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                                <button type="button" onClick={() => setEditingComputer(null)} style={{ flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '10px', color: 'white', padding: '12px', cursor: 'pointer' }}>Cancelar</button>
                                <button type="submit" className="btn-primary" style={{ flex: 2, padding: '12px', fontSize: '1.1rem' }}><Save size={18} /> Guardar Cambios</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Quick Maintenance Mode Modal (Optional to keep in Inventory too) */}
            {maintenanceMode && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '100px' }}>
                    <div className="glass-card" style={{ width: '400px', padding: '25px', border: '1px solid var(--primary)' }}>
                        <h4 style={{ marginTop: 0 }}>Registrar Mantenimiento</h4>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Para: {maintenanceMode.brand} {maintenanceMode.model}</p>
                        <form onSubmit={handleMaintenanceSave}>
                            <div className="input-group">
                                <label>Actividad Realizada</label>
                                <textarea required rows="4" value={newLog.activity} onChange={e => setNewLog({ ...newLog, activity: e.target.value })} placeholder="Ej: Limpieza física, Actualización de Drivers..."></textarea>
                            </div>
                            <div className="input-group">
                                <label>Técnico Responsable</label>
                                <input value={newLog.technician} onChange={e => setNewLog({ ...newLog, technician: e.target.value })} placeholder="Nombre del técnico" />
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Registrar</button>
                                <button type="button" onClick={() => setMaintenanceMode(null)} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '10px', color: 'white' }}>Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Search Bar */}
            <div style={{ marginBottom: '20px', position: 'relative' }}>
                <input
                    type="text"
                    placeholder="Buscar por serial, marca o usuario..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '12px 15px 12px 45px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'white', fontSize: '0.9rem' }}
                />
                <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>

            {/* INVENTORY GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {filteredComputers.map(comp => (
                    <div key={comp.id} className="glass-card" style={{
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '15px',
                        border: '1px solid rgba(255,255,255,0.05)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        {/* Status Stripe */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '4px',
                            height: '100%',
                            background: comp.status === 'Active' ? 'var(--success)' : comp.status === 'Stock' ? 'var(--primary)' : 'var(--danger)'
                        }}></div>

                        <div>
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>{comp.brand}</h4>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{comp.model}</span>
                                </div>
                                <span style={{
                                    fontSize: '0.7rem',
                                    padding: '3px 8px',
                                    borderRadius: '10px',
                                    background: comp.status === 'Active' ? 'rgba(16, 185, 129, 0.2)' : comp.status === 'Stock' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                    color: comp.status === 'Active' ? 'var(--success)' : comp.status === 'Stock' ? 'var(--primary)' : 'var(--danger)',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase'
                                }}>
                                    {comp.status === 'Active' ? 'En Uso' : comp.status === 'Stock' ? 'Stock' : comp.status}
                                </span>
                            </div>

                            {/* Main Info - Assigned User */}
                            <div style={{ margin: '15px 0', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '50%' }}>
                                    <User size={20} color="var(--primary)" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Asignado a</div>
                                    <div style={{ fontWeight: 'bold', fontSize: '1rem', color: comp.assignedTo ? 'white' : 'var(--text-muted)' }}>
                                        {comp.assignedTo || 'Sin Asignar'}
                                    </div>
                                </div>
                            </div>

                            {/* Support Summary in UI */}
                            {comp.supportLog && comp.supportLog.length > 0 && (
                                <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(6, 182, 212, 0.05)', borderRadius: '8px', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                                    <div style={{ fontSize: '0.7rem', color: '#06b6d4', textTransform: 'uppercase', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                                        <Activity size={12} /> Último Soporte ({comp.supportLog.length})
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {comp.supportLog[comp.supportLog.length - 1].activity}
                                    </div>
                                </div>
                            )}

                            {/* Tech Specs */}
                            {(comp.ram || comp.storage || comp.processor) && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '10px' }}>
                                    {comp.processor && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '4px' }}>
                                            <Cpu size={12} /> {comp.processor}
                                        </div>
                                    )}
                                    {comp.ram && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '4px' }}>
                                            <Activity size={12} /> {comp.ram}
                                        </div>
                                    )}
                                    {comp.storage && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '4px' }}>
                                            <Save size={12} /> {comp.storage}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Serial: <span style={{ color: 'white', fontFamily: 'monospace' }}>{comp.serial}</span></span>
                                {comp.purchaseDate && (
                                    <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                                        Compra: {comp.purchaseDate}
                                    </span>
                                )}
                            </div>

                            {comp.hasFault && (
                                <div style={{ fontSize: '0.85rem', color: '#f87171', background: 'rgba(239, 68, 68, 0.1)', padding: '8px', borderRadius: '8px', marginTop: '10px', display: 'flex', alignItems: 'start', gap: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                    <AlertCircle size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                                    <div>{comp.faultDescription}</div>
                                </div>
                            )}
                        </div>

                        {/* Actions Footer */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            <button onClick={() => generatePDF(comp)} title="Hoja de Vida" style={{ flex: 1, background: 'rgba(0, 108, 224, 0.1)', color: 'var(--primary)', padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
                                <FileText size={18} />
                            </button>
                            {canManageAssets && (
                                <>
                                    <button onClick={() => setMaintenanceMode(comp)} title="Mantenimiento" style={{ flex: 1, background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
                                        <Briefcase size={18} />
                                    </button>
                                    <button onClick={() => handleEditClick(comp)} title="Editar" style={{ flex: 1, background: 'rgba(255, 255, 255, 0.1)', color: 'white', padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
                                        <Edit size={18} />
                                    </button>
                                    <button onClick={() => handleDelete(comp.id)} title="Eliminar" style={{ flex: 1, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
                                        <Trash2 size={18} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
                {filteredComputers.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '15px' }}>
                        <Monitor size={48} style={{ marginBottom: '15px', opacity: 0.5 }} />
                        <p>No se encontraron equipos registrados con los filtros actuales.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ComputerManagement;
