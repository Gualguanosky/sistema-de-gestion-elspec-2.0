import React, { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import db from '../services/db';
import { LogIn, ShieldCheck, Eye, EyeOff } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const { login } = useAuth();

    useEffect(() => {
        // Ensure default users exist (secure check)
        db.initializeDefaults();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const success = await login(username, password);
            if (success) {
                // Determine redirect based on role (optional, for now just reload/home)
                // window.location.reload(); 
                // No need to reload, state update handles it.
            } else {
                setError('Usuario o contraseña incorrectos, o error de conexión.');
            }
        } catch (e) {
            console.error(e);
            if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
                setError('Contraseña incorrecta.');
            } else if (e.code === 'auth/user-not-found') {
                setError('Usuario no encontrado.');
            } else if (e.code === 'auth/network-request-failed') {
                setError('Error de conexión o red bloqueada.');
            } else if (e.code === 'permission-denied') {
                setError('Acceso denegado (Reglas de Seguridad). Contacte soporte.');
            } else {
                setError(`Error (${e.code || 'v-check'}): ` + (e.message || 'Error desconocido al iniciar sesión'));
            }
        }
    };

    const [showReset, setShowReset] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetSuccess, setResetSuccess] = useState('');

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setResetSuccess('');
        if (!resetEmail) {
            setError('Por favor, ingrese su correo electrónico.');
            return;
        }
        try {
            await db.resetPassword(resetEmail);
            setResetSuccess('Se ha enviado un correo para restablecer su contraseña. Revise su bandeja de entrada.');
            setTimeout(() => setShowReset(false), 5000);
        } catch (e) {
            setError('Error al enviar correo de recuperación: ' + (e.message || 'Intente de nuevo.'));
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            background: 'radial-gradient(circle at top right, rgba(0, 108, 224, 0.15), transparent 40%), radial-gradient(circle at bottom left, rgba(0, 108, 224, 0.1), transparent 40%)',
            padding: '20px'
        }}>
            <div className="glass-card" style={{
                padding: '50px 40px',
                width: '100%',
                maxWidth: '450px',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, var(--primary), #004da1)',
                        width: '70px',
                        height: '70px',
                        borderRadius: '20px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        margin: '0 auto 20px',
                        boxShadow: '0 10px 25px rgba(0, 108, 224, 0.3)'
                    }}>
                        <ShieldCheck color="white" size={36} />
                    </div>
                    <h1 style={{ fontSize: '2rem', color: 'white', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '8px' }}>
                        ELSPEC <span style={{ color: 'var(--primary)' }}>ANDINA</span>
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
                        Mesa de Soporte Técnico Especializado
                    </p>
                </div>

                {!showReset ? (
                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Usuario / Correo</label>
                            <input
                                type="text"
                                shadow="none"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="usuario@ejemplo.com"
                                required
                            />
                        </div>
                        <div className="input-group" style={{ marginBottom: '10px' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Contraseña</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Ingrese su contraseña"
                                    style={{ paddingRight: '50px !important' }}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '10px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'transparent',
                                        padding: '5px',
                                        color: 'var(--text-muted)',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <div style={{ textAlign: 'right', marginBottom: '25px' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowReset(true);
                                    setError('');
                                    setResetEmail(username.includes('@') ? username : '');
                                }}
                                style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                ¿Olvidó su contraseña?
                            </button>
                        </div>

                        {error && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                color: 'var(--danger)',
                                padding: '12px',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                marginBottom: '20px',
                                textAlign: 'center'
                            }}>
                                {error}
                            </div>
                        )}

                        <button type="submit" className="btn-primary" style={{ width: '100%', padding: '16px', fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                            Acceder al Sistema <LogIn size={20} />
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleResetPassword}>
                        <h2 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '15px', textAlign: 'center' }}>Restablecer Contraseña</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px', textAlign: 'center' }}>
                            Ingrese su correo electrónico y le enviaremos un enlace para cambiar su clave.
                        </p>

                        <div className="input-group">
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Correo Electrónico</label>
                            <input
                                type="email"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                placeholder="correo@ejemplo.com"
                                style={{ padding: '14px 18px', fontSize: '1rem' }}
                                required
                            />
                        </div>

                        {error && (
                            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '12px', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '20px', textAlign: 'center' }}>
                                {error}
                            </div>
                        )}

                        {resetSuccess && (
                            <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '12px', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '20px', textAlign: 'center' }}>
                                {resetSuccess}
                            </div>
                        )}

                        <button type="submit" className="btn-primary" style={{ width: '100%', padding: '14px', marginBottom: '15px' }}>
                            Enviar Correo de Recuperación
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowReset(false)}
                            style={{ width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '12px', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            Volver al Inicio
                        </button>
                    </form>
                )}

                <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <div style={{ marginBottom: '5px' }}>Secure Access</div>
                    <div>
                        Designed with ❤️ by <a href="https://gualguanosky.web.app" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold' }}>Gualguanosky</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
