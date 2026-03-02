import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Calculator, Save, X, Info, Search } from 'lucide-react';
import { calculateSaleTotals } from '../utils/salesCalculations';
import { TIPOS_OFERTA } from '../utils/termsAndConditions';
import db from '../services/db';
import useAuth from '../hooks/useAuth';

const SaleForm = ({ sale, onSave, onCancel }) => {
    const { user } = useAuth();
    const isLogisticaOnly = user?.role === 'logistica';
    const [configGlobal, setConfigGlobal] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [catalog, setCatalog] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchModalActive, setSearchModalActive] = useState(null);
    const [modalSearchTerm, setModalSearchTerm] = useState('');

    const [form, setForm] = useState({
        cliente: {
            razon_social: '',
            nit: '',
            email: '',
            telefono: '',
            direccion: '',
            ciudad: ''
        },
        estado: 'BORRADOR',
        lineas: [
            { descripcion: '', cantidad: 1, precio_base: 0, descuento_pct: 0, comision_pct: 0, peso_transporte: 0, tarifaCosto1: 0 }
        ],
        configuracion: {
            aplicarIVA: true,
            tipoTransporte: 'NINGUNO',
            unidadTransporte: 'KG',
            tarifaCosto1: 0,
            tarifaCosto1: 0,
            aplicarSeguro: false,
            tasaSeguro: 0
        },
        totales: {}
    });

    useEffect(() => {
        let unsubscribeCustomers = () => { };
        let unsubscribeProducts = () => { };

        const fetchData = async () => {
            const config = await db.getGlobalConfig();
            setConfigGlobal(config);

            unsubscribeCustomers = db.subscribeCustomers((data) => {
                setCustomers(data);
            });

            unsubscribeProducts = db.subscribeProducts((data) => {
                setCatalog(data);
            });

            if (sale) {
                setForm(sale);
            }
        };
        fetchData();
        return () => {
            unsubscribeCustomers();
            unsubscribeProducts();
        };
    }, [sale]);

    // Memoized calculation results to avoid infinite loops
    const saleResults = useMemo(() => {
        if (!configGlobal) return { lineas: form.lineas, totales: {} };
        return calculateSaleTotals(form.lineas, form.configuracion, configGlobal);
    }, [form.lineas, form.configuracion, configGlobal]);

    const handleClientSelect = (customerId) => {
        if (!customerId) return;
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
            setForm(prev => ({
                ...prev,
                cliente: {
                    razon_social: customer.name || '',
                    nit: customer.idNumber || '',
                    email: customer.email || '',
                    telefono: customer.phone || '',
                    direccion: customer.address || '',
                    ciudad: customer.city || ''
                }
            }));
        }
    };

    const addLine = () => {
        setForm(prev => ({
            ...prev,
            lineas: [...prev.lineas, { descripcion: '', cantidad: 1, precio_base: 0, descuento_pct: 0, comision_pct: 0, peso_transporte: 0, tarifaCosto1: 0 }]
        }));
    };

    const removeLine = (index) => {
        if (form.lineas.length > 1) {
            const newLineas = [...form.lineas];
            newLineas.splice(index, 1);
            setForm(prev => ({ ...prev, lineas: newLineas }));
        }
    };

    const updateLine = (index, field, value) => {
        const newLineas = [...form.lineas];
        newLineas[index] = { ...newLineas[index], [field]: value };
        setForm(prev => ({ ...prev, lineas: newLineas }));
    };

    const updateConfig = (field, value) => {
        setForm(prev => ({
            ...prev,
            configuracion: { ...prev.configuracion, [field]: value }
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Combine input data with latest calculated results
            const finalSaleData = {
                ...form,
                lineas: saleResults.lineas,
                totales: saleResults.totales
            };
            await onSave(finalSaleData);
        } catch (error) {
            console.error(error);
            alert('Error al guardar la venta');
        } finally {
            setLoading(false);
        }
    };

    if (!configGlobal) return <div className="animate-pulse p-10 text-center">Cargando configuración...</div>;

    const formatCurrency = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val || 0);

    return (
        <form onSubmit={handleSave} className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 3vw, 20px)' }}>
            <div className="glass-card" style={{ padding: 'clamp(15px, 4vw, 25px)' }}>
                <h3 style={{ color: 'var(--primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)' }}>
                    <Info size={20} /> Información del Cliente
                </h3>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cargar de Clientes</label>
                    <select
                        onChange={(e) => handleClientSelect(e.target.value)}
                        disabled={isLogisticaOnly}
                        style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', opacity: isLogisticaOnly ? 0.5 : 1 }}
                    >
                        <option value="">-- Seleccionar cliente existente --</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.idNumber})</option>)}
                    </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                    <div className="input-group">
                        <label>Razón Social</label>
                        <input
                            list="clients-list"
                            type="text"
                            required
                            disabled={isLogisticaOnly}
                            value={form.cliente.razon_social}
                            onChange={e => {
                                const val = e.target.value;
                                const matched = customers.find(c => c.name === val);
                                if (matched) {
                                    setForm(prev => ({
                                        ...prev,
                                        cliente: {
                                            razon_social: matched.name,
                                            nit: matched.idNumber || '',
                                            email: matched.email || '',
                                            telefono: matched.phone || '',
                                            direccion: matched.address || '',
                                            ciudad: matched.city || ''
                                        }
                                    }));
                                } else {
                                    setForm(prev => ({ ...prev, cliente: { ...prev.cliente, razon_social: val } }));
                                }
                            }}
                        />
                        <datalist id="clients-list">
                            {customers.map(c => <option key={c.id} value={c.name}>{c.idNumber}</option>)}
                        </datalist>
                    </div>
                    <div className="input-group">
                        <label>NIT</label>
                        <input type="text" required disabled={isLogisticaOnly} value={form.cliente.nit} onChange={e => setForm({ ...form, cliente: { ...form.cliente, nit: e.target.value } })} />
                    </div>
                </div>
            </div>

            <div className="glass-card" style={{ padding: 'clamp(15px, 4vw, 25px)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <h3 style={{ color: 'var(--primary)', margin: 0, fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)' }}>Líneas de Venta</h3>
                    {!isLogisticaOnly && (
                        <button type="button" onClick={addLine} className="btn-primary" style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem' }}>
                            <Plus size={16} /> Agregar ítem
                        </button>
                    )}
                </div>

                <div className="responsive-table">
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                <th style={{ padding: '10px' }}>Descripción</th>
                                <th style={{ padding: '10px', width: '80px' }}>Cant.</th>
                                <th style={{ padding: '10px', width: '150px' }}>Precio FOB</th>
                                <th style={{ padding: '10px', width: '90px', textAlign: 'center' }}>Margen</th>
                                <th style={{ padding: '10px', width: '150px' }}>Precio Venta (Unidad)</th>
                                <th style={{ padding: '10px', width: '90px' }}>Desc %</th>
                                <th style={{ padding: '10px', width: '90px' }}>Comisión %</th>
                                {form.configuracion.tipoTransporte !== 'NINGUNO' && form.configuracion.unidadTransporte !== 'USD' && (
                                    <>
                                        <th style={{ padding: '10px', width: '90px' }}>
                                            {form.configuracion.unidadTransporte === 'KG' ? 'Kg' : 'Unid.'} ✈
                                        </th>
                                        <th style={{ padding: '10px', width: '100px' }}>
                                            Tarifa
                                        </th>
                                        <th style={{ padding: '10px', width: '100px', textAlign: 'right' }}>
                                            USD ✈
                                        </th>
                                    </>
                                )}
                                <th style={{ padding: '10px', width: '160px', textAlign: 'right' }}>Subtotal</th>
                                <th style={{ padding: '10px', width: '50px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {saleResults.lineas.map((linea, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '5px' }}>
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            <input
                                                type="text"
                                                required
                                                disabled={isLogisticaOnly}
                                                value={linea.descripcion}
                                                onChange={e => updateLine(idx, 'descripcion', e.target.value)}
                                                style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '6px', padding: '8px 12px' }}
                                                placeholder="Escriba desc. o busque 👉"
                                            />
                                            {!isLogisticaOnly && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSearchModalActive(idx);
                                                        setModalSearchTerm(linea.descripcion || '');
                                                    }}
                                                    title="Buscar en Catálogo"
                                                    style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'background 0.2s' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.8)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'var(--primary)'}
                                                >
                                                    <Search size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '5px' }}>
                                        <input type="number" step="1" min="1" disabled={isLogisticaOnly} value={linea.cantidad} onChange={e => updateLine(idx, 'cantidad', e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', borderRadius: '4px', textAlign: 'center' }} />
                                    </td>
                                    <td style={{ padding: '5px' }}>
                                        <input
                                            type="number"
                                            step="0.01"
                                            disabled={isLogisticaOnly}
                                            value={linea.precio_base}
                                            onChange={e => updateLine(idx, 'precio_base', e.target.value)}
                                            style={{
                                                width: '100%',
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                color: 'var(--text-muted)',
                                                borderRadius: '6px',
                                                padding: '8px',
                                                textAlign: 'right',
                                                fontSize: '1rem'
                                            }}
                                        />
                                    </td>
                                    <td style={{ padding: '5px' }}>
                                        <input
                                            type="number"
                                            step="0.01"
                                            disabled={isLogisticaOnly}
                                            value={linea.margen_especifico || configGlobal?.margen_sistema || 1.66}
                                            onChange={e => updateLine(idx, 'margen_especifico', parseFloat(e.target.value))}
                                            style={{
                                                width: '100%',
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                color: 'var(--text-muted)',
                                                borderRadius: '6px',
                                                padding: '8px',
                                                textAlign: 'center',
                                                fontSize: '0.9rem'
                                            }}
                                            title="Margen de Contribución del Equipo"
                                        />
                                    </td>
                                    <td style={{ padding: '5px' }}>
                                        <div style={{
                                            width: '100%',
                                            background: 'rgba(16,185,129,0.1)',
                                            border: '1px solid rgba(16,185,129,0.3)',
                                            color: '#10b981',
                                            borderRadius: '6px',
                                            padding: '8px',
                                            textAlign: 'right',
                                            fontWeight: 'bold',
                                            fontSize: '1rem'
                                        }}>
                                            {formatCurrency(linea.precio_distribuido || 0)}
                                        </div>
                                    </td>
                                    <td style={{ padding: '5px' }}>
                                        <input type="number" step="0.1" disabled={isLogisticaOnly} value={linea.descuento_pct} onChange={e => updateLine(idx, 'descuento_pct', e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', borderRadius: '4px', textAlign: 'center' }} />
                                    </td>
                                    <td style={{ padding: '5px' }}>
                                        <input type="number" step="0.1" disabled={isLogisticaOnly} value={linea.comision_pct} onChange={e => updateLine(idx, 'comision_pct', e.target.value)} style={{ width: '100%', background: 'rgba(255,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', color: 'white', borderRadius: '4px', textAlign: 'center' }} />
                                    </td>
                                    {form.configuracion.tipoTransporte !== 'NINGUNO' && form.configuracion.unidadTransporte !== 'USD' && (
                                        <>
                                            <td style={{ padding: '5px' }}>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    min="0"
                                                    value={linea.peso_transporte || ''}
                                                    onChange={e => updateLine(idx, 'peso_transporte', e.target.value)}
                                                    placeholder="0"
                                                    style={{ width: '100%', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: 'white', borderRadius: '4px', textAlign: 'center', padding: '4px' }}
                                                    title={linea.pesoVolumetrico ? `Volumétrico: ${linea.pesoVolumetrico.toFixed(1)}kg` : ''}
                                                />
                                                {linea.transporteSugerido && (
                                                    <div style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '4px',
                                                        fontSize: '0.65rem',
                                                        color: linea.transporteSugerido === 'MARITIMO' ? '#0ea5e9' : '#a855f7',
                                                        background: linea.transporteSugerido === 'MARITIMO' ? 'rgba(14, 165, 233, 0.1)' : 'rgba(168, 85, 247, 0.1)',
                                                        border: `1px solid ${linea.transporteSugerido === 'MARITIMO' ? 'rgba(14, 165, 233, 0.3)' : 'rgba(168, 85, 247, 0.3)'}`,
                                                        borderRadius: '10px',
                                                        padding: '2px 6px',
                                                        marginTop: '6px',
                                                        fontWeight: 'bold',
                                                        width: '100%',
                                                        boxSizing: 'border-box',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {linea.transporteSugerido === 'MARITIMO' ? '🚢' : '✈️'} P.Cob: {linea.pesoCobrable?.toFixed(1)}kg
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '5px' }}>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={linea.tarifaCosto1 || ''}
                                                    onChange={e => updateLine(idx, 'tarifaCosto1', e.target.value)}
                                                    placeholder="0.00"
                                                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', borderRadius: '4px', textAlign: 'right', padding: '4px' }}
                                                />
                                            </td>
                                            <td style={{ padding: '10px', fontSize: '0.85rem', textAlign: 'right', color: 'rgba(var(--primary-rgb), 0.8)' }}>
                                                {formatCurrency(linea.transporteCostoTotal)}
                                            </td>
                                        </>
                                    )}
                                    <td style={{ padding: '10px', fontWeight: 'bold', textAlign: 'right', color: 'var(--success)' }}>
                                        {formatCurrency(linea.subtotal_calculado)}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        {!isLogisticaOnly && (
                                            <button type="button" onClick={() => removeLine(idx)} style={{ color: 'var(--danger)', background: 'transparent' }}><Trash2 size={16} /></button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                <div className="glass-card" style={{ padding: '25px' }}>
                    <h3 style={{ color: 'var(--primary)', marginBottom: '20px' }}>Configuración</h3>

                    <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <input type="checkbox" disabled={isLogisticaOnly} checked={form.configuracion.aplicarIVA} onChange={e => updateConfig('aplicarIVA', e.target.checked)} id="iva" />
                        <label htmlFor="iva" style={{ margin: 0, opacity: isLogisticaOnly ? 0.5 : 1 }}>Aplicar Impuestos (IVA {configGlobal.IVA * 100}%)</label>
                    </div>

                    <div className="input-group">
                        <label>Tipo de Transporte</label>
                        <select value={form.configuracion.tipoTransporte} onChange={e => updateConfig('tipoTransporte', e.target.value)}>
                            <option value="NINGUNO">Ninguno</option>
                            <option value="MARITIMO">Marítimo</option>
                            <option value="AEREO">Aéreo</option>
                        </select>
                    </div>

                    <div className="input-group">
                        <label>Tipo de Oferta / Términos</label>
                        <select value={form.configuracion.tipoOferta || TIPOS_OFERTA.ESTANDAR} onChange={e => updateConfig('tipoOferta', e.target.value)}>
                            {Object.values(TIPOS_OFERTA).map(tipo => (
                                <option key={tipo} value={tipo}>{tipo}</option>
                            ))}
                        </select>
                    </div>

                    {form.configuracion.tipoTransporte !== 'NINGUNO' && (() => {
                        const c1 = parseFloat(form.configuracion.tarifaCosto1) || 0;
                        const c2 = parseFloat(form.configuracion.tarifaCosto2) || 0;
                        const unidad = form.configuracion.unidadTransporte || 'KG';
                        const weightSum = form.lineas.reduce((acc, l) => acc + (parseFloat(l.peso_transporte) || 0), 0);
                        const itemCount = form.lineas.length || 1;
                        // If no weight is entered in any line but it's Kg/Unit mode, we assume 1 per line = itemCount
                        const totalKg = unidad !== 'USD'
                            ? (weightSum > 0 ? weightSum : itemCount)
                            : 1;
                        const tarifaTotal = c1 + c2;
                        const baseEfectiva = unidad === 'USD' ? tarifaTotal : tarifaTotal * totalKg;
                        const unitLabel = unidad === 'KG' ? 'kg' : 'unid.';
                        return (
                            <div className="animate-slide-up" style={{ marginTop: '10px', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tarifas de Transporte</label>
                                    {/* Unit type */}
                                    <select
                                        value={unidad}
                                        onChange={e => updateConfig('unidadTransporte', e.target.value)}
                                        style={{ padding: '5px 8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.8rem' }}
                                    >
                                        <option value="KG">USD / Kg</option>
                                        <option value="UNIDAD">USD / Unidad</option>
                                        <option value="USD">USD fijo total</option>
                                    </select>
                                </div>

                                <div style={{ marginTop: '10px', padding: '12px', background: 'rgba(99,102,241,0.08)', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.2)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: 'white' }}>
                                        <span>Total Transporte {form.configuracion.tipoTransporte}</span>
                                        <strong style={{ color: 'var(--primary)' }}>${(saleResults.totales.transporteOculto || 0).toFixed(2)} USD</strong>
                                    </div>

                                    {/* Breakdown of items */}
                                    {saleResults.lineas.filter(l => l.transporte_calculado > 0).length > 0 && (
                                        <div style={{ marginTop: '8px', marginBottom: '8px', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                                            <div style={{ fontSize: '0.75rem', marginBottom: '6px', opacity: 0.8 }}>Desglose por ítem:</div>
                                            {saleResults.lineas.map((linea, idx) => {
                                                if (!linea.transporte_calculado) return null;
                                                return (
                                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginBottom: '3px' }}>
                                                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60%' }}>
                                                            {idx + 1}. {linea.descripcion || 'Sin descripción'}
                                                        </span>
                                                        <span>${linea.transporte_calculado.toFixed(2)} USD</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {form.configuracion.aplicarSeguro && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                                            <span>Seguro Total ({form.configuracion.tasaSeguro}%):</span>
                                            <strong style={{ color: 'var(--primary)' }}>${(saleResults.totales.seguro || 0).toFixed(2)} USD</strong>
                                        </div>
                                    )}
                                </div>
                                {unidad !== 'USD' && totalKg === 0 && (
                                    <div style={{ fontSize: '0.78rem', color: 'var(--warning)', marginTop: '6px', fontWeight: 'bold' }}>
                                        ⚠ Ingresá los kg/unidades de cada ítem en la columna ✈ de la tabla
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* Configuraciones Globales Elspec (Cotizador Avanzado) */}
                    <div className="animate-slide-up" style={{ marginTop: '20px', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                        <h4 style={{ color: 'var(--primary)', marginBottom: '15px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Mecanismo de Cotización (Bases)
                        </h4>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.75rem' }}>TRM de Venta</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    disabled={isLogisticaOnly}
                                    value={form.configuracion.trm_actual !== undefined ? form.configuracion.trm_actual : (configGlobal.trm_actual || '')}
                                    onChange={e => updateConfig('trm_actual', e.target.value)}
                                />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.75rem' }}>Margen (Default)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    disabled={isLogisticaOnly}
                                    value={form.configuracion.margen_sistema !== undefined ? form.configuracion.margen_sistema : (configGlobal.margen_sistema || '')}
                                    onChange={e => updateConfig('margen_sistema', e.target.value)}
                                />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.75rem' }}>Margen Vta. Flete</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    disabled={isLogisticaOnly}
                                    value={form.configuracion.margen_transporte !== undefined ? form.configuracion.margen_transporte : (configGlobal.margen_transporte || '')}
                                    onChange={e => updateConfig('margen_transporte', e.target.value)}
                                />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.75rem' }}>F. Imprevistos (%)</label>
                                <input
                                    type="number"
                                    step="0.001"
                                    disabled={isLogisticaOnly}
                                    value={form.configuracion.factor_imprevistos !== undefined ? form.configuracion.factor_imprevistos : (configGlobal.factor_imprevistos || '')}
                                    onChange={e => updateConfig('factor_imprevistos', e.target.value)}
                                />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.75rem' }}>F. Póliza (%)</label>
                                <input
                                    type="number"
                                    step="0.001"
                                    disabled={isLogisticaOnly}
                                    value={form.configuracion.factor_poliza !== undefined ? form.configuracion.factor_poliza : (configGlobal.factor_poliza || '')}
                                    onChange={e => updateConfig('factor_poliza', e.target.value)}
                                />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.75rem' }}>F. C.C / Negociación (%)</label>
                                <input
                                    type="number"
                                    step="0.001"
                                    disabled={isLogisticaOnly}
                                    value={form.configuracion.factor_negociacion !== undefined ? form.configuracion.factor_negociacion : (configGlobal.factor_negociacion || '')}
                                    onChange={e => updateConfig('factor_negociacion', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                </div>

                <div className="glass-card" style={{ padding: '25px', background: 'rgba(var(--primary-rgb), 0.05)', border: '1px solid var(--primary)' }}>
                    <h3 style={{ color: 'var(--primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Calculator size={20} /> Resumen de Totales
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                            <span>Subtotal Bruto:</span>
                            <span>{formatCurrency(saleResults.totales.subtotalBruto)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)' }}>
                            <span>Descuentos Línea:</span>
                            <span>- {formatCurrency(saleResults.totales.descuentos)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)', fontWeight: 'bold' }}>
                            <span>Subtotal Neto:</span>
                            <span>{formatCurrency(saleResults.totales.subtotalNeto)}</span>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '5px', paddingTop: '5px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>
                                <span>(+) Transporte Total:</span>
                                <span>{formatCurrency(saleResults.totales.transporteOculto)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>
                                <span>(+) Imprevistos (4%):</span>
                                <span>{formatCurrency(saleResults.totales.imprevistosOcultos)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>
                                <span>(+) Gtos. Seguridad (Póliza/CC):</span>
                                <span>{formatCurrency(saleResults.totales.seguridadOculta)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#00d2ff', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '5px' }}>
                                <span>Total Técnico:</span>
                                <span>{formatCurrency(saleResults.totales.totalTecnico)}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b', fontWeight: 'bold', marginTop: '5px' }}>
                            <span>Total Comisión:</span>
                            <span>{formatCurrency(saleResults.totales.comisionesTotal)}</span>
                        </div>
                        {saleResults.totales.seguro > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)' }}>
                                <span>Seguro de Transporte:</span>
                                <span>{formatCurrency(saleResults.totales.seguro)}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)' }}>
                            <span>IVA Estimado:</span>
                            <span>{formatCurrency(saleResults.totales.impuestos)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', paddingTop: '15px', borderTop: '2px solid var(--border-color)', fontSize: '1.4rem', fontWeight: 900 }}>
                            <span>TOTAL:</span>
                            <span style={{ color: 'var(--success)' }}>{formatCurrency(saleResults.totales.total)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={onCancel} style={{ padding: '12px 25px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <X size={18} /> Cancelar
                </button>
                <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '12px 40px', fontSize: '1.1rem', fontWeight: 'bold' }}>
                    {loading ? 'Guardando...' : (sale ? 'Actualizar Venta ERP' : 'Crear Venta ERP')}
                </button>
            </div>

            {/* Modal Búsqueda Catálogo */}
            {searchModalActive !== null && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
                    <div className="glass-card animate-slide-up" style={{ width: '90%', maxWidth: '850px', height: '85vh', maxHeight: '800px', display: 'flex', flexDirection: 'column', padding: '25px', boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }}>

                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '15px' }}>
                            <h3 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.4rem' }}>
                                <div style={{ background: 'var(--primary)', padding: '8px', borderRadius: '8px', display: 'flex' }}><Search size={22} color="white" /></div>
                                Catálogo de Productos
                            </h3>
                            <button type="button" onClick={() => setSearchModalActive(null)} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '50%', padding: '8px', display: 'flex', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--danger)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                                <X size={24} />
                            </button>
                        </div>

                        {/* Search Input */}
                        <div style={{ marginBottom: '20px', position: 'relative' }}>
                            <Search size={22} style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', pointerEvents: 'none' }} />
                            <input
                                type="text"
                                autoFocus
                                className="search-input-modal"
                                placeholder="Buscar por nombre, referencia clave, familia..."
                                value={modalSearchTerm}
                                onChange={e => setModalSearchTerm(e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box', fontSize: '1.1rem', padding: '16px 20px 16px 70px', borderRadius: '12px', background: 'rgba(0,0,0,0.4)', border: '2px solid rgba(99,102,241,0.3)', color: 'white', outline: 'none' }}
                                onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                onBlur={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'}
                            />
                        </div>

                        {/* Results Table */}
                        <div style={{ overflowY: 'auto', flex: 1, borderRadius: '10px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)' }}>
                            {(() => {
                                const q = modalSearchTerm.trim().toLowerCase();
                                const resc = q ? catalog.filter(p => p.name.toLowerCase().includes(q) || (p.extraInfo && p.extraInfo.toLowerCase().includes(q)) || (p.category && p.category.toLowerCase().includes(q))).slice(0, 100) : catalog.slice(0, 100);

                                if (resc.length === 0) return (
                                    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <div style={{ fontSize: '3rem', marginBottom: '15px', opacity: 0.5 }}>📦</div>
                                        <div style={{ fontSize: '1.2rem', color: 'white', marginBottom: '5px' }}>No hay resultados</div>
                                        <div>No se encontraron productos coincidentes con "{modalSearchTerm}".</div>
                                    </div>
                                );

                                return (
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead style={{ position: 'sticky', top: 0, background: 'rgba(26,32,53,0.95)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
                                            <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)' }}>Producto / Familia</th>
                                                <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)' }}>Referencia APERTURA</th>
                                                <th style={{ padding: '15px 20px', textAlign: 'right', borderBottom: '1px solid var(--border-color)' }}>Precio Unit. (USD)</th>
                                                <th style={{ padding: '15px 20px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {resc.map(p => {
                                                const handleSelectProduct = () => {
                                                    const newLineas = [...form.lineas];

                                                    // Determinar el margen aplicable según la inteligencia comercial de Elspec
                                                    const determinarMargen = (producto) => {
                                                        const txt = `${producto.name} ${producto.category || ''} ${producto.extraInfo || ''}`.toLowerCase();
                                                        if (txt.includes('activo') || txt.includes('active') || txt.includes('filtro')) return 1.45;
                                                        if (txt.includes('g44') || txt.includes('4420') || txt.includes('analizador') || txt.includes('analyzer')) return 1.73;
                                                        if (txt.includes('servicio') || txt.includes('instalacion') || txt.includes('obra') || txt.includes('viaticos')) return 1.15;
                                                        return form.configuracion?.margen_sistema || 1.66; // Por defecto: EQ/AP/AC
                                                    };

                                                    newLineas[searchModalActive] = {
                                                        ...newLineas[searchModalActive],
                                                        descripcion: p.extraInfo || p.name,
                                                        precio_base: p.price || 0,
                                                        margen_especifico: determinarMargen(p),

                                                        descuento_pct: p.discount || 0,
                                                        peso_transporte: parseFloat(p.weightApprox) || 0,
                                                        dimensiones: p.packageDimensions || ''
                                                    };
                                                    setForm(prev => ({ ...prev, lineas: newLineas }));
                                                    setSearchModalActive(null);
                                                };

                                                return (
                                                    <tr
                                                        key={p.id}
                                                        onDoubleClick={handleSelectProduct}
                                                        title="Doble clic para seleccionar"
                                                        style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s', cursor: 'pointer' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                    >
                                                        <td style={{ padding: '12px 20px' }}>
                                                            <div style={{ color: 'white', fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '2px' }}>{p.name}</div>
                                                            <div style={{ fontSize: '0.75rem', display: 'inline-block', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '10px', color: 'var(--text-muted)' }}>{p.category || 'General'}</div>
                                                        </td>
                                                        <td style={{ padding: '12px 20px', fontSize: '0.9rem' }}>
                                                            {p.extraInfo ? <span style={{ color: 'var(--primary)', letterSpacing: '0.05em', fontWeight: '500' }}>🔑 {p.extraInfo}</span> : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                                                        </td>
                                                        <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 'bold', color: 'var(--success)', fontSize: '1rem' }}>
                                                            {formatCurrency(p.price)}
                                                        </td>
                                                        <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                                                            <button
                                                                type="button"
                                                                className="btn-primary"
                                                                style={{ padding: '8px 16px', fontSize: '0.9rem', borderRadius: '8px', fontWeight: 'bold' }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleSelectProduct();
                                                                }}
                                                            >
                                                                Elegir
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                );
                            })()}
                        </div>
                        <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mostrando hasta 100 resultados para mantener rendimiento veloz.</div>
                    </div>
                </div>
            )}
        </form>
    );
};

export default SaleForm;
