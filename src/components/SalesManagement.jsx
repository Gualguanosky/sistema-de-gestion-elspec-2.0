import React, { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import db from '../services/db';
import { PlusCircle, Search, DollarSign, Calendar, Filter, FileText, Trash2, Edit, Download } from 'lucide-react';
import SaleForm from './SaleForm';
import ProductManager from './ProductManager';
import CustomerManagement from './CustomerManagement';
import TermsManagement from './TermsManagement';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoImg from '../assets/logo.png';
import { TIPOS_OFERTA, OBTENER_TERMINOS, TERMINOS_EXHAUSTIVOS } from '../utils/termsAndConditions';
import PricingVariables from './PricingVariables';
import CatalogConverter from './CatalogConverter';

const SalesManagement = () => {
    const { user } = useAuth();
    const [sales, setSales] = useState([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingSale, setEditingSale] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeSubTab, setActiveSubTab] = useState('list'); // 'list', 'catalog', 'customers', 'terms', 'pricing', 'converter'
    const [dbTerms, setDbTerms] = useState([]);

    useEffect(() => {
        const unsubscribeSales = db.subscribeSales((data) => {
            setSales(data);
        });
        const unsubscribeTerms = db.subscribeTerms((data) => {
            setDbTerms(data);
        });
        return () => {
            unsubscribeSales();
            unsubscribeTerms();
        };
    }, []);

    const handleSave = async (saleData) => {
        if (editingSale) {
            await db.updateSale(editingSale.id, saleData);
        } else {
            const newSale = await db.addSale({
                ...saleData,
                createdBy: user.username,
                createdByName: user.name || user.username
            });

            // Enviar notificación a logística y administradores
            await db.addNotification({
                title: 'Nueva Venta Creada',
                message: `La venta para el cliente ${saleData.cliente?.razon_social || 'Desconocido'} ha sido generada por ${user.name || user.username} y requiere revisión.`,
                targetRoles: ['logistica', 'admin'],
                type: 'sale_created',
                saleId: newSale.id
            });

            // Enviar datos vía Webhook a N8N
            try {
                const webhookUrl = import.meta.env.VITE_N8N_SALES_WEBHOOK || 'https://hook.us2.make.com/n8n-ventas-placeholder';
                console.log("Enviando venta a N8N...", newSale);
                
                // Realizamos el envío de forma asíncrona sin bloquear la UI
                fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        event: 'sale_created',
                        sale: newSale,
                    })
                }).then(res => {
                    if (!res.ok) console.warn("N8N Webhook warning:", res.statusText);
                }).catch(err => {
                    console.error("Error enviando datos a N8N:", err);
                });
            } catch (error) {
                console.error("Excepción asíncrona enviando a N8N:", error);
            }
        }
        setIsFormOpen(false);
        setEditingSale(null);
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Eliminar este registro de venta ERP permanentemente?')) {
            await db.deleteSale(id);
        }
    };

    const generatePDF = (sale) => {
        try {
            console.log("Generando PDF institucional Elspec:", sale);
            const doc = new jsPDF();
            const formatCurrency = (val) => new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(val || 0);

            const t = sale.totales || {};
            const c = sale.configuracion || {};
            const cliente = sale.cliente || {};

            // Helper para el Dibujo del Header Institucional (GMV-FT-07)
            const drawHeader = (data) => {
                const docWidth = doc.internal.pageSize.width;

                // 1. Tabla de Control de Documentos (Header)
                autoTable(doc, {
                    startY: 10,
                    margin: { left: 14, right: 14 },
                    tableWidth: docWidth - 28,
                    theme: 'grid',
                    styles: { fontSize: 8, fontStyle: 'bold', halign: 'center', valign: 'middle', cellPadding: 2 },
                    body: [
                        [
                            { content: '', rowSpan: 3, styles: { cellWidth: 40 } }, // Placeholder Logo
                            { content: 'GESTIÓN MERCADEO Y VENTAS', styles: { fillColor: [240, 240, 240] } },
                            { content: 'Código: GMV-FT-07' }
                        ],
                        [
                            { content: 'FORMATO PARA CÁLCULO DE PRECIOS', styles: { fillColor: [240, 240, 240] } },
                            { content: 'Versión: 02' }
                        ],
                        [
                            { content: '', styles: { fillColor: [240, 240, 240] } },
                            { content: `Fecha: 08-07-2022\nPágina ${data.pageNumber} de ${data.pageCount}` }
                        ]
                    ],
                    didDrawCell: (cellData) => {
                        if (cellData.row.index === 0 && cellData.column.index === 0) {
                            try {
                                doc.addImage(logoImg, 'PNG', cellData.cell.x + 5, cellData.cell.y + 2, 30, 10);
                            } catch (e) { }
                        }
                    }
                });
            };

            // --- PÁGINA 1: PROPUESTA Y LOGÍSTICA ---
            drawHeader({ pageNumber: 1, pageCount: 2 }); // Reducimos a 2 páginas si es posible

            // 2. Sección de Variables Globales (Factores)
            autoTable(doc, {
                startY: doc.lastAutoTable.finalY + 10,
                tableWidth: 80,
                margin: { left: 110 },
                theme: 'grid',
                styles: { fontSize: 7, cellPadding: 1 },
                headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0] },
                body: [
                    ['TRM', formatCurrency(t.trm_aplicado)],
                    ['Margen Equipos (%)', `${c.margen_sistema || 0}%`],
                    ['Margen Venta Flete (%)', `${c.margen_flete || 0}%`],
                    ['Factor Imprevistos (%)', `${c.factor_imprevistos || 0}%`],
                    ['Factor Póliza (%)', `${c.factor_poliza || 0}%`],
                    ['Factor C.C. / Negociación (%)', `${c.factor_negociacion || 0}%`]
                ]
            });

            const finalYVars = doc.lastAutoTable.finalY;

            // 3. Título de Oferta
            doc.setFontSize(14);
            doc.setTextColor(200, 0, 0); // Rojo
            doc.setFont("helvetica", "bold");
            doc.text(`OFERTA ${sale.id?.substring(0, 8).toUpperCase()} Rev. 1`, 105, finalYVars - 25, { align: 'center' });

            // 4. Client Metadata
            doc.setFontSize(8);
            doc.setTextColor(50);
            doc.setFont("helvetica", "normal");
            doc.text(`Cliente: ${cliente.razon_social || 'N/A'}`, 14, finalYVars - 15);
            doc.text(`Nit: ${cliente.nit || 'N/A'}`, 14, finalYVars - 10);
            doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, finalYVars - 5);

            // 5. Tabla Principal de Propuesta
            autoTable(doc, {
                startY: finalYVars + 5,
                body: (sale.lineas || []).map((l, i) => ({
                    item: i + 1,
                    cant: l.cantidad,
                    ref: l.codigo || 'N/A',
                    desc: l.descripcion,
                    pu_sis: formatCurrency(l.costoLineaVenta / l.cantidad),
                    pu_dis: formatCurrency(l.precio_distribuido),
                    subtotal: formatCurrency(l.subtotal_calculado)
                })),
                columns: [
                    { header: 'ITEM', dataKey: 'item' },
                    { header: 'CANT', dataKey: 'cant' },
                    { header: 'REFERENCIA', dataKey: 'ref' },
                    { header: 'DESCRIPCIÓN', dataKey: 'desc' },
                    { header: 'P.U. SISTEMA', dataKey: 'pu_sis' },
                    { header: 'P.U. DISTRIB.', dataKey: 'pu_dis' },
                    { header: 'SUBTOTAL', dataKey: 'subtotal' }
                ],
                theme: 'grid',
                headStyles: { fillColor: [255, 255, 0], textColor: [0, 0, 0], fontSize: 7, halign: 'center' },
                styles: { fontSize: 7, valign: 'middle' },
                columnStyles: { 3: { cellWidth: 50 }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } }
            });

            // 6. Totales Finales de Página 1
            const finalYTable = doc.lastAutoTable.finalY;
            autoTable(doc, {
                startY: finalYTable + 2,
                tableWidth: 60,
                margin: { left: 136 },
                theme: 'grid',
                styles: { fontSize: 8, fontStyle: 'bold' },
                body: [
                    ['TOTAL PROPUESTA', formatCurrency(t.subtotalNeto)],
                    ['VALOR TÉCNICO', formatCurrency(t.totalTecnico)],
                    ['TOTAL + IVA', formatCurrency(t.total)]
                ]
            });

            // --- DETALLE LOGÍSTICA (En la misma página si hay espacio) ---
            let currentY = doc.lastAutoTable.finalY + 10;
            if (currentY > 200) { doc.addPage(); drawHeader({ pageNumber: 2, pageCount: 2 }); currentY = 50; }

            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("DETALLE DE LOGÍSTICA Y TRANSPORTES", 14, currentY);

            autoTable(doc, {
                startY: currentY + 5,
                theme: 'striped',
                head: [['Componente', 'Costo USD']],
                body: [
                    ['Transporte Internacional / Nacional', formatCurrency(t.transporteOculto)],
                    ['Seguro de Carga', formatCurrency(t.imprevistosOcultos)],
                    ['I. Nacionalización / Gastos Puerto', formatCurrency(t.seguridadOculta)]
                ],
                headStyles: { fillColor: [33, 150, 243] },
                styles: { fontSize: 8 }
            });

            // --- TÉRMINOS Y CONDICIONES (Consolidados) ---
            doc.addPage();
            let currentPageNum = doc.internal.getNumberOfPages();
            drawHeader({ pageNumber: currentPageNum, pageCount: 'N/A' });
            currentY = 50; // Reset Y position after adding a new page

            // --- PÁGINAS DE TÉRMINOS Y CONDICIONES (Dinámicos de la DB o Fallback estático) ---
            const terminosBase = dbTerms.length > 0 ? dbTerms : TERMINOS_EXHAUSTIVOS;
            const nombreCliente = cliente.razon_social || 'EL CLIENTE';

            terminosBase.forEach((seccion) => {
                doc.setFontSize(9);
                doc.setFont("helvetica", "bold");

                if (currentY > 260) {
                    doc.addPage();
                    currentPageNum = doc.internal.getNumberOfPages();
                    drawHeader({ pageNumber: currentPageNum, pageCount: 'N/A' });
                    currentY = 50;
                }

                doc.text(seccion.titulo, 14, currentY);
                currentY += 5;

                doc.setFontSize(7.5);
                doc.setFont("helvetica", "normal");
                const lineasProcesadas = seccion.contenido.map(l =>
                    l.replace(/XXXX S\.A\./g, nombreCliente).replace(/“cliente”/g, `“${nombreCliente}”`)
                );

                lineasProcesadas.forEach(parrafo => {
                    const textLines = doc.splitTextToSize(parrafo, 182);
                    textLines.forEach(line => {
                        if (currentY > 265) {
                            doc.addPage();
                            currentPageNum = doc.internal.getNumberOfPages();
                            drawHeader({ pageNumber: currentPageNum, pageCount: 'N/A' });
                            currentY = 50;
                            doc.setFontSize(7.5);
                            doc.setFont("helvetica", "normal");
                        }
                        doc.text(line, 14, currentY);
                        currentY += 3.5;
                    });
                    currentY += 1.5; // Espacio entre párrafos
                });
                currentY += 3; // Espacio entre secciones
            });

            const lastPageY = Math.min(currentY + 10, 260);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Firma de Aceptación ${nombreCliente}: ________________________`, 14, lastPageY);
            doc.text("Sello y Fecha Elspec Andina: ________________________", 120, lastPageY);

            const safeFileName = (cliente.razon_social || 'Venta').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            doc.save(`Oferta_Elspec_${safeFileName}_${sale.id?.substring(0, 4)}.pdf`);
            console.log("PDF Institucional con Términos Exhaustivos Generado");
        } catch (err) {
            console.error("Error al generar PDF Institucional:", err);
            alert("Error al replicar el formato de Excel.");
        }
    };

    const filteredSales = sales.filter(s =>
        s.cliente.razon_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.cliente.nit.includes(searchTerm)
    );

    if (isFormOpen) {
        return (
            <div style={{ padding: 'clamp(10px, 3vw, 20px)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
                    <h2 style={{ fontSize: 'clamp(1.2rem, 4vw, 1.8rem)', margin: 0 }}>{editingSale ? 'Editar Venta ERP' : 'Nueva Venta ERP'}</h2>
                    <button onClick={() => { setIsFormOpen(false); setEditingSale(null); }} className="btn-primary" style={{ background: 'rgba(255,255,255,0.05)', color: 'white', padding: '8px 15px', fontSize: '0.9rem' }}>Volver</button>
                </div>
                <SaleForm sale={editingSale} onSave={handleSave} onCancel={() => { setIsFormOpen(false); setEditingSale(null); }} />
            </div>
        );
    }

    return (
        <div className="animate-fade-in" style={{ padding: 'clamp(10px, 3vw, 20px)' }}>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '25px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                <button
                    onClick={() => setActiveSubTab('list')}
                    style={{
                        padding: '10px 20px', background: 'transparent', border: 'none', color: activeSubTab === 'list' ? 'var(--primary)' : 'var(--text-muted)',
                        borderBottom: activeSubTab === 'list' ? '2px solid var(--primary)' : 'none', fontWeight: 'bold'
                    }}
                >
                    Listado de Ventas
                </button>
                <button
                    onClick={() => setActiveSubTab('catalog')}
                    style={{
                        padding: '10px 20px', background: 'transparent', border: 'none', color: activeSubTab === 'catalog' ? 'var(--primary)' : 'var(--text-muted)',
                        borderBottom: activeSubTab === 'catalog' ? '2px solid var(--primary)' : 'none', fontWeight: 'bold'
                    }}
                >
                    Catálogo de Productos
                </button>
                <button
                    onClick={() => setActiveSubTab('customers')}
                    style={{
                        padding: '10px 20px', background: 'transparent', border: 'none', color: activeSubTab === 'customers' ? 'var(--primary)' : 'var(--text-muted)',
                        borderBottom: activeSubTab === 'customers' ? '2px solid var(--primary)' : 'none', fontWeight: 'bold'
                    }}
                >
                    Gestión de Clientes
                </button>
                <button
                    onClick={() => setActiveSubTab('terms')}
                    style={{
                        padding: '10px 20px', background: 'transparent', border: 'none', color: activeSubTab === 'terms' ? 'var(--primary)' : 'var(--text-muted)',
                        borderBottom: activeSubTab === 'terms' ? '2px solid var(--primary)' : 'none', fontWeight: 'bold'
                    }}
                >
                    Gestión de Términos
                </button>
                <button
                    onClick={() => setActiveSubTab('pricing')}
                    style={{
                        padding: '10px 20px', background: 'transparent', border: 'none', color: activeSubTab === 'pricing' ? 'var(--primary)' : 'var(--text-muted)',
                        borderBottom: activeSubTab === 'pricing' ? '2px solid var(--primary)' : 'none', fontWeight: 'bold'
                    }}
                >
                    Variables de Cotización
                </button>
                <button
                    onClick={() => setActiveSubTab('converter')}
                    style={{
                        padding: '10px 20px', background: 'transparent', border: 'none', color: activeSubTab === 'converter' ? 'var(--primary)' : 'var(--text-muted)',
                        borderBottom: activeSubTab === 'converter' ? '2px solid var(--primary)' : 'none', fontWeight: 'bold'
                    }}
                >
                    Convertidor
                </button>
            </div>

            {activeSubTab === 'catalog' ? (
                <ProductManager />
            ) : activeSubTab === 'customers' ? (
                <CustomerManagement />
            ) : activeSubTab === 'terms' ? (
                <TermsManagement />
            ) : activeSubTab === 'pricing' ? (
                <PricingVariables />
            ) : activeSubTab === 'converter' ? (
                <CatalogConverter />
            ) : (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: '1 1 auto', minWidth: '250px' }}>
                            <div className="search-box-premium" style={{ width: '100%' }}>
                                <Search size={18} />
                                <input type="text" placeholder="Buscar cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ padding: '10px' }} />
                            </div>
                        </div>
                        <button onClick={() => setIsFormOpen(true)} className="btn-primary" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
                            <PlusCircle size={20} /> <span className="hide-mobile">Crear Nueva Venta ERP</span><span className="show-mobile">Nueva Venta</span>
                        </button>
                    </div>

                    <div className="glass-card" style={{ padding: '5px' }}>
                        {/* Desktop Table View */}
                        <div className="responsive-table hide-mobile">
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        <th style={{ padding: '15px' }}>Cliente</th>
                                        <th style={{ padding: '15px' }}>Fecha</th>
                                        <th style={{ padding: '15px' }}>Vendedor</th>
                                        <th style={{ padding: '15px' }}>Estado</th>
                                        <th style={{ padding: '15px', textAlign: 'right' }}>Total</th>
                                        <th style={{ padding: '15px', textAlign: 'center' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSales.length === 0 ? (
                                        <tr><td colSpan="6" style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron ventas registradas.</td></tr>
                                    ) : (
                                        filteredSales.map(sale => (
                                            <tr key={sale.id} className="table-row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '15px' }}>
                                                    <div style={{ fontWeight: 'bold' }}>{sale.cliente.razon_social}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>NIT: {sale.cliente.nit}</div>
                                                </td>
                                                <td style={{ padding: '15px' }}>
                                                    <div style={{ fontSize: '0.9rem' }}>{new Date(sale.createdAt).toLocaleDateString()}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(sale.createdAt).toLocaleTimeString()}</div>
                                                </td>
                                                <td style={{ padding: '15px', fontSize: '0.9rem' }}>{sale.createdByName}</td>
                                                <td style={{ padding: '15px' }}>
                                                    <span style={{
                                                        padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold',
                                                        background: sale.estado === 'APROBADA' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.1)',
                                                        color: sale.estado === 'APROBADA' ? 'var(--success)' : 'white'
                                                    }}>
                                                        {sale.estado}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '15px', textAlign: 'right', fontWeight: '900', color: 'var(--success)', fontSize: '1.1rem' }}>
                                                    ${new Intl.NumberFormat('es-CO').format(sale.totales.total)}
                                                </td>
                                                <td style={{ padding: '15px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                        <button onClick={() => generatePDF(sale)} className="action-btn" title="Descargar PDF" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}><Download size={18} /></button>
                                                        <button onClick={() => { setEditingSale(sale); setIsFormOpen(true); }} className="action-btn" title="Editar" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}><Edit size={18} /></button>
                                                        <button onClick={() => handleDelete(sale.id)} className="action-btn" title="Eliminar" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}><Trash2 size={18} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="show-mobile mobile-card-list" style={{ padding: '10px' }}>
                            {filteredSales.length === 0 ? (
                                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron ventas registradas.</div>
                            ) : (
                                filteredSales.map(sale => (
                                    <div key={sale.id} className="mobile-card">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'flex-start' }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{sale.cliente.razon_social}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>NIT: {sale.cliente.nit}</div>
                                            </div>
                                            <span style={{
                                                padding: '3px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 'bold',
                                                background: sale.estado === 'APROBADA' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.1)',
                                                color: sale.estado === 'APROBADA' ? 'var(--success)' : 'white'
                                            }}>
                                                {sale.estado}
                                            </span>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                                            <div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fecha</div>
                                                <div style={{ fontSize: '0.85rem' }}>{new Date(sale.createdAt).toLocaleDateString()}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total</div>
                                                <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--success)' }}>
                                                    ${new Intl.NumberFormat('es-CO').format(sale.totales.total)}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                            <button onClick={() => generatePDF(sale)} className="action-btn" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', flex: 1 }}><Download size={16} /> PDF</button>
                                            <button onClick={() => { setEditingSale(sale); setIsFormOpen(true); }} className="action-btn" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', flex: 1 }}><Edit size={16} /> Editar</button>
                                            <button onClick={() => handleDelete(sale.id)} className="action-btn" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '8px' }}><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default SalesManagement;
