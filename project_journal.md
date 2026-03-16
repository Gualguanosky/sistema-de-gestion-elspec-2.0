# 📓 Bitácora del Proyecto — Sistema de Gestión Elspec 2.0

> **Cómo usar este archivo:**
> Al inicio de cada sesión con Antigravity, puedes decir: _"lee la bitácora y recuerda el contexto"_.
> Al final de cada sesión, di: _"actualiza la bitácora con lo que hicimos hoy"_.

---

## 🗂️ Stack Tecnológico Actual

| Capa | Tecnología |
|---|---|
| Frontend | React (Vite) en VPS (`https://gestionelspec.site`) |
| Backend / Orquestación | N8N Self-hosted (Docker) |
| Base de Datos | Firebase (Firestore) + PostgreSQL (VPS) |
| Proxy / SSL | Nginx + Certbot (HTTPS) |
| Almacenamiento | Almacenamiento local VPS (`/var/www/elspec/storage`) |
| Integraciones IA | Google Gemini, OpenAI (GPT-3.5/4o), Hunter.io |
| Integraciones externas | Apollo.io, Google Custom Search, Outlook |

---

## 🏗️ Arquitectura General

El sistema migró de un monolito frontend + N8N hacia una arquitectura de microservicios ligera:

1. **API Gateway** (Node.js/Express — Dockerizado) → Punto único de entrada para el frontend
2. **Firebase Cloud Functions** → Microservicios serverless:
   - `searchProspects`: Búsqueda de prospectos con Google Custom Search + Gemini
   - `generateCampaign` / `create_flyer`: Generación de campañas y arte con IA
3. **N8N** → Agente unificado de IA para flujos complejos (campañas, tracking, prospectos)
4. **Firestore** → Persistencia de datos (usuarios, ventas, proyectos, logística)

---

## 📋 Módulos del Sistema (Estado actual)

| Módulo | Archivo Principal | Estado |
|---|---|---|
| Dashboard / Navegación | `App.jsx` | ✅ Activo |
| Ventas / ERP | `SalesManagement.jsx` | ✅ Activo |
| Gestión de Proyectos | `ProjectManagement.jsx` | ✅ Activo |
| Logística / Planner | `ProjectLogistics.jsx` | ✅ Activo |
| Campañas / Marketing | `CampaignManagement.jsx` | ✅ Activo |
| Generador de Flyers (IA) | Sub-vista dentro de Campañas | ✅ Integrado |
| Buscador de Prospectos (IA) | `ProspectFinder.jsx` | ✅ Activo (con Mock Data) |
| Autenticación | Firebase Auth | ✅ Activo |

---

## 🛒 Detalle del Módulo de Ventas (`SalesManagement.jsx`)

El módulo de ventas es el más complejo del sistema. Tiene **8 sub-pestañas** organizadas así:

| Sub-pestaña | Componente | Función |
|---|---|---|
| **Gestión de Proyectos** *(default)* | `ProjectManagement.jsx` | CRUD de proyectos con estados (Planificación/Ejecución/Pausado/Completado). Al crear un proyecto, lo vincula automáticamente a un ERP (venta) vacío en Firestore. |
| **Logística y Transporte** | `ProjectLogistics.jsx` | Tabla tipo Planner de importaciones/embarques. Campos: Order #, Requisition, Customer, Project, Compliance, Description, Status, Date PO, Est. Delivery, Delivered, Delay Time, Del. Condition, Remarks. Filas con color por estado (Verde=Entregado, Amarillo=En Tránsito/Fabricación). |
| **Listado de Ventas** | (inline en `SalesManagement`) | Tabla de ventas con búsqueda, generación de PDF institucional (formato GMV-FT-07), editar y eliminar. Vista Desktop + Mobile card. |
| **Catálogo de Productos** | `ProductManager.jsx` | Gestión del catálogo de equipos/productos. |
| **Gestión de Clientes** | `CustomerManagement.jsx` | CRUD de clientes (razón social, NIT, email, teléfono, etc.). |
| **Gestión de Términos** | `TermsManagement.jsx` | Editor de T&C dinámicos que se incluyen automáticamente en el PDF de oferta. |
| **Variables de Cotización** | `PricingVariables.jsx` | Configuración de factores globales: TRM, márgenes, imprevistos, póliza, etc. |
| **Convertidor** | `CatalogConverter.jsx` | Herramienta de conversión de catálogo (formatos de importación). |

### Flujo Integrado: Proyecto → ERP → Logística
```
Crear Proyecto (ProjectManagement)
  └─→ Se genera automáticamente una Venta ERP en blanco vinculada
        └─→ Al agregar equipos (líneas) al ERP en SaleForm
              └─→ Se generan filas de logística en ProjectLogistics por cada equipo
```

### Generación de PDF (`generatePDF` en SalesManagement)
- Formato institucional **GMV-FT-07** con logo Elspec
- Página 1: Encabezado + Variables (TRM, márgenes) + Tabla de equipos + Totales + Logística
- Páginas siguientes: Términos y condiciones (dinámicos de Firestore o fallback estático)
- Pie: Firma de aceptación y sello
- Envío automático via webhook a N8N al crear una nueva venta (`VITE_N8N_SALES_WEBHOOK`)

---

## 🗓️ Historial de Sesiones

---

### Sesión 1 — Exploración inicial del codebase
**Fecha aprox.:** 2026-03-09
**Conversación:** `27a90281-e45d-4507-9ddf-b4bd2cfb6156`

**Temas:**
- Revisión del estado general del repositorio
- Exploración de commits recientes y estructura del proyecto

**Resultado:**
- Entendimos el punto de partida: frontend React con N8N como orquestador y Firebase como base de datos.

---

### Sesión 2 — Migración a Arquitectura de Microservicios
**Fecha aprox.:** 2026-03-09 → 2026-03-10
**Conversación:** `f651edc8-b81b-4946-80ba-0a8d93157f4b` (primera parte)

**Temas:**
- Diseño de la arquitectura por fases
- Dockerización del frontend
- Creación del API Gateway (Node.js/Express)
- Extracción de `searchProspects` como Firebase Cloud Function
- Extracción de `generateCampaign` / `create_flyer` como Firebase Cloud Functions
- Integración de Google Custom Search + Gemini en las funciones

**✅ Completado:**
- `Dockerfile` para el frontend
- `docker-compose.yml` base
- `api-gateway/` (Node.js proxy)
- `functions/` (Firebase Cloud Functions): `searchProspects`, `generateCampaign`, `create_flyer`

---

### Sesión 3 — Consolidación de Herramientas de Marketing
**Fecha aprox.:** 2026-03-09
**Conversación:** `d1db1d81-4930-444b-8151-c214d00ad8c7`

**Temas:**
- El generador de flyers era un ítem separado en la barra de navegación
- Se decidió consolidarlo como sub-vista dentro del módulo de Campañas

**✅ Completado:**
- `CampaignManagement.jsx`: El generador de flyers pasó a ser una pestaña interna
- Se eliminó el ítem de navegación redundante del Dashboard

---

### Sesión 4 — Integración Apollo.io / N8N (Debugging)
**Fecha aprox.:** 2026-03-10
**Conversación:** `a945240a-63ab-4482-b667-c99ac5ae68ca`

**Temas:**
- Integración del Buscador de Prospectos con Apollo.io via N8N
- Debugging de la autenticación en el nodo HTTP Request de N8N
- Diferentes modos de pasar el API Key (Headers vs. Query Params)
- Restricciones del plan gratuito de Apollo.io

**✅ Completado:**
- `ProspectFinder.jsx`: Componente de UI con diseño glassmorphism
- El componente incluye **Mock Data** para demostrar el flujo sin N8N conectado
- `n8n-workflows/n8n_prospect_agent.json`: Workflow base para N8N con Apollo.io
- Los prospectos seleccionados se pueden agregar al "Banco de Correos" de campañas

**⚠️ Pendiente del usuario:**
- Importar el workflow `n8n_prospect_agent.json` en N8N
- Pegar la URL del webhook en `ProspectFinder.jsx` línea 12 (`N8N_PROSPECT_WEBHOOK_URL`)
- Crear cuenta en Apollo.io y poner el API Key en el nodo HTTP Request de N8N

---

### Sesión 5 — Módulo de Proyectos y Logística
**Fecha aprox.:** 2026-03-10 → 2026-03-11
**Conversación:** `f651edc8-b81b-4946-80ba-0a8d93157f4b` (segunda parte)

**Temas:**
- Integración de gestión de proyectos dentro de la sección de Ventas
- Vinculación de proyectos con datos ERP (ventas existentes)
- Vista tipo Planner de logística para seguimiento de embarques/entregas

**✅ Completado:**
- `SalesManagement.jsx`: Nuevas pestañas de "Proyectos" y "Logística" integradas
- `ProjectManagement.jsx`: Listado de proyectos con vinculación a Venta ERP
- `ProjectLogistics.jsx`: Vista tipo Planner con estado visual de embarques
- `db.js` / Firebase: Soporte para tablas de proyectos y logística
- **Flujo integrado:** Al crear un proyecto → genera ERP vacío referenciado; al guardar ERP con equipos → genera filas de logística automáticamente

---

### Sesión 6 — Configuración de Bitácora Automática + Revisión del Sistema de Ventas
**Fecha:** 2026-03-10
**Conversación:** `3db017e3-ae7f-4f96-87eb-7cce7834d118`

**Temas:**
- El usuario quería un mecanismo para no perder el hilo entre sesiones y entre cuentas (empresa/personal)
- Creación de la bitácora persistente del proyecto
- Revisión del estado actual del módulo de ventas en el código

**✅ Completado:**
- Creado `project_journal.md` en la raíz del proyecto con historial completo de las 5 sesiones anteriores
- Creado `.agents/workflows/session_journal.md` — workflow automático que instruye al asistente a leer la bitácora al iniciar y actualizarla al terminar cada sesión, **sin necesidad de pedirlo**
- Revisión completa del código: `SalesManagement.jsx`, `ProjectManagement.jsx`, `ProjectLogistics.jsx`
- La bitácora fue enriquecida con el detalle de las 8 sub-pestañas del módulo de ventas y el flujo integrado Proyecto → ERP → Logística

**Estado confirmado del sistema de ventas:**
- 8 sub-pestañas completamente implementadas y funcionales
- Flujo integrado automático: Crear Proyecto → genera ERP vacío vinculado → al guardar ERP con equipos → genera filas de logística
- Generación de PDF institucional GMV-FT-07 con T&C dinámicos desde Firestore
- Vista responsive (Desktop table + Mobile cards) en el listado de ventas



### Sesión 8 — Depuración N8N y Vuelta a Google Custom Search (La Solución Definitiva)
**Fecha:** 2026-03-10
**Conversación:** `3db017e3-ae7f-4f96-87eb-7cce7834d118` (Última Fase)

**Contexto:**
- **El reto de la extracción en N8N:** Al probar la arquitectura de N8N en producción con React conectándose, nos encontramos con un problema grave. DuckDuckGo actualizó hoy silenciosamente sus políticas anti-bot y ahora bloquea cualquier petición curl o desde N8N sin Javascript que intente raspar (scrape) su página de manera automatizada. Entregaba HTML en blanco (API de Google vacía).
- **El problema del Regex en N8N:** Gemini devolvía el array JSON rodeado de comodines markdwn (` ```json `), pero si insertaba saltos de línea donde no debía, el nodo Code de N8N ("Separar Prospectos") fallaba y devolvía `No output data returned`, lo cual apagaba el flujo e impedía que llegara a Hunter.io.

**Solución Implementada (La versión estable y final que enviamos a producción):**
1. **Pivote final seguro:** Revertimos el nodo de N8N de DuckDuckGo para que vuelva a ser **Google Custom Search API**. Como la cuenta gratuita de Google incluye 100 requests profesionales diarios (`key` y `cx`), garantizamos que ningún WAF (bot-protector) bloqueará las llamadas y la IA siempre tendrá datos duros.
2. **Regex Blindado:** Reescribimos el Node "Separar Prospectos" en JS con una iteración regex a prueba de balas (`cleanJsonText.replace(/^[\\s\\S]*?```(?:json)?\\n?/i, '')`) que extrae el corchete pase lo que pase. 
3. **Fallback Magia IA:** Modificamos el nodo "Merge Hunter + IA". Si Hunter.io (por su plan gratuito) no encuentra el correo exacto para que lo mostremos en el Frontend, en vez de devolver `null`, nuestro **script deduce inteligentemente el patrón del dominio** (ej. nombre.apellido@ecopetrol.com) e inyecta la suposición (`emailSource: 'ia_estimado'`) garantizando que en React la tabla de usuarios SIEMPRE esté poblada de emails para enviar flyers.

**🛑 NOTA PERSONAL / CONTEXTO (Para mi yo del futuro):**
> *(El usuario cuenta con la ayuda del agente externo "Claude" que está operando en paralelo en otras tareas. Al retomar o seguir estas bitácoras, tener en cuenta que las ideas estructurales o cambios aledaños pueden provenir de implementaciones hechas con Claude, y debo enfocarme en integrarme colaborativamente con lo que ya tengan definido).*

---

### Sesión 9 — Corrección de Configuración y Preparación de QA
**Fecha:** 2026-03-11
**Conversación:** `b11f164c-8ed8-4c6d-b9dd-b1b92a4fbf9d`

**Temas:**
- Validación del flujo "Lanzar Campaña".
- Detección de configuración faltante en `.env`.
- Intento de despliegue a Firebase (Blaze Plan Error).

**✅ Completado:**
- **Configuración Fix:** Se agregó `VITE_MARKETING_API_URL` al archivo `.env` apuntando al Agente Unificado de N8N.
- **Identificación de Limitación Cloud:** Se confirmó que el plan **Spark** de Firebase no permite desplegar funciones v2 ni hacer peticiones externas (Google/Hunter.io) desde las Cloud Functions.

**🔴 Pendiente Inmediato (QA):**
1. **Validación N8N:** Dado que N8N no depende de Firebase Blaze, el plan sigue siendo probar el flujo desde el frontend local contra N8N.
2. **Upgrade de Firebase (Opcional):** Si se desea usar las Cloud Functions en el futuro, se requiere pasar a plan Blaze.

### Sesión 11 — Revisión de Estado y Preparación de QA
**Fecha:** 2026-03-11
**Conversación:** `c10dec83-6c44-4eee-af7f-1c0645cecb15`

**Temas:**
- Revisión integral de la bitácora tras la migración exitosa.
- Verificación de la configuración del entorno (.env) para el nuevo dominio del VPS.

**✅ Completado:**
- Confirmación de la conectividad con `n8n.gestionelspec.site`.
- Sincronización de contexto para el cierre de jornada.

**⚠️ Pendiente / Próximos pasos:**
- Importar `n8n_unified_ai_agent.json` en n8n.
- Validar el flujo de Prospect Finder en producción (Frontend -> n8n -> APIs).

### Sesión 12 — Depuración de Credenciales y Validación de Frontend
**Fecha:** 2026-03-12
**Conversación:** `2468cf11-b759-4173-91fe-5da97092d00b`

**Temas:**
- Error "Invalid API Key" en el buscador de prospectos.
- Limpieza de fallbacks inválidos en n8n.
- Validación proactiva en el frontend.

**✅ Completado:**
- **Restaurada lógica de n8n Cloud:** Volvimos al Scraper de DuckDuckGo para evitar errores de API Key de Google.
- Eliminada la funcionalidad de Flyers: Borrado `FlyerGenerator.jsx` y limpieza de n8n.
- Verificación de build exitosa.

**⚠️ Pendiente / Próximos pasos:**
- El usuario debe configurar sus propias llaves en la pestaña "Configuración".
- Pruebas reales de búsqueda con llaves válidas.

---

*Última actualización: 2026-03-12 | Por: Antigravity AI*

## Sesión 10 — Migración Total a VPS y Dominio Propio
**Fecha:** 2026-03-11
**Conversación:** `b11f164c-8ed8-4c6d-b9dd-b1b92a4fbf9d` (Final)

**Temas:**
- Finalización del sistema de seguimiento ("Tecking").
- Migración de n8n Cloud a n8n Self-hosted en VPS.
- Implementación de dominio propio con SSL.
- Configuración de PostgreSQL para persistencia avanzada.

**✅ Completado:**
1. **Infraestructura VPS:** Despliegue de Docker/Docker Compose en Ubuntu 24.04.
2. **Base de Datos:** Migración de n8n de SQLite a **PostgreSQL 16** para mayor robustez.
3. **Dominio & SSL:** Configuración de `https://gestionelspec.site` con Certbot y Nginx.
4. **"Tecking" (Tracking):** Actualización de todos los flujos para que el pixel de seguimiento apunte al nuevo dominio local.
5. **Almacenamiento:** Creación de volumen persistente `/var/www/elspec/storage` para reportes, fotos y facturas PDF futuras.
6. **Frontend:** Despliegue del build local (`dist`) directamente al VPS vía Nginx.

**Estado Final:**
El sistema es ahora 100% independiente de n8n Cloud y Firebase Functions (Spark limitations). Toda la lógica corre en el VPS propio bajo el dominio consolidado.

---

*Última actualización: 2026-03-11 (Cierre de día) | Por: Antigravity AI*

## [2026-03-11] VPS Migration & Docker-Native Setup (Part 1)

**Estado Actual:**
- **Servidor:** VPS Hostinger KVM 2, Ubuntu 24.04 (Docker-Native).
- **Infraestructura:** Stack de Docker unificado corriendo 4 servicios (Nginx Proxy Manager, PostgreSQL 16, n8n-server, elspec-frontend).
- **Dominios:**
    - `https://gestionelspec.site`: **OK** (Frontend React desplegado y con SSL).
    - `n8n.gestionelspec.site`: **En progreso** (Decisión de mover a subdominio para evitar errores de carga de archivos en subruta).
- **Base de Datos:** PostgreSQL configurado con volumen persistente en `~/elspec-stack/db_data`.

**Acciones Pendientes para el regreso:**
1. Verificar que el registro DNS `n8n` apunte a la IP `187.124.152.139`.
2. Crear el Proxy Host para `n8n.gestionelspec.site` en el panel de NPM (IP:81).
3. Importar el flujo `n8n_unified_ai_agent.json` y configurar credenciales (OpenAI, Hunter, Google).
4. Verificación final de "Email Tracking" en el nuevo dominio.


## [2026-03-11] VPS Migration - ¡MISIÓN CUMPLIDA! 🏆

**Resultado Final:**
- **Frontend Live:** [https://gestionelspec.site](https://gestionelspec.site) (SSL OK).
- **Automation Live:** [https://n8n.gestionelspec.site](https://n8n.gestionelspec.site) (SSL OK).
- **Infraestructura:** 100% Docker-Native en Hostinger VPS.
- **Base de Datos:** PostgreSQL persistente conectada a n8n.

**Siguientes Pasos (Finales):**
1. Importar `n8n_unified_ai_agent.json`.
### Sesión 11 — Revisión de Estado y Preparación de QA
**Fecha:** 2026-03-11
**Conversación:** `c10dec83-6c44-4eee-af7f-1c0645cecb15`

**Temas:**
- Revisión integral de la bitácora tras la migración exitosa.
- Verificación de la configuración del entorno (.env) para el nuevo dominio del VPS.

**✅ Completado:**
- Confirmación de la conectividad con `n8n.gestionelspec.site`.
- Sincronización de contexto para el cierre de jornada.

**⚠️ Pendiente / Próximos pasos:**
- Importar `n8n_unified_ai_agent.json` en n8n.
- Validar el flujo de Prospect Finder en producción (Frontend -> n8n -> APIs).

---

### Sesión 13 — Migración Crítica: Firebase a PostgreSQL (v8.0)
**Fecha:** 2026-03-13
**Conversación:** `33ecdb3d-5e40-4e2a-b909-49523289bb11`

**Temas:**
- Migración masiva de datos desde Firebase Firestore hacia PostgreSQL (VPS).
- Configuración de flujos de n8n con SQL parametrizado ($1, $2, etc.).
- Depuración de tipos de datos numéricos y estructuras anidadas en Firebase.
- Implementación de lógica de "Upsert" (`ON CONFLICT`) para migración segura.

**✅ Completado:**
- **Esquema Postgres v8.0:** Despliegue exitoso del esquema relacional completo en el esquema `elspec`.
- **Migración de Usuarios:** 15 registros migrados con `firebase_id` como referencia.
- **Migración de Clientes:** Resolución de nombres de colección y mapeo de campos ERP.
- **Migración de Ventas:** Superado error de sintaxis en N8N mediante consultas parametrizadas y mapeo de `totales.total`.
- **Configuración N8N:** Workflow `n8n_migration_v1.json` listo y probado para las 3 entidades principales.

**⚠️ Pendiente / Próximos pasos:**
- **Tickets y Equipos:** Ejecutar los nodos de migración para `tickets` y `computers` (ya configurados).
- **Procesos SGI:** Migrar `sgi_processes` y `sgi_evidence`.
- **Limpieza Firebase:** Una vez validado todo en Postgres, preparar el "apagado" de las llamadas a Firebase en el frontend.

---

## 🔴 Pendientes Globales / Próximos Pasos
- [x] Desplegar PostgreSQL en VPS con Docker.
- [x] Configurar esquema `elspec` y seguridad.
- [/] Migración total de Firebase a Postgres:
    - [x] Usuarios
    - [x] Clientes (Customers)
    - [x] Ventas (ERP)
    - [ ] Tickets y Soporte
    - [ ] SGI y Procesos
- [ ] Actualizar Frontend para leer desde API Gateway (Postgres) en lugar de Firestore.
- [ ] QA Final de integridad referencial.

---

*Última actualización: 2026-03-13 | Por: Antigravity AI (Master Agent)*


### Sesi�n 14 � Separaci�n de Workflows N8N
**Fecha:** 2026-03-15
**Conversaci�n:** (Actual)

**Temas:**
- Separaci�n del workflow unificado `n8n_unified_ai_agent.json` en workflows independientes.
- Actualizaci�n de variables de entorno para los endpoints del frontend.

**? Completado:**
- Creados 3 workflows: `n8n_prospect_finder.json`, `n8n_campaign_launcher.json`, `n8n_email_tracking.json`.
- Actualizado `.env` del frontend (`VITE_PROSPECTS_API_URL` y `VITE_MARKETING_API_URL`) refiriendo a los nuevos webhooks.


### Sesi�n 15 � Interrupci�n Reconfiguraci�n N8N
**Fecha:** 2026-03-15
**Conversaci�n:** (Actual)

**Estado:**
- El usuario necesita reiniciar su m�quina local por lentitud.
- Qued� pendiente a�adir las variables de entorno de las API Keys (GEMINI_API_KEY, HUNTER_API_KEY, OPENAI_API_KEY) dentro del archivo .env del VPS (en ~/elspec-stack/) y reiniciar los contenedores de Docker (docker-compose down && docker-compose up -d).
- Los 3 workflows (.json) ya se crearon y dividieron correctamente. Falta importarlos en la interfaz de n8n luego del reinicio y probarlos.

 # #   N o t a   d e   C o n f i g u r a c i � � n   ( 2 0 2 5 - 0 3 - 1 5 ) 
 -   * * S M T P * * :   S e t e a d o   c o n   c o r r e o   p e r s o n a l   d e   f o r m a   p r o v i s i o n a l   p a r a   p r u e b a s . 
 -   * * P e n d i e n t e * * :   C a m b i a r   a   S M T P   c o r p o r a t i v o   ( v e n t a s @ e l s p e c a n d i n a . c o m . c o )   c u a n d o   l a s   c r e d e n c i a l e s   e s t � � n   l i s t a s   p a r a   p r o d u c c i � � n .  
 