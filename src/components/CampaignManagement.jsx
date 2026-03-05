import React, { useState } from 'react';
import { Send, Users, Plus, Trash2, Mail, Briefcase, FileSpreadsheet, AlertCircle } from 'lucide-react';
import useAuth from '../hooks/useAuth';

const CampaignManagement = () => {
    const { user } = useAuth();
    const [campaignName, setCampaignName] = useState('');
    const [emails, setEmails] = useState([]);
    const [newEmail, setNewEmail] = useState('');
    const [newIndustry, setNewIndustry] = useState('');
    const [bulkEmails, setBulkEmails] = useState('');
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isSending, setIsSending] = useState(false);
    const [activeTab, setActiveTab] = useState('manual'); // 'manual' or 'bulk'

    // This URL will be replaced by the actual N8N Webhook URL
    const N8N_WEBHOOK_URL = 'https://n8n-webhook-placeholder.com/webhook/campaign';

    const handleAddEmail = (e) => {
        e.preventDefault();
        if (!newEmail.trim() || !newIndustry.trim()) return;

        setEmails([...emails, { email: newEmail.trim(), industry: newIndustry.trim() }]);
        setNewEmail('');
        setNewIndustry('');
    };

    const handleRemoveEmail = (indexToRemove) => {
        setEmails(emails.filter((_, index) => index !== indexToRemove));
    };

    const handleBulkAdd = () => {
        // Expected format: email@example.com, Industry Name
        const lines = bulkEmails.split('\n');
        const added = [];
        let errors = 0;

        lines.forEach(line => {
            const parts = line.split(',');
            if (parts.length >= 2) {
                const email = parts[0].trim();
                const industry = parts.slice(1).join(',').trim(); // keep remaining parts as industry
                if (email && industry) {
                    added.push({ email, industry });
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

        setIsSending(true);
        setStatus({ type: 'info', message: 'Iniciando campaña... Conectando con N8N.' });

        try {
            const payload = {
                campaignName: campaignName,
                user: user.name || user.username,
                timestamp: new Date().toISOString(),
                contacts: emails
            };

            console.log("Enviando Webhook a N8N con payload:", payload);

            // Uncomment the fetch call below when the real N8N Webhook URL is available
            // const response = await fetch(N8N_WEBHOOK_URL, {
            //    method: 'POST',
            //    headers: {
            //        'Content-Type': 'application/json'
            //    },
            //    body: JSON.stringify(payload)
            // });
            //
            // if (!response.ok) throw new Error('Error al conectar con el servidor.');

            // SIMULATION OF DELAY
            await new Promise(resolve => setTimeout(resolve, 1500));

            setStatus({ type: 'success', message: `¡Campaña "${campaignName}" iniciada con éxito! N8N está procesando los envíos.` });

            // Opcional: limpiar formulario después de enviar
            // setEmails([]);
            // setCampaignName('');
        } catch (error) {
            console.error("Error sending campaign:", error);
            setStatus({ type: 'error', message: 'Hubo un error al iniciar la campaña. Verifique la conexión con N8N.' });
        } finally {
            setIsSending(false);
            setTimeout(() => setStatus({ type: '', message: '' }), 5000);
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

            <div className="glass-card" style={{ padding: '25px', marginBottom: '25px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Briefcase size={20} color="var(--primary)" /> Detalles de la Campaña
                </h3>
                <div className="input-group">
                    <label>Nombre de la Campaña</label>
                    <input
                        type="text"
                        placeholder="Ej. Promo Mantenimiento Subestaciones Q3"
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                        style={{ fontSize: '1.1rem', padding: '12px' }}
                    />
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
                            <label><Briefcase size={14} style={{ display: 'inline', marginRight: '5px' }} /> Industria / Perfil</label>
                            <input
                                type="text"
                                placeholder="Ej. Minería, Hospitales, Textil..."
                                value={newIndustry}
                                onChange={(e) => setNewIndustry(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="btn-primary" style={{ height: '42px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Plus size={18} /> Agregar
                        </button>
                    </form>
                ) : (
                    <div style={{ marginBottom: '25px' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                            Pega una lista separada por comas. Formato: <strong>correo, industria</strong> (Un registro por línea).
                            <br />Ejemplo:<br />
                            <code style={{ background: 'rgba(0,0,0,0.3)', padding: '5px', display: 'block', marginTop: '5px', borderRadius: '5px' }}>
                                gerente@textiles.com, Industria Textil<br />
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
                                    <th style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Industria / Contexto</th>
                                    <th style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', width: '80px' }}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {emails.map((item, index) => (
                                    <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '10px 15px' }}>{item.email}</td>
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
        </div>
    );
};

export default CampaignManagement;
