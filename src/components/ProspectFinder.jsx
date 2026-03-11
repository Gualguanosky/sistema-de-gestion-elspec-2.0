import React, { useState } from 'react';
import { Search, Users, AlertCircle, Loader, CheckCircle, Database, ExternalLink, Mail, UserPlus, ShieldCheck, HelpCircle } from 'lucide-react';

const ProspectFinder = ({ onAddProspects }) => {
    const [companyName, setCompanyName] = useState('');
    const [roles, setRoles] = useState('Ventas, Gerencia, Compras');
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState([]);
    const [searchStats, setSearchStats] = useState(null);
    const [selectedProspects, setSelectedProspects] = useState(new Set());

    // URL del Microservicio Firebase Functions (Google CSE + Gemini + Hunter.io)
    const FIREBASE_FUNCTION_URL = import.meta.env.VITE_PROSPECTS_API_URL || 'http://127.0.0.1:5001/sistema-tickets-766f4/us-central1/searchProspects';

    const handleSearch = async (e) => {
        e.preventDefault();

        if (!companyName.trim()) {
            setStatus({ type: 'warning', message: 'Por favor, ingresa el nombre de la empresa.' });
            return;
        }

        setIsSearching(true);
        setStatus({ type: 'info', message: '🔍 Paso 1/3: Buscando en LinkedIn con Google CSE...' });
        setResults([]);
        setSearchStats(null);
        setSelectedProspects(new Set());

        try {

// LLAMADO AL MICROSERVICIO (N8N)
            setTimeout(() => setStatus({ type: 'info', message: '🤖 Paso 2/3: N8N analizando perfiles con IA y enriqueciendo emails corporativos...' }), 2000);

            const payload = {
                action: 'find_prospects',
                companyName: companyName.trim(),
                targetRoles: roles.trim()
            };

            const response = await fetch(import.meta.env.VITE_PROSPECTS_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Error del servidor N8N (${response.status})`);
            }

            const data = await response.json();

            // N8N devuelve { prospects: [...] }
            const prospectsData = data.prospects || [];
            const stats = { total: prospectsData.length, withEmail: prospectsData.filter(p => p.email).length, emailSources: { hunter_io: prospectsData.filter(p => p.emailSource === 'hunter_io').length } };
            
            if (prospectsData.length === 0) {
                setStatus({ type: 'warning', message: data.message || 'La búsqueda finalizó, pero no se encontraron prospectos con esos criterios. Intenta con otro nombre de empresa o cargo.' });
            } else {
                setResults(prospectsData);
                setSearchStats(stats);
                const allIds = new Set(prospectsData.map(r => r.id));
                setSelectedProspects(allIds);
                const emailCount = stats?.withEmail || prospectsData.filter(p => p.email).length;
                setStatus({ type: 'success', message: `✅ ${prospectsData.length} prospectos encontrados. ${emailCount} con email verificado por Hunter.io.` });
            }

        } catch (error) {
            console.error("Error searching prospects:", error);
            setStatus({ type: 'error', message: `Hubo un error al buscar prospectos: ${error.message}` });
        } finally {
            setIsSearching(false);
            // Hide non-error messages after a while
            setTimeout(() => {
                setStatus(prev => prev.type === 'error' ? prev : { type: '', message: '' });
            }, 8000);
        }
    };

    const toggleSelect = (id) => {
        const newSelected = new Set(selectedProspects);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedProspects(newSelected);
    };

    const handleAddSelectedToCampaign = () => {
        if (!onAddProspects) {
            alert("La función de agregar a campaña no está disponible en este momento.");
            return;
        }

        const selectedData = results.filter(r => selectedProspects.has(r.id)).map(p => ({
            email: p.email || '',
            industry: p.industry || companyName,
            name: p.name || ''
        })).filter(p => p.email); // Solo incluir los que tienen email

        if (selectedData.length === 0) {
            alert("Por favor selecciona al menos un prospecto que tenga correo electrónico válido.");
            return;
        }

        onAddProspects(selectedData);
        // Opcional: mostrar un mensajito temporal aquí o dejar que el componente padre lo haga
        setStatus({ type: 'success', message: `✅ ${selectedData.length} prospectos enviados al Banco de Correos de la Campaña.` });
        setTimeout(() => setStatus({ type: '', message: '' }), 4000);
    };


    return (
        <div className="animate-fade-in glass-card" style={{ padding: 'clamp(15px, 3vw, 30px)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '25px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Search color="var(--primary)" /> Buscador de Prospectos IA
                </h3>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                    Motor de 3 pasos: <strong>Google CSE</strong> busca perfiles en LinkedIn → <strong>Gemini</strong> extrae nombre y cargo → <strong>Hunter.io</strong> verifica emails corporativos.
                </p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>🔍 Google CSE · 100/día</span>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)' }}>🤖 Gemini · Gratis</span>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}>📧 Hunter.io · 25/mes</span>
                </div>
            </div>

            <form onSubmit={handleSearch} style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end', marginBottom: '30px' }}>
                <div className="input-group" style={{ flex: '1 1 300px', marginBottom: 0 }}>
                    <label>Nombre de la Empresa Objetivo *</label>
                    <input
                        type="text"
                        placeholder="Ej: Elspec Andina, Ecopetrol, Siemens..."
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required
                        disabled={isSearching}
                        style={{ padding: '12px', fontSize: '1.1rem' }}
                    />
                </div>
                <div className="input-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
                    <label>Cargos de Interés (Roles)</label>
                    <input
                        type="text"
                        placeholder="Ej: Gerente, Compras, Ingemiero..."
                        value={roles}
                        onChange={(e) => setRoles(e.target.value)}
                        disabled={isSearching}
                        style={{ padding: '12px' }}
                    />
                </div>
                <button
                    type="submit"
                    className="btn-primary"
                    disabled={isSearching || !companyName.trim()}
                    style={{
                        height: '46px',
                        padding: '0 30px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: isSearching ? 'var(--bg-card)' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                    }}
                >
                    {isSearching ? <Loader className="spin" size={20} /> : <Database size={20} />}
                    {isSearching ? 'Buscando...' : 'Encontrar Prospectos'}
                </button>
            </form>

            {status.message && (
                <div style={{
                    padding: '15px',
                    borderRadius: '10px',
                    marginBottom: '25px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: status.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : status.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : status.type === 'warning' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                    border: `1px solid ${status.type === 'error' ? 'var(--danger)' : status.type === 'success' ? 'var(--success)' : status.type === 'warning' ? 'var(--warning)' : 'var(--primary)'}`,
                    color: status.type === 'error' ? 'var(--danger)' : status.type === 'success' ? 'var(--success)' : status.type === 'warning' ? 'var(--warning)' : 'var(--primary)'
                }}>
                    {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <span style={{ flex: 1 }}>{status.message}</span>
                </div>
            )}

            {results.length > 0 && (
                <div className="animate-slide-up">
                    {searchStats && (
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '15px', flexWrap: 'wrap' }}>
                            <div style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.85rem' }}>
                                👤 <strong>{searchStats.total}</strong> prospectos
                            </div>
                            <div style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', fontSize: '0.85rem', color: '#34d399' }}>
                                📧 <strong>{searchStats.withEmail}</strong> con email verificado
                            </div>
                            {searchStats.emailSources?.hunter_io > 0 && (
                                <div style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', fontSize: '0.85rem', color: '#fbbf24' }}>
                                    🏹 <strong>{searchStats.emailSources.hunter_io}</strong> via Hunter.io
                                </div>
                            )}
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                        <h4 style={{ margin: 0, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Users size={18} /> Resultados de la Búsqueda ({results.length})
                        </h4>

                        <button
                            onClick={handleAddSelectedToCampaign}
                            className="btn-primary"
                            disabled={selectedProspects.size === 0}
                            style={{
                                padding: '8px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: selectedProspects.size === 0 ? 'var(--bg-card)' : 'var(--success)',
                                borderColor: selectedProspects.size === 0 ? 'var(--border-color)' : 'var(--success)'
                            }}
                        >
                            <UserPlus size={18} />
                            Agregar {selectedProspects.size} a la Campaña
                        </button>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                                    <th style={{ padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)', width: '50px', textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedProspects.size === results.length}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedProspects(new Set(results.map(r => r.id)));
                                                } else {
                                                    setSelectedProspects(new Set());
                                                }
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        />
                                    </th>
                                    <th style={{ padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Nombre</th>
                                    <th style={{ padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Cargo / Rol</th>
                                    <th style={{ padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Email</th>
                                    <th style={{ padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>LinkedIn</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((prospect) => (
                                    <tr
                                        key={prospect.id}
                                        style={{
                                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                                            background: selectedProspects.has(prospect.id) ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                                            transition: 'background 0.2s'
                                        }}
                                        onClick={() => toggleSelect(prospect.id)}
                                    >
                                        <td style={{ padding: '15px', textAlign: 'center', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedProspects.has(prospect.id)}
                                                onChange={() => { }} // Handled by tr onClick
                                                style={{ cursor: 'pointer' }}
                                            />
                                        </td>
                                        <td style={{ padding: '15px', fontWeight: 'bold' }}>{prospect.name}</td>
                                        <td style={{ padding: '15px', color: 'var(--primary)' }}>{prospect.role}</td>
                                        <td style={{ padding: '15px' }}>
                                            {prospect.email ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)' }}>
                                                        <Mail size={14} /> {prospect.email}
                                                    </div>
                                                    {prospect.emailSource === 'hunter_io' && (
                                                        <span style={{ fontSize: '0.7rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                            <ShieldCheck size={11} /> Hunter.io verificado
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <HelpCircle size={13} /> No encontrado
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '15px', textAlign: 'center' }}>
                                            {prospect.linkedin ? (
                                                <a
                                                    href={prospect.linkedin}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#0a66c2', background: 'rgba(10, 102, 194, 0.1)', padding: '5px 10px', borderRadius: '4px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 'bold' }}
                                                >
                                                    <ExternalLink size={14} /> Perfil
                                                </a>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {!isSearching && results.length === 0 && companyName && !status.message && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '10px' }}>
                    <Users size={40} opacity={0.3} style={{ marginBottom: '10px' }} />
                    <p style={{ margin: 0 }}>Haz clic en "Encontrar Prospectos" para iniciar la búsqueda.</p>
                </div>
            )}
        </div>
    );
};

export default ProspectFinder;
