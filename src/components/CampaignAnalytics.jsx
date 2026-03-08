import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { Send, MousePointerClick, MailOpen, AlertTriangle, TrendingUp, Users, Calendar } from 'lucide-react';
import db from '../services/db';

const CampaignAnalytics = () => {
    const [history, setHistory] = useState([]);
    const [totalSent, setTotalSent] = useState(0);
    const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'history'

    useEffect(() => {
        const fetchCampaigns = async () => {
            const data = await db.getCampaigns();
            setHistory(data);

            // Calcular totales
            let sent = 0;
            data.forEach(camp => {
                sent += (camp.contactsCount || (camp.contacts ? camp.contacts.length : 0));
            });
            setTotalSent(sent);
        };
        fetchCampaigns();
    }, []);

    // Dummy Data for visual representation (since N8N doesn't send data back yet)
    const funnelData = [
        { name: 'Enviados', value: 1250 },
        { name: 'Entregados', value: 1180 },
        { name: 'Abiertos', value: 850 },
        { name: 'Clics', value: 320 },
        { name: 'Respuestas', value: 45 }
    ];

    const monthlyTrends = [
        { name: 'Ene', envios: 400, aperturas: 240, clics: 100 },
        { name: 'Feb', envios: 600, aperturas: 380, clics: 150 },
        { name: 'Mar', envios: 800, aperturas: 520, clics: 210 },
        { name: 'Abr', envios: 1200, aperturas: 780, clics: 340 },
        { name: 'May', envios: 1500, aperturas: 950, clics: 420 },
        { name: 'Jun', envios: 2000, aperturas: 1250, clics: 680 }
    ];

    const industryPerformance = [
        { name: 'Minería', aperturas: 85, fill: '#10b981' },
        { name: 'Hospitales', aperturas: 65, fill: '#3b82f6' },
        { name: 'Textil', aperturas: 45, fill: '#f59e0b' },
        { name: 'Alimentos', aperturas: 70, fill: '#8b5cf6' },
        { name: 'Petróleo', aperturas: 90, fill: '#ec4899' }
    ];

    const aiPerformance = [
        { name: 'ChatGPT', value: 65, fill: '#10b981' },
        { name: 'Gemini', value: 35, fill: '#3b82f6' }
    ];

    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '12px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(4px)'
                }}>
                    <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#fff' }}>{label}</p>
                    {payload.map((entry, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color || entry.fill }}></div>
                            <span style={{ color: 'var(--text-muted)' }}>{entry.name}:</span>
                            <span style={{ color: '#fff', fontWeight: 'bold' }}>{entry.value}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="animate-fade-in">
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '12px 20px', borderRadius: '8px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={20} color="#3b82f6" />
                <p style={{ margin: 0, color: '#60a5fa', fontSize: '0.9rem' }}>
                    <strong>Fase Beta:</strong> Estos gráficos muestran datos de demostración. Para ver métricas reales, se requiere configurar los webhooks de retorno desde N8N hacia Firebase (Próxima actualización).
                </p>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '20px' }}>
                <button
                    onClick={() => setActiveTab('dashboard')}
                    style={{
                        padding: '10px 20px',
                        background: 'transparent',
                        border: 'none',
                        color: activeTab === 'dashboard' ? 'var(--primary)' : 'var(--text-muted)',
                        borderBottom: activeTab === 'dashboard' ? '2px solid var(--primary)' : '2px solid transparent',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: activeTab === 'dashboard' ? 'bold' : 'normal',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <TrendingUp size={16} /> Métricas
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    style={{
                        padding: '10px 20px',
                        background: 'transparent',
                        border: 'none',
                        color: activeTab === 'history' ? 'var(--primary)' : 'var(--text-muted)',
                        borderBottom: activeTab === 'history' ? '2px solid var(--primary)' : '2px solid transparent',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: activeTab === 'history' ? 'bold' : 'normal',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <Calendar size={16} /> Historial
                </button>
            </div>

            {/* CONDICIONAL: DASHBOARD */}
            {activeTab === 'dashboard' && (
                <>
                    {/* KPI Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #3b82f6' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <p style={{ margin: '0 0 5px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total Enviados (Real)</p>
                                    <h3 style={{ margin: 0, fontSize: '1.8rem', color: '#fff' }}>{totalSent}</h3>
                                </div>
                                <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '10px', borderRadius: '10px' }}>
                                    <Send size={20} color="#3b82f6" />
                                </div>
                            </div>
                        </div>

                        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #10b981' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <p style={{ margin: '0 0 5px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Tasa de Apertura</p>
                                    <h3 style={{ margin: 0, fontSize: '1.8rem', color: '#fff' }}>68%</h3>
                                </div>
                                <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '10px', borderRadius: '10px' }}>
                                    <MailOpen size={20} color="#10b981" />
                                </div>
                            </div>
                        </div>

                        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #f59e0b' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <p style={{ margin: '0 0 5px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Tasa de Clics (CTR)</p>
                                    <h3 style={{ margin: 0, fontSize: '1.8rem', color: '#fff' }}>24%</h3>
                                </div>
                                <div style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '10px', borderRadius: '10px' }}>
                                    <MousePointerClick size={20} color="#f59e0b" />
                                </div>
                            </div>
                        </div>

                        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #ec4899' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <p style={{ margin: '0 0 5px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Conversión a Leads</p>
                                    <h3 style={{ margin: 0, fontSize: '1.8rem', color: '#fff' }}>4.2%</h3>
                                </div>
                                <div style={{ background: 'rgba(236, 72, 153, 0.2)', padding: '10px', borderRadius: '10px' }}>
                                    <TrendingUp size={20} color="#ec4899" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                        {/* Monthly Trends - Area Chart */}
                        <div className="glass-card" style={{ padding: '20px' }}>
                            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: '#fff' }}>Rendimiento Mensual</h3>
                            <div style={{ height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={monthlyTrends}>
                                        <defs>
                                            <linearGradient id="colorEnvios" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorAperturas" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.5)' }} />
                                        <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.5)' }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                        <Area type="monotone" dataKey="envios" name="Envíos" stroke="#3b82f6" fillOpacity={1} fill="url(#colorEnvios)" />
                                        <Area type="monotone" dataKey="aperturas" name="Aperturas" stroke="#10b981" fillOpacity={1} fill="url(#colorAperturas)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Conversion Funnel - Bar Chart */}
                        <div className="glass-card" style={{ padding: '20px' }}>
                            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: '#fff' }}>Embudo de Conversión (Última Campaña)</h3>
                            <div style={{ height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                                        <XAxis type="number" stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.5)' }} />
                                        <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.5)' }} width={80} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="value" name="Usuarios" radius={[0, 4, 4, 0]} barSize={30}>
                                            {funnelData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                        {/* Industry Performance - Radar / Bar */}
                        <div className="glass-card" style={{ padding: '20px' }}>
                            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: '#fff' }}>Tasa de Apertura por Industria</h3>
                            <div style={{ height: 250 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={industryPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.5)' }} />
                                        <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.5)' }} unit="%" />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                        <Bar dataKey="aperturas" name="Aperturas (%)" radius={[4, 4, 0, 0]} barSize={40}>
                                            {industryPerformance.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* AI Engine usage - Pie Chart */}
                        <div className="glass-card" style={{ padding: '20px' }}>
                            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: '#fff' }}>Uso de Motores IA</h3>
                            <div style={{ height: 250, display: 'flex', alignItems: 'center' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={aiPerformance}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={70}
                                            outerRadius={90}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {aiPerformance.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend verticalAlign="middle" align="right" layout="vertical" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* CONDICIONAL: HISTORIAL */}
            {activeTab === 'history' && (
                <div className="glass-card" style={{ padding: '20px' }}>
                    <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Calendar size={20} color="var(--primary)" /> Historial de Campañas
                    </h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', minWidth: '600px' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                                    <th style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Fecha</th>
                                    <th style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Campaña</th>
                                    <th style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Vendedor</th>
                                    <th style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Destinatarios</th>
                                    <th style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Motor IA</th>
                                    <th style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.length > 0 ? history.map((camp, index) => (
                                    <tr key={camp.id || index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '10px 15px', color: 'var(--text-muted)' }}>
                                            {new Date(camp.timestamp).toLocaleDateString()} {new Date(camp.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td style={{ padding: '10px 15px', fontWeight: 'bold' }}>{camp.campaignName}</td>
                                        <td style={{ padding: '10px 15px' }}>{camp.senderName}</td>
                                        <td style={{ padding: '10px 15px' }}>{camp.contactsCount || (camp.contacts ? camp.contacts.length : 0)}</td>
                                        <td style={{ padding: '10px 15px' }}>
                                            <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                                                {camp.aiEngine?.toUpperCase() || 'GEMINI'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px 15px' }}>
                                            <span style={{ color: 'var(--success)' }}>{camp.status === 'started' ? 'Envíada' : 'Completada'}</span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                                            No hay campañas registradas aún.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CampaignAnalytics;
