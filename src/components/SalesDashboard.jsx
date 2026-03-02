import React, { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import db from '../services/db';
import { ROLES } from '../config/roles'; // Ensure ROLES is imported or defined
import { PlusCircle, FileText, History, Download, Trash2, Search, DollarSign, User, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import logo from '../assets/logo.svg';
import CustomerManagement from './CustomerManagement';
import { Users } from 'lucide-react';

const SalesDashboard = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('create'); // 'create', 'history', 'clients'
    const [quotations, setQuotations] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');

    // Form State
    const [clientData, setClientData] = useState({
        name: '',
        idNumber: '', // NIT or CC
        email: '',
        phone: '',
        address: '',
        city: ''
    });
    const [items, setItems] = useState([{ id: 1, description: '', quantity: 1, unitPrice: 0 }]);
    const [notes, setNotes] = useState('');
    const [quotationNumber, setQuotationNumber] = useState('');

    // Subscribe to quotations
    useEffect(() => {
        const unsubscribe = db.subscribeQuotations((data) => {
            // Filter based on role
            if (user.role === 'lider_ventas' || user.role === 'admin') {
                setQuotations(data);
            } else {
                setQuotations(data.filter(q => q.createdBy === user.username));
            }

            // Generate a simple auto-increment text for display (not strict ID)
            setQuotationNumber(`COT-${new Date().getFullYear()}-${String(data.length + 1).padStart(4, '0')}`);
        });

        const unsubscribeCustomers = db.subscribeCustomers((data) => {
            setCustomers(data);
        });

        return () => {
            unsubscribe();
            unsubscribeCustomers();
        };
    }, [user]);

    const handleSelectCustomer = (customerId) => {
        setSelectedCustomerId(customerId);
        if (customerId === '') {
            setClientData({ name: '', idNumber: '', email: '', phone: '', address: '', city: '' });
            return;
        }

        const customer = customers.find(c => c.id === customerId);
        if (customer) {
            setClientData({
                name: customer.name || '',
                idNumber: customer.idNumber || '',
                email: customer.email || '',
                phone: customer.phone || '',
                address: customer.address || '',
                city: customer.city || ''
            });
        }
    };

    const addItem = () => {
        setItems([...items, { id: Date.now(), description: '', quantity: 1, unitPrice: 0 }]);
    };

    const removeItem = (id) => {
        if (items.length > 1) {
            setItems(items.filter(i => i.id !== id));
        }
    };

    const updateItem = (id, field, value) => {
        setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    };

    const generatePDF = (quotationData = null) => {
        const doc = new jsPDF();
        const data = quotationData || {
            client: clientData,
            items: items,
            notes: notes,
            number: quotationNumber,
            date: new Date().toLocaleDateString(),
            total: calculateTotal(),
            createdBy: user.name || user.username
        };

        // Logo (Placeholder if not loaded, or use text)
        doc.setFontSize(22);
        doc.setTextColor(41, 128, 185);
        doc.text("ELSPEC ANDINA", 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("Nit: 900.xxx.xxx-x", 14, 26);
        doc.text("Dirección: Calle Falsa 123", 14, 31);
        doc.text("Teléfono: +57 300 123 4567", 14, 36);

        // Quotation Info
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text(`COTIZACIÓN N° ${data.number || 'PROFORMA'}`, 120, 20);
        doc.setFontSize(10);
        doc.text(`Fecha: ${data.date || new Date().toLocaleDateString()}`, 120, 28);
        doc.text(`Vendedor: ${data.createdBy}`, 120, 34);

        // Client Info
        doc.setFontSize(12);
        doc.text("Datos del Cliente:", 14, 50);
        doc.setFontSize(10);
        doc.text(`Nombre: ${data.client.name}`, 14, 57);
        doc.text(`NIT/CC: ${data.client.idNumber}`, 14, 62);
        doc.text(`Dirección: ${data.client.address} - ${data.client.city}`, 14, 67);
        doc.text(`Tel: ${data.client.phone}`, 120, 57);
        doc.text(`Email: ${data.client.email}`, 120, 62);

        // Items Table
        const tableColumn = ["Descripción", "Cant.", "V. Unitario", "Total"];
        const tableRows = [];

        data.items.forEach(item => {
            const ticketData = [
                item.description,
                item.quantity,
                `$ ${parseFloat(item.unitPrice).toLocaleString()}`,
                `$ ${(item.quantity * item.unitPrice).toLocaleString()}`
            ];
            tableRows.push(ticketData);
        });

        doc.autoTable({
            startY: 75,
            head: [tableColumn],
            body: tableRows,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] }
        });

        // Total
        const finalY = doc.lastAutoTable.finalY || 75;
        doc.setFontSize(12);
        doc.text(`TOTAL: $ ${data.total ? data.total.toLocaleString() : calculateTotal().toLocaleString()}`, 140, finalY + 15);

        // Notes
        if (data.notes) {
            doc.setFontSize(10);
            doc.text("Observaciones:", 14, finalY + 25);
            doc.setFont("helvetica", "italic");
            doc.text(data.notes, 14, finalY + 31);
        }

        // Footer
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("Esta cotización tiene una validez de 30 días.", 105, 280, null, null, "center");

        doc.save(`Cotizacion_${data.number || 'borrador'}.pdf`);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!confirm("¿Confirmar creación de cotización?")) return;

        setLoading(true);
        try {
            const newQuotation = {
                client: clientData,
                items: items,
                notes: notes,
                total: calculateTotal(),
                createdBy: user.username,
                createdByName: user.name || user.username,
                number: quotationNumber, // This might duplicate in race conditions but acceptable for now
                createdAt: new Date().toISOString()
            };

            await db.addQuotation(newQuotation);
            generatePDF(newQuotation); // Auto download on create

            // Reset form
            setClientData({ name: '', idNumber: '', email: '', phone: '', address: '', city: '' });
            setSelectedCustomerId('');
            setItems([{ id: 1, description: '', quantity: 1, unitPrice: 0 }]);
            setNotes('');
            alert("Cotización creada exitosamente.");
            setActiveTab('history');
        } catch (error) {
            console.error("Error creating quotation:", error);
            alert("Error al guardar la cotización.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (confirm("¿Eliminar esta cotización del historial?")) {
            try {
                await db.deleteQuotation(id);
            } catch (e) {
                console.error(e);
                alert("Error al eliminar");
            }
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h2 style={{ fontSize: '1.8rem', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <DollarSign size={28} color="var(--primary)" /> Gestión de Ventas
                    </h2>
                    <p style={{ color: 'var(--text-muted)' }}>Generación y control de cotizaciones.</p>
                </div>

                <div className="glass-card" style={{ padding: '5px', display: 'flex', gap: '5px' }}>
                    <button
                        onClick={() => setActiveTab('create')}
                        style={{
                            padding: '8px 15px',
                            background: activeTab === 'create' ? 'var(--primary)' : 'transparent',
                            color: activeTab === 'create' ? 'white' : 'var(--text-muted)',
                            border: 'none', borderRadius: '6px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                    >
                        <PlusCircle size={18} /> Nueva Cotización
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        style={{
                            padding: '8px 15px',
                            background: activeTab === 'history' ? 'var(--primary)' : 'transparent',
                            color: activeTab === 'history' ? 'white' : 'var(--text-muted)',
                            border: 'none', borderRadius: '6px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                    >
                        <History size={18} /> Historial
                    </button>
                    {(user.role === 'admin' || user.role === 'lider_ventas' || user.role === 'ventas') && (
                        <button
                            onClick={() => setActiveTab('clients')}
                            style={{
                                padding: '8px 15px',
                                background: activeTab === 'clients' ? 'var(--primary)' : 'transparent',
                                color: activeTab === 'clients' ? 'white' : 'var(--text-muted)',
                                border: 'none', borderRadius: '6px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                        >
                            <Users size={18} /> Clientes
                        </button>
                    )}
                </div>
            </div>

            {/* Create Tab */}
            {activeTab === 'create' && (
                <div className="glass-card" style={{ padding: '30px' }}>
                    <form onSubmit={handleSubmit}>
                        {/* Client Info Section */}
                        <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '20px', color: 'var(--primary)' }}>
                            <User size={20} style={{ marginRight: '10px', verticalAlign: 'middle' }} /> Datos del Cliente
                        </h3>

                        <div style={{ marginBottom: '25px', maxWidth: '400px' }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                                Seleccionar Cliente Guardado
                            </label>
                            <select
                                value={selectedCustomerId}
                                onChange={(e) => handleSelectCustomer(e.target.value)}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: '8px',
                                    background: 'rgba(0,108,224,0.1)', border: '1px solid var(--primary)',
                                    color: 'white', outline: 'none'
                                }}
                            >
                                <option value="" style={{ background: '#1e293b' }}>-- Datos manuales / Nuevo cliente --</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id} style={{ background: '#1e293b' }}>
                                        {c.name} ({c.idNumber})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                            <div className="input-group">
                                <label>Razón Social / Nombre</label>
                                <input required type="text" value={clientData.name} onChange={e => setClientData({ ...clientData, name: e.target.value })} placeholder="Cliente S.A.S" />
                            </div>
                            <div className="input-group">
                                <label>NIT / Cédula</label>
                                <input required type="text" value={clientData.idNumber} onChange={e => setClientData({ ...clientData, idNumber: e.target.value })} placeholder="900.000.000" />
                            </div>
                            <div className="input-group">
                                <label>Email</label>
                                <input type="email" value={clientData.email} onChange={e => setClientData({ ...clientData, email: e.target.value })} placeholder="contacto@cliente.com" />
                            </div>
                            <div className="input-group">
                                <label>Teléfono</label>
                                <input type="text" value={clientData.phone} onChange={e => setClientData({ ...clientData, phone: e.target.value })} placeholder="300..." />
                            </div>
                            <div className="input-group">
                                <label>Ciudad</label>
                                <input type="text" value={clientData.city} onChange={e => setClientData({ ...clientData, city: e.target.value })} placeholder="Bogotá" />
                            </div>
                            <div className="input-group">
                                <label>Dirección</label>
                                <input type="text" value={clientData.address} onChange={e => setClientData({ ...clientData, address: e.target.value })} placeholder="Calle 123..." />
                            </div>
                        </div>

                        {/* Items Section */}
                        <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '20px', color: 'var(--primary)', display: 'flex', justifyContent: 'space-between' }}>
                            <span><FileText size={20} style={{ marginRight: '10px', verticalAlign: 'middle' }} /> Ítems de Cotización</span>
                            <button type="button" onClick={addItem} style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '0.8rem' }}>
                                + Agregar Ítem
                            </button>
                        </h3>

                        <div style={{ marginBottom: '30px', overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', textAlign: 'left' }}>
                                        <th style={{ padding: '10px', borderRadius: '8px 0 0 8px' }}>Descripción</th>
                                        <th style={{ padding: '10px', width: '100px' }}>Cant.</th>
                                        <th style={{ padding: '10px', width: '150px' }}>V. Unitario</th>
                                        <th style={{ padding: '10px', width: '150px' }}>Total</th>
                                        <th style={{ padding: '10px', width: '50px', borderRadius: '0 8px 8px 0' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '10px' }}>
                                                <input
                                                    type="text"
                                                    required
                                                    value={item.description}
                                                    onChange={e => updateItem(item.id, 'description', e.target.value)}
                                                    placeholder="Descripción del producto o servicio"
                                                    style={{ width: '100%', background: 'transparent', border: 'none', color: 'white', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
                                                />
                                            </td>
                                            <td style={{ padding: '10px' }}>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '5px', borderRadius: '4px', textAlign: 'center' }}
                                                />
                                            </td>
                                            <td style={{ padding: '10px' }}>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={item.unitPrice}
                                                    onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '5px', borderRadius: '4px' }}
                                                />
                                            </td>
                                            <td style={{ padding: '10px', fontWeight: 'bold' }}>
                                                $ {(item.quantity * item.unitPrice).toLocaleString()}
                                            </td>
                                            <td style={{ padding: '10px' }}>
                                                <button type="button" onClick={() => removeItem(item.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '20px', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '30px' }}>
                            <span>TOTAL:</span>
                            <span style={{ color: 'var(--success)', fontSize: '1.5rem' }}>$ {calculateTotal().toLocaleString()}</span>
                        </div>

                        <div className="input-group">
                            <label>Observaciones / Condiciones</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows="3" placeholder="Garantía, Tiempos de entrega, etc..." />
                        </div>

                        <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                            <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1, padding: '15px', fontSize: '1rem' }}>
                                {loading ? 'Procesando...' : 'Generar Cotización y Descargar PDF'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
                <div className="glass-card" style={{ padding: '20px' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                    <th style={{ padding: '15px', textAlign: 'left' }}># Cotización</th>
                                    <th style={{ padding: '15px', textAlign: 'left' }}>Fecha</th>
                                    <th style={{ padding: '15px', textAlign: 'left' }}>Cliente</th>
                                    <th style={{ padding: '15px', textAlign: 'left' }}>Vendedor</th>
                                    <th style={{ padding: '15px', textAlign: 'right' }}>Total</th>
                                    <th style={{ padding: '15px', textAlign: 'center' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {quotations.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            No hay cotizaciones registradas.
                                        </td>
                                    </tr>
                                ) : (
                                    quotations.map(q => (
                                        <tr key={q.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                                            <td style={{ padding: '15px', fontWeight: 'bold' }}>{q.number || 'N/A'}</td>
                                            <td style={{ padding: '15px' }}>{new Date(q.createdAt).toLocaleDateString()}</td>
                                            <td style={{ padding: '15px' }}>{q.client.name} {q.client.idNumber ? `(${q.client.idNumber})` : ''}</td>
                                            <td style={{ padding: '15px' }}>{q.createdByName}</td>
                                            <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold', color: 'var(--success)' }}>
                                                $ {q.total ? q.total.toLocaleString() : '0'}
                                            </td>
                                            <td style={{ padding: '15px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                                <button
                                                    onClick={() => generatePDF(q)}
                                                    style={{ background: 'rgba(0, 108, 224, 0.15)', color: 'var(--primary)', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                                                    title="Descargar PDF"
                                                >
                                                    <Download size={18} />
                                                </button>
                                                {(user.role === 'admin' || user.role === 'lider_ventas' || user.username === q.createdBy) && (
                                                    <button
                                                        onClick={() => handleDelete(q.id)}
                                                        style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Clients Tab */}
            {activeTab === 'clients' && (
                <CustomerManagement />
            )}
        </div>
    );
};

export default SalesDashboard;
