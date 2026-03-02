const getFactor = (configValue, globalValue, defaultValue = 0) => {
    return configValue !== undefined && configValue !== ''
        ? parseFloat(configValue)
        : (parseFloat(globalValue) || defaultValue);
};

const extractFactors = (configuracion, configGlobal) => ({
    imprevistos: getFactor(configuracion?.factor_imprevistos, configGlobal?.factor_imprevistos, 0),
    poliza: getFactor(configuracion?.factor_poliza, configGlobal?.factor_poliza, 0),
    negociacion: getFactor(configuracion?.factor_negociacion, configGlobal?.factor_negociacion, 0),
    margenSistema: getFactor(configuracion?.margen_sistema, configGlobal?.margen_sistema, 1.66),
    margenTransporte: getFactor(configuracion?.margen_transporte, configGlobal?.margen_transporte, 1.35),
    trm: getFactor(configuracion?.trm_actual, configGlobal?.trm_actual, 1),
});

const calculateDimensionsAndWeight = (linea) => {
    let pesoVolumetrico = 0;
    let volumenM3 = 0;

    if (linea.dimensiones) {
        const dims = linea.dimensiones.toLowerCase().split('x').map(d => parseFloat(d.replace(/[^0-9.]/g, '')));
        if (dims.length === 3 && !dims.includes(NaN)) {
            volumenM3 = (dims[0] * dims[1] * dims[2]) / 1000000;
            pesoVolumetrico = (dims[0] * dims[1] * dims[2]) / 5000;
        }
    }

    const pesoReal = parseFloat(linea.peso_transporte) || 0;
    const pesoCobrable = Math.max(pesoReal, pesoVolumetrico);
    const transporteSugerido = (pesoCobrable > 100 || volumenM3 > 1) ? 'MARITIMO' : 'AEREO';

    return { pesoReal, pesoVolumetrico, pesoCobrable, volumenM3, transporteSugerido };
};

const calculateTransportCost = (linea, configuracion, configGlobal, pesoCobrable, factores) => {
    if (!configuracion.tipoTransporte || configuracion.tipoTransporte === 'NINGUNO') {
        return 0;
    }

    const tarifaC1 = parseFloat(linea.tarifaCosto1) || 0;
    const unidad = configuracion.unidadTransporte || 'KG';
    const multiplicador = (unidad !== 'USD' && pesoCobrable === 0) ? 1 : (unidad === 'USD' ? 1 : pesoCobrable);
    const baseLinea = tarifaC1 * multiplicador;

    const factorM = configGlobal?.TRANSPORTE?.MARITIMO || { MULTIPLICADOR: 1.2, IVA: 0.19, ADICIONAL: 0.1 };
    const factorA = configGlobal?.TRANSPORTE?.AEREO || { MULTIPLICADOR: 1.18 };

    let transporteCalculadoAdValorem = 0;

    if (configuracion.tipoTransporte === 'MARITIMO') {
        const subTotal = baseLinea * factorM.MULTIPLICADOR;
        const impuesto = subTotal * factorM.IVA;
        const adicional = subTotal * factorM.ADICIONAL;
        transporteCalculadoAdValorem = subTotal + impuesto + adicional;
    } else if (configuracion.tipoTransporte === 'AEREO') {
        const subTotal = baseLinea;
        transporteCalculadoAdValorem = subTotal * factorA.MULTIPLICADOR;
    }

    const cantidad = parseFloat(linea.cantidad) || 0;
    return (transporteCalculadoAdValorem * factores.margenTransporte) * cantidad;
};

export const calculateSaleTotals = (lineas, configuracion, configGlobal) => {
    // 1. Validaciones
    if (!lineas || !Array.isArray(lineas)) return { lineas: [], totales: {} };

    // 2. Extraer Factores Globales y permitir sobreescritura manual por cotización (configuracion)
    const factores = extractFactors(configuracion, configGlobal);

    // 3. PASO 1: Calcular Subtotales Base (A: Equipos, B: Transporte)
    let subtotalA_VentaEquipos = 0;
    let subtotalB_Transporte = 0;

    // Arrays intermedios
    const processedLineas = lineas.map(linea => {
        const cantidad = parseFloat(linea.cantidad) || 0;
        const precioFOB = parseFloat(linea.precio_base) || 0;

        // --- Margen Específico ---
        const margenProducto = parseFloat(linea.margen_especifico) || factores.margenSistema;
        const costoLineaVenta = precioFOB * margenProducto;
        const subtotalLineaVenta = costoLineaVenta * cantidad;

        // --- Transporte y Logística ---
        const {
            pesoReal,
            pesoVolumetrico,
            pesoCobrable,
            transporteSugerido
        } = calculateDimensionsAndWeight(linea);

        const transporteCostoTotal = calculateTransportCost(
            linea,
            configuracion,
            configGlobal,
            pesoCobrable,
            factores
        );

        // Acumular a los Subtotales Globales
        subtotalA_VentaEquipos += subtotalLineaVenta;
        subtotalB_Transporte += transporteCostoTotal;

        return {
            ...linea,
            precioFOB,
            margenProducto,
            costoLineaVenta,
            pesoReal,
            pesoVolumetrico,
            pesoCobrable,
            transporteSugerido,
            transporteCostoTotal,
            subtotalLineaVenta
        };
    });

    // 4. PASO 2: Cascadas Globales de Seguridad
    // Imprevistos: SOLO sobre el valor de venta del equipo (Subtotal A)
    const imprevistosGlobales = subtotalA_VentaEquipos * factores.imprevistos;

    // Póliza y Negociación: Sobre (Venta Equipos + Transporte) -> Subtotal A + Subtotal B
    const baseSeguridad = subtotalA_VentaEquipos + subtotalB_Transporte;
    const polizaGlobal = baseSeguridad * factores.poliza;
    const negociacionGlobal = baseSeguridad * factores.negociacion;

    // Gran Total (Valor Técnico)
    const granTotalTecnico = subtotalA_VentaEquipos + subtotalB_Transporte + imprevistosGlobales + polizaGlobal + negociacionGlobal;

    // 5. PASO 3: Factor de Distribución Proporcional
    // coeficiente = TotalTecnico / Subtotal A -> Para inyectar los indirectos a los equipos
    const coeficienteDistribucion = subtotalA_VentaEquipos > 0 ? (granTotalTecnico / subtotalA_VentaEquipos) : 0;

    // 6. PASO 4: Aplicar redistribución a cada ítem para la Vista de Presentación (Frontend)
    const finalLineas = processedLineas.map(linea => {
        const cantidad = parseFloat(linea.cantidad) || 0;
        const descuentoPct = (parseFloat(linea.descuento_pct) || 0) / 100;

        // Distribución: El precio base se infla con el coeficiente para esconder polizas/imprevistos/transporte
        // Multiplicamos el (FOB * MargenProducto) por el factor de redistribución proporcional
        const precioUnitarioVentaDistribucion = linea.costoLineaVenta * coeficienteDistribucion;

        const descuento = precioUnitarioVentaDistribucion * descuentoPct;
        const precioUnitarioNeto = precioUnitarioVentaDistribucion - descuento;
        const subtotalLineaFinal = precioUnitarioNeto * cantidad;

        const comisionPct = (parseFloat(linea.comision_pct) || 0) / 100;
        const comisionLinea = subtotalLineaFinal * comisionPct;

        return {
            ...linea,
            precio_distribuido: precioUnitarioVentaDistribucion, // Esto va a I73
            descuento,
            precioNeto: precioUnitarioNeto,
            subtotal_calculado: subtotalLineaFinal,
            comision_calculada: comisionLinea
        };
    });

    // 7. Resumen de Totales Finales para la UI
    const subtotalBruto = finalLineas.reduce((acc, l) => acc + (l.precio_distribuido * l.cantidad), 0);
    const totalDescuentos = finalLineas.reduce((acc, l) => acc + (l.descuento * l.cantidad), 0);
    const subtotalNeto = finalLineas.reduce((acc, l) => acc + l.subtotal_calculado, 0);

    // Impuestos Locales si aplica (Ej. IVA 19% final sobre la factura total local)
    const impuestos = configuracion.aplicarIVA ? (subtotalNeto * (configGlobal?.IVA || 0.19)) : 0;

    // Total General (El transporte ya está oculto y diluido matemáticamente en cada ítem)
    const total = subtotalNeto + impuestos;

    return {
        lineas: finalLineas,
        totales: {
            subtotalBruto,
            descuentos: totalDescuentos,
            subtotalNeto,
            transporteOculto: subtotalB_Transporte, // Informativo interno (para analíticas, etc)
            imprevistosOcultos: imprevistosGlobales,
            seguridadOculta: polizaGlobal + negociacionGlobal,
            totalTecnico: granTotalTecnico,
            comisionesTotal: finalLineas.reduce((acc, l) => acc + l.comision_calculada, 0),
            impuestos,
            total,
            trm_aplicado: factores.trm
        }
    };
};
