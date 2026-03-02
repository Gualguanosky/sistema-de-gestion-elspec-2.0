import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileText, Download, Calendar, Monitor, Activity, Filter, Server, Smartphone, Printer, Box } from 'lucide-react';
import logo from '../assets/logo.svg';

const ASSET_TYPES = [
    'Laptop', 'Desktop', 'Servidor', 'Impresora', 'Router', 'Switch',
    'Modem', 'Tablet', 'Smartphone', 'Scanner', 'Otro'
];

const ReportGenerator = ({ tickets, computers }) => {
    const [reportType, setReportType] = useState('tickets'); // 'tickets', 'assets', 'maintenance'
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    // Asset Report Filters
    const [selectedAssetTypes, setSelectedAssetTypes] = useState([]);
    const [isAssetFilterOpen, setIsAssetFilterOpen] = useState(false);

    // Ticket Report Filters
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedType, setSelectedType] = useState('all');

    const toggleAssetTypeFilter = (type) => {
        setSelectedAssetTypes(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        );
    };

    const getFilteredComputers = () => {
        if (selectedAssetTypes.length === 0) return computers || [];
        return (computers || []).filter(c => selectedAssetTypes.includes(c.type));
    };

    // Filter tickets by Date Range, Status and Type
    const filteredTickets = (tickets || []).filter(t => {
        if (!t.createdAt) return false;
        try {
            const ticketDate = new Date(t.createdAt).toISOString().split('T')[0];
            const dateOk = ticketDate >= dateRange.start && ticketDate <= dateRange.end;
            const statusOk = selectedStatus === 'all' || t.status === selectedStatus;
            const typeOk = selectedType === 'all' || t.type === selectedType;

            return dateOk && statusOk && typeOk;
        } catch (e) {
            return false;
        }
    });

    // --- SHARED PDF HELPERS ---
    const primaryColor = [0, 108, 224]; // Corporate Blue
    const secondaryColor = [100, 100, 100]; // Gray
    const lightBg = [245, 247, 250];

    // ... (keep drawHeader, drawFooter, drawKPI helpers same) ...

    const drawHeader = (doc, title, subtitle) => {
        const pageWidth = doc.internal.pageSize.width;
        // Logo
        try {
            const img = new Image();
            img.src = logo;
            doc.addImage(img, 'PNG', 14, 10, 30, 10);
        } catch (e) {
            console.warn("Logo not loaded");
        }

        // Top Bar
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, pageWidth, 5, 'F');

        // Company Name
        doc.setTextColor(0);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('ELSPEC ANDINA', 50, 20);

        // Subtitle / Slogan
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.setFont('helvetica', 'normal');
        doc.text('Soluciones en Calidad de Energía', 50, 25);

        // Separator
        doc.setDrawColor(200);
        doc.line(14, 30, pageWidth - 14, 30);

        // Report Title (If provided)
        if (title) {
            doc.setFontSize(18);
            doc.setTextColor(0);
            doc.setFont('helvetica', 'bold');
            doc.text(title, 14, 42);
        }
        if (subtitle) {
            doc.setFontSize(11);
            doc.setTextColor(...secondaryColor);
            doc.setFont('helvetica', 'normal');
            doc.text(subtitle, 14, 49);
        }
    };

    const drawFooter = (doc, pageNumber) => {
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const totalPages = doc.internal.getNumberOfPages();

        doc.setTextColor(150);
        doc.setFontSize(8);
        doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
        doc.text(`Confidencial - Uso Interno - Generado el ${new Date().toLocaleDateString()}`, 14, pageHeight - 10);
    };

    const drawKPI = (doc, x, y, width, height, label, value, color) => {
        doc.setFillColor(...lightBg);
        doc.setDrawColor(220);
        doc.roundedRect(x, y, width, height, 3, 3, 'FD');

        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.setFont('helvetica', 'normal');
        doc.text(label.toUpperCase(), x + 5, y + 8);

        doc.setFontSize(16);
        doc.setTextColor(...color);
        doc.setFont('helvetica', 'bold');
        doc.text(String(value), x + 5, y + 20);
    };

    const generateTicketReport = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        // Metrics
        const totalTickets = filteredTickets.length;
        const openTickets = filteredTickets.filter(t => t.status !== 'closed').length;
        const closedTickets = filteredTickets.filter(t => t.status === 'closed').length;

        const priorityCounts = filteredTickets.reduce((acc, t) => {
            acc[t.priority] = (acc[t.priority] || 0) + 1;
            return acc;
        }, { high: 0, medium: 0, low: 0 });

        // Calculate average rating only for closed tickets with feedback
        const feedbackStats = filteredTickets.reduce((acc, t) => {
            if (t.feedback && t.feedback.rating) {
                acc.sum += t.feedback.rating;
                acc.count += 1;
            }
            return acc;
        }, { sum: 0, count: 0 });
        const avgRating = feedbackStats.count > 0 ? (feedbackStats.sum / feedbackStats.count).toFixed(1) : 'N/A';

        // --- PAGE 1: EXECUTIVE SUMMARY ---
        drawHeader(doc, 'Resumen Ejecutivo de Servicios', `Periodo: ${dateRange.start} al ${dateRange.end}`);

        // KPIs
        const kpiY = 55;
        const kpiH = 25;
        const kpiW = (pageWidth - 34) / 4;

        drawKPI(doc, 14, kpiY, kpiW, kpiH, 'Total Tickets', totalTickets, primaryColor);
        drawKPI(doc, 14 + kpiW + 2, kpiY, kpiW, kpiH, 'Abiertos / Pend.', openTickets, [220, 38, 38]); // Red
        drawKPI(doc, 14 + (kpiW * 2) + 4, kpiY, kpiW, kpiH, 'Resueltos', closedTickets, [22, 163, 74]); // Green
        drawKPI(doc, 14 + (kpiW * 3) + 6, kpiY, kpiW, kpiH, 'Satisfacción', `${avgRating} / 5.0`, [245, 158, 11]); // Yellow

        // Intro
        let currentY = kpiY + kpiH + 15;
        doc.setFontSize(12); doc.setTextColor(...primaryColor); doc.setFont('helvetica', 'bold');
        doc.text('Detalle de Servicios Prestados:', 14, currentY);
        currentY += 6;
        doc.setFontSize(10); doc.setTextColor(60); doc.setFont('helvetica', 'normal');
        const introText = "A continuación se presenta el detalle de las solicitudes de soporte técnico gestionadas durante el periodo seleccionado. Incluye tanto incidentes resueltos como aquellos actualmente en proceso de atención.";
        doc.text(doc.splitTextToSize(introText, pageWidth - 28), 14, currentY);
        currentY += 20;

        // Table
        const tableColumn = ["ID", "Título", "Estado", "Prioridad", "Fecha Proceso", "Calif."];
        const tableRows = filteredTickets.map(ticket => [
            ticket.id ? ticket.id.slice(-6) : '',
            ticket.title || '',
            (ticket.status === 'closed' ? 'CERRADO' : 'ABIERTO'), // Simplified status
            (ticket.priority || '').toUpperCase(),
            ticket.closedAt ? new Date(ticket.closedAt).toLocaleDateString() : new Date(ticket.createdAt).toLocaleDateString(), // Show closed date if closed, else created date
            ticket.feedback ? `${ticket.feedback.rating}/5` : '-'
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: currentY,
            theme: 'grid',
            headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 9, fontStyle: 'bold' },
            bodyStyles: { fontSize: 8 },
            alternateRowStyles: { fillColor: lightBg },
            margin: { top: 35 } // Ensure space for header on new pages
        });

        // Add page numbers
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            if (i > 1) drawHeader(doc); // Re-draw header on subsequent pages (simple version)
            drawFooter(doc, i);
        }

        // --- DETAILED TICKET SECTION (Refined) ---
        doc.addPage();
        drawHeader(doc);
        currentY = 40;

        doc.setFontSize(16); doc.setTextColor(0); doc.setFont('helvetica', 'bold');
        doc.text('Fichas Detalladas de Servicio Técnico', 14, currentY);
        currentY += 15;

        filteredTickets.forEach((ticket) => {
            // Calculate height requirements roughly
            const descLines = doc.splitTextToSize(ticket.description || '', pageWidth - 40).length;
            const solLines = ticket.solution ? doc.splitTextToSize(ticket.solution, pageWidth - 40).length : 0;
            const estHeight = 60 + (descLines * 5) + (solLines * 5) + (ticket.feedback ? 30 : 0);

            if (currentY + estHeight > 280) {
                doc.addPage();
                drawHeader(doc);
                currentY = 40;
            }

            // --- TICKET CONTAINER ---

            // 1. Header Row (ID, Date, Priority, CreateAt)
            doc.setFillColor(...lightBg);
            doc.setDrawColor(200);
            doc.roundedRect(14, currentY, pageWidth - 28, 12, 2, 2, 'F');

            doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
            doc.text(`TICKET #${ticket.id ? ticket.id.slice(-6) : 'N/A'}`, 20, currentY + 8);

            doc.setFont('helvetica', 'normal'); doc.setTextColor(80);
            doc.text(`Fecha: ${new Date(ticket.createdAt).toLocaleDateString()}`, 60, currentY + 8);

            // Priority Badge (Text colored)
            const pColor = ticket.priority === 'high' ? [220, 38, 38] : ticket.priority === 'medium' ? [217, 119, 6] : [22, 163, 74];
            doc.setFont('helvetica', 'bold'); doc.setTextColor(...pColor);
            doc.text(`Prioridad: ${ticket.priority.toUpperCase()}`, 110, currentY + 8);

            doc.setTextColor(0);
            doc.text(`Solicitante: ${ticket.author}`, 160, currentY + 8);

            currentY += 18;

            // 2. Title
            doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...primaryColor);
            const titleLines = doc.splitTextToSize(ticket.title, pageWidth - 28);
            doc.text(titleLines, 14, currentY);
            currentY += (titleLines.length * 6) + 4;

            // 3. Description Box
            doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(50);
            doc.text('DESCRIPCIÓN DEL PROBLEMA:', 14, currentY);
            currentY += 5;

            doc.setFont('helvetica', 'normal'); doc.setTextColor(60);
            const dLines = doc.splitTextToSize(ticket.description || 'Sin detalles.', pageWidth - 34);
            // Draw gray background for description
            doc.setFillColor(250);
            const descBoxHeight = (dLines.length * 5) + 6;
            doc.rect(14, currentY - 4, pageWidth - 28, descBoxHeight, 'F');
            doc.text(dLines, 17, currentY);
            currentY += descBoxHeight + 6;

            // --- TICKET INITIAL IMAGE (imageUrl) ---
            if (ticket.imageUrl) {
                try {
                    const imgWidth = 80;
                    const imgHeight = 60;
                    if (currentY + imgHeight > 280) {
                        doc.addPage();
                        drawHeader(doc);
                        currentY = 40;
                    }
                    // If it's Base64, clean it or use directly. jsPDF handles data:image...
                    doc.addImage(ticket.imageUrl, 'JPEG', (pageWidth - imgWidth) / 2, currentY, imgWidth, imgHeight, undefined, 'FAST');
                    currentY += imgHeight + 10;
                } catch (err) {
                    console.warn("Error adding initial image to PDF:", err);
                }
            } else {
                currentY += 6;
            }

            // 4. Solution Box (if closed) or Status (if open)
            if (ticket.solution) {
                doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(22, 163, 74); // Green title
                doc.text('SOLUCIÓN TÉCNICA APLICADA:', 14, currentY);
                currentY += 5;

                doc.setFont('helvetica', 'normal'); doc.setTextColor(60);
                const sLines = doc.splitTextToSize(ticket.solution, pageWidth - 34);
                // Draw light green background
                doc.setFillColor(240, 253, 244);
                doc.rect(14, currentY - 4, pageWidth - 28, (sLines.length * 5) + 6, 'F');
                doc.text(sLines, 17, currentY);
                currentY += (sLines.length * 5) + 4;

                // Recommendation row if exists
                if (ticket.recommendation) {
                    currentY += 4;
                    doc.setFont('helvetica', 'bold'); doc.setTextColor(60);
                    doc.text('Recomendación:', 17, currentY);
                    doc.setFont('helvetica', 'normal');
                    const rLines = doc.splitTextToSize(ticket.recommendation, pageWidth - 60);
                    doc.text(rLines, 45, currentY);
                    currentY += (rLines.length * 5) + 6;
                } else {
                    currentY += 8;
                }
            } else {
                // If open, show status box
                doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(220, 38, 38); // Red title
                doc.text('ESTADO ACTUAL:', 14, currentY);
                currentY += 5;

                doc.setFont('helvetica', 'normal'); doc.setTextColor(60);
                const statusText = "Este ticket se encuentra actualmente ABIERTO y en proceso de atención.";
                const sLines = doc.splitTextToSize(statusText, pageWidth - 34);

                // Draw light red background
                doc.setFillColor(254, 242, 242);
                doc.rect(14, currentY - 4, pageWidth - 28, (sLines.length * 5) + 6, 'F');
                doc.text(sLines, 17, currentY);
                currentY += (sLines.length * 5) + 12;
            }

            // 5. User Feedback Section
            if (ticket.feedback) {
                // Divider line
                doc.setDrawColor(245, 158, 11);
                doc.setLineWidth(0.5);
                doc.line(14, currentY, pageWidth - 14, currentY);
                currentY += 6;

                doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(180, 83, 9);
                doc.text('EVALUACIÓN DEL SERVICIO', 14, currentY + 4);

                // Stars (Text representation)
                doc.setFontSize(12);
                const stars = "★".repeat(ticket.feedback.rating) + "☆".repeat(5 - ticket.feedback.rating);
                doc.text(stars, 70, currentY + 4);
                doc.setFontSize(9);

                if (ticket.feedback.comment) {
                    doc.setFont('helvetica', 'italic'); doc.setTextColor(80);
                    const cLines = doc.splitTextToSize(`"${ticket.feedback.comment}"`, pageWidth - 110);
                    doc.text(cLines, 100, currentY + 4);
                    currentY += Math.max(10, (cLines.length * 4) + 10);
                } else {
                    currentY += 12;
                }
            } else {
                currentY += 10; // Spacing if no feedback
            }

            // 6. Attachments Section (Initial Attachments & Resolution Evidence)
            const allEvidence = [
                ...(ticket.attachments || []),
                ...(ticket.resolutionAttachments || [])
            ];

            if (allEvidence.length > 0) {
                // Check if there are any images
                const imageAttachments = allEvidence.filter(att =>
                    att.type?.startsWith('image/') ||
                    att.name?.match(/\.(jpg|jpeg|png|gif)$/i) ||
                    (att.url && att.url.startsWith('data:image'))
                );

                if (imageAttachments.length > 0) {
                    currentY += 10;

                    // Page break check for header
                    if (currentY + 20 > 280) {
                        doc.addPage();
                        drawHeader(doc);
                        currentY = 40;
                    }

                    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
                    doc.text('EVIDENCIA ADJUNTA (RESOLUCIÓN/OTROS):', 14, currentY);
                    currentY += 8;

                    imageAttachments.forEach((att, index) => {
                        try {
                            const imgWidth = 120;
                            const imgHeight = 90;

                            // Check space
                            if (currentY + imgHeight > 280) {
                                doc.addPage();
                                drawHeader(doc);
                                currentY = 40;
                            }

                            if (att.url && att.url.startsWith('data:image')) {
                                doc.addImage(att.url, 'JPEG', 45, currentY, imgWidth, imgHeight, undefined, 'FAST');
                                doc.setFontSize(8); doc.setTextColor(100);
                                doc.text(`Evidencia ${index + 1}: ${att.name || 'Imagen'}`, 45, currentY + imgHeight + 4);
                                currentY += imgHeight + 15;
                            }
                        } catch (err) {
                            console.warn("Error adding evidence image to PDF:", err);
                        }
                    });
                }
            }

            // Bottom Border for entire ticket card
            doc.setDrawColor(200);
            doc.setLineWidth(0.5);
            doc.line(14, currentY - 2, pageWidth - 14, currentY - 2);

            currentY += 10; // Margin between tickets
        });

        doc.save(`Informe_Soporte_${dateRange.end}.pdf`);
    };

    const generateAssetReport = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const comps = getFilteredComputers();

        // Metrics
        const total = comps.length;
        const active = comps.filter(c => c.status === 'Active').length;
        const stock = comps.filter(c => c.status === 'Stock').length;
        const maintenance = comps.filter(c => c.status === 'Maintenance').length;

        // --- PAGE 1: EXECUTIVE SUMMARY ---
        drawHeader(doc, 'Inventario General de Activos IT', `Fecha de Corte: ${new Date().toLocaleDateString()}`);

        // KPIs
        const kpiY = 55;
        const kpiH = 25;
        const kpiW = (pageWidth - 34) / 4;

        drawKPI(doc, 14, kpiY, kpiW, kpiH, 'Total Equipos', total, primaryColor);
        drawKPI(doc, 14 + kpiW + 2, kpiY, kpiW, kpiH, 'En Uso (Asignados)', active, [22, 163, 74]); // Green
        drawKPI(doc, 14 + (kpiW * 2) + 4, kpiY, kpiW, kpiH, 'En Stock', stock, [245, 158, 11]); // Yellow
        drawKPI(doc, 14 + (kpiW * 3) + 6, kpiY, kpiW, kpiH, 'Mantenimiento', maintenance, [220, 38, 38]); // Red

        // Intro
        let currentY = kpiY + kpiH + 15;
        doc.setFontSize(12); doc.setTextColor(...primaryColor); doc.setFont('helvetica', 'bold');
        doc.text('Estado del Parque Informático:', 14, currentY);
        currentY += 6;
        doc.setFontSize(10); doc.setTextColor(60); doc.setFont('helvetica', 'normal');
        const introText = "Informe detallado de los activos tecnológicos registrados en el sistema. Incluye equipos de cómputo asignados a usuarios, equipos disponibles en inventario y aquellos que se encuentran en procesos de reparación o baja.";
        doc.text(doc.splitTextToSize(introText, pageWidth - 28), 14, currentY);
        currentY += 20;

        // Table
        const tableData = comps.map(comp => [
            comp.name || `${comp.brand} ${comp.model}`,
            comp.type || 'N/A',
            comp.serial || 'N/A',
            comp.assignedTo || '---',
            comp.location || 'N/A',
            comp.status === 'Active' ? 'EN USO' : comp.status === 'Stock' ? 'DISPONIBLE' : comp.status.toUpperCase()
        ]);

        autoTable(doc, {
            head: [['Equipo / Modelo', 'Tipo', 'Serial', 'Asignado A', 'Ubicación', 'Estado', 'Fallas']],
            body: tableData.map(row => {
                // Find original computer object to check fault status
                const comp = comps.find(c => c.serial === row[2] || (c.name === row[0]));
                const hasFault = comp?.hasFault ? 'SÍ' : 'NO';
                return [...row, hasFault];
            }),
            startY: currentY,
            theme: 'striped',
            headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 9 },
            bodyStyles: { fontSize: 8 },
            alternateRowStyles: { fillColor: lightBg },
            margin: { top: 35 }
        });

        // --- DETAILED SECTION (New) ---
        doc.addPage();
        drawHeader(doc);
        currentY = 40;

        doc.setFontSize(14); doc.setTextColor(0); doc.setFont('helvetica', 'bold');
        doc.text('Fichas Técnicas Resumidas', 14, currentY);
        currentY += 10;

        comps.forEach((comp, index) => {
            // Check page break
            if (currentY + 40 > 280) {
                doc.addPage();
                drawHeader(doc);
                currentY = 40;
            }

            // Asset Card
            doc.setFillColor(250, 250, 250);
            doc.setDrawColor(220);
            doc.roundedRect(14, currentY, pageWidth - 28, 35, 2, 2, 'FD');

            // Left: Icon + Main Info
            doc.setFontSize(12); doc.setTextColor(0); doc.setFont('helvetica', 'bold');
            doc.text(`${comp.brand} ${comp.model}`.toUpperCase(), 25, currentY + 10);

            doc.setFontSize(9); doc.setTextColor(100); doc.setFont('helvetica', 'normal');
            doc.text(`Serial: ${comp.serial}`, 25, currentY + 16);
            doc.text(`Tipo: ${comp.type}`, 25, currentY + 22);

            // Middle: Specs
            doc.setFontSize(9); doc.setTextColor(0); doc.setFont('helvetica', 'bold');
            doc.text('Especificaciones:', 90, currentY + 10);
            doc.setFont('helvetica', 'normal'); doc.setTextColor(80);
            doc.text(`CPU: ${comp.processor || 'N/A'}`, 90, currentY + 16);
            doc.text(`RAM: ${comp.ram || 'N/A'} | HDD: ${comp.storage || 'N/A'}`, 90, currentY + 22);
            doc.text(`OS: ${comp.os || 'N/A'}`, 90, currentY + 28);

            // Right: Status & Assignment
            doc.setFontSize(9); doc.setTextColor(0); doc.setFont('helvetica', 'bold');
            doc.text('Asignación:', 150, currentY + 10);
            doc.setFont('helvetica', 'normal'); doc.setTextColor(80);
            doc.text(`Usuario: ${comp.assignedTo || '---'}`, 150, currentY + 16);
            doc.text(`Ubicación: ${comp.location || 'N/A'}`, 150, currentY + 22);

            // Status Tag
            const statusColor = comp.status === 'Active' ? [22, 163, 74] : comp.status === 'Stock' ? [245, 158, 11] : [220, 38, 38];
            doc.setTextColor(...statusColor); doc.setFont('helvetica', 'bold');
            doc.text(comp.status.toUpperCase(), 150, currentY + 28);

            // Fault Warning in Detailed Section
            if (comp.hasFault) {
                doc.setFillColor(254, 242, 242); // Light red bg
                doc.setDrawColor(220, 38, 38); // Red border
                doc.roundedRect(25, currentY + 32, pageWidth - 50, 12, 1, 1, 'FD');

                doc.setFontSize(8); doc.setTextColor(185, 28, 28); doc.setFont('helvetica', 'bold');
                doc.text('REPORTE DE FALLA ACTIV0:', 28, currentY + 37);
                doc.setFont('helvetica', 'normal');
                doc.text(comp.faultDescription || 'Sin detalles', 28, currentY + 41);

                // Adjust Y for next item if fault section was added
                currentY += 15;
            }

            currentY += 40;
        });

        // Add Header/Footer to all pages
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            if (i > 1) drawHeader(doc); // Simple header for next pages
            drawFooter(doc, i);
        }

        doc.save(`Inventario_IT_Completo_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const generateMaintenanceReport = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const comps = getFilteredComputers();

        // Metrics Helpers
        const getMaintStatus = (computer) => {
            if (!computer.maintenanceLog || computer.maintenanceLog.length === 0) return { status: 'Pendiente', color: [100, 100, 100] };
            const lastMaint = new Date(computer.maintenanceLog[computer.maintenanceLog.length - 1].createdAt || computer.maintenanceLog[computer.maintenanceLog.length - 1].date);

            // Fixed Deadlines Logic: July 15 and Nov 15
            const currentYear = new Date().getFullYear();
            let nextMaint;

            if (lastMaint.getFullYear() < currentYear) {
                // Last maint was last year -> Due July 15 this year
                nextMaint = new Date(currentYear, 6, 15);
            } else {
                // Last maint was this year
                // If done Jan-July (Month <= 6) -> Due Nov 15
                if (lastMaint.getMonth() <= 6) {
                    nextMaint = new Date(currentYear, 10, 15);
                } else {
                    // Done Aug-Dec -> Due July 15 next year
                    nextMaint = new Date(currentYear + 1, 6, 15);
                }
            }
            const now = new Date();
            const diffDays = Math.ceil((nextMaint - now) / (1000 * 60 * 60 * 24));

            if (diffDays < 0) return { status: 'Vencido', color: [220, 38, 38] };
            if (diffDays <= 30) return { status: 'Próximo', color: [234, 179, 8] };
            return { status: 'Al Día', color: [22, 163, 74] };
        };

        // Calc Metrics
        const total = comps.length;
        const overdue = comps.filter(c => getMaintStatus(c).status === 'Vencido').length;
        const warning = comps.filter(c => getMaintStatus(c).status === 'Próximo').length;
        const ok = comps.filter(c => getMaintStatus(c).status === 'Al Día').length;

        // --- PAGE 1: EXECUTIVE SUMMARY ---
        drawHeader(doc, 'Informe de Mantenimiento Preventivo', `Fecha de Generación: ${new Date().toLocaleDateString()}`);

        // KPIs
        const kpiY = 55;
        const kpiH = 25;
        const kpiW = (pageWidth - 34) / 4;

        drawKPI(doc, 14, kpiY, kpiW, kpiH, 'Total Equipos', total, primaryColor);
        drawKPI(doc, 14 + kpiW + 2, kpiY, kpiW, kpiH, 'Al Día (OK)', ok, [22, 163, 74]);
        drawKPI(doc, 14 + (kpiW * 2) + 4, kpiY, kpiW, kpiH, 'Atención Req.', warning, [234, 179, 8]);
        drawKPI(doc, 14 + (kpiW * 3) + 6, kpiY, kpiW, kpiH, 'Vencidos / Crítico', overdue, [220, 38, 38]);

        // Intro
        let currentY = kpiY + kpiH + 15;
        doc.setFontSize(12); doc.setTextColor(...primaryColor); doc.setFont('helvetica', 'bold');
        doc.text('Análisis de Salud del Parque Informático:', 14, currentY);
        currentY += 6;
        doc.setFontSize(10); doc.setTextColor(60); doc.setFont('helvetica', 'normal');
        const introText = "Este informe presenta el estado actual del cronograma de mantenimiento preventivo. Se identifican los equipos que requieren atención inmediata (Vencidos) y aquellos próximos a su fecha de servicio, permitiendo una planificación eficiente de los recursos técnicos.";
        doc.text(doc.splitTextToSize(introText, pageWidth - 28), 14, currentY);
        currentY += 20;

        // Table
        const tableData = comps.map(comp => {
            const statusInfo = getMaintStatus(comp);
            const lastMaint = comp.maintenanceLog?.length > 0
                ? new Date(comp.maintenanceLog[comp.maintenanceLog.length - 1].createdAt || comp.maintenanceLog[comp.maintenanceLog.length - 1].date).toLocaleDateString()
                : 'Sin Registros';

            return [
                comp.name || `${comp.brand} ${comp.model}`,
                comp.serial || 'N/A',
                comp.assignedTo || 'Stock',
                lastMaint,
                statusInfo.status.toUpperCase()
            ];
        });

        autoTable(doc, {
            head: [['Equipo', 'Serial', 'Usuario / Ubicación', 'Último Mant.', 'Estado Actual']],
            body: tableData,
            startY: currentY,
            theme: 'grid',
            headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 9 },
            bodyStyles: { fontSize: 8 },
            alternateRowStyles: { fillColor: lightBg },
            margin: { top: 35 },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 4) {
                    const status = data.cell.raw;
                    if (status === 'VENCIDO') data.cell.styles.textColor = [220, 38, 38];
                    if (status === 'PRÓXIMO') data.cell.styles.textColor = [217, 119, 6];
                    if (status === 'AL DÍA') data.cell.styles.textColor = [22, 163, 74];
                }
            }
        });

        // --- DETAILED HISTORICAL SECTION (New) ---
        doc.addPage();
        drawHeader(doc);
        currentY = 40;

        doc.setFontSize(14); doc.setTextColor(0); doc.setFont('helvetica', 'bold');
        doc.text('Historial de Mantenimientos por Equipo', 14, currentY);
        currentY += 15;

        comps.forEach((comp, index) => {
            // Check page break
            const logCount = comp.maintenanceLog?.length || 0;
            const neededHeight = 35 + (logCount * 10);
            if (currentY + neededHeight > 280) {
                doc.addPage();
                drawHeader(doc);
                currentY = 40;
            }

            // Asset Header
            doc.setFillColor(245, 245, 245);
            doc.rect(14, currentY, pageWidth - 28, 8, 'F');
            doc.setFontSize(10); doc.setTextColor(0); doc.setFont('helvetica', 'bold');
            doc.text(`${comp.brand} ${comp.model} (${comp.serial})`, 16, currentY + 5.5);

            // Health Status Indicator
            const statusInfo = getMaintStatus(comp);
            doc.setTextColor(...statusInfo.color);
            doc.text(statusInfo.status.toUpperCase(), pageWidth - 30, currentY + 5.5, { align: 'right' });

            currentY += 12;

            // Logs Table
            if (logCount > 0) {
                const logs = comp.maintenanceLog.slice(-3); // Last 3 logs
                logs.forEach(log => {
                    doc.setFontSize(9); doc.setTextColor(80); doc.setFont('helvetica', 'normal');
                    const dateStr = new Date(log.createdAt || log.date).toLocaleDateString();
                    doc.text(`• ${dateStr}`, 20, currentY);
                    doc.text(`${log.activity} (Téc: ${log.technician || 'Admin'})`, 50, currentY);
                    currentY += 6;
                });
            } else {
                doc.setFontSize(9); doc.setTextColor(150); doc.setFont('helvetica', 'italic');
                doc.text('   Sin registros de mantenimiento.', 20, currentY);
                currentY += 6;
            }

            currentY += 8; // Spacing between items
        });

        // Add Header/Footer to all pages
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            if (i > 1) drawHeader(doc);
            drawFooter(doc, i);
        }

        doc.save(`Plan_Mantenimiento_Completo_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const countFeedback = filteredTickets.reduce((acc, t) => {
        if (t.feedback && t.feedback.rating) {
            acc.sum += t.feedback.rating;
            acc.count += 1;
        }
        return acc;
    }, { sum: 0, count: 0 });
    const avgRating = countFeedback.count > 0 ? (countFeedback.sum / countFeedback.count).toFixed(1) : 'N/A';

    return (
        <div className="glass-card" style={{ padding: 'clamp(15px, 4vw, 30px)' }}>
            {/* Professional Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', flexWrap: 'wrap', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(10px, 3vw, 15px)' }}>
                    <img src={logo} alt="ELSPEC Logo" style={{ height: 'clamp(35px, 6vw, 50px)' }} />
                    <div>
                        <h2 style={{ margin: 0, fontSize: 'clamp(1.2rem, 3vw, 1.5rem)', background: 'linear-gradient(90deg, #fff, #aaa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            ELSPEC ANDINA
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)' }}>
                            <FileText size={16} color="var(--primary)" /> <span className="hide-mobile">Centro de Inteligencia y </span>Reportes IT
                        </div>
                    </div>
                </div>

                {/* Report Type Selector */}
                <div style={{ position: 'relative', minWidth: '250px', flex: '1 1 auto' }}>
                    <select
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px 20px',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid var(--primary)',
                            borderRadius: '12px',
                            color: 'white',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            outline: 'none',
                            fontWeight: 'bold'
                        }}
                    >
                        <option value="tickets" style={{ background: '#1e293b' }}>📄 Informe de Asistencia Técnica</option>
                        <option value="assets" style={{ background: '#1e293b' }}>🖥️ Inventario General de Activos</option>
                        <option value="maintenance" style={{ background: '#1e293b' }}>🛠️ Estado de Mantenimiento</option>
                    </select>
                </div>
            </div>

            {/* Content Switcher */}
            {reportType === 'tickets' && (
                <>
                    {/* KPI Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                        <div style={{ background: 'rgba(0, 108, 224, 0.1)', border: '1px solid rgba(0, 108, 224, 0.3)', borderRadius: '15px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)' }}>{filteredTickets.length}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tickets en Rango</div>
                        </div>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '15px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--success)' }}>{filteredTickets.filter(t => t.status === 'closed').length}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Resueltos</div>
                        </div>
                        <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '15px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--warning)' }}>{avgRating}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Satisfacción (1-5)</div>
                        </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: 'clamp(15px, 4vw, 25px)', borderRadius: '15px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(150px, 45%, 200px), 1fr))', gap: '20px', alignItems: 'end' }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Calendar size={14} /> Fecha Inicio
                                </label>
                                <input
                                    type="date"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                    style={{ background: 'rgba(0,0,0,0.3)' }}
                                />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Calendar size={14} /> Fecha Fin
                                </label>
                                <input
                                    type="date"
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                    style={{ background: 'rgba(0,0,0,0.3)' }}
                                />
                            </div>

                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Filter size={14} /> Estado
                                </label>
                                <select
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                    style={{ background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px' }}
                                >
                                    <option value="all">Todos los estados</option>
                                    <option value="open">Abierto / Pendiente</option>
                                    <option value="in_progress">En Progreso</option>
                                    <option value="closed">Cerrado / Resuelto</option>
                                </select>
                            </div>

                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Filter size={14} /> Tipo de Ticket
                                </label>
                                <select
                                    value={selectedType}
                                    onChange={(e) => setSelectedType(e.target.value)}
                                    style={{ background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px' }}
                                >
                                    <option value="all">Todos los tipos</option>
                                    <option value="soporte">Soporte Técnico</option>
                                    <option value="pqr">PQR (Petición/Queja/Reclamo)</option>
                                    <option value="info">Información</option>
                                    <option value="otro">Otro</option>
                                </select>
                            </div>

                            <button
                                onClick={generateTicketReport}
                                disabled={filteredTickets.length === 0}
                                className="btn-primary"
                                style={{
                                    height: '48px',
                                    padding: '0 30px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    background: filteredTickets.length === 0 ? 'rgba(255,255,255,0.05)' : 'var(--primary)',
                                    cursor: filteredTickets.length === 0 ? 'not-allowed' : 'pointer'
                                }}
                            >
                                <Download size={20} /> Generar Informe (PDF)
                            </button>
                        </div>
                        {filteredTickets.length === 0 && (
                            <p style={{ marginTop: '20px', color: 'var(--warning)', fontSize: '0.9rem', textAlign: 'center' }}>
                                * No se encontraron tickets cerrados en el rango de fechas seleccionado.
                            </p>
                        )}
                    </div>
                </>
            )}

            {reportType === 'assets' && (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '25px', borderRadius: '15px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <Monitor size={48} color="var(--primary)" style={{ marginBottom: '20px' }} />
                    <h3 style={{ marginBottom: '10px' }}>Inventario Completo de Activos IT</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Genera un reporte detallado de todo el hardware registrado en el sistema.</p>

                    {/* Asset Filter UI */}
                    <div style={{ marginBottom: '25px', maxWidth: '400px', margin: '0 auto 25px auto', position: 'relative' }}>
                        <button
                            onClick={() => setIsAssetFilterOpen(!isAssetFilterOpen)}
                            className="btn-secondary"
                            style={{
                                width: '100%',
                                padding: '12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--border-color)',
                                color: 'white',
                                borderRadius: '10px',
                                cursor: 'pointer'
                            }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Filter size={16} />
                                {selectedAssetTypes.length === 0 ? 'Incluir: Todos los Tipos' : `Incluir: ${selectedAssetTypes.length} seleccionados`}
                            </span>
                            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>▼</span>
                        </button>

                        {isAssetFilterOpen && (
                            <div style={{
                                position: 'absolute', top: '100%', left: 0, width: '100%', marginTop: '5px',
                                background: '#1e293b', border: '1px solid var(--border-color)', borderRadius: '10px',
                                padding: '15px', zIndex: 50, boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                textAlign: 'left', maxHeight: '300px', overflowY: 'auto'
                            }}>
                                <div style={{ marginBottom: '10px', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Seleccione Tipos:</span>
                                    <span style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => setSelectedAssetTypes([])}>Limpiar Filtros</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                                    {ASSET_TYPES.map(type => (
                                        <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px', cursor: 'pointer', fontSize: '0.9rem', borderRadius: '5px', background: selectedAssetTypes.includes(type) ? 'rgba(0, 108, 224, 0.1)' : 'transparent' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedAssetTypes.includes(type)}
                                                onChange={() => toggleAssetTypeFilter(type)}
                                            />
                                            {type}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={generateAssetReport}
                        className="btn-primary"
                        style={{ padding: '15px 30px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px', margin: '0 auto' }}
                    >
                        <Download size={20} /> Descargar Reporte de Inventario
                    </button>
                    {selectedAssetTypes.length > 0 && (
                        <p style={{ marginTop: '10px', fontSize: '0.85rem', color: 'var(--primary)' }}>
                            * Filtrado por: {selectedAssetTypes.join(', ')}
                        </p>
                    )}
                </div>
            )}

            {reportType === 'maintenance' && (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '25px', borderRadius: '15px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <Activity size={48} color="var(--warning)" style={{ marginBottom: '20px' }} />
                    <h3 style={{ marginBottom: '10px' }}>Estado de Mantenimiento Preventivo</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
                        Informe de salud del parque informático, identificando equipos críticos, vencidos y próximos a mantenimiento.
                    </p>
                    <button
                        onClick={generateMaintenanceReport}
                        className="btn-primary"
                        style={{ background: 'var(--warning)', color: 'black', padding: '15px 30px', display: 'inline-flex', alignItems: 'center', gap: '10px' }}
                    >
                        <Download size={20} /> Descargar Informe de Salud (PDF)
                    </button>
                </div>
            )}

        </div>
    );
};

export default ReportGenerator;
