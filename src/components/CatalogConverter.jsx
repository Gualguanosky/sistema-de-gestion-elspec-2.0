import React, { useState, useCallback } from 'react';
import { Upload, FileText, ArrowRight, Download, RefreshCw, CheckCircle, AlertCircle, X, Settings2, Sparkles } from 'lucide-react';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import { GoogleGenAI } from '@google/genai';
import db from '../services/db';

// Cargar worker de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const TARGET_COLUMNS = [
    { key: 'item', label: 'REFERENCIA / ITEM' },
    { key: 'price', label: 'PRECIO USD MSRP' },
    { key: 'family', label: 'FAMILIA / CATEGORÍA', optional: true },
    { key: 'discount', label: 'DESCUENTO (Factory Discount2)', optional: true },
    { key: 'info', label: 'APERTURA / INFO', optional: true }
];

const CatalogConverter = () => {
    // Cola de archivos
    const [filesQueue, setFilesQueue] = useState([]);
    const [currentFileIndex, setCurrentFileIndex] = useState(0);

    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null); // { type: 'success'|'error'|'info', message: '' }
    const [step, setStep] = useState(1); // 1: Upload, 2: Map Columns, 3: Preview/Download
    const [aiExtracting, setAiExtracting] = useState(false);
    const [uploadingToDB, setUploadingToDB] = useState(false);

    // Datos parseados
    const [rawHeaders, setRawHeaders] = useState([]);
    const [rawData, setRawData] = useState([]);

    // Mapeo actual
    const [columnMap, setColumnMap] = useState({
        item: '',
        price: '',
        family: '',
        discount: '',
        info: ''
    });

    const [convertedData, setConvertedData] = useState([]); // Datos del archivo actual
    const [allConvertedData, setAllConvertedData] = useState([]); // Datos acumulados de todos los archivos

    const handleFileUpload = async (event) => {
        const uploadedFiles = Array.from(event.target.files);
        if (uploadedFiles.length === 0) return;

        setFilesQueue(uploadedFiles);
        setCurrentFileIndex(0);
        setAllConvertedData([]);
        setLoading(true);
        setStatus(null);
        setStep(1);

        await processQueueFile(uploadedFiles, 0);

        event.target.value = ''; // Reset input
    };

    const processQueueFile = async (queue, index) => {
        if (index >= queue.length) {
            // Terminamos de procesar todos los archivos, ir al paso 3 final
            setStep(3);
            setLoading(false);
            setStatus({ type: 'success', message: `Todos los archivos procesados. ${allConvertedData.length} productos listos en total.` });
            return;
        }

        const currentFile = queue[index];
        setLoading(true);
        setStatus({ type: 'info', message: `Procesando archivo ${index + 1} de ${queue.length}: ${currentFile.name}...` });

        // Reset mapping para el nuevo archivo
        setColumnMap({ item: '', price: '', family: '', discount: '', info: '' });

        try {
            if (currentFile.name.toLowerCase().endsWith('.pdf')) {
                await processPDF(currentFile);
            } else if (currentFile.name.toLowerCase().endsWith('.xlsx') || currentFile.name.toLowerCase().endsWith('.xls') || currentFile.name.toLowerCase().endsWith('.csv')) {
                await processExcel(currentFile);
            } else {
                throw new Error("Formato de archivo no soportado. Usa Excel o PDF.");
            }
        } catch (error) {
            console.error("Error processing file:", error);
            setStatus({ type: 'error', message: `Error en ${currentFile.name}: ${error.message}` });
            setLoading(false);
        }
    };

    const processExcel = async (fileObj) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

                    if (jsonData.length < 2) throw new Error("El Excel está vacío o no tiene suficientes filas.");

                    // Encontrar la fila de cabeceras (asumiendo que está en las primeras 10 filas)
                    let headerRowIndex = 0;
                    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
                        if (jsonData[i].length > 2) { // Asumimos que la cabecera tiene más de 2 columnas
                            headerRowIndex = i;
                            break;
                        }
                    }

                    const headers = jsonData[headerRowIndex].map(h => String(h || '').trim()).filter(h => h);
                    const dataRows = jsonData.slice(headerRowIndex + 1).filter(row => row && row.length > 0);

                    // Convertir a array de objetos basado en las cabeceras
                    const parsedData = dataRows.map(row => {
                        const obj = {};
                        headers.forEach((h, index) => {
                            obj[h] = row[index] !== undefined ? row[index] : '';
                        });
                        return obj;
                    });

                    setRawHeaders(headers);
                    setRawData(parsedData);
                    autoMapColumns(headers);
                    setStep(2); // Ir al paso de mapeo
                    resolve();
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(fileObj);
        });
    };

    const processPDF = async (fileObj) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const typedarray = new Uint8Array(e.target.result);
                    const pdf = await pdfjsLib.getDocument(typedarray).promise;

                    let fullTextLines = [];

                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();

                        // Ordenar elementos por su posición Y (de arriba abajo), luego X (izquierda a derecha)
                        const items = textContent.items.sort((a, b) => {
                            // Si están en la misma línea "aproximadamente" (diferencia Y < 5)
                            if (Math.abs(a.transform[5] - b.transform[5]) < 5) {
                                return a.transform[4] - b.transform[4]; // Ordenar por X
                            }
                            return b.transform[5] - a.transform[5]; // Ordenar por Y (descendente porque el origen está abajo)
                        });

                        // Agrupar en líneas
                        let currentLineY = null;
                        let currentLineText = [];

                        for (const item of items) {
                            if (currentLineY === null || Math.abs(item.transform[5] - currentLineY) > 5) {
                                if (currentLineText.length > 0) {
                                    fullTextLines.push(currentLineText.join('  |  ')); // Separador artificial para tratar de simular columnas
                                }
                                currentLineY = item.transform[5];
                                currentLineText = [item.str.trim()];
                            } else {
                                currentLineText.push(item.str.trim());
                            }
                        }
                        if (currentLineText.length > 0) {
                            fullTextLines.push(currentLineText.join('  |  '));
                        }
                    }

                    // Limpiar líneas vacías
                    fullTextLines = fullTextLines.filter(line => line.replace(/\|/g, '').trim().length > 0);

                    if (fullTextLines.length < 2) throw new Error("No se pudo extraer texto suficiente del PDF.");

                    // Convertir el texto a algo similar a un Excel
                    // Advertencia: esto es muy básico y dependerá de la estructura del PDF

                    // Tratamos de buscar la "cabecera"
                    let headerTokens = [];
                    let dataRows = [];
                    let foundHeader = false;

                    for (const line of fullTextLines) {
                        const tokens = line.split('  |  ').filter(t => t.trim());
                        if (tokens.length >= 2) {
                            if (!foundHeader) {
                                headerTokens = tokens.map((t, i) => `Columna_${i + 1} (${t.substring(0, 10)}...)`);
                                foundHeader = true;

                                // Añadimos la primera como data por si acaso no era cabecera real
                                const obj = {};
                                headerTokens.forEach((h, i) => obj[h] = tokens[i] || '');
                                dataRows.push(obj);
                            } else {
                                const obj = {};
                                headerTokens.forEach((h, i) => obj[h] = tokens[i] || '');
                                dataRows.push(obj);
                            }
                        }
                    }

                    if (headerTokens.length === 0) {
                        // Plan B: Textos sin columnas claras, los metemos en una sola columna para que el usuario corte
                        headerTokens = ["TextoCompleto"];
                        dataRows = fullTextLines.map(line => ({ "TextoCompleto": line }));
                        setStatus({ type: 'warning', message: 'El PDF no tenía columnas claras. Se extrajo todo como texto. Puede ser difícil convertir esto.' });
                    } else {
                        setStatus({ type: 'info', message: 'PDF extraído en formato tabla temporal. VERIFICA LAS COLUMNAS.' });
                    }

                    setRawHeaders(headerTokens);
                    setRawData(dataRows);
                    autoMapColumns(headerTokens);
                    setStep(2);
                    resolve();

                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(fileObj);
        });
    };

    const autoMapColumns = (headers) => {
        let newMap = { item: '', price: '', family: '', discount: '', info: '' };

        const lowerHeaders = headers.map(h => h.toLowerCase());

        lowerHeaders.forEach((h, i) => {
            const orig = headers[i];
            if (!newMap.item && (h.includes('ref') || h.includes('item') || h.includes('codigo') || h.includes('modelo') || h.includes('producto') || h.includes('part number'))) newMap.item = orig;
            if (!newMap.price && (h.includes('precio') || h.includes('price') || h.includes('usd') || h.includes('msrp') || h.includes('valor'))) newMap.price = orig;
            if (!newMap.family && (h.includes('familia') || h.includes('family') || h.includes('categoria') || h.includes('kind') || h.includes('grupo') || h.includes('linea'))) newMap.family = orig;
            if (!newMap.discount && (h.includes('desc') || h.includes('fact') || h.includes('dto'))) newMap.discount = orig;
            if (!newMap.info && (h.includes('aper') || h.includes('info') || h.includes('descrip'))) newMap.info = orig;
        });

        setColumnMap(newMap);
    };

    const handleGenerate = () => {
        if (!columnMap.item || !columnMap.price) {
            setStatus({ type: 'error', message: 'Debes seleccionar al menos las columnas para REFERENCIA y PRECIO.' });
            return;
        }

        const newConverted = rawData.map(row => {
            return {
                'REFERENCIA': row[columnMap.item] ? String(row[columnMap.item]).trim() : '',
                'PRECIO USD MSRP': row[columnMap.price] ? extractNumber(String(row[columnMap.price])) : 0,
                'FAMILIA': columnMap.family && row[columnMap.family] ? String(row[columnMap.family]).trim() : 'General',
                'Factory Discount2': columnMap.discount && row[columnMap.discount] ? extractNumber(String(row[columnMap.discount])) : 0,
                'APERTURA': columnMap.info && row[columnMap.info] ? String(row[columnMap.info]).trim() : ''
            };
        }).filter(row => row['REFERENCIA'] && row['REFERENCIA'] !== ''); // Filtrar filas sin referencia

        if (newConverted.length === 0) {
            setStatus({ type: 'error', message: 'No se generó ningún producto válido. Verifica el mapeo de columnas.' });
            return;
        }

        // Acumular los datos
        setAllConvertedData(prev => [...prev, ...newConverted]);
        handleNextFile();
    };

    const handleNextFile = () => {
        const nextIndex = currentFileIndex + 1;
        setCurrentFileIndex(nextIndex);

        if (nextIndex < filesQueue.length) {
            // Procesar el siguiente
            processQueueFile(filesQueue, nextIndex);
        } else {
            // Finalizar e ir al paso 3
            setStep(3);
            setStatus({ type: 'success', message: 'Todos los archivos procesados con éxito.' });
        }
    };

    const handleAIExtract = async () => {
        try {
            setAiExtracting(true);
            setStatus({ type: 'info', message: 'Iniciando conexión con Inteligencia Artificial. Esto puede demorar unos 10-20 segundos...' });

            // 1. Get the Key
            const config = await db.getGlobalConfig();
            if (!config || !config.geminiApiKey) {
                throw new Error("La clave de Gemini API no está configurada. Pide a un Administrador que la guarde en Ajustes.");
            }

            const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

            // 2. Prepare data
            let rawTextForPrompt = JSON.stringify(rawData);

            // Limit text to avoid giant context costs (roughly ~35k chars is safe and covers most catalogues)
            if (rawTextForPrompt.length > 35000) {
                rawTextForPrompt = rawTextForPrompt.substring(0, 35000);
                console.warn("Texto muy largo, truncado por límites de seguridad.");
            }

            const prompt = `
Eres un experto extrayendo datos de listas de precios de componentes eléctricos y catálogos de proveedores.
Convierte la siguiente tabla desordenada (datos en formato crudo/JSON) en un arreglo JSON estricto y perfecto de productos.
DEBES usar EXACTAMENTE estas claves siempre literal: "REFERENCIA", "PRECIO USD MSRP", "FAMILIA", "Factory Discount2", "APERTURA".
Si falta la familia, usa la palabra "General" por defecto. Si falta Factory Discount2 o APERTURA, usa 0 y "" (vacío) respectivamente.
Limpia los precios quitando símbolos ($) y dejándolos como número flotante limpio (usa punto como decimal). Trata de distinguir códigos de productos de las descripciones largas.

Solo debes devolver un arreglo de objetos JSON puro. ABSOLUTAMENTE NINGÚN TEXTO ADICIONAL NI MARKDOWN, NO PONGAS \`\`\`json. Solo el array de corchetes con objetos adentro.

Datos en Bruto:
${rawTextForPrompt}
`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            let textResp = response.text().trim();

            // Clean markdown if Gemini insists
            if (textResp.startsWith('```json')) textResp = textResp.replace(/```json/g, '').trim();
            if (textResp.startsWith('```')) textResp = textResp.replace(/```/g, '').trim();
            if (textResp.endsWith('```')) textResp = textResp.replace(/```/g, '').trim();

            const aiData = JSON.parse(textResp);

            if (!Array.isArray(aiData)) throw new Error("La IA no devolvió una lista estructurada válida.");

            // Acumular los datos
            setAllConvertedData(prev => [...prev, ...aiData]);

            setStatus({ type: 'success', message: '¡Extracción exitosa y mágica gracias a Gemini AI!' });
            handleNextFile();

        } catch (error) {
            console.error("AI Extract Error", error);
            setStatus({ type: 'error', message: `Fallo la IA: ${error.message || 'Error parseando el JSON de respuesta.'} Intenta extraer con la herramienta de mapeo natural.` });
        } finally {
            setAiExtracting(false);
        }
    };

    const extractNumber = (str) => {
        if (!str) return 0;
        // Eliminar todo lo que no sea dígito, punto o coma
        let numStr = str.replace(/[^\d.,-]/g, '');
        // Si hay múltiples comas/puntos, intentar adivinar los miles vs decimales (muy básico)
        numStr = numStr.replace(/,/g, '.'); // Convertir todas las comillas en puntos temporalmente para simplificar

        // Si hay más de un punto, el último es decimal y los demás son miles (los borramos)
        const parts = numStr.split('.');
        if (parts.length > 2) {
            const decimal = parts.pop();
            numStr = parts.join('') + '.' + decimal;
        }

        const parsed = parseFloat(numStr);
        return isNaN(parsed) ? 0 : parsed;
    };

    const resetProcess = () => {
        setFilesQueue([]);
        setCurrentFileIndex(0);
        setRawData([]);
        setRawHeaders([]);
        setConvertedData([]);
        setAllConvertedData([]);
        setStep(1);
        setStatus(null);
    };

    const handleDownload = () => {
        const worksheet = XLSX.utils.json_to_sheet(allConvertedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Catálogo Maestro");
        XLSX.writeFile(workbook, `Catalogo_Maestro_${new Date().toISOString().split('T')[0]}.xlsx`);
        setStatus({ type: 'success', message: 'Archivo descargado exitosamente.' });
    };

    const handleDirectDBUpload = async () => {
        if (!window.confirm(`¿Estás seguro de inyectar ${allConvertedData.length} productos directamente al catálogo en la base de datos? Esto sobreescribirá registros con la misma Referencia.`)) return;

        setUploadingToDB(true);
        setStatus({ type: 'info', message: 'Subiendo productos al catálogo... Por favor espera.' });

        try {
            // Map the internal format to the expected DB schema format
            const mappedProducts = allConvertedData.map(row => ({
                name: String(row['REFERENCIA']).trim(),
                price: parseFloat(row['PRECIO USD MSRP']) || 0,
                category: String(row['FAMILIA'] || 'General').trim(),
                discount: parseFloat(row['Factory Discount2']) || 0,
                extraInfo: String(row['APERTURA'] || '').trim(),
            }));

            await db.addProductsBulk(mappedProducts);
            setStatus({ type: 'success', message: `¡Excelente! Los ${allConvertedData.length} productos fueron agregados al catálogo y ya están disponibles para ventas.` });
            setAllConvertedData([]); // Clear memory
            setStep(3); // Keep in step 3 to show success
        } catch (error) {
            console.error("Error direct DB upload:", error);
            setStatus({ type: 'error', message: 'Hubo un error subiendo los productos a la base de datos.' });
        } finally {
            setUploadingToDB(false);
        }
    };

    return (
        <div className="animate-fade-in" style={{ padding: '0px' }}>
            {/* Header info */}
            <div className="glass-card" style={{ marginBottom: '20px', padding: '20px', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(0, 108, 224, 0.1))', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                <h3 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <RefreshCw size={24} color="#8b5cf6" />
                    Convertidor de Listas de Precios (PDF/Excel)
                </h3>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Sube la lista de precios de tu proveedor en Excel o formato PDF de tabla. Esta herramienta te ayudará a identificar las columnas y generar un Excel en el formato estandarizado que requiere nuestro sistema para el catálogo de productos.
                </p>
            </div>

            {status && (
                <div className="animate-slide-down" style={{
                    padding: '15px', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px',
                    background: status.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : status.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    color: status.type === 'error' ? 'var(--danger)' : status.type === 'success' ? 'var(--success)' : 'var(--warning)',
                    border: `1px solid ${status.type === 'error' ? 'var(--danger)' : status.type === 'success' ? 'var(--success)' : 'var(--warning)'}`
                }}>
                    {status.type === 'error' ? <AlertCircle size={20} /> : status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    {status.message}
                </div>
            )}

            {/* Steps Progress */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px', gap: '10px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: step >= 1 ? 'var(--primary)' : 'var(--text-muted)', fontWeight: step >= 1 ? 'bold' : 'normal' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: step >= 1 ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: step >= 1 ? 'white' : 'inherit', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.8rem' }}>1</div>
                    Subir Archivo
                </div>
                <div style={{ width: '40px', height: '2px', background: step >= 2 ? 'var(--primary)' : 'rgba(255,255,255,0.1)' }}></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: step >= 2 ? 'var(--primary)' : 'var(--text-muted)', fontWeight: step >= 2 ? 'bold' : 'normal' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: step >= 2 ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: step >= 2 ? 'white' : 'inherit', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.8rem' }}>2</div>
                    Asignar Columnas
                </div>
                <div style={{ width: '40px', height: '2px', background: step >= 3 ? 'var(--primary)' : 'rgba(255,255,255,0.1)' }}></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: step >= 3 ? 'var(--primary)' : 'var(--text-muted)', fontWeight: step >= 3 ? 'bold' : 'normal' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: step >= 3 ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: step >= 3 ? 'white' : 'inherit', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.8rem' }}>3</div>
                    Descargar
                </div>
            </div>

            {/* STEP 1: Upload */}
            {step === 1 && (
                <div className="glass-card" style={{ padding: '40px', textAlign: 'center', borderStyle: 'dashed', borderWidth: '2px', transition: 'all 0.3s' }}>
                    {loading ? (
                        <div style={{ padding: '40px 0' }}>
                            <RefreshCw size={40} className="spinner" color="var(--primary)" style={{ animation: 'spin 1s linear infinite', marginBottom: '15px' }} />
                            <h3>Procesando Archivo...</h3>
                            <p style={{ color: 'var(--text-muted)' }}>Esto puede tardar unos momentos dependiendo del tamaño.</p>
                        </div>
                    ) : (
                        <>
                            <FileText size={48} color="var(--text-muted)" style={{ margin: '0 auto 20px', opacity: 0.5 }} />
                            <h2 style={{ marginBottom: '10px' }}>Arrastra un archivo o haz clic para subir</h2>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Soporta .XLSX, .XLS, .CSV y .PDF</p>

                            <label className="btn-primary" style={{ cursor: 'pointer', padding: '15px 30px', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                                <Upload size={20} /> Seleccionar Archivo(s)
                                <input type="file" multiple accept=".xlsx, .xls, .csv, .pdf" onChange={handleFileUpload} style={{ display: 'none' }} />
                            </label>
                        </>
                    )}
                </div>
            )}

            {/* STEP 2: Map Columns */}
            {step === 2 && (
                <div className="glass-card animate-slide-up">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Settings2 size={20} color="var(--primary)" />
                            Relacionar Columnas
                        </h3>
                        <button onClick={resetProcess} className="btn-primary" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)' }}>
                            <X size={16} /> Cancelar
                        </button>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
                        <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            Archivo: <strong>{filesQueue[currentFileIndex]?.name}</strong> ({currentFileIndex + 1} de {filesQueue.length})
                        </p>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#06b6d4' }}>
                            Instrucciones: Selecciona la correspondencia de columnas para este archivo en específico. Los datos se acumularán al final.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gap: '15px', marginBottom: '30px' }}>
                        {TARGET_COLUMNS.map(target => (
                            <div key={target.key} style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: target.optional ? '1px dashed rgba(255,255,255,0.1)' : '1px solid rgba(139, 92, 246, 0.3)' }}>
                                <div style={{ width: '250px' }}>
                                    <div style={{ fontWeight: 'bold' }}>{target.label}</div>
                                    <div style={{ fontSize: '0.75rem', color: target.optional ? 'var(--text-muted)' : 'var(--danger)' }}>
                                        {target.optional ? '(Opcional)' : '*(Obligatorio)'}
                                    </div>
                                </div>

                                <ArrowRight size={20} color="var(--text-muted)" />

                                <select
                                    className="input-group"
                                    style={{ flex: 1, margin: 0, padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '8px' }}
                                    value={columnMap[target.key]}
                                    onChange={(e) => setColumnMap({ ...columnMap, [target.key]: e.target.value })}
                                >
                                    <option value="">-- No incluir / Ignorar --</option>
                                    {rawHeaders.map((header, idx) => (
                                        <option key={idx} value={header}>{header}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                        <button onClick={handleAIExtract} disabled={aiExtracting} className="btn-primary" style={{ padding: '15px 30px', display: 'flex', alignItems: 'center', gap: '10px', background: 'linear-gradient(45deg, #a855f7, #ec4899)', border: 'none', boxShadow: '0 4px 15px rgba(236, 72, 153, 0.4)' }}>
                            {aiExtracting ? <RefreshCw size={18} className="spinner" /> : <Sparkles size={18} />}
                            {aiExtracting ? 'Analizando con IA...' : 'Extraer Mágicamente con IA'}
                        </button>
                        <button onClick={handleGenerate} disabled={aiExtracting} className="btn-primary" style={{ padding: '15px 30px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <RefreshCw size={18} /> {currentFileIndex + 1 === filesQueue.length ? 'Finalizar Lote' : 'Mapeo Clásico y PDF Siguiente'}
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: Preview and Download */}
            {step === 3 && (
                <div className="glass-card animate-slide-up">
                    <div style={{ textAlign: 'center', marginBottom: '30px', padding: '30px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '15px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        <CheckCircle size={48} color="var(--success)" style={{ margin: '0 auto 15px' }} />
                        <h2 style={{ marginBottom: '10px', color: 'var(--success)' }}>¡Conversión Completa!</h2>
                        <p style={{ color: 'var(--text-muted)' }}>Mapeados <strong>{allConvertedData.length}</strong> productos desde <strong>{filesQueue.length}</strong> archivo(s).</p>

                        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '25px', flexWrap: 'wrap' }}>
                            <button onClick={handleDirectDBUpload} disabled={uploadingToDB || allConvertedData.length === 0} className="btn-primary" style={{ background: 'linear-gradient(45deg, #10b981, #059669)', color: 'white', fontWeight: 'bold', padding: '15px 30px', display: 'flex', alignItems: 'center', gap: '10px', border: 'none', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)' }}>
                                {uploadingToDB ? <RefreshCw size={20} className="spinner" /> : <Upload size={20} />}
                                {uploadingToDB ? 'Enviando...' : 'Enviar Directo al Catálogo (Recomendado)'}
                            </button>
                            <button onClick={handleDownload} disabled={allConvertedData.length === 0} className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--success)', color: 'var(--success)' }}>
                                <Download size={18} /> Bajar Excel de Respaldo
                            </button>
                            <button onClick={resetProcess} className="btn-primary" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)' }}>
                                Nuevo Lote
                            </button>
                        </div>
                    </div>

                    <h4 style={{ marginBottom: '15px' }}>Vista Previa de los primeros 5 productos:</h4>
                    <div style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '10px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>REFERENCIA</th>
                                    <th style={{ padding: '12px', textAlign: 'right' }}>PRECIO USD</th>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>FAMILIA</th>
                                    <th style={{ padding: '12px', textAlign: 'right' }}>DTOS %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allConvertedData.slice(0, 10).map((row, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{row['REFERENCIA']}</td>
                                        <td style={{ padding: '12px', textAlign: 'right', color: 'var(--success)' }}>${row['PRECIO USD MSRP']}</td>
                                        <td style={{ padding: '12px' }}>{row['FAMILIA']}</td>
                                        <td style={{ padding: '12px', textAlign: 'right', color: 'var(--warning)' }}>{row['Factory Discount2']}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default CatalogConverter;
