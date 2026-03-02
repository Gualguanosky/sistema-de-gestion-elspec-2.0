import React, { useState } from 'react';
import {
    LayoutDashboard,
    CheckSquare,
    Settings,
    ShieldCheck
} from 'lucide-react';
import SGIDashboard from './SGIDashboard';
import SGIProcessManagement from './SGIProcessManagement';
import ProcessExecution from './ProcessExecution';

const SGIUnifiedView = ({
    user,
    tickets,
    canManageSGI, // Logic passed from Dashboard: isAdmin || role === 'sgi'
    isProcessLeader // Logic passed from Dashboard: if user is leader of any process
}) => {
    // Default tab: Dashboard for everyone
    const [activeTab, setActiveTab] = useState('dashboard');

    // Tab Definitions
    const tabs = [
        {
            id: 'dashboard',
            label: 'Dashboard',
            icon: <LayoutDashboard size={18} />,
            visible: true
        },
        {
            id: 'execution',
            label: 'Mis Procesos',
            icon: <CheckSquare size={18} />,
            visible: true // Everyone can see this, empty state handled internally if no processes
        },
        {
            id: 'management',
            label: 'Gestión',
            icon: <Settings size={18} />,
            visible: canManageSGI
        }
    ];

    return (
        <div style={{ padding: '0 0 20px 0', width: '100%' }}>
            {/* Header & Navigation */}
            <div className="glass-card" style={{
                padding: 'clamp(10px, 3vw, 15px) clamp(15px, 4vw, 25px)',
                marginBottom: 'clamp(15px, 4vw, 30px)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 'clamp(10px, 3vw, 20px)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(10px, 3vw, 15px)' }}>
                    <div style={{
                        background: 'rgba(0, 108, 224, 0.1)',
                        padding: 'clamp(6px, 1.5vw, 10px)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <ShieldCheck size={28} color="var(--primary)" />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 'clamp(1.2rem, 3vw, 1.5rem)' }}>Sistema Gestión (SGI)</h2>
                        <div style={{ color: 'var(--text-muted)', fontSize: 'clamp(0.75rem, 1.8vw, 0.9rem)' }}>
                            Control de Procesos e Indicadores
                        </div>
                    </div>
                </div>

                {/* Internal Navigation Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '5px',
                    background: 'rgba(0,0,0,0.2)',
                    padding: '5px',
                    borderRadius: '12px',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    flex: '1 1 auto'
                }}>
                    {tabs.filter(t => t.visible).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                border: 'none',
                                background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                                color: activeTab === tab.id ? 'white' : 'var(--text-muted)',
                                padding: 'clamp(6px, 1.5vw, 8px) clamp(10px, 2.5vw, 20px)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.2s ease',
                                fontWeight: activeTab === tab.id ? '500' : 'normal',
                                fontSize: '0.85rem'
                            }}
                        >
                            {tab.icon}
                            <span className={activeTab === tab.id ? '' : 'hide-mobile'}>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="sgi-content">
                {activeTab === 'dashboard' && <SGIDashboard tickets={tickets} user={user} canManageSGI={canManageSGI} />}
                {activeTab === 'execution' && <ProcessExecution user={user} />}
                {activeTab === 'management' && canManageSGI && <SGIProcessManagement user={user} />}
            </div>
        </div>
    );
};

export default SGIUnifiedView;
