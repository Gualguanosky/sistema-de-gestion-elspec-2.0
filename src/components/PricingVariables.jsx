import React, { useState, useEffect } from 'react';
import { DollarSign } from 'lucide-react';
import db from '../services/db';
import useAuth from '../hooks/useAuth';

const PricingVariables = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const [pricingConfig, setPricingConfig] = useState({
        trm_actual: 4268.7,
        margen_sistema: 1.66,
        margen_instalacion: 1.15,
        margen_transporte: 1.35,
        factor_imprevistos: 0.04,
        factor_poliza: 0.008,
        factor_negociacion: 0.03
    });
    const [savingPricing, setSavingPricing] = useState(false);
    const [pricingMsg, setPricingMsg] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadConfig = async () => {
            const config = await db.getGlobalConfig();
            if (config) {
                setPricingConfig({
                    trm_actual: config.trm_actual || 4268.7,
                    margen_sistema: config.margen_sistema || 1.66,
                    margen_instalacion: config.margen_instalacion || 1.15,
                    margen_transporte: config.margen_transporte || 1.35,
                    factor_imprevistos: config.factor_imprevistos || 0.04,
                    factor_poliza: config.factor_poliza || 0.008,
                    factor_negociacion: config.factor_negociacion || 0.03
                });
            }
            setLoading(false);
        };
        loadConfig();
    }, []);

    const handleSavePricing = async (e) => {
        e.preventDefault();
        if (!isAdmin) {
            setPricingMsg('❌ Solo administradores pueden guardar.');
            return;
        }
        setSavingPricing(true);
        setPricingMsg('');
        try {
            await db.updateGlobalConfig({ ...pricingConfig });
            setPricingMsg('✅ Variables de cotización actualizadas.');
            setTimeout(() => setPricingMsg(''), 3000);
        } catch (error) {
            console.error("Error saving pricing config", error);
            setPricingMsg('❌ Error al guardar.');
        } finally {
            setSavingPricing(false);
        }
    };

    if (loading) return <div style={{ padding: '20px', color: 'white' }}>Cargando variables...</div>;

    return (
        <div className="glass-card animate-fade-in" style={{ padding: 'clamp(15px, 3vw, 30px)', maxWidth: '900px', margin: '0 auto', borderLeft: '3px solid #10b981' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '10px' }}>
                    <DollarSign size={24} color="#10b981" />
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#10b981' }}>Variables de Cotización (Motor en Cascada)</h3>
                    <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Modifica los márgenes, TRM y factores de riesgo aplicados en la plataforma para los precios Elspec.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSavePricing} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '25px' }}>
                
                <div className="input-group">
                    <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>TRM Actual</label>
                    <input type="number" step="0.01" value={pricingConfig.trm_actual} onChange={e => setPricingConfig({ ...pricingConfig, trm_actual: parseFloat(e.target.value) || 0 })} disabled={!isAdmin} style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: 'white' }} />
                </div>

                <div className="input-group">
                    <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>Margen Sistema (Ej: 1.66)</label>
                    <input type="number" step="0.001" value={pricingConfig.margen_sistema} onChange={e => setPricingConfig({ ...pricingConfig, margen_sistema: parseFloat(e.target.value) || 0 })} disabled={!isAdmin} style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: 'white' }} />
                </div>

                <div className="input-group">
                    <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>Margen Instalación</label>
                    <input type="number" step="0.001" value={pricingConfig.margen_instalacion} onChange={e => setPricingConfig({ ...pricingConfig, margen_instalacion: parseFloat(e.target.value) || 0 })} disabled={!isAdmin} style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: 'white' }} />
                </div>

                <div className="input-group">
                    <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>Margen Transporte</label>
                    <input type="number" step="0.001" value={pricingConfig.margen_transporte} onChange={e => setPricingConfig({ ...pricingConfig, margen_transporte: parseFloat(e.target.value) || 0 })} disabled={!isAdmin} style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: 'white' }} />
                </div>

                <div className="input-group">
                    <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>Factor Imprevistos (0.04 = 4%)</label>
                    <input type="number" step="0.001" value={pricingConfig.factor_imprevistos} onChange={e => setPricingConfig({ ...pricingConfig, factor_imprevistos: parseFloat(e.target.value) || 0 })} disabled={!isAdmin} style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: 'white' }} />
                </div>

                <div className="input-group">
                    <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>Factor Póliza</label>
                    <input type="number" step="0.001" value={pricingConfig.factor_poliza} onChange={e => setPricingConfig({ ...pricingConfig, factor_poliza: parseFloat(e.target.value) || 0 })} disabled={!isAdmin} style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: 'white' }} />
                </div>

                <div className="input-group">
                    <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>Factor Negociación</label>
                    <input type="number" step="0.001" value={pricingConfig.factor_negociacion} onChange={e => setPricingConfig({ ...pricingConfig, factor_negociacion: parseFloat(e.target.value) || 0 })} disabled={!isAdmin} style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: 'white' }} />
                </div>

                {isAdmin && (
                    <div style={{ gridColumn: '1 / -1', marginTop: '15px' }}>
                        <button type="submit" disabled={savingPricing} style={{ background: '#10b981', color: 'black', border: 'none', borderRadius: '8px', padding: '12px 20px', fontWeight: 'bold', cursor: 'pointer', width: '100%', fontSize: '1rem' }}>
                            {savingPricing ? '⏳ Guardando Variables...' : 'Guardar Variables de Cotización'}
                        </button>
                        {pricingMsg && <p style={{ margin: '10px 0 0 0', fontSize: '0.9rem', textAlign: 'center', color: pricingMsg.startsWith('✅') ? '#10b981' : '#ef4444' }}>{pricingMsg}</p>}
                    </div>
                )}
                {!isAdmin && (
                    <div style={{ gridColumn: '1 / -1', marginTop: '15px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Solo los administradores pueden modificar estas variables.
                    </div>
                )}
            </form>
        </div>
    );
};

export default PricingVariables;
