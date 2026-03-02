import React, { useState, useEffect } from 'react';
import db from '../services/db';
import { UserPlus, Search, Edit2, Trash2, X, Save, User } from 'lucide-react';

const CustomerManagement = () => {
    const [customers, setCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        idNumber: '', // NIT or CC
        email: '',
        phone: '',
        address: '',
        city: ''
    });

    useEffect(() => {
        const unsubscribe = db.subscribeCustomers(setCustomers);
        return () => unsubscribe();
    }, []);

    const handleOpenModal = (customer = null) => {
        if (customer) {
            setEditingCustomer(customer);
            setFormData({
                name: customer.name || '',
                idNumber: customer.idNumber || '',
                email: customer.email || '',
                phone: customer.phone || '',
                address: customer.address || '',
                city: customer.city || ''
            });
        } else {
            setEditingCustomer(null);
            setFormData({ name: '', idNumber: '', email: '', phone: '', address: '', city: '' });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingCustomer) {
                await db.updateCustomer(editingCustomer.id, formData);
                alert('✅ Cliente actualizado exitosamente');
            } else {
                await db.addCustomer(formData);
                alert('✅ Cliente registrado exitosamente');
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving customer:', error);
            alert('❌ Error al guardar el cliente');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (confirm('¿Está seguro de eliminar este cliente?')) {
            try {
                await db.deleteCustomer(id);
            } catch (error) {
                console.error('Error deleting customer:', error);
                alert('Error al eliminar el cliente');
            }
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.idNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="customer-management animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                <div style={{ position: 'relative', flex: '1 1 auto', minWidth: '250px' }}>
                    <div className="search-box-premium" style={{ width: '100%' }}>
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o NIT..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ padding: '10px' }}
                        />
                    </div>
                </div>
                <button onClick={() => handleOpenModal()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}>
                    <UserPlus size={18} /> <span className="hide-mobile">Nuevo Cliente</span><span className="show-mobile">Nuevo</span>
                </button>
            </div>

            <div className="glass-card" style={{ padding: '5px' }}>
                {/* Desktop View */}
                <div className="responsive-table hide-mobile">
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '850px' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)', textAlign: 'left', fontSize: '0.9rem' }}>
                                <th style={{ padding: '15px' }}>Nombre / Razón Social</th>
                                <th style={{ padding: '15px' }}>NIT / Cédula</th>
                                <th style={{ padding: '15px' }}>Contacto</th>
                                <th style={{ padding: '15px' }}>Ubicación</th>
                                <th style={{ padding: '15px', textAlign: 'center' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No se encontraron clientes registrados.
                                    </td>
                                </tr>
                            ) : (
                                filteredCustomers.map(c => (
                                    <tr key={c.id} className="table-row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '15px', fontWeight: 'bold' }}>{c.name}</td>
                                        <td style={{ padding: '15px' }}>{c.idNumber}</td>
                                        <td style={{ padding: '15px' }}>
                                            <div style={{ fontSize: '0.9rem' }}>{c.email || '-'}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.phone || '-'}</div>
                                        </td>
                                        <td style={{ padding: '15px' }}>
                                            <div style={{ fontSize: '0.9rem' }}>{c.city || '-'}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.address || '-'}</div>
                                        </td>
                                        <td style={{ padding: '15px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                <button onClick={() => handleOpenModal(c)} className="action-btn" style={{ background: 'rgba(0,108,224,0.1)', color: 'var(--primary)' }}>
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(c.id)} className="action-btn" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View */}
                <div className="show-mobile mobile-card-list" style={{ padding: '10px' }}>
                    {filteredCustomers.length === 0 ? (
                        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay clientes registrados o no coinciden con la búsqueda.</div>
                    ) : (
                        filteredCustomers.map(c => (
                            <div key={c.id} className="mobile-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{c.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>NIT: {c.idNumber}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={() => handleOpenModal(c)} className="action-btn" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}><Edit2 size={16} /></button>
                                        <button onClick={() => handleDelete(c.id)} className="action-btn" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}><Trash2 size={16} /></button>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div className="mobile-card-row" style={{ flexDirection: 'column', border: 'none', padding: 0 }}>
                                        <span className="mobile-card-label">Contacto</span>
                                        <span className="mobile-card-value" style={{ fontSize: '0.8rem' }}>{c.phone || 'N/A'}</span>
                                    </div>
                                    <div className="mobile-card-row" style={{ flexDirection: 'column', border: 'none', padding: 0, textAlign: 'right' }}>
                                        <span className="mobile-card-label">Email</span>
                                        <span className="mobile-card-value" style={{ fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.email || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div className="glass-card" style={{ width: '100%', maxWidth: '600px', padding: 'clamp(20px, 5vw, 30px)', position: 'relative', border: '1px solid var(--primary)' }}>
                        <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                            <X size={24} />
                        </button>

                        <h3 style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary)', fontSize: 'clamp(1.1rem, 3vw, 1.4rem)' }}>
                            <User size={24} /> {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
                        </h3>

                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                                <div className="input-group" style={{ gridColumn: 'span 2' }}>
                                    <label>Nombre / Razón Social *</label>
                                    <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: Elspec Andina S.A.S" />
                                </div>
                                <div className="input-group">
                                    <label>NIT / Cédula *</label>
                                    <input required type="text" value={formData.idNumber} onChange={e => setFormData({ ...formData, idNumber: e.target.value })} placeholder="900.xxx.xxx-x" />
                                </div>
                                <div className="input-group">
                                    <label>Teléfono</label>
                                    <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+57 ..." />
                                </div>
                                <div className="input-group">
                                    <label>Email</label>
                                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="cliente@correo.com" />
                                </div>
                                <div className="input-group">
                                    <label>Ciudad</label>
                                    <input type="text" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} placeholder="Ej: Bogotá" />
                                </div>
                                <div className="input-group" style={{ gridColumn: 'span 2' }}>
                                    <label>Dirección</label>
                                    <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Calle 123 # ..." />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '15px' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
                                    Cancelar
                                </button>
                                <button type="submit" disabled={loading} className="btn-primary" style={{ flex: 2, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '1.1rem' }}>
                                    {loading ? 'Procesando...' : <><Save size={18} /> {editingCustomer ? 'Actualizar' : 'Guardar Cliente'}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerManagement;
