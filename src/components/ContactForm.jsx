import React, { useState, useEffect } from 'react';

const N8N_FORM_WEBHOOK = 'http://localhost:5678/webhook/elspec-contacto-form';

export default function ContactForm() {
    const [formData, setFormData] = useState({
        nombre: '',
        empresa: '',
        telefono: '',
        cargo: '',
        descripcion: '',
        email: '',
        vendedorEmail: '',
        vendedorNombre: '',
        sector: '',
    });
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setFormData(prev => ({
            ...prev,
            email: params.get('email') || '',
            vendedorEmail: params.get('vendedor') || '',
            vendedorNombre: params.get('vendedorNombre') || '',
            sector: params.get('industry') || params.get('sector') || '',
        }));
    }, []);

    const handleChange = e => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await fetch(N8N_FORM_WEBHOOK, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            setSubmitted(true);
        } catch {
            setError('Hubo un problema al enviar. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div style={styles.page}>
                <div style={styles.card}>
                    <div style={styles.header}>
                        <img src="https://www.elspecandina.com.co/wp-content/uploads/2021/05/aw3.jpg" alt="Elspec Andina" style={styles.logo} />
                        <h1 style={styles.headerTitle}>ELSPEC ANDINA</h1>
                        <p style={styles.headerSub}>Soluciones en Calidad de Energía Eléctrica</p>
                    </div>
                    <div style={{ padding: '50px 40px', textAlign: 'center' }}>
                        <div style={{ fontSize: 60, marginBottom: 20 }}>✅</div>
                        <h2 style={{ color: '#1a237e', fontSize: 24, marginBottom: 12 }}>¡Solicitud Recibida!</h2>
                        <p style={{ color: '#555', fontSize: 16, lineHeight: 1.7, maxWidth: 400, margin: '0 auto' }}>
                            Gracias por su interés. Nuestro equipo comercial estará en contacto con usted muy pronto.
                            Recibirá una confirmación en su correo electrónico.
                        </p>
                        <p style={{ color: '#1565c0', fontWeight: 'bold', marginTop: 24 }}>
                            ELSPEC ANDINA S.A.S.
                        </p>
                    </div>
                    <div style={styles.footer}>
                        <p>© 2025 ELSPEC ANDINA S.A.S. | Calidad de Energía para la Industria Colombiana</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                {/* Header */}
                <div style={styles.header}>
                    <img src="https://www.elspecandina.com.co/wp-content/uploads/2021/05/aw3.jpg" alt="Elspec Andina" style={styles.logo} />
                    <h1 style={styles.headerTitle}>ELSPEC ANDINA</h1>
                    <p style={styles.headerSub}>Soluciones en Calidad de Energía Eléctrica</p>
                </div>

                {/* Form body */}
                <div style={{ padding: '35px 40px' }}>
                    <h2 style={{ color: '#1a237e', fontSize: 22, marginBottom: 6 }}>
                        📅 Agenda tu Diagnóstico Gratuito
                    </h2>
                    {formData.sector && (
                        <p style={{ color: '#555', marginBottom: 24, fontSize: 15 }}>
                            Sector: <strong>{formData.sector}</strong>
                        </p>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div style={styles.row}>
                            <div style={styles.field}>
                                <label style={styles.label}>Nombre completo *</label>
                                <input
                                    style={styles.input}
                                    name="nombre"
                                    value={formData.nombre}
                                    onChange={handleChange}
                                    required
                                    placeholder="Ej: Juan Rodríguez"
                                />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Empresa *</label>
                                <input
                                    style={styles.input}
                                    name="empresa"
                                    value={formData.empresa}
                                    onChange={handleChange}
                                    required
                                    placeholder="Nombre de su empresa"
                                />
                            </div>
                        </div>

                        <div style={styles.row}>
                            <div style={styles.field}>
                                <label style={styles.label}>Correo electrónico *</label>
                                <input
                                    style={styles.input}
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    placeholder="correo@empresa.com"
                                />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Teléfono / WhatsApp *</label>
                                <input
                                    style={styles.input}
                                    name="telefono"
                                    value={formData.telefono}
                                    onChange={handleChange}
                                    required
                                    placeholder="+57 300 000 0000"
                                />
                            </div>
                        </div>

                        <div style={styles.row}>
                            <div style={styles.field}>
                                <label style={styles.label}>Cargo</label>
                                <input
                                    style={styles.input}
                                    name="cargo"
                                    value={formData.cargo}
                                    onChange={handleChange}
                                    placeholder="Ej: Gerente de Operaciones"
                                />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Sector / Industria</label>
                                <input
                                    style={styles.input}
                                    name="sector"
                                    value={formData.sector}
                                    onChange={handleChange}
                                    placeholder="Ej: Minería, Hospitales..."
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: 20 }}>
                            <label style={styles.label}>
                                Descripción de su necesidad o reto eléctrico *
                            </label>
                            <textarea
                                style={{ ...styles.input, height: 110, resize: 'vertical' }}
                                name="descripcion"
                                value={formData.descripcion}
                                onChange={handleChange}
                                required
                                placeholder="Describa brevemente el problema eléctrico que enfrenta, equipos involucrados, síntomas observados, etc."
                            />
                        </div>

                        {error && (
                            <p style={{ color: '#c62828', background: '#ffebee', padding: '10px 15px', borderRadius: 6, marginBottom: 16 }}>
                                {error}
                            </p>
                        )}

                        <button type="submit" style={styles.btn} disabled={loading}>
                            {loading ? '⏳ Enviando...' : '📤 Enviar Solicitud'}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <div style={styles.footer}>
                    <p>© 2025 ELSPEC ANDINA S.A.S. | Calidad de Energía para la Industria Colombiana</p>
                    <p style={{ color: '#5c6bc0', fontSize: 10, marginTop: 4 }}>🌐 https://www.elspecandina.com.co/</p>
                </div>
            </div>
        </div>
    );
}

const styles = {
    page: {
        minHeight: '100vh',
        background: '#f4f4f4',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '30px 16px',
        fontFamily: 'Arial, Helvetica, sans-serif',
    },
    card: {
        width: '100%',
        maxWidth: 680,
        background: '#fff',
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
    },
    header: {
        background: 'linear-gradient(135deg,#1a237e 0%,#283593 60%,#1565c0 100%)',
        padding: '25px 40px',
        textAlign: 'center',
    },
    logo: {
        height: 60,
        marginBottom: 10,
        borderRadius: 4,
    },
    headerTitle: {
        color: '#fff',
        margin: 0,
        fontSize: 24,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    headerSub: {
        color: '#90caf9',
        margin: '5px 0 0',
        fontSize: 12,
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    row: {
        display: 'flex',
        gap: 16,
        marginBottom: 16,
        flexWrap: 'wrap',
    },
    field: {
        flex: 1,
        minWidth: 200,
        display: 'flex',
        flexDirection: 'column',
    },
    label: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#1a237e',
        marginBottom: 5,
    },
    input: {
        border: '1px solid #c5cae9',
        borderRadius: 6,
        padding: '10px 14px',
        fontSize: 14,
        color: '#333',
        outline: 'none',
        fontFamily: 'inherit',
        transition: 'border-color 0.2s',
    },
    btn: {
        width: '100%',
        padding: '14px',
        background: 'linear-gradient(135deg,#1565c0,#1a237e)',
        color: '#fff',
        border: 'none',
        borderRadius: 25,
        fontSize: 16,
        fontWeight: 'bold',
        cursor: 'pointer',
        letterSpacing: 0.5,
    },
    footer: {
        background: '#1a237e',
        padding: '18px 40px',
        textAlign: 'center',
        color: '#90caf9',
        fontSize: 11,
    },
};
