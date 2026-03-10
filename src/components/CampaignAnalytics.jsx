import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { Send, MousePointerClick, MailOpen, TrendingUp, Users, Calendar, AlertCircle } from 'lucide-react';
import db from '../services/db';

const CampaignAnalytics = () => {
    const [history, setHistory] = useState([]);
    const [totalSent, setTotalSent] = useState(0);
    const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'history'

    // Real Data State
    const [funnelData, setFunnelData] = useState([]);
    const [aiPerformance, setAiPerformance] = useState([]);
    const [kpiCards, setKpiCards] = useState({ openRate: 0, clickRate: 0, convRate: 0 });
    const [monthlyTrends, setMonthlyTrends] = useState([]);
    const [industryPerformance, setIndustryPerformance] = useState([]);

    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];

    useEffect(() => {
        const fetchCampaigns = async () => {
            const data = await db.getCampaigns();
            setHistory(data);

            // Calcular totales y KPIs
            let sentTotal = 0;
            let deliveredTotal = 0;
            let openedTotal = 0;
            let clickedTotal = 0;
            let repliedTotal = 0;

            // AI usage counters
            let geminiCount = 0;
            let openaiCount = 0;

            // Industry map for statistics
            const industries = {};
            // Monthly trends map
            const trends = {};

            data.forEach(camp => {
                const contactsCount = camp.contactsCount || (camp.contacts ? camp.contacts.length : 0);
                const s = {
                    sent: camp.stats?.sent || contactsCount || 0,
                    delivered: camp.stats?.delivered || contactsCount || 0,
                    opened: camp.stats?.opened || 0,
                    clicked: camp.stats?.clicked || 0,
                    replied: camp.stats?.replied || 0
                };

                sentTotal += s.sent || 0;
                deliveredTotal += s.delivered || 0;
                openedTotal += s.opened || 0;
                clickedTotal += s.clicked || 0;
                repliedTotal += s.replied || 0;

                if (camp.aiEngine === 'openai') openaiCount++;
                else geminiCount++;

                // Group by Industry
                if (camp.contacts && Array.isArray(camp.contacts)) {
                    camp.contacts.forEach(contact => {
                        const ind = contact.industry || 'General';
                        if (!industries[ind]) industries[ind] = { name: ind, total: 0, opened: 0 };
                        industries[ind].total++;
                        // Estimation: If the campaign has 50% open rate, we apply it to industry contacts for visualization
                        // since we don't track industry-specific opens yet in the webhook.
                        const campaignOpenRate = s.delivered > 0 ? (s.opened / s.delivered) : 0;
                        industries[ind].opened += campaignOpenRate;
                    });
                }

                // Group by Month (using timestamp)
                if (camp.timestamp) {
                    const date = new Date(camp.timestamp);
                    const monthName = date.toLocaleString('default', { month: 'short' });
                    if (!trends[monthName]) trends[monthName] = { name: monthName, envios: 0, aperturas: 0 };
                    trends[monthName].envios += s.sent || 0;
                    trends[monthName].aperturas += s.opened || 0;
                }
            });

            setTotalSent(sentTotal);

            // Funnel Data
            setFunnelData([
                { name: 'Enviados', value: sentTotal },
                { name: 'Entregados', value: deliveredTotal },
                { name: 'Abiertos', value: openedTotal },
                { name: 'Clics', value: clickedTotal },
                { name: 'Respuestas', value: repliedTotal }
            ]);

            // AI Performance
            setAiPerformance([
                { name: 'ChatGPT', value: openaiCount, fill: '#10b981' },
                { name: 'Gemini', value: geminiCount, fill: '#3b82f6' }
            ]);

            // KPIs
            const oRate = deliveredTotal > 0 ? ((openedTotal / deliveredTotal) * 100).toFixed(1) : 0;
            const cRate = openedTotal > 0 ? ((clickedTotal / openedTotal) * 100).toFixed(1) : 0;
            const convRate = sentTotal > 0 ? ((repliedTotal / sentTotal) * 100).toFixed(1) : 0;
            setKpiCards({ openRate: oRate, clickRate: cRate, convRate: convRate });

            // Industry Performance
            const indArray = Object.values(industries).map((ind, idx) => ({
                name: ind.name,
                aperturas: ind.total > 0 ? ((ind.opened / ind.total) * 100).toFixed(1) : 0,
                fill: COLORS[idx % COLORS.length]
            })).slice(0, 5); // Limit to top 5
            setIndustryPerformance(indArray);

            // Monthly Trends (Order by actual months if possible)
            const trendArray = Object.values(trends);
            setMonthlyTrends(trendArray);
        };
        fetchCampaigns();
    }, []);

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
                            <span style={{ color: 'rgba(255,255,255,0.6)' }}>{entry.name}:</span>
                            <span style={{ color: '#fff', fontWeight: 'bold' }}>{entry.value}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="animate-premium" style={{ color: '#fff' }}>
            {/* Nav Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '24px', gap: '8px' }}>
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
                    style={{
                        padding: '12px 24px',
                        background: 'transparent',
                        color: activeTab === 'dashboard' ? 'var(--primary)' : 'var(--text-muted)',
                        borderBottom: activeTab === 'dashboard' ? '2px solid var(--primary)' : '2px solid transparent',
                        borderRadius: '0',
                        fontSize: '0.95rem'
                    }}
                >
                    <TrendingUp size={18} /> Dashboard
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`nav-tab ${activeTab === 'history' ? 'active' : ''}`}
                    style={{
                        padding: '12px 24px',
                        background: 'transparent',
                        color: activeTab === 'history' ? 'var(--primary)' : 'var(--text-muted)',
                        borderBottom: activeTab === 'history' ? '2px solid var(--primary)' : '2px solid transparent',
                        borderRadius: '0',
                        fontSize: '0.95rem'
                    }}
                >
                    <Calendar size={18} /> Historial
                </button>
            </div>

            {activeTab === 'dashboard' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    {/* KPI Cards Grid */}
                    <div className="kpi-grid">
                        <div className="glass-card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--primary)' }}></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <p style={{ margin: '0 0 8px 0', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Enviados Totales</p>
                                    <h3 style={{ margin: 0, fontSize: '2rem', fontWeight: 800 }}>{totalSent.toLocaleString()}</h3>
                                </div>
                                <div style={{ background: 'var(--primary-light)', padding: '12px', borderRadius: '12px' }}>
                                    <Send size={24} color="var(--primary)" />
                                </div>
                            </div>
                        </div>

                        <div className="glass-card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--success)' }}></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <p style={{ margin: '0 0 8px 0', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Tasa de Apertura</p>
                                    <h3 style={{ margin: 0, fontSize: '2rem', fontWeight: 800 }}>{kpiCards.openRate}%</h3>
                                </div>
                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '12px' }}>
                                    <MailOpen size={24} color="var(--success)" />
                                </div>
                            </div>
                        </div>

                        <div className="glass-card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--warning)' }}></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <p style={{ margin: '0 0 8px 0', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Clicks Reales</p>
                                    <h3 style={{ margin: 0, fontSize: '2rem', fontWeight: 800 }}>{kpiCards.clickRate}%</h3>
                                </div>
                                <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '12px' }}>
                                    <MousePointerClick size={24} color="var(--warning)" />
                                </div>
                            </div>
                        </div>

                        <div className="glass-card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#ec4899' }}></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <p style={{ margin: '0 0 8px 0', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Conversión</p>
                                    <h3 style={{ margin: 0, fontSize: '2rem', fontWeight: 800 }}>{kpiCards.convRate}%</h3>
                                </div>
                                <div style={{ background: 'rgba(236, 72, 153, 0.1)', padding: '12px', borderRadius: '12px' }}>
                                    <TrendingUp size={24} color="#ec4899" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Charts Grid */}
                    <div className="metrics-grid">
                        <div className="glass-card" style={{ padding: '25px' }}>
                            <h3 style={{ margin: '0 0 25px 0', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Calendar size={20} color="var(--primary)" /> Rendimiento por Mes
                            </h3>
                            <div style={{ height: 320, width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    {monthlyTrends.length > 0 ? (
                                        <AreaChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorEnvios" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Area type="monotone" dataKey="envios" name="Envíos" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorEnvios)" />
                                            <Area type="monotone" dataKey="aperturas" name="Aperturas" stroke="var(--success)" strokeWidth={3} fill="transparent" />
                                        </AreaChart>
                                    ) : (
                                        <div className="empty-state-container">
                                            <AlertCircle size={40} style={{ marginBottom: '15px', opacity: 0.5 }} />
                                            <p>No hay datos suficientes para mostrar tendencias temporales.</p>
                                        </div>
                                    )}
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="glass-card" style={{ padding: '25px' }}>
                            <h3 style={{ margin: '0 0 25px 0', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <TrendingUp size={20} color="var(--success)" /> Embudo de Conversión
                            </h3>
                            <div style={{ height: 320, width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" stroke="var(--text-main)" fontSize={12} width={90} tickLine={false} axisLine={false} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="value" name="Total" radius={[0, 6, 6, 0]} barSize={35}>
                                            {funnelData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="metrics-grid">
                        <div className="glass-card" style={{ padding: '25px' }}>
                            <h3 style={{ margin: '0 0 25px 0', fontSize: '1.1rem', fontWeight: 700 }}>Aperturas por Industria</h3>
                            <div style={{ height: 280 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={industryPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                                        <YAxis stroke="var(--text-muted)" fontSize={11} unit="%" tickLine={false} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="aperturas" name="Tasa de Apertura" barSize={30} radius={[4, 4, 0, 0]}>
                                            {industryPerformance.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="glass-card" style={{ padding: '25px' }}>
                            <h3 style={{ margin: '0 0 25px 0', fontSize: '1.1rem', fontWeight: 700 }}>Uso de Motores IA</h3>
                            <div style={{ height: 280 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie 
                                            data={aiPerformance} 
                                            cx="50%" 
                                            cy="50%" 
                                            innerRadius={70} 
                                            outerRadius={90} 
                                            paddingAngle={8} 
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {aiPerformance.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend verticalAlign="bottom" height={36}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="glass-card animate-premium" style={{ padding: '24px', overflow: 'hidden' }}>
                    <h3 style={{ margin: '0 0 24px 0', fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Calendar size={24} color="var(--primary)" /> Historial de Campañas
                    </h3>
                    <div className="responsive-table">
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    <th style={{ padding: '12px 20px', fontWeight: 600, textTransform: 'uppercase' }}>Fecha</th>
                                    <th style={{ padding: '12px 20px', fontWeight: 600, textTransform: 'uppercase' }}>Campaña</th>
                                    <th style={{ padding: '12px 20px', fontWeight: 600, textTransform: 'uppercase' }}>Vendedor</th>
                                    <th style={{ padding: '12px 20px', fontWeight: 600, textTransform: 'uppercase' }}>Métricas</th>
                                    <th style={{ padding: '12px 20px', fontWeight: 600, textTransform: 'uppercase' }}>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.length > 0 ? history.map((camp, index) => {
                                    const cStats = camp.stats || { sent: camp.contactsCount || 0, opened: 0 };
                                    return (
                                        <tr key={camp.id || index} style={{ background: 'rgba(255,255,255,0.02)', transition: 'var(--transition)' }} className="hover-row">
                                            <td style={{ padding: '15px 20px', borderRadius: '12px 0 0 12px' }}>
                                                {new Date(camp.timestamp).toLocaleDateString()}
                                            </td>
                                            <td style={{ padding: '15px 20px', fontWeight: 700 }}>{camp.campaignName}</td>
                                            <td style={{ padding: '15px 20px' }}>{camp.senderName}</td>
                                            <td style={{ padding: '15px 20px' }}>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.8rem' }}>
                                                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{cStats.sent} Env.</span>
                                                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>{cStats.opened} Aper.</span>
                                                    <span style={{ color: 'var(--warning)', fontWeight: 600 }}>{cStats.clicked || 0} Clics</span>
                                                    <span style={{ color: '#ec4899', fontWeight: 600 }}>{cStats.replied || 0} Resp.</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '15px 20px', borderRadius: '0 12px 12px 0' }}>
                                                <span style={{ 
                                                    padding: '4px 12px', 
                                                    background: 'rgba(16, 185, 129, 0.1)', 
                                                    color: 'var(--success)', 
                                                    borderRadius: '20px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700
                                                }}>Completada</span>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan="5">
                                            <div className="empty-state-container">
                                                No hay registros de campañas.
                                            </div>
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
