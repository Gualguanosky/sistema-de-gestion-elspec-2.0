import React, { useState, useEffect } from 'react';
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
    Tooltip, Legend, ResponsiveContainer, AreaChart, Area,
    CartesianGrid
} from 'recharts';
import {
    TrendingUp, CheckCircle, AlertTriangle, Clock,
    Activity, Calendar, Target, Zap
} from 'lucide-react';
import useTickets from '../hooks/useTickets';
import db from '../services/db';

// ── Design Tokens ───────────────────────────────────────────
const COLORS = {
    primary: '#006ce0',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    purple: '#8b5cf6',
    cyan: '#06b6d4',
    muted: 'rgba(255,255,255,0.4)'
};

const STATUS_COLORS = {
    open: COLORS.primary,
    in_progress: COLORS.warning,
    closed: COLORS.success,
};

const PRIORITY_COLORS = {
    low: COLORS.cyan,
    medium: COLORS.warning,
    high: COLORS.danger,
    urgent: '#ff2d55',
};

// ── Custom Recharts Tooltip ──────────────────────────────────
const GlassTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: 'rgba(10,20,40,0.95)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '10px', padding: '10px 14px',
            backdropFilter: 'blur(12px)', color: 'white',
            fontSize: '0.85rem', boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
        }}>
            {label && <div style={{ fontWeight: 700, marginBottom: 4, color: 'rgba(255,255,255,0.7)' }}>{label}</div>}
            {payload.map((p, i) => (
                <div key={i} style={{ color: p.color || 'white', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
                    <span>{p.name}: <strong>{p.value}</strong></span>
                </div>
            ))}
        </div>
    );
};

// ── KPI Card ─────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, subtext, gradient, trend }) => (
    <div style={{
        background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
        borderRadius: '16px', padding: '22px', color: 'white',
        position: 'relative', overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 4px 30px rgba(0,0,0,0.3)',
        transition: 'transform 0.2s',
    }}
        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
        {/* Background circle decoration */}
        <div style={{
            position: 'absolute', top: -20, right: -20, width: 100, height: 100,
            borderRadius: '50%', background: 'rgba(255,255,255,0.07)'
        }} />
        <div style={{
            position: 'absolute', bottom: -30, right: 20, width: 60, height: 60,
            borderRadius: '50%', background: 'rgba(255,255,255,0.05)'
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
            <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8, marginBottom: 8 }}>
                    {label}
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1, marginBottom: 6 }}>
                    {value}
                </div>
                {subtext && <div style={{ fontSize: '0.8rem', opacity: 0.75 }}>{subtext}</div>}
            </div>
            <div style={{
                background: 'rgba(255,255,255,0.15)', borderRadius: '12px',
                padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                {icon}
            </div>
        </div>
        {trend !== undefined && (
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', opacity: 0.85 }}>
                <TrendingUp size={12} />
                <span>{trend > 0 ? '+' : ''}{trend}% vs mes anterior</span>
            </div>
        )}
    </div>
);

// ── Section Card ─────────────────────────────────────────────
const ChartCard = ({ title, children, style = {} }) => (
    <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px', padding: '24px',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
        ...style
    }}>
        <h3 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
            {title}
        </h3>
        {children}
    </div>
);

// ── Spark Badge ────────────────────────────────────────────
const Badge = ({ label, color }) => (
    <span style={{
        display: 'inline-block', padding: '2px 10px', borderRadius: '12px',
        fontSize: '0.72rem', fontWeight: 600,
        background: color + '22', color,
        border: `1px solid ${color}44`
    }}>{label}</span>
);

// ── Helpers ──────────────────────────────────────────────────
const getLast6Months = () => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        months.push({
            label: d.toLocaleString('es', { month: 'short' }),
            year: d.getFullYear(),
            month: d.getMonth()
        });
    }
    return months;
};

const getLast4Weeks = () => {
    const weeks = [];
    for (let i = 3; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i * 7);
        weeks.push({
            label: `Sem ${4 - i}`,
            start: new Date(date.getFullYear(), date.getMonth(), date.getDate() - 6),
            end: new Date(date.getFullYear(), date.getMonth(), date.getDate())
        });
    }
    return weeks;
};

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
const AnalyticsDashboard = () => {
    const { tickets } = useTickets();
    const [visits, setVisits] = useState([]);

    useEffect(() => {
        const unsub = db.getVisits(data => setVisits(data));
        return () => unsub?.();
    }, []);

    // ── KPI Calculations ──────────────────────────────────────
    const total = tickets.length;
    const open = tickets.filter(t => t.status === 'open').length;
    const inProgress = tickets.filter(t => t.status === 'in_progress').length;
    const closed = tickets.filter(t => t.status === 'closed').length;
    const highPrio = tickets.filter(t => t.priority === 'high' || t.priority === 'urgent').length;
    const resolution = total > 0 ? Math.round((closed / total) * 100) : 0;

    const thisMonth = new Date().getMonth();
    const visitsThisMonth = visits.filter(v => {
        const d = new Date(v.date);
        return d.getMonth() === thisMonth && d.getFullYear() === new Date().getFullYear();
    }).length;

    // ── Status Donut ──────────────────────────────────────────
    const statusData = [
        { name: 'Abiertos', value: open, color: COLORS.primary },
        { name: 'En Progreso', value: inProgress, color: COLORS.warning },
        { name: 'Cerrados', value: closed, color: COLORS.success },
    ].filter(d => d.value > 0);

    // ── Priority Bar ──────────────────────────────────────────
    const priorityData = [
        { name: 'Baja', value: tickets.filter(t => t.priority === 'low').length, fill: COLORS.cyan },
        { name: 'Media', value: tickets.filter(t => t.priority === 'medium').length, fill: COLORS.warning },
        { name: 'Alta', value: tickets.filter(t => t.priority === 'high').length, fill: COLORS.danger },
        { name: 'Urgente', value: tickets.filter(t => t.priority === 'urgent').length, fill: '#ff2d55' },
    ];

    // ── Tickets por Mes ───────────────────────────────────────
    const months = getLast6Months();
    const monthlyData = months.map(({ label, year, month }) => {
        const created = tickets.filter(t => {
            const d = t.createdAt ? new Date(t.createdAt?.toDate ? t.createdAt.toDate() : t.createdAt) : null;
            return d && d.getMonth() === month && d.getFullYear() === year;
        }).length;
        const closedM = tickets.filter(t => {
            const d = t.createdAt ? new Date(t.createdAt?.toDate ? t.createdAt.toDate() : t.createdAt) : null;
            return d && d.getMonth() === month && d.getFullYear() === year && t.status === 'closed';
        }).length;
        return { label, Creados: created, Cerrados: closedM };
    });

    // ── Trend 4 weeks ─────────────────────────────────────────
    const weeks = getLast4Weeks();
    const weeklyData = weeks.map(({ label, start, end }) => {
        const count = tickets.filter(t => {
            const d = t.createdAt ? new Date(t.createdAt?.toDate ? t.createdAt.toDate() : t.createdAt) : null;
            return d && d >= start && d <= end;
        }).length;
        return { label, Tickets: count };
    });

    // ── Top Technicians ───────────────────────────────────────
    const techCounts = {};
    tickets.forEach(t => {
        if (!t.assignedTo) return;
        const people = Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo];
        people.forEach(p => {
            const name = typeof p === 'string' ? p : (p?.name || p?.id || 'N/A');
            if (name && name !== 'N/A') techCounts[name] = (techCounts[name] || 0) + 1;
        });
    });
    const techData = Object.entries(techCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, value]) => ({ name: name.split(' ')[0], value }));

    // ── Type distribution ─────────────────────────────────────
    const typeData = (() => {
        const counts = {};
        tickets.forEach(t => { counts[t.type || 'soporte'] = (counts[t.type || 'soporte'] || 0) + 1; });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    })();

    const RADIAN = Math.PI / 180;
    const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
        if (percent < 0.06) return null;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        return (
            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
                style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <div style={{ padding: 'clamp(10px, 3vw, 24px)', color: 'white', maxWidth: '1300px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 'clamp(1.3rem, 4vw, 1.8rem)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Activity color={COLORS.primary} size={28} />
                        Analytics & KPIs
                    </h2>
                    <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.88rem' }}>
                        Panel de métricas en tiempo real — Actualizado ahora
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <Badge label={`${total} tickets totales`} color={COLORS.primary} />
                    <Badge label={`${visitsThisMonth} visitas este mes`} color={COLORS.cyan} />
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
                <KpiCard label="Total Tickets" value={total}
                    icon={<Zap size={22} />}
                    gradient={['#006ce0', '#0043a8']}
                    subtext="Todos los tiempo" />
                <KpiCard label="Abiertos" value={open}
                    icon={<Clock size={22} />}
                    gradient={['#1e3a5f', '#0d6efd']}
                    subtext={`${inProgress} en progreso`} />
                <KpiCard label="Cerrados" value={closed}
                    icon={<CheckCircle size={22} />}
                    gradient={['#064e3b', '#10b981']}
                    subtext={`${resolution}% tasa de cierre`} />
                <KpiCard label="Alta Prioridad" value={highPrio}
                    icon={<AlertTriangle size={22} />}
                    gradient={['#7f1d1d', '#ef4444']}
                    subtext="Urgentes + Altas" />
                <KpiCard label="Visitas / Mes" value={visitsThisMonth}
                    icon={<Calendar size={22} />}
                    gradient={['#1e1b4b', '#8b5cf6']}
                    subtext={`${visits.filter(v => v.status === 'scheduled').length} programadas`} />
                <KpiCard label="Tasa Resolución" value={`${resolution}%`}
                    icon={<Target size={22} />}
                    gradient={['#134e4a', '#06b6d4']}
                    subtext={closed > 0 ? 'Buen rendimiento' : 'Sin datos aún'} />
            </div>

            {/* Charts Row 1: Donut + Monthly Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 20 }}>

                {/* Status Donut */}
                <ChartCard title="🎯 Estado de Tickets">
                    {statusData.length === 0 ? (
                        <div style={{ textAlign: 'center', color: COLORS.muted, padding: 40 }}>Sin datos aún</div>
                    ) : (
                        <>
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%" cy="50%"
                                        innerRadius={55} outerRadius={90}
                                        paddingAngle={4}
                                        dataKey="value"
                                        labelLine={false}
                                        label={renderCustomLabel}
                                    >
                                        {statusData.map((entry, i) => (
                                            <Cell key={i} fill={entry.color}
                                                stroke="rgba(255,255,255,0.05)"
                                                strokeWidth={2} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<GlassTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Legend */}
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
                                {statusData.map(d => (
                                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}>
                                        <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, display: 'inline-block' }} />
                                        <span style={{ color: 'rgba(255,255,255,0.75)' }}>{d.name}</span>
                                        <strong style={{ color: 'white' }}>{d.value}</strong>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </ChartCard>

                {/* Tickets by Month */}
                <ChartCard title="📅 Tickets por Mes" style={{ gridColumn: 'span 2' }}>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={monthlyData} barGap={4}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                            <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} width={28} />
                            <Tooltip content={<GlassTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                            <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }} />
                            <Bar dataKey="Creados" fill={COLORS.primary} radius={[6, 6, 0, 0]} maxBarSize={40} />
                            <Bar dataKey="Cerrados" fill={COLORS.success} radius={[6, 6, 0, 0]} maxBarSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            {/* Charts Row 2: Trend + Priority + Technicians */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 20 }}>

                {/* Weekly Trend */}
                <ChartCard title="📈 Tendencia Semanal">
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={weeklyData}>
                            <defs>
                                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.4} />
                                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                            <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} width={26} />
                            <Tooltip content={<GlassTooltip />} />
                            <Area type="monotone" dataKey="Tickets"
                                stroke={COLORS.primary} strokeWidth={2.5}
                                fill="url(#trendGrad)" dot={{ fill: COLORS.primary, strokeWidth: 0, r: 4 }}
                                activeDot={{ r: 6, fill: 'white', stroke: COLORS.primary, strokeWidth: 2 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Priority Distribution */}
                <ChartCard title="🚨 Por Prioridad">
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={priorityData} layout="vertical" barGap={4}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                            <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} axisLine={false} tickLine={false} width={55} />
                            <Tooltip content={<GlassTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                            <Bar dataKey="value" name="Tickets" radius={[0, 6, 6, 0]} maxBarSize={28}>
                                {priorityData.map((entry, i) => (
                                    <Cell key={i} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Top Technicians */}
                <ChartCard title="👤 Tickets por Técnico">
                    {techData.length === 0 ? (
                        <div style={{ textAlign: 'center', color: COLORS.muted, padding: 40, fontSize: '0.9rem' }}>
                            No hay tickets asignados aún
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                            {techData.map(({ name, value }, i) => {
                                const max = techData[0]?.value || 1;
                                const pct = Math.round((value / max) * 100);
                                const barColors = [COLORS.primary, COLORS.cyan, COLORS.purple, COLORS.success, COLORS.warning, COLORS.danger];
                                return (
                                    <div key={name}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                                            <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{name}</span>
                                            <span style={{ color: barColors[i % barColors.length], fontWeight: 700 }}>{value}</span>
                                        </div>
                                        <div style={{ height: 7, background: 'rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%', width: `${pct}%`,
                                                background: barColors[i % barColors.length],
                                                borderRadius: 10, transition: 'width 0.8s ease'
                                            }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ChartCard>
            </div>

            {/* Row 3: Visits Status + Ticket Types */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>

                {/* Visits by Status */}
                <ChartCard title="📅 Estado de Visitas">
                    {(() => {
                        const vData = [
                            { name: 'Programadas', value: visits.filter(v => v.status === 'scheduled').length, color: COLORS.primary },
                            { name: 'Completadas', value: visits.filter(v => v.status === 'completed').length, color: COLORS.success },
                            { name: 'Canceladas', value: visits.filter(v => v.status === 'cancelled').length, color: COLORS.danger },
                        ].filter(d => d.value > 0);
                        if (vData.length === 0) return (
                            <div style={{ textAlign: 'center', color: COLORS.muted, padding: 40 }}>Sin visitas registradas</div>
                        );
                        return (
                            <>
                                <ResponsiveContainer width="100%" height={180}>
                                    <PieChart>
                                        <Pie data={vData} cx="50%" cy="50%"
                                            innerRadius={45} outerRadius={75}
                                            paddingAngle={4} dataKey="value"
                                            labelLine={false} label={renderCustomLabel}>
                                            {vData.map((e, i) => <Cell key={i} fill={e.color} strokeWidth={1} stroke="rgba(255,255,255,0.05)" />)}
                                        </Pie>
                                        <Tooltip content={<GlassTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                                    {vData.map(d => (
                                        <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem' }}>
                                            <span style={{ width: 8, height: 8, borderRadius: 2, background: d.color, display: 'inline-block' }} />
                                            <span style={{ color: 'rgba(255,255,255,0.7)' }}>{d.name} ({d.value})</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        );
                    })()}
                </ChartCard>

                {/* Ticket Types */}
                <ChartCard title="🏷️ Tipos de Ticket" style={{ gridColumn: 'span 2' }}>
                    {typeData.length === 0 ? (
                        <div style={{ textAlign: 'center', color: COLORS.muted, padding: 40 }}>Sin datos</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={typeData} barGap={6}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }} axisLine={false} tickLine={false} width={26} />
                                <Tooltip content={<GlassTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                                <Bar dataKey="value" name="Tickets" radius={[6, 6, 0, 0]} maxBarSize={50}>
                                    {typeData.map((_, i) => {
                                        const cs = [COLORS.primary, COLORS.purple, COLORS.cyan, COLORS.warning, COLORS.success];
                                        return <Cell key={i} fill={cs[i % cs.length]} />;
                                    })}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
