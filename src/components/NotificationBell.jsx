import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, X } from 'lucide-react';
import db from '../services/db';
import useAuth from '../hooks/useAuth';

const NotificationBell = ({ onNotificationClick }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = [useState([])][0];
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!user || !user.role || !user.id) return;

        const unsubscribe = db.subscribeNotifications(user.role, user.id, (data) => {
            setNotifications(data.all);
            setUnreadCount(data.unread.length);
        });

        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleMarkAsRead = async (notificationId) => {
        if (!user || !user.id) return;
        await db.markNotificationAsRead(notificationId, user.id);
    };

    const handleMarkAllAsRead = async () => {
        if (!user || !user.id) return;
        const unreadList = notifications.filter(n => !(n.readBy || []).includes(user.id));
        for (const n of unreadList) {
            await db.markNotificationAsRead(n.id, user.id);
        }
    };

    if (!user) return null;

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: 'transparent',
                    border: 'none',
                    position: 'relative',
                    cursor: 'pointer',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
                <Bell size={22} color="var(--text-muted)" />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '2px',
                        right: '4px',
                        background: 'var(--danger)',
                        color: 'white',
                        fontSize: '0.65rem',
                        fontWeight: 'bold',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid var(--background-dark)'
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="glass-card" style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '10px',
                    width: '320px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    zIndex: 2000,
                    padding: 0,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <div style={{
                        padding: '12px 15px',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Notificaciones</h4>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllAsRead}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--primary)',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                        padding: 0
                                    }}>
                                    Marcar todo leído
                                </button>
                            )}
                            <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    <div style={{ padding: '5px 0' }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                No tienes notificaciones
                            </div>
                        ) : (
                            notifications.map(notification => {
                                const isUnread = !(notification.readBy || []).includes(user.id);
                                return (
                                    <div
                                        key={notification.id}
                                        onClick={() => {
                                            if (isUnread) handleMarkAsRead(notification.id);
                                            if (onNotificationClick) {
                                                onNotificationClick(notification);
                                                setIsOpen(false);
                                            }
                                        }}
                                        style={{
                                            padding: '12px 15px',
                                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                                            background: isUnread ? 'rgba(99,102,241,0.08)' : 'transparent',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            gap: '10px',
                                            cursor: 'pointer'
                                        }}
                                        onMouseEnter={(e) => isUnread ? e.currentTarget.style.background = 'rgba(99,102,241,0.15)' : e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                        onMouseLeave={(e) => isUnread ? e.currentTarget.style.background = 'rgba(99,102,241,0.08)' : e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.85rem', fontWeight: isUnread ? 700 : 500, color: 'white', marginBottom: '4px' }}>
                                                {notification.title}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                                                {notification.message}
                                            </div>
                                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>
                                                {new Date(notification.createdAt).toLocaleString()}
                                            </div>
                                        </div>
                                        {isUnread && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleMarkAsRead(notification.id);
                                                }}
                                                title="Marcar como leída"
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'var(--primary)',
                                                    cursor: 'pointer',
                                                    padding: '4px',
                                                    alignSelf: 'flex-start'
                                                }}>
                                                <Check size={16} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
