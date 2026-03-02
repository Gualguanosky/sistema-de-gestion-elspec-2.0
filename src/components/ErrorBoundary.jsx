import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            // Fallback UI
            return (
                <div style={{
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: '#0f172a', // Dark background matching theme
                    color: 'white',
                    padding: '20px',
                    textAlign: 'center'
                }}>
                    <div className="glass-card" style={{
                        padding: '40px',
                        maxWidth: '500px',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        background: 'rgba(239, 68, 68, 0.05)'
                    }}>
                        <AlertTriangle size={64} style={{ color: '#ef4444', marginBottom: '20px' }} />
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Algo salió mal</h2>
                        <p style={{ color: '#94a3b8', marginBottom: '30px' }}>
                            La aplicación ha encontrado un error inesperado al intentar cargar esta vista.
                        </p>

                        <details style={{ whiteSpace: 'pre-wrap', textAlign: 'left', background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '8px', marginBottom: '30px', fontSize: '0.8rem', color: '#ef4444', maxHeight: '200px', overflow: 'auto' }}>
                            {this.state.error && this.state.error.toString()}
                        </details>

                        <button
                            onClick={this.handleReload}
                            style={{
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                padding: '12px 24px',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                margin: '0 auto'
                            }}
                        >
                            <RefreshCw size={18} /> Recargar Aplicación
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
