import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, Shield, User as UserIcon, Edit, X, ShieldCheck, AlertTriangle } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import db from '../services/db';

const UserManagement = () => {
    const { addUser, deleteUser, updateUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false); // State for modal visibility
    const [editingUser, setEditingUser] = useState(null); // The user being edited
    const [formData, setFormData] = useState({ username: '', password: '', role: 'engineer', name: '', email: '', canManageAssets: false });

    useEffect(() => {
        const unsubscribe = db.subscribeUsers(setUsers);
        return () => unsubscribe();
    }, []);

    const resetForm = () => {
        setFormData({ username: '', password: '', role: 'engineer', name: '', email: '', canManageAssets: false });
        setEditingUser(null);
    };

    const handleOpenCreate = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (editingUser) {
            // Check if email is changing
            const isEmailChanging = formData.email !== editingUser.email;
            const updatedData = { ...formData };

            // If email changes and user was already migrated, reset migration status
            if (isEmailChanging && editingUser.uid) {
                console.log("Detectado cambio de email. Reiniciando estado de migración para sincronización.");
                updatedData.uid = null; // Clear UID to trigger re-migration on next login
            }

            try {
                await updateUser(editingUser.id, updatedData);
                if (isEmailChanging && editingUser.uid) {
                    alert("✅ Email actualizado.\n\nEl sistema detectó un cambio de correo. El ID Seguro ha sido reiniciado para que el usuario se sincronice automáticamente con el nuevo correo en su próximo inicio de sesión.");
                }
            } catch (error) {
                console.error("Error updating user:", error);
                alert("Error al actualizar el usuario.");
            }
        } else {
            // Add new user
            if (users.some(u => u.username === formData.username)) {
                alert('El nombre de usuario ya existe');
                return;
            }
            addUser(formData);
        }

        setIsModalOpen(false);
        resetForm();
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            password: user.password,
            role: user.role,
            name: user.name,
            email: user.email,
            canManageAssets: user.canManageAssets || false
        });
        setIsModalOpen(true);
    };

    const handleManualMigration = async (user) => {
        if (!user.email) return alert("El usuario necesita un email para ser migrado.");
        const tempPassword = prompt(`Para migrar a ${user.username}, se actualizará su contraseña base para permitir la auto-migración.\n\nIngrese la contraseña actual (si la conoce) o una nueva contraseña temporal:`, user.password || "elspec123");

        if (!tempPassword) return;
        if (tempPassword.length < 6) return alert("La contraseña debe tener al menos 6 caracteres.");

        try {
            // Update the legacy password in DB, so when they login with that, it auto-migrates.
            await updateUser(user.id, { password: tempPassword });
            alert(`✅ Usuario listo para migración.\n\nContraseña actualizada a: "${tempPassword}"\n\nInstrucción: Pida al usuario ${user.username} que inicie sesión con esta contraseña. El sistema lo migrará automáticamente a Firebase Auth.`);
        } catch (e) {
            console.error(e);
            alert("Error al actualizar usuario.");
        }
    };

    return (
        <div className="glass-card" style={{ padding: 'clamp(15px, 4vw, 30px)', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)' }}>
                    <UserIcon size={24} color="var(--primary)" /> Gestión de Usuarios
                </h3>
                <button
                    onClick={handleOpenCreate}
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px', fontSize: '0.9rem' }}
                >
                    <UserPlus size={18} /> <span className="hide-mobile">Nuevo Usuario</span><span className="show-mobile">Nuevo</span>
                </button>
            </div>

            {/* User List */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {users.map(u => (
                    <div key={u.id} className="glass-card" style={{
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '15px',
                        position: 'relative',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        cursor: 'default',
                        border: u.uid ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{
                                background: u.role === 'admin' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.08)',
                                padding: '12px',
                                borderRadius: '12px',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}>
                                {u.role === 'admin' ? <Shield size={24} color="var(--warning)" /> : <UserIcon size={24} color="var(--text-muted)" />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {u.name || u.username}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>@{u.username}</div>
                            </div>
                            {u.uid && <ShieldCheck size={20} color="var(--success)" title="Autenticación Segura Activada" />}
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px', flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Rol:</span>
                                <span style={{ textTransform: 'capitalize', fontWeight: '500', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>{u.role}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Email:</span>
                                <span style={{ fontSize: '0.85rem', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={u.email}>{u.email || '-'}</span>
                            </div>
                            {u.canManageAssets && (
                                <div style={{ marginTop: '10px' }}>
                                    <span style={{ fontSize: '0.75rem', background: 'rgba(0, 108, 224, 0.15)', color: 'var(--primary)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', width: '100%', textAlign: 'center' }}>
                                        Gestor de Activos
                                    </span>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                            <button
                                onClick={() => handleEdit(u)}
                                className="btn-secondary"
                                style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '8px', padding: '8px' }}
                            >
                                <Edit size={16} /> Editar
                            </button>
                            {u.username !== 'admin' && (
                                <button
                                    onClick={() => {
                                        if (confirm(`¿Eliminar al usuario ${u.username}?`)) deleteUser(u.id);
                                    }}
                                    style={{
                                        background: 'rgba(239, 68, 68, 0.15)',
                                        color: 'var(--danger)',
                                        padding: '8px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        width: '40px'
                                    }}
                                    title="Eliminar Usuario"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                            {!u.uid && (
                                <button
                                    onClick={() => handleManualMigration(u)}
                                    style={{
                                        background: 'rgba(234, 179, 8, 0.15)',
                                        color: 'var(--warning)',
                                        padding: '8px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        width: '40px'
                                    }}
                                    title="Migrar a Auth Seguro"
                                >
                                    <ShieldCheck size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)',
                    zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center',
                    padding: '20px'
                }}>
                    <div className="glass-card" style={{ padding: '30px', width: '100%', maxWidth: '500px', border: '1px solid var(--primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {editingUser ? <Edit size={24} /> : <UserPlus size={24} />}
                                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="input-group">
                                <label>Nombre Completo</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    placeholder="Juan Pérez"
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label>Correo Electrónico</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    placeholder="juan@empresa.com"
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label>Usuario</label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    placeholder="juanp"
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    required
                                    disabled={!!editingUser}
                                />
                            </div>
                            <div className="input-group">
                                <label>Contraseña</label>
                                <input
                                    type="text"
                                    value={formData.password}
                                    placeholder="******"
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label>Rol</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="engineer">Ingeniero / Soporte</option>
                                    <option value="technician">Técnico (Operaciones)</option>
                                    <option value="admin">Administrador / Gerencia</option>
                                    <option value="ventas">Ventas (Comercial)</option>
                                    <option value="lider_ventas">Líder de Ventas</option>
                                    <option value="sgi">SGI (Gestión)</option>
                                    <option value="logistica">Logística</option>
                                    <option value="operaciones">Operaciones (Coordinador)</option>
                                </select>
                            </div>

                            <div className="input-group" style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: 0, textTransform: 'none', fontWeight: 500, fontSize: '0.9rem', color: 'white' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.canManageAssets}
                                        onChange={(e) => setFormData({ ...formData, canManageAssets: e.target.checked })}
                                        style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                                    />
                                    Permitir Gestión de Activos
                                </label>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
                                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '12px' }}>
                                    {editingUser ? <ShieldCheck size={18} /> : <UserPlus size={18} />}
                                    {editingUser ? 'Actualizar' : 'Crear Usuario'}
                                </button>
                                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}>
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
