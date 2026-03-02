import React, { useState, useEffect } from 'react';
import { Shield, Key, Eye, EyeOff, CheckCircle, AlertCircle, Database, Sparkles, DollarSign } from 'lucide-react';
import db from '../services/db';

const Settings = ({ user }) => {
    const [passwords, setPasswords] = useState({ new: '', confirm: '' });
    const [showPasswords, setShowPasswords] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [migrating, setMigrating] = useState(false);
    const [migrateMsg, setMigrateMsg] = useState('');

    // AI Config State
    const [geminiKey, setGeminiKey] = useState('');
    const [savingKey, setSavingKey] = useState(false);
    const [keyMsg, setKeyMsg] = useState('');

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });
        if (passwords.new !== passwords.confirm) { setMessage({ type: 'error', text: 'Las contraseñas no coinciden.' }); return; }
        if (passwords.new.length < 6) { setMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' }); return; }
        setLoading(true);
        try {
            await db.updateUserPassword(user.id, passwords.new);
            setMessage({ type: 'success', text: 'Contraseña actualizada con éxito.' });
            setPasswords({ new: '', confirm: '' });
        } catch (error) {
            console.error(error);
            if (error.code === 'auth/requires-recent-login') {
                setMessage({ type: 'error', text: 'Esta acción requiere un inicio de sesión reciente. Por favor, cierre sesión y vuelva a entrar.' });
            } else {
                setMessage({ type: 'error', text: 'Error al actualizar la contraseña. Reintente más tarde.' });
            }
        } finally { setLoading(false); }
    };

    const handleMigrateTypes = async () => {
        if (!window.confirm('¿Actualizar todos los tickets sin tipo a "Soporte Técnico"?')) return;
        setMigrating(true);
        setMigrateMsg('');
        try {
            const count = await db.migrateTicketsType();
            setMigrateMsg(`✅ ${count} ticket(s) actualizados a "Soporte Técnico".`);
        } catch (e) {
            console.error(e);
            setMigrateMsg('❌ Error durante la migración. Revise la consola.');
        } finally { setMigrating(false); }
    }; const isAdmin = user?.role === 'admin';

    useEffect(() => {
        if (isAdmin) {
            const loadConfig = async () => {
                const config = await db.getGlobalConfig();
                if (config) {
                    if (config.geminiApiKey) setGeminiKey(config.geminiApiKey);
                }
            };
            loadConfig();
        }
    }, [isAdmin]);

    const handleSaveAIKey = async (e) => {
        e.preventDefault();
        setSavingKey(true);
        setKeyMsg('');
        try {
            await db.updateGlobalConfig({ geminiApiKey: geminiKey });
            setKeyMsg('✅ Clave de Gemini guardada.');
            setTimeout(() => setKeyMsg(''), 3000);
        } catch (error) {
            console.error("Error saving API Key", error);
            setKeyMsg('❌ Error al guardar la clave.');
        } finally {
            setSavingKey(false);
        }
    };

    return (
        <div className="animate-slide-up" style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Password card */}
            <div className="glass-card" style={{ padding: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
                    <div style={{ background: 'rgba(0, 108, 224, 0.15)', padding: '12px', borderRadius: '12px' }}>
                        <Shield color="var(--primary)" size={32} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Seguridad del Perfil</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Administre su contraseña y seguridad.</p>
                    </div>
                </div>

                <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="input-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Key size={16} /> Nueva Contraseña
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPasswords ? "text" : "password"}
                                value={passwords.new}
                                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                placeholder="Mínimo 6 caracteres"
                                required
                                style={{ paddingRight: '45px' }}
                            />
                            <button type="button" onClick={() => setShowPasswords(!showPasswords)}
                                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', color: 'var(--text-muted)', padding: '5px' }}>
                                {showPasswords ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <div className="input-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Key size={16} /> Confirmar Contraseña
                        </label>
                        <input
                            type={showPasswords ? "text" : "password"}
                            value={passwords.confirm}
                            onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                            placeholder="Repita la nueva contraseña"
                            required
                        />
                    </div>

                    {message.text && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '10px', padding: '15px', borderRadius: '12px',
                            background: message.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                            border: `1px solid ${message.type === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                            color: message.type === 'error' ? 'var(--danger)' : 'var(--success)', fontSize: '0.9rem'
                        }}>
                            {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                            {message.text}
                        </div>
                    )}

                    <button type="submit" className="btn-primary" disabled={loading}
                        style={{ padding: '15px', marginTop: '10px', justifyContent: 'center' }}>
                        {loading ? 'Actualizando...' : 'Cambiar Contraseña'}
                    </button>
                </form>

                <div style={{ marginTop: '40px', paddingTop: '30px', borderTop: '1px solid var(--border-color)' }}>
                    <h4 style={{ fontSize: '1rem', marginBottom: '10px' }}>Información de la Cuenta</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Usuario:</span>
                            <span style={{ color: 'white' }}>{user?.username}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Correo:</span>
                            <span style={{ color: 'white' }}>{user?.email}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Rol:</span>
                            <span style={{ color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase' }}>{user?.role}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Admin tools card — only visible to admins */}
            {isAdmin && (
                <div className="glass-card" style={{ padding: '30px', borderLeft: '3px solid #f59e0b', display: 'flex', flexDirection: 'column', gap: '30px' }}>

                    {/* Header Admin Tools */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Database color="#f59e0b" size={24} />
                        <div>
                            <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Herramientas de Administración</h4>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Configuraciones avanzadas y mantenimiento.</p>
                        </div>
                    </div>
                    <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', padding: '16px' }}>
                        <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            Asigna el tipo <strong style={{ color: 'white' }}>"Soporte Técnico"</strong> a todos los tickets que no tienen tipo definido (tickets creados antes de la nueva interfaz).
                        </p>
                        <button
                            onClick={handleMigrateTypes}
                            disabled={migrating}
                            style={{
                                background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)',
                                color: '#f59e0b', borderRadius: '8px', padding: '8px 18px',
                                fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600
                            }}>
                            {migrating ? '⏳ Migrando...' : '⚡ Migrar Tipos de Tickets'}
                        </button>
                        {migrateMsg && (
                            <p style={{ margin: '12px 0 0 0', fontSize: '0.85rem', color: migrateMsg.startsWith('✅') ? '#10b981' : '#ef4444' }}>
                                {migrateMsg}
                            </p>
                        )}
                    </div>

                    {/* AI Configuration */}
                    <div style={{ background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '12px', padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <Sparkles size={18} color="#8b5cf6" />
                            <h5 style={{ margin: 0, fontSize: '0.95rem', color: '#8b5cf6' }}>Inteligencia Artificial (Gemini API)</h5>
                        </div>
                        <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Configura la clave de la API de Google Gemini para habilitar la extracción automática de catálogos y PDFs usando IA.
                        </p>
                        <form onSubmit={handleSaveAIKey} style={{ display: 'flex', gap: '10px' }}>
                            <input
                                type="password"
                                value={geminiKey}
                                onChange={(e) => setGeminiKey(e.target.value)}
                                placeholder="Pega tu API Key de Gemini aquí..."
                                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.3)', color: 'white' }}
                                required
                            />
                            <button type="submit" disabled={savingKey} style={{ background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', padding: '0 15px', fontWeight: 'bold', cursor: 'pointer' }}>
                                {savingKey ? '⏳' : 'Guardar'}
                            </button>
                        </form>
                        {keyMsg && <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: keyMsg.startsWith('✅') ? '#10b981' : '#ef4444' }}>{keyMsg}</p>}
                    </div>

                </div>
            )}
        </div>
    );
};

export default Settings;
