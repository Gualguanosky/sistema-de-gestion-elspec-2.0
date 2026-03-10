import React, { useState } from 'react';
import { 
    Palette, 
    Sparkles, 
    Image as ImageIcon, 
    Download, 
    Type, 
    Layout,
    RefreshCw,
    Send,
    AlertCircle
} from 'lucide-react';

const FlyerGenerator = () => {
    const [prompt, setPrompt] = useState('');
    const [industry, setIndustry] = useState('');
    const [tone, setTone] = useState('profesional');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState(null);

    const N8N_FLYER_WEBHOOK = 'https://gualguanosky.app.n8n.cloud/webhook/elspec-flyer-agent-v1';

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!prompt) return;

        setIsGenerating(true);
        try {
            const response = await fetch(N8N_FLYER_WEBHOOK, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    industry,
                    tone,
                    user: {
                        name: 'Operador Elspec',
                        timestamp: new Date().toISOString()
                    }
                })
            });

            if (!response.ok) {
                throw new Error('Error al conectar con el servidor de IA');
            }

            const data = await response.json();
            console.log("Datos recibidos de n8n:", data);
            
            // Intentamos extraer datos de varias formas por si n8n los devuelve anidados
            const title = data.title || (data.body && data.body.title) || `Propuesta para ${industry}`;
            const copy = data.copy || (data.body && data.body.copy) || 'Error al generar el texto. Intenta de nuevo.';
            const imageUrl = data.imageUrl || (data.body && data.body.imageUrl) || 'https://via.placeholder.com/1000x1000?text=Error+en+Imagen';
            const cta = data.cta || (data.body && data.body.cta) || 'Contactar Vendedor';

            setGeneratedContent({ title, copy, imageUrl, cta });

        } catch (err) {
            console.error("Error en generación IA:", err);
            alert("Hubo un problema al conectar con la IA de n8n. Verifica que el flujo esté activo y las credenciales configuradas.");
            
            setGeneratedContent({
                title: "Error de Conexión",
                copy: "No pudimos obtener una respuesta de la IA. Por favor, asegúrate de que el flujo en n8n esté en 'Active' y que tengas saldo en OpenAI.",
                imageUrl: 'https://images.unsplash.com/photo-1594322436404-5a0526db4d13?auto=format&fit=crop&q=80&w=1000',
                cta: 'Reintentar'
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = async () => {
        if (!generatedContent) return;
        
        try {
            // Intentar descargar Imagen vía Fetch (funcionará si hay CORS)
            try {
                const response = await fetch(generatedContent.imageUrl, { mode: 'cors' });
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `Flyer_Elspec_${industry || 'Campaña'}.jpg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            } catch (corsErr) {
                console.warn("CORS evitó descarga directa, usando fallback:", corsErr);
                // Fallback: Abrir en pestaña nueva para que el usuario guarde manualmente
                window.open(generatedContent.imageUrl, '_blank');
                alert("Debido a restricciones de seguridad de la imagen, se ha abierto en una pestaña nueva. Por favor, haz clic derecho y selecciona 'Guardar imagen como...'.");
            }

            // Descargar Texto como TXT (Esto siempre funciona localmente)
            const textContent = `
TITULO: ${generatedContent.title}
COPY: ${generatedContent.copy}
CTA: ${generatedContent.cta}
---
INDUSTRIA: ${industry}
TONO: ${tone}
            `;
            const textBlob = new Blob([textContent], { type: 'text/plain' });
            const textUrl = window.URL.createObjectURL(textBlob);
            const textLink = document.createElement('a');
            textLink.href = textUrl;
            textLink.download = `Copy_Flyer_${industry || 'Campaña'}.txt`;
            document.body.appendChild(textLink);
            textLink.click();
            document.body.removeChild(textLink);
            window.URL.revokeObjectURL(textUrl);
        } catch (err) {
            console.error("Error al descargar:", err);
            alert("Hubo un error inesperado al intentar procesar la descarga.");
        }
    };

    return (
        <div className="animate-slide-up" style={{ padding: '0 10px' }}>
            <div className="glass-card" style={{ padding: '30px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
                    <div style={{ background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', padding: '12px', borderRadius: '12px', color: 'white' }}>
                        <Sparkles size={24} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.4rem' }}>Agente de Flyers con IA</h3>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Describe tu campaña y deja que la IA cree el arte y el mensaje.</p>
                    </div>
                </div>

                <form onSubmit={handleGenerate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                    <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Type size={16} color="var(--primary)" /> ¿Qué quieres comunicar?
                        </label>
                        <textarea 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Ej: Oferta del 20% en transformadores de potencia para el sector minero durante este mes..."
                            rows="3"
                            required
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
                        ></textarea>
                    </div>

                    <div className="input-group">
                        <label>Industria Objetivo</label>
                        <input 
                            type="text" 
                            value={industry}
                            onChange={(e) => setIndustry(e.target.value)}
                            placeholder="Ej: Minería, Papelera, Alimentos..."
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                    </div>

                    <div className="input-group">
                        <label>Tono de Voz</label>
                        <select 
                            value={tone}
                            onChange={(e) => setTone(e.target.value)}
                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                        >
                            <option value="profesional">Profesional y Autoritario</option>
                            <option value="amigable">Amigable y Cercano</option>
                            <option value="urgente">Urgente (Promocional)</option>
                            <option value="tecnico">Altamente Técnico</option>
                        </select>
                    </div>

                    <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                        <button 
                            type="submit" 
                            disabled={isGenerating}
                            className="btn-primary" 
                            style={{ 
                                width: '100%', 
                                padding: '15px', 
                                background: 'linear-gradient(90deg, var(--primary), #8b5cf6)',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '10px',
                                fontWeight: 'bold'
                            }}
                        >
                            {isGenerating ? (
                                <><RefreshCw className="animate-spin" size={20} /> Generando Magia...</>
                            ) : (
                                <><Palette size={20} /> Generar Diseño e Ideas</>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {generatedContent && (
                <div className="grid-2" style={{ gap: '30px' }}>
                    {/* Preview del Flyer */}
                    <div className="glass-card animate-slide-up" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--primary)' }}>
                        <div style={{ position: 'relative' }}>
                            <img 
                                src={generatedContent.imageUrl} 
                                alt="Flyer IA" 
                                style={{ width: '100%', height: '300px', objectFit: 'cover' }}
                            />
                            <div style={{ 
                                position: 'absolute', 
                                bottom: 0, 
                                left: 0, 
                                width: '100%', 
                                padding: '20px', 
                                background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
                                color: 'white'
                            }}>
                                <h4 style={{ margin: 0, fontSize: '1.2rem' }}>{generatedContent.title}</h4>
                            </div>
                        </div>
                        <div style={{ padding: '20px' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '20px' }}>
                                {generatedContent.copy}
                            </p>
                            <button className="btn-primary" style={{ width: '100%', background: '#8b5cf6' }}>
                                {generatedContent.cta}
                            </button>
                        </div>
                        <div style={{ padding: '15px', borderTop: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'center' }}>
                            <button 
                                onClick={handleDownload}
                                style={{ background: 'transparent', color: 'var(--primary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 'bold' }}
                            >
                                <Download size={18} /> Descargar Flyer para Campaña
                            </button>
                        </div>
                    </div>

                    {/* Recomendaciones Sugeridas */}
                    <div className="glass-card animate-slide-up" style={{ padding: '25px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <Layout size={20} color="#8b5cf6" /> Sugerencias Estratégicas
                        </h4>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '5px' }}>ASUNTO SUGERIDO</div>
                                <div style={{ fontSize: '0.9rem' }}>🚀 [EXCLUSIVO] Mejora la eficiencia en {industry} con esta solución</div>
                            </div>

                            <div style={{ padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                                <div style={{ fontSize: '0.8rem', color: '#8b5cf6', fontWeight: 'bold', marginBottom: '5px' }}>MEJOR HORA PARA ENVIAR</div>
                                <div style={{ fontSize: '0.9rem' }}>Martes o Jueves entre las 9:00 AM y 10:30 AM</div>
                            </div>

                            <div style={{ padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 'bold', marginBottom: '5px' }}>TIP DE CONVERSIÓN</div>
                                <div style={{ fontSize: '0.9rem' }}>Este copy enfocado en "{tone}" suele tener una tasa de respuesta un 15% mayor en tu sector.</div>
                            </div>
                        </div>

                        <div style={{ marginTop: '25px', padding: '15px', background: 'rgba(0,108,224,0.1)', borderRadius: '10px', border: '1px solid rgba(0,108,224,0.2)' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: 'var(--primary)', marginBottom: '8px' }}>
                                <AlertCircle size={18} />
                                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Listo para enviar</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                Puedes usar este flyer directamente en el módulo de **Campañas** simplemente copiando el texto generado.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FlyerGenerator;
