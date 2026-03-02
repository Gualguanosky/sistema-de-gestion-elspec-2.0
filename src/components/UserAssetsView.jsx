import React from 'react';
import { Monitor, FileText, Calendar, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/logo.svg';

const UserAssetsView = ({ computers, currentUser }) => {
    // Filter computers assigned to the current user
    const myComputers = computers.filter(c => c.assignedTo === currentUser.username);

    const generatePDF = (comp) => {
        const doc = new jsPDF();
        const primaryColor = [0, 108, 224];

        // Header
        try {
            const img = new Image();
            img.src = logo;
            doc.addImage(img, 'SVG', 14, 10, 40, 15);
        } catch (e) {
            console.warn("Logo error");
        }

        doc.setFontSize(18);
        doc.setTextColor(0);
        doc.setFont('helvetica', 'bold');
        doc.text('HOJA DE VIDA', 150, 18, { align: 'center' });
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('EQUIPO DE CÓMPUTO', 150, 23, { align: 'center' });

        doc.setDrawColor(0, 108, 224);
        doc.setLineWidth(1);
        doc.line(14, 30, 196, 30);

        // Asset Info Box
        doc.setDrawColor(200);
        doc.setFillColor(245, 247, 250);
        doc.roundedRect(14, 35, 182, 35, 3, 3, 'FD');

        doc.setFontSize(10); doc.setTextColor(100);
        doc.text('TIPO DE EQUIPO', 20, 42);
        doc.text('MARCA', 80, 42);
        doc.text('MODELO', 140, 42);

        doc.setFontSize(12); doc.setTextColor(0); doc.setFont('helvetica', 'bold');
        doc.text((comp.type || 'N/A').toUpperCase(), 20, 48);
        doc.text((comp.brand || 'N/A').toUpperCase(), 80, 48);
        doc.text((comp.model || 'N/A').toUpperCase(), 140, 48);

        doc.setFontSize(10); doc.setTextColor(100); doc.setFont('helvetica', 'normal');
        doc.text('SERIAL', 20, 58);
        doc.text('ESTADO ACTUAL', 80, 58);
        doc.text('FECHA COMPRA', 140, 58);

        doc.setFontSize(12); doc.setTextColor(0); doc.setFont('helvetica', 'bold');
        doc.text(comp.serial || 'N/A', 20, 64);
        doc.text((comp.status || 'N/A').toUpperCase(), 80, 64);
        doc.text(comp.purchaseDate || 'N/A', 140, 64);


        // Specs Section
        doc.setFontSize(14); doc.setTextColor(...primaryColor);
        doc.text('Especificaciones Técnicas', 14, 85);

        const specsData = [
            ['Procesador', comp.processor],
            ['Memoria RAM', comp.ram],
            ['Almacenamiento', comp.storage],
            ['Sistema Operativo', comp.os],
            ['Ubicación', comp.location],
            ['Asignado a', comp.assignedTo]
        ];

        let yPos = 95;
        doc.setFontSize(10); doc.setTextColor(0); doc.setFont('helvetica', 'normal');

        specsData.forEach(([label, value]) => {
            doc.setFillColor(250);
            doc.rect(14, yPos - 4, 182, 8, 'F');
            doc.setFont('helvetica', 'bold');
            doc.text(label + ':', 20, yPos + 1);
            doc.setFont('helvetica', 'normal');
            doc.text(value || 'N/A', 80, yPos + 1);
            yPos += 10;
        });

        // Maintenance Logs
        yPos += 10;
        doc.setFontSize(14); doc.setTextColor(...primaryColor);
        doc.text('Historial de Mantenimientos', 14, yPos);
        yPos += 10;

        if (comp.maintenanceLog && comp.maintenanceLog.length > 0) {
            const tableBody = comp.maintenanceLog.map(log => [
                new Date(log.createdAt).toLocaleDateString(),
                log.activity,
                log.technician || 'N/A'
            ]);

            doc.autoTable({
                startY: yPos,
                head: [['Fecha', 'Actividad Realizada', 'Técnico']],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: primaryColor, textColor: 255 },
                styles: { fontSize: 9 }
            });
        } else {
            doc.setFontSize(10); doc.setTextColor(100);
            doc.text('No hay registros de mantenimiento.', 14, yPos + 5);
        }

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8); doc.setTextColor(150);
            doc.text(`Generado el: ${new Date().toLocaleDateString()} - ELSPEC ANDINA S.A.S`, 105, 290, { align: 'center' });
        }

        doc.save(`HojaDeVida_${comp.brand}_${comp.model}.pdf`);
    };

    return (
        <div className="glass-card" style={{ padding: '30px' }}>
            <h3 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Monitor color="var(--primary)" size={24} /> Mis Equipos Asignados
            </h3>

            {myComputers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: '15px' }}>
                    <p style={{ color: 'var(--text-muted)' }}>No tienes equipos de cómputo asignados actualmente.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {myComputers.map(comp => (
                        <div key={comp.id} style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '15px',
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '15px',
                            transition: 'transform 0.2s',
                            cursor: 'default'
                        }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>{comp.brand} {comp.model}</h4>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 'bold' }}>{comp.type}</span>
                                </div>
                                <div style={{
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    color: 'var(--success)',
                                    padding: '5px 10px',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    display: 'flex', alignItems: 'center', gap: '5px'
                                }}>
                                    <CheckCircle size={14} /> Asignado
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                <div>
                                    <strong>Serial:</strong><br />{comp.serial}
                                </div>
                                <div>
                                    <strong>Procesador:</strong><br />{comp.processor}
                                </div>
                                <div>
                                    <strong>RAM:</strong><br />{comp.ram}
                                </div>
                                <div>
                                    <strong>Almacenamiento:</strong><br />{comp.storage}
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px', marginTop: 'auto' }}>
                                <button
                                    onClick={() => generatePDF(comp)}
                                    className="btn-primary"
                                    style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
                                >
                                    <FileText size={18} /> Descargar Hoja de Vida
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default UserAssetsView;
