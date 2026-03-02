import React, { useState, useEffect } from 'react';
import db from '../services/db';
import { Save, Trash2, Plus, RefreshCw, FileText } from 'lucide-react';
import { TERMINOS_EXHAUSTIVOS } from '../utils/termsAndConditions';

const TermsManagement = () => {
    const [terms, setTerms] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isFirstLoad = true;

        const initDefaults = async () => {
            console.log("Auto-inicializando los términos bases...");
            for (let i = 0; i < TERMINOS_EXHAUSTIVOS.length; i++) {
                const t = TERMINOS_EXHAUSTIVOS[i];
                await db.addTerm({
                    ...t,
                    orden: i
                });
            }
        };

        const unsubscribe = db.subscribeTerms((data) => {
            if (isFirstLoad && data.length === 0) {
                isFirstLoad = false;
                initDefaults();
            } else {
                isFirstLoad = false;
                setTerms(data);
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const handleSaveTerm = async (id, data) => {
        try {
            await db.updateTerm(id, data);
            alert('Cambios guardados correctamente.');
        } catch (e) {
            console.error(e);
            alert('Error al guardar cambios.');
        }
    };

    const handleAddTerm = async () => {
        const newTerm = {
            titulo: 'Nueva Sección',
            contenido: ['Nueva línea de términos...'],
            orden: terms.length
        };
        await db.addTerm(newTerm);
    };

    const handleDeleteTerm = async (id) => {
        if (window.confirm('¿Eliminar esta sección de términos?')) {
            await db.deleteTerm(id);
        }
    };

    const handleInitialize = async () => {
        if (terms.length > 0 && !window.confirm('Ya existen términos en la base de datos. ¿Desea sobrescribirlos con los valores por defecto?')) {
            return;
        }

        if (window.confirm('Esto cargará los términos exhaustivos originales. ¿Continuar?')) {
            // Delete existing
            for (const t of terms) {
                await db.deleteTerm(t.id);
            }
            // Add defaults
            for (let i = 0; i < TERMINOS_EXHAUSTIVOS.length; i++) {
                const t = TERMINOS_EXHAUSTIVOS[i];
                await db.addTerm({
                    ...t,
                    orden: i
                });
            }
            alert('Términos restaurados correctamente.');
        }
    };

    const updateTermField = (id, field, value) => {
        setTerms(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    const updateTermContent = (id, textValue) => {
        const lines = textValue.split('\n').filter(l => l.trim() !== '');
        updateTermField(id, 'contenido', lines);
    };

    if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando términos...</div>;

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <div>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FileText size={20} color="var(--primary)" /> Gestión de Términos Legales (PDF)
                    </h3>
                    <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Estos textos aparecerán al final de cada reporte PDF generado.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handleInitialize} className="btn-primary" title="Restaura los términos a sus valores originales" style={{ background: 'rgba(255,255,255,0.05)', color: 'white', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <RefreshCw size={16} /> Restaurar por Defecto
                    </button>
                    <button onClick={handleAddTerm} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Plus size={16} /> Nueva Sección
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {terms.length === 0 && (
                    <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No hay términos configurados en este momento. Puede usar "Restaurar por Defecto" o agregar una nueva sección.
                    </div>
                )}

                {terms.map((term) => (
                    <div key={term.id} className="glass-card" style={{ padding: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>Título de la Sección</label>
                                <input
                                    type="text"
                                    value={term.titulo}
                                    onChange={(e) => updateTermField(term.id, 'titulo', e.target.value)}
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '10px', borderRadius: '5px', fontWeight: 'bold' }}
                                />
                            </div>
                            <div style={{ width: '100px' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>Orden</label>
                                <input
                                    type="number"
                                    value={term.orden}
                                    onChange={(e) => updateTermField(term.id, 'orden', parseInt(e.target.value))}
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '10px', borderRadius: '5px' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>
                                Contenido (Una línea por párrafo)
                            </label>
                            <textarea
                                value={term.contenido.join('\n')}
                                onChange={(e) => updateTermContent(term.id, e.target.value)}
                                style={{ width: '100%', height: '150px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)', padding: '15px', borderRadius: '5px', resize: 'vertical', fontSize: '0.9rem', lineHeight: '1.5' }}
                                placeholder="Escriba cada párrafo u oración en una línea nueva..."
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
                            <button onClick={() => handleDeleteTerm(term.id)} className="action-btn" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Trash2 size={16} /> Eliminar
                            </button>
                            <button onClick={() => handleSaveTerm(term.id, { titulo: term.titulo, contenido: term.contenido, orden: term.orden })} className="btn-primary" style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Save size={16} /> Guardar Sección
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TermsManagement;
