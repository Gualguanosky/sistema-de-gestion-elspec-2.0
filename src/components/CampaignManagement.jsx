import React, { useState, useEffect } from 'react';
import { Send, Users, Plus, Trash2, Mail, Briefcase, FileSpreadsheet, AlertCircle, RefreshCw, BarChart2 } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import db from '../services/db';
import { ROLES } from '../config/roles';
import CampaignAnalytics from './CampaignAnalytics';

const CampaignManagement = () => {
    const { user } = useAuth();
    const [mainTab, setMainTab] = useState('campaign'); // 'campaign' or 'salespeople'

    // Campaign State
    const [campaignName, setCampaignName] = useState('');
    const [emails, setEmails] = useState([]);
    const [newEmail, setNewEmail] = useState('');
    const [newIndustry, setNewIndustry] = useState('');
    const [newName, setNewName] = useState('');
    const [bulkEmails, setBulkEmails] = useState('');
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isSending, setIsSending] = useState(false);
    const [activeTab, setActiveTab] = useState('manual'); // 'manual' or 'bulk'
    const [aiEngine, setAiEngine] = useState('gemini'); // Default to gemini now
    const [delayAmount, setDelayAmount] = useState(10);
    const [delayUnit, setDelayUnit] = useState('hours'); // 'seconds', 'minutes', 'hours'

    // Salespeople State
    const [salespeople, setSalespeople] = useState([]);
    const [isLoadingSalespeople, setIsLoadingSalespeople] = useState(false);
    const [selectedSalesperson, setSelectedSalesperson] = useState('');

    // URL de producción de N8N Cloud (funciona siempre)
    const N8N_WEBHOOK_URL = 'https://gualguanosky.app.n8n.cloud/webhook/elspec-pro-agent-v2';

    // Fetch salespeople immediately so they are available for the dropdown
    useEffect(() => {
        loadSalespeople();
    }, []);

    const loadSalespeople = async () => {
        setIsLoadingSalespeople(true);
        try {
            const allUsers = await db.getUsers();
            // Filter users who have a role related to sales or admin
            const salesRoles = [ROLES.VENTAS, ROLES.LIDER_VENTAS, ROLES.ADMIN];
            const filteredUsers = allUsers.filter(u => salesRoles.includes(u.role));
            setSalespeople(filteredUsers);
            if (filteredUsers.length > 0 && !selectedSalesperson) {
                // Auto-select the first one by default if none is selected
                setSelectedSalesperson(filteredUsers[0].email);
            }
        } catch (error) {
            console.error("Error loading salespeople:", error);
            setStatus({ type: 'error', message: 'Error cargando la lista de vendedores.' });
        } finally {
            setIsLoadingSalespeople(false);
        }
    };

    const handleAddEmail = (e) => {
        e.preventDefault();
        if (!newEmail.trim() || !newIndustry.trim()) return;

        setEmails([...emails, {
            email: newEmail.trim(),
            industry: newIndustry.trim(),
            name: newName.trim() || ''
        }]);
        setNewEmail('');
        setNewIndustry('');
        setNewName('');
    };

    const handleRemoveEmail = (indexToRemove) => {
        setEmails(emails.filter((_, index) => index !== indexToRemove));
    };

    const handleBulkAdd = () => {
        // Expected format: email@example.com, Industry Name, Contact Name (Optional)
        const lines = bulkEmails.split('\n');
        const added = [];
        let errors = 0;

        lines.forEach(line => {
            const parts = line.split(',');
            if (parts.length >= 2) {
                const email = parts[0].trim();
                const industry = parts[1].trim();
                const name = parts.length >= 3 ? parts.slice(2).join(',').trim() : '';

                if (email && industry) {
                    added.push({ email, industry, name });
                } else {
                    errors++;
                }
            } else if (line.trim()) {
                errors++;
            }
        });

        if (added.length > 0) {
            setEmails([...emails, ...added]);
            setBulkEmails('');
            setStatus({ type: 'success', message: `${added.length} correos agregados correctamente.` });
        } else {
            setStatus({ type: 'error', message: 'No se encontraron correos válidos en el formato correcto.' });
        }

        if (errors > 0) {
            setStatus({ type: 'warning', message: `Se agregaron ${added.length} correos, pero hubo ${errors} errores de formato (Líneas omitidas).` });
        }

        setTimeout(() => setStatus({ type: '', message: '' }), 4000);
    };

    const handleStartCampaign = async () => {
        if (!campaignName.trim()) {
            setStatus({ type: 'error', message: 'Debe ingresar un nombre para la campaña.' });
            return;
        }
        if (emails.length === 0) {
            setStatus({ type: 'error', message: 'Debe agregar al menos un correo al banco de envíos.' });
            return;
        }
        if (!selectedSalesperson) {
            setStatus({ type: 'error', message: 'Debe seleccionar un Vendedor Responsable.' });
            return;
        }

        setIsSending(true);
        setStatus({ type: 'info', message: 'Iniciando campaña... Conectando con N8N.' });

        // Validación de seguridad para el delay
        let finalDelay = parseInt(delayAmount);
        if (delayUnit === 'hours' && finalDelay > 24) {
            finalDelay = 24;
            setDelayAmount(24);
        }

        // Find the selected salesperson full object
        const sellerObj = salespeople.find(s => s.email === selectedSalesperson) || { name: 'Vendedor', email: 'campanas@elspecandina.com' };

        try {
            const payload = {
                campaignName: campaignName,
                user: user.name || user.username,
                timestamp: new Date().toISOString(),
                aiEngine: aiEngine,
                delayAmount: finalDelay,
                delayUnit: delayUnit,
                senderName: sellerObj.name || sellerObj.username,
                senderEmail: sellerObj.email,
                contacts: emails
            };

            // 1. Guardar Historial en Firebase Local
            await db.saveCampaign({
                ...payload,
                status: 'started',
                contactsCount: emails.length
            });

            console.log("Enviando Webhook a N8N con payload:", payload);

            const response = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error de N8N (${response.status}): ${errorText}`);
            }

            setStatus({ type: 'success', message: `¡Campaña "${campaignName}" iniciada! Revisa tu n8n para ver el progreso.` });

            // Limpiar datos sensibles tras éxito
            setEmails([]);
            setCampaignName('');
            setBulkEmails('');
        } catch (error) {
            console.error("Error sending campaign:", error);
            setStatus({ type: 'error', message: `Error al conectar con N8N: ${error.message}` });
        } finally {
            setIsSending(false);
            setTimeout(() => setStatus({ type: '', message: '' }), 8000);
        }
    };

    return (
        <div className="animate-fade-in" style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', padding: '15px', borderRadius: '15px', color: 'white', boxShadow: '0 10px 20px rgba(16, 185, 129, 0.2)' }}>
                    <Send size={28} />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 800 }}>Marketing y Campañas (IA)</h2>
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>Configure envíos automáticos e inteligentes usando N8N y ChatGPT</p>
                </div>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '20px' }}>
                <button
                    onClick={() => setMainTab('campaign')}
                    style={{
                        padding: '10px 20px',
                        background: 'transparent',
                        border: 'none',
                        color: mainTab === 'campaign' ? 'var(--primary)' : 'var(--text-muted)',
                        borderBottom: mainTab === 'campaign' ? '2px solid var(--primary)' : '2px solid transparent',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: mainTab === 'campaign' ? 'bold' : 'normal',
                        transition: 'all 0.3s ease'
                    }}
                >
                    Gestión de Campaña
                </button>
                <button
                    onClick={() => setMainTab('salespeople')}
                    style={{
                        padding: '10px 20px',
                        background: 'transparent',
                        border: 'none',
                        color: mainTab === 'salespeople' ? 'var(--primary)' : 'var(--text-muted)',
                        borderBottom: mainTab === 'salespeople' ? '2px solid var(--primary)' : '2px solid transparent',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: mainTab === 'salespeople' ? 'bold' : 'normal',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <Users size={16} /> Vendedores ({salespeople.length})
                </button>
                <button
                    onClick={() => setMainTab('analytics')}
                    style={{
                        padding: '10px 20px',
                        background: 'transparent',
                        border: 'none',
                        color: mainTab === 'analytics' ? 'var(--primary)' : 'var(--text-muted)',
                        borderBottom: mainTab === 'analytics' ? '2px solid var(--primary)' : '2px solid transparent',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: mainTab === 'analytics' ? 'bold' : 'normal',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <BarChart2 size={16} /> Analytics
                </button>
            </div>

            {status.message && (
                <div style={{
                    padding: '15px',
                    borderRadius: '10px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: status.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : status.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : status.type === 'warning' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                    border: `1px solid ${status.type === 'error' ? 'var(--danger)' : status.type === 'success' ? 'var(--success)' : status.type === 'warning' ? 'var(--warning)' : 'var(--primary)'}`,
                    color: status.type === 'error' ? 'var(--danger)' : status.type === 'success' ? 'var(--success)' : status.type === 'warning' ? 'var(--warning)' : 'var(--primary)'
                }}>
                    <AlertCircle size={20} />
                    {status.message}
                </div>
            )}

            {mainTab === 'campaign' && (
                <>

                    <div className="glass-card" style={{ padding: '25px', marginBottom: '25px' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Briefcase size={20} color="var(--primary)" /> Detalles de la Campaña
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label>Nombre de la Campaña</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Promo Mantenimiento Subestaciones Q3"
                                    value={campaignName}
                                    onChange={(e) => setCampaignName(e.target.value)}
                                    style={{ fontSize: '1.1rem', padding: '12px' }}
                                />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label>Vendedor Responsable</label>
                                <select
                                    value={selectedSalesperson}
                                    onChange={(e) => setSelectedSalesperson(e.target.value)}
                                    style={{
                                        width: '100%',
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid var(--border-color)',
                                        color: 'white',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        fontSize: '1rem',
                                        outline: 'none'
                                    }}
                                    disabled={isLoadingSalespeople || salespeople.length === 0}
                                >
                                    {isLoadingSalespeople ? (
                                        <option value="">Cargando vendedores...</option>
                                    ) : salespeople.length === 0 ? (
                                        <option value="">No hay vendedores disponibles</option>
                                    ) : (
                                        salespeople.map(s => (
                                            <option key={s.id} value={s.email}>
                                                {s.name || s.username} ({s.email || 'Sin correo'})
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label>Motor de Inteligencia Artificial</label>
                                <select
                                    value={aiEngine}
                                    onChange={(e) => setAiEngine(e.target.value)}
                                    style={{
                                        width: '100%',
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid var(--border-color)',
                                        color: 'white',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        fontSize: '1rem',
                                        outline: 'none'
                                    }}
                                >
                                    <option value="openai">OpenAI (ChatGPT 4o-mini)</option>
                                    <option value="gemini">Google Gemini (1.5 Pro - Gratis)</option>
                                </select>
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label>Tiempo de Espera (Delay)</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input
                                        type="number"
                                        min="0"
                                        value={delayAmount}
                                        onChange={(e) => setDelayAmount(e.target.value)}
                                        style={{ flex: '1', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '8px' }}
                                    />
                                    <select
                                        value={delayUnit}
                                        onChange={(e) => setDelayUnit(e.target.value)}
                                        style={{
                                            flex: '1',
                                            background: 'rgba(0,0,0,0.3)',
                                            border: '1px solid var(--border-color)',
                                            color: 'white',
                                            padding: '12px',
                                            borderRadius: '8px'
                                        }}
                                    >
                                        <option value="seconds">Segundos</option>
                                        <option value="minutes">Minutos</option>
                                        <option value="hours">Horas</option>
                                    </select>
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '5px', margin: 0 }}>
                                    Pausa entre cada envío. Usa 0 para envío inmediato.
                                </p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', paddingTop: '20px' }}>
                                <AlertCircle size={16} style={{ marginRight: '8px' }} />
                                El delay se aplica <i>antes</i> de cada envío comercial.
                            </div>
                        </div>
                    </div>

                    <div className="glass-card" style={{ padding: '25px', marginBottom: '25px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Users size={20} color="var(--primary)" /> Banco de Correos
                                <span style={{ background: 'var(--primary)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>
                                    {emails.length}
                                </span>
                            </h3>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    className={activeTab === 'manual' ? 'btn-primary' : ''}
                                    style={activeTab !== 'manual' ? { background: 'transparent', border: '1px solid var(--border-color)', color: 'white', padding: '8px 15px', borderRadius: '8px' } : { padding: '8px 15px' }}
                                    onClick={() => setActiveTab('manual')}
                                >
                                    Registro Manual
                                </button>
                                <button
                                    className={activeTab === 'bulk' ? 'btn-primary' : ''}
                                    style={activeTab !== 'bulk' ? { background: 'transparent', border: '1px solid var(--border-color)', color: 'white', padding: '8px 15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px' } : { padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '5px' }}
                                    onClick={() => setActiveTab('bulk')}
                                >
                                    <FileSpreadsheet size={16} /> Pegar Lista
                                </button>
                            </div>
                        </div>

                        {activeTab === 'manual' ? (
                            <form onSubmit={handleAddEmail} style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end', marginBottom: '25px' }}>
                                <div className="input-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
                                    <label><Mail size={14} style={{ display: 'inline', marginRight: '5px' }} /> Correo Electrónico</label>
                                    <input
                                        type="email"
                                        placeholder="cliente@empresa.com"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                    />
                                </div>
                                <div className="input-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
                                    <label><Briefcase size={14} style={{ display: 'inline', marginRight: '5px' }} /> Industria / Perfil *</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. Minería, Hospitales, Textil..."
                                        value={newIndustry}
                                        onChange={(e) => setNewIndustry(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="input-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
                                    <label><Users size={14} style={{ display: 'inline', marginRight: '5px' }} /> Nombre Contacto (Opcional)</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. Juan Pérez"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                    />
                                </div>
                                <button type="submit" className="btn-primary" style={{ height: '42px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '5px', alignSelf: 'flex-end' }}>
                                    <Plus size={18} /> Agregar
                                </button>
                            </form>
                        ) : (
                            <div style={{ marginBottom: '25px' }}>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                                    Pega una lista separada por comas. Formato: <strong>correo, industria, nombre (opcional)</strong>
                                    <br />Ejemplo:<br />
                                    <code style={{ background: 'rgba(0,0,0,0.3)', padding: '5px', display: 'block', marginTop: '5px', borderRadius: '5px' }}>
                                        gerente@textiles.com, Industria Textil, María Gómez<br />
                                        compras@hmhospital.com, Sector Salud
                                    </code>
                                </p>
                                <textarea
                                    rows="5"
                                    style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white', padding: '10px', borderRadius: '8px', marginBottom: '10px', resize: 'vertical' }}
                                    value={bulkEmails}
                                    onChange={(e) => setBulkEmails(e.target.value)}
                                />
                                <button type="button" onClick={handleBulkAdd} className="btn-primary" style={{ padding: '10px 20px' }}>
                                    Procesar Lista
                                </button>
                            </div>
                        )}

                        {emails.length > 0 ? (
                            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', minWidth: '500px' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                                            <th style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Correo</th>
                                            <th style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Nombre Contacto</th>
                                            <th style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Industria / Contexto</th>
                                            <th style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', width: '80px' }}>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {emails.map((item, index) => (
                                            <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '10px 15px' }}>{item.email}</td>
                                                <td style={{ padding: '10px 15px', color: item.name ? 'white' : 'var(--text-muted)' }}>{item.name || '-'}</td>
                                                <td style={{ padding: '10px 15px', color: 'var(--text-muted)' }}>{item.industry}</td>
                                                <td style={{ padding: '10px 15px', textAlign: 'center' }}>
                                                    <button
                                                        onClick={() => handleRemoveEmail(index)}
                                                        style={{ background: 'transparent', color: 'var(--danger)', border: 'none', cursor: 'pointer', padding: '5px', transition: 'transform 0.2s' }}
                                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '10px' }}>
                                <Mail size={40} opacity={0.3} style={{ marginBottom: '10px' }} />
                                <p style={{ margin: 0 }}>El banco de correos está vacío. Agrega destinatarios para continuar.</p>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            onClick={handleStartCampaign}
                            className="btn-primary"
                            disabled={isSending || emails.length === 0}
                            style={{
                                padding: '15px 30px',
                                fontSize: '1.1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                background: (isSending || emails.length === 0) ? 'gray' : 'linear-gradient(135deg, var(--primary), #004da1)',
                                boxShadow: (isSending || emails.length === 0) ? 'none' : '0 5px 15px rgba(0, 108, 224, 0.4)',
                                cursor: (isSending || emails.length === 0) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isSending ? (
                                <>Enviando a N8N...</>
                            ) : (
                                <><Send size={20} /> Iniciar Campaña Mágica</>
                            )}
                        </button>
                    </div>

                    <div style={{ marginTop: '20px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        <p>💡 <b>Nota:</b> Al hacer clic en "Iniciar Campaña", N8N procesará individualmente cada correo generando textos IA. Esto simulará un operador humano.</p>
                    </div>
                </>
            )}

            {mainTab === 'salespeople' && (
                <div className="glass-card animate-fade-in" style={{ padding: '25px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Users size={20} color="var(--primary)" /> Vendedores Disponibles
                        </h3>
                        <button
                            className="btn-primary"
                            onClick={loadSalespeople}
                            disabled={isLoadingSalespeople}
                            style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '5px' }}
                        >
                            <RefreshCw size={16} className={isLoadingSalespeople ? 'spin' : ''} /> Actualizar
                        </button>
                    </div>

                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
                        Estos son los usuarios registrados en el sistema con rol de Ventas, Líder de Ventas o Administrador.
                        Más adelante, podrás seleccionarlos específicamente para enviarlos a n8n en lugar de la lista aleatoria actual.
                    </p>

                    {isLoadingSalespeople ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>Cargando vendedores...</div>
                    ) : salespeople.length > 0 ? (
                        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                                        <th style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Nombre</th>
                                        <th style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Correo Electrónico</th>
                                        <th style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Rol Asignado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {salespeople.map((person) => (
                                        <tr key={person.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '12px 15px', fontWeight: 'bold' }}>{person.name || person.username}</td>
                                            <td style={{ padding: '12px 15px', color: 'var(--text-muted)' }}>{person.email || 'Sin correo asociado'}</td>
                                            <td style={{ padding: '12px 15px' }}>
                                                <span style={{
                                                    background: person.role === ROLES.ADMIN ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                                    color: person.role === ROLES.ADMIN ? '#fca5a5' : '#93c5fd',
                                                    padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem'
                                                }}>
                                                    {person.role.toUpperCase()}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '10px' }}>
                            <Users size={40} opacity={0.3} style={{ marginBottom: '10px' }} />
                            <p style={{ margin: 0 }}>No se encontraron vendedores en el sistema.</p>
                        </div>
                    )}
                </div>
            )}

            {mainTab === 'analytics' && <CampaignAnalytics />}
        </div>
    );
};

export default CampaignManagement;
