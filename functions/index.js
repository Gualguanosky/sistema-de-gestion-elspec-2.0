import { onRequest } from "firebase-functions/v2/https";
import logger from "firebase-functions/logger";
import admin from "firebase-admin";
import cors from "cors";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";

admin.initializeApp();
const corsHandler = cors({ origin: true });

export const healthCheck = onRequest((request, response) => {
    corsHandler(request, response, () => {
        logger.info("HealthCheck microservicio llamado!", { structuredData: true });
        response.status(200).json({ status: "ok", message: "Microservicios Elspec Online" });
    });
});

// ==========================================
// MICROSERVICIO 1: PROSPECTOS
// Google CSE → Gemini → Hunter.io
// ==========================================
export const searchProspects = onRequest(
    { timeoutSeconds: 60 },
    (request, response) => {
        corsHandler(request, response, async () => {
            try {
                if (request.method !== 'POST') return response.status(405).json({ error: "Use POST" });

                const { companyName, roles } = request.body;
                if (!companyName) return response.status(400).json({ error: "companyName is required" });

                // ─── PASO 1: Google Custom Search ───────────────────────────
                const searchRole = roles && roles.length > 0 ? roles[0] : "Gerente OR Director OR Jefe OR Compras";
                // Búsqueda dual: perfiles LinkedIn + sitio de empresa
                const query = `site:linkedin.com/in "${searchRole}" "${companyName}"`;

                const searchKey = process.env.GOOGLE_SEARCH_API_KEY;
                const searchCx = process.env.GOOGLE_SEARCH_CX;
                const gcsUrl = `https://www.googleapis.com/customsearch/v1?key=${searchKey}&cx=${searchCx}&q=${encodeURIComponent(query)}&num=10`;

                logger.info(`[searchProspects] Buscando: ${query}`);
                const gcsResponse = await axios.get(gcsUrl);
                const items = gcsResponse.data.items || [];

                if (items.length === 0) {
                    return response.status(200).json({ prospects: [], source: 'google_cse', message: 'No se encontraron resultados para esa búsqueda.' });
                }

                // ─── PASO 2: Gemini — Parsear perfiles ──────────────────────
                const geminiApiKey = process.env.GEMINI_API_KEY;
                if (!geminiApiKey || geminiApiKey === 'INGRESA_TU_API_KEY_DE_GEMINI_AQUI') {
                    return response.status(500).json({ error: "API Key de Gemini no configurada en el .env." });
                }

                const textToAnalyze = items.map((item, index) =>
                    `Resultado ${index + 1}:\nTítulo: ${item.title}\nDescripción: ${item.snippet}\nLink: ${item.link}\n`
                ).join('\n');

                const ai = new GoogleGenAI({ apiKey: geminiApiKey });

                const prompt = `
Analiza estos resultados de búsqueda de LinkedIn sobre personas en la empresa "${companyName}".
Extrae ÚNICAMENTE prospectos reales que sean personas humanas (no páginas de empresa o artículos).

Para cada prospecto encontrado, devuelve un JSON array con este formato EXACTO:
[
  {
    "name": "Nombre Completo de la persona",
    "role": "Cargo o rol en la empresa",
    "linkedin": "URL completa del perfil de LinkedIn (https://linkedin.com/in/...)",
    "companyDomain": "dominio del sitio web de la empresa (ej: ecopetrol.com, siemens.com.co). Infiere el dominio más probable de '${companyName}' si no está explícito.",
    "emailSource": "ai_inferred"
  }
]

Si no puedes extraer un campo con certeza, usa null. Devuelve SOLO el JSON, sin texto adicional.

RESULTADOS A ANALIZAR:
${textToAnalyze}
`;

                const aiResponse = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt });
                let cleanJson = aiResponse.text.trim().replace(/```json/g, '').replace(/```/g, '').trim();

                let extractedProspects = [];
                try {
                    extractedProspects = JSON.parse(cleanJson);
                    if (!Array.isArray(extractedProspects)) extractedProspects = [];
                } catch (parseErr) {
                    logger.warn("[searchProspects] Gemini devolvió JSON no parseable:", cleanJson);
                    extractedProspects = [];
                }

                if (extractedProspects.length === 0) {
                    return response.status(200).json({ prospects: [], source: 'gemini', message: 'Gemini no pudo extraer prospectos de los resultados.' });
                }

                // ─── PASO 3: Hunter.io — Enriquecer emails ──────────────────
                const hunterKey = process.env.HUNTER_API_KEY;
                let hunterEmailsByDomain = {}; // Cache por dominio

                if (hunterKey) {
                    // Obtener dominios únicos para no gastar cuota de más
                    const uniqueDomains = [...new Set(
                        extractedProspects
                            .map(p => p.companyDomain)
                            .filter(d => d && d !== 'null' && d.includes('.'))
                    )];

                    logger.info(`[searchProspects] Consultando Hunter.io para ${uniqueDomains.length} dominios: ${uniqueDomains.join(', ')}`);

                    for (const domain of uniqueDomains) {
                        try {
                            const hunterUrl = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${hunterKey}&limit=20`;
                            const hunterRes = await axios.get(hunterUrl);
                            const hunterEmails = hunterRes.data?.data?.emails || [];
                            // Indexar por nombre para búsqueda rápida
                            hunterEmailsByDomain[domain] = hunterEmails;
                            logger.info(`[Hunter.io] Dominio ${domain}: ${hunterEmails.length} emails encontrados`);
                        } catch (hunterErr) {
                            // Si Hunter.io falla (límite, dominio no encontrado), seguimos sin email
                            logger.warn(`[Hunter.io] Error para dominio ${domain}: ${hunterErr.message}`);
                        }
                    }
                }

                // ─── PASO 4: Cruzar datos y construir respuesta final ────────
                const finalProspects = extractedProspects.map((prospect, idx) => {
                    let email = null;
                    let emailSource = 'not_found';

                    // Intentar encontrar email en Hunter.io
                    const domain = prospect.companyDomain;
                    if (domain && hunterEmailsByDomain[domain]) {
                        const domainEmails = hunterEmailsByDomain[domain];

                        // Buscar por nombre (coincidencia parcial)
                        const firstName = (prospect.name || '').split(' ')[0]?.toLowerCase();
                        const lastName = (prospect.name || '').split(' ')[1]?.toLowerCase();

                        const matched = domainEmails.find(e => {
                            const eFn = (e.first_name || '').toLowerCase();
                            const eLn = (e.last_name || '').toLowerCase();
                            return (firstName && eFn.includes(firstName)) ||
                                   (lastName && eLn.includes(lastName));
                        });

                        if (matched) {
                            email = matched.value;
                            emailSource = 'hunter_io';
                        } else if (domainEmails.length > 0) {
                            // Si no hay match exacto pero sabemos el patrón, lo inferimos
                            const pattern = domainEmails[0]?.type; // e.g. 'pattern' field
                            const commonPattern = hunterEmailsByDomain[domain][0]; // primer email de referencia
                            if (commonPattern && firstName) {
                                emailSource = 'ai_inferred';
                                // No asignamos un email inventado, dejamos null
                            }
                        }
                    }

                    return {
                        id: `prospect_${Date.now()}_${idx}`,
                        name: prospect.name || 'Desconocido',
                        role: prospect.role || 'Sin cargo',
                        linkedin: prospect.linkedin || null,
                        email: email,
                        emailSource: emailSource, // 'hunter_io', 'ai_inferred', 'not_found'
                        company: companyName,
                        companyDomain: prospect.companyDomain || null
                    };
                });

                logger.info(`[searchProspects] Completado: ${finalProspects.length} prospectos, ${finalProspects.filter(p => p.email).length} con email.`);

                return response.status(200).json({
                    prospects: finalProspects,
                    stats: {
                        total: finalProspects.length,
                        withEmail: finalProspects.filter(p => p.email).length,
                        emailSources: {
                            hunter_io: finalProspects.filter(p => p.emailSource === 'hunter_io').length,
                            ai_inferred: finalProspects.filter(p => p.emailSource === 'ai_inferred').length,
                            not_found: finalProspects.filter(p => p.emailSource === 'not_found').length,
                        }
                    }
                });

            } catch (error) {
                logger.error("Error searchProspects:", error);
                return response.status(500).json({ error: "Error processing request", details: error.message });
            }
        });
    });



// ==========================================
// MICROSERVICIO 2: MARKETING (Flyers y Campañas)
// ==========================================
export const marketingService = onRequest(
    { secrets: ["GEMINI_API_KEY"], timeoutSeconds: 300 }, // Hasta 5 min para campañas largas
    (request, response) => {
        corsHandler(request, response, async () => {
            try {
                if (request.method !== 'POST') return response.status(405).json({ error: "Use POST" });

                const payload = request.body;
                const action = payload.action;

                const geminiApiKey = process.env.GEMINI_API_KEY;
                if (!geminiApiKey || geminiApiKey === 'INGRESA_TU_API_KEY_DE_GEMINI_AQUI') {
                    return response.status(500).json({ error: "API Key de Gemini no configurada." });
                }
                const ai = new GoogleGenAI({ apiKey: geminiApiKey });

                // -- ACCIÓN: CREAR FLYER --
                if (action === 'create_flyer') {
                    const { prompt, industry, tone } = payload;

                    logger.info(`Generando flyer para industria: ${industry}`);

                    const systemPrompt = `
        Eres un experto copywriter de marketing B2B industrial.
        Debes generar el texto para un flyer/anuncio basado en la siguiente información:
        Propuesta: "${prompt}"
        Industria: "${industry}"
        Tono: "${tone}"

        Devuelve ÚNICAMENTE un JSON válido con estas 3 claves:
        - title: Un título llamativo y corto (max 6 palabras).
        - copy: El texto persuasivo principal del flyer (max 40 palabras).
        - cta: Un llamado a la acción corto (max 3 palabras).
        `;

                    const aiResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: systemPrompt });
                    let cleanJson = aiResponse.text.trim().replace(/```json/g, '').replace(/```/g, '').trim();
                    const generatedText = JSON.parse(cleanJson);

                    // Generar una imagen de Unsplash basada en la industria (Dado que Gemini no genera imágenes directo aquí)
                    // Usamos una URL dinámica de Unsplash Source (redirecciona a una imagen aleatoria)
                    const encodedIndustry = encodeURIComponent(industry || "tecnologia industrial");
                    const imageUrl = `https://source.unsplash.com/800x600/?${encodedIndustry}`;

                    return response.status(200).json({
                        title: generatedText.title,
                        copy: generatedText.copy,
                        cta: generatedText.cta,
                        imageUrl: imageUrl
                    });
                }

                // -- ACCIÓN: LANZAR CAMPAÑA --
                else if (action === 'launch_campaign') {
                    const { campaignName, contacts, senderName } = payload;
                    logger.info(`[Campaña] Iniciando: ${campaignName} con ${contacts.length} contactos.`);

                    // En una implementación real de Microservicio, aquí se usaría:
                    // 1. Google Cloud Tasks para manejar los delays (delayAmount/delayUnit).
                    // 2. Nodemailer o SendGrid para enviar los correos.
                    // 3. Un bucle generando copys personalizados con Gemini.

                    // Simulamos el procesamiento para el Frontend
                    const processedContacts = contacts.map(c => ({
                        email: c.email,
                        status: "queued_for_sending",
                        aiContext: `Generando correo B2B para ${c.name || 'el cliente'} en la industria ${c.industry} de parte de ${senderName}`
                    }));

                    return response.status(200).json({
                        success: true,
                        message: `Campaña ${campaignName} encolada exitosamente en el backend Serverless.`,
                        queuedContacts: processedContacts.length
                    });
                }

                else {
                    return response.status(400).json({ error: "Acción no soportada por el microservicio." });
                }

            } catch (error) {
                logger.error("Error marketingService:", error);
                return response.status(500).json({ error: "Error en Marketing Service", details: error.message });
            }
        });
    });
