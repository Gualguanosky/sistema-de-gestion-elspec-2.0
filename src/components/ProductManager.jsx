import React, { useState, useEffect } from 'react';
import { Upload, Trash2, Search, CheckCircle, AlertCircle } from 'lucide-react';
import db from '../services/db';
import * as XLSX from 'xlsx';

const ProductManager = () => {
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [importStatus, setImportStatus] = useState(null); // { type: 'success'|'error', message: '' }

    useEffect(() => {
        const unsubscribe = db.subscribeProducts((data) => {
            setProducts(data);
        });
        return () => unsubscribe();
    }, []);

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setLoading(true);
        setImportStatus(null);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Convert to JSON with headers (header: 1 returns array of arrays)
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonData.length < 2) throw new Error("El archivo está vacío o no tiene suficientes datos.");

                const rawHeaders = jsonData[0].map(h => String(h || '').trim());

                // Identify key columns with multiple possible names
                const findIndex = (names) => {
                    for (const name of names) {
                        const idx = rawHeaders.indexOf(name);
                        if (idx !== -1) return idx;
                    }
                    return -1;
                };

                const itemIndex = findIndex(['REFERENCIA', 'Item']);
                const priceIndex = findIndex(['PRECIO USD MSRP', 'Purchase Price USD']);
                const discountIndex = findIndex(['Factory Discount2', 'Discount']);
                const kindIndex = findIndex(['FAMILIA', 'Kind']);
                const column6Index = findIndex(['APERTURA', 'Data.Column6', 'Column6']);

                if (itemIndex === -1 || priceIndex === -1) {
                    throw new Error("No se encontraron las columnas críticas (REFERENCIA/Item o PRECIO USD MSRP/Purchase Price USD) en el Excel.");
                }

                const newProducts = [];
                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (!row || row.length === 0) continue;

                    const itemName = row[itemIndex];
                    if (itemName) {
                        newProducts.push({
                            name: String(itemName).trim(),
                            price: parseFloat(row[priceIndex]) || 0,
                            discount: parseFloat(row[discountIndex]) || 0,
                            category: String(row[kindIndex] || 'General').trim(),
                            extraInfo: column6Index !== -1 ? String(row[column6Index] || '').trim() : '',
                            updatedAt: new Date().toISOString()
                        });
                    }
                }

                if (newProducts.length > 0) {
                    await db.addProductsBulk(newProducts);
                    setImportStatus({ type: 'success', message: `¡Éxito! Importados ${newProducts.length} productos desde Excel.` });
                } else {
                    throw new Error("No se encontraron productos válidos para importar");
                }
            } catch (error) {
                console.error("Import error:", error);
                setImportStatus({ type: 'error', message: `Error: ${error.message}` });
            } finally {
                setLoading(false);
                event.target.value = ''; // Reset input
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleDeleteAll = async () => {
        if (window.confirm('¿ELIMINAR TODO EL CATÁLOGO? Esta acción borrará todos los productos importados.')) {
            setLoading(true);
            try {
                await db.deleteAllProducts();
                setImportStatus({ type: 'success', message: 'Catálogo borrado exitosamente.' });
            } catch (error) {
                setImportStatus({ type: 'error', message: 'Error al borrar el catálogo.' });
            } finally {
                setLoading(false);
            }
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.extraInfo && p.extraInfo.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className="search-box-premium" style={{ width: '300px' }}>
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Buscar en el catálogo..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        {products.length} productos en base de datos
                    </span>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <label className="btn-primary" style={{ padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--success)' }}>
                        <Upload size={18} /> Importar Excel Proveedor
                        <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} style={{ display: 'none' }} disabled={loading} />
                    </label>
                    <button
                        onClick={handleDeleteAll}
                        className="btn-primary"
                        style={{ padding: '10px 20px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid var(--danger)' }}
                        disabled={loading || products.length === 0}
                    >
                        <Trash2 size={18} /> Borrar Todo
                    </button>
                </div>
            </div>

            {importStatus && (
                <div className={`animate-slide-up`} style={{
                    padding: '15px', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px',
                    background: importStatus.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: importStatus.type === 'success' ? 'var(--success)' : 'var(--danger)',
                    border: `1px solid ${importStatus.type === 'success' ? 'var(--success)' : 'var(--danger)'}`
                }}>
                    {importStatus.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    {importStatus.message}
                </div>
            )}

            <div className="glass-card" style={{ padding: '0', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            <th style={{ padding: '15px' }}>Producto / Item</th>
                            <th style={{ padding: '15px' }}>Categoría</th>
                            <th style={{ padding: '15px' }}>Modelo / Info</th>
                            <th style={{ padding: '15px', textAlign: 'right' }}>Precio Lista (USD)</th>
                            <th style={{ padding: '15px', textAlign: 'right' }}>Desc. Fábrica</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.length === 0 ? (
                            <tr><td colSpan="5" style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay productos en el catálogo. Usa el botón de importar.</td></tr>
                        ) : (
                            filteredProducts.map(p => (
                                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
                                    <td style={{ padding: '15px' }}>
                                        <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                                    </td>
                                    <td style={{ padding: '15px' }}>
                                        <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px' }}>{p.category}</span>
                                    </td>
                                    <td style={{ padding: '15px' }}>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{p.extraInfo || '-'}</div>
                                    </td>
                                    <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold', color: 'var(--success)' }}>
                                        {formatCurrency(p.price)}
                                    </td>
                                    <td style={{ padding: '15px', textAlign: 'right', color: 'var(--warning)' }}>
                                        {p.discount}%
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '12px', border: '1px dashed var(--border-color)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                    <AlertCircle size={14} /> <strong>Nota sobre estructura del archivo:</strong>
                </div>
                El archivo Excel debe tener las columnas críticas: <b>REFERENCIA</b> (o Item) y <b>PRECIO USD MSRP</b> (o Purchase Price USD). También reconoce <b>FAMILIA</b> (o Kind), <b>Factory Discount2</b> y <b>APERTURA</b> (o Data.Column6).
            </div>
        </div>
    );
};

export default ProductManager;
