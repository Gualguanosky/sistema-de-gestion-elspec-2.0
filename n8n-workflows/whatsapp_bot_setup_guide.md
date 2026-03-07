# 🤖 Guía de Configuración — WhatsApp Ticket Bot ELSPEC

## Qué vas a necesitar

| Herramienta | Propósito | Costo |
|---|---|---|
| Cuenta Twilio | Recibir y enviar mensajes WhatsApp | Gratis (sandbox) |
| N8N (ya tienes) | Orquestación del bot | Gratis (self-hosted) |
| Firebase Service Account | Escribir en Firestore sin login | Gratis |

---

## PASO 1 — Configurar Twilio WhatsApp Sandbox

> **¿Por qué Twilio Sandbox?** No requiere verificación de Meta Business. Puedes probar en 5 minutos con tu WhatsApp personal.

1. Ve a [twilio.com](https://www.twilio.com) → Crear cuenta gratuita
2. En el dashboard, busca **"Messaging" → "Try it Out" → "Send a WhatsApp message"**
3. Verás instrucciones para conectar tu WhatsApp al sandbox:
   - Envía el código de activación al número del sandbox (ej: `+1 415 523 8886`)
   - El mensaje será algo como: `join plenty-tiger`
4. Una vez conectado, ve a **Messaging → Settings → WhatsApp Sandbox Settings**
5. En el campo **"When a message comes in"**, pega la URL del webhook de N8N (la obtienes en el Paso 3)

**Datos que necesitas guardar:**
```
Account SID: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Auth Token:  xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Sandbox Number: +14155238886 (o el que te asigne Twilio)
```

---

## PASO 2 — Crear Firebase Service Account (para escribir en Firestore)

> Esto permite que N8N escriba tickets directamente en tu Firestore sin estar logueado en la app.

1. Ve a [console.firebase.google.com](https://console.firebase.google.com)
2. Selecciona tu proyecto **ELSPEC 2.0**
3. Click en el ⚙️ (**Configuración del Proyecto**) → pestaña **"Cuentas de Servicio"**
4. Click en **"Generar nueva clave privada"** → Descargar JSON
5. Guarda ese archivo como `firebase-service-account.json` en un lugar seguro

**⚠️ IMPORTANTE:** Este archivo contiene credenciales privadas. **Nunca lo subas a Git**.

---

## PASO 3 — Importar el Workflow en N8N

1. Abre tu N8N → Click en **"Import from file"**
2. Selecciona el archivo: `n8n-workflows/whatsapp_ticket_bot_v1.json`
3. El workflow aparecerá con todos sus nodos

### Configurar las Credenciales en N8N

**a) Credencial de Twilio:**
- En N8N → Credentials → Add → busca **"Twilio API"**
- Ingresa tu `Account SID` y `Auth Token`

**b) Credencial de Google (Firebase):**
- En N8N → Credentials → Add → busca **"Google API"** → selecciona **"Service Account"**
- Sube o pega el contenido del `firebase-service-account.json`
- En los scopes escribe: `https://www.googleapis.com/auth/datastore`

**c) Variables de Entorno en N8N:**
En el archivo `.env` de tu N8N agrega:
```env
TWILIO_WHATSAPP_NUMBER=+14155238886
FIREBASE_PROJECT_ID=tu-project-id-aqui
```
> El `FIREBASE_PROJECT_ID` es el que está en tu archivo `.env` de la app web como `VITE_FIREBASE_PROJECT_ID`

### Asignar las Credenciales a los Nodos
- Abre el nodo **"Enviar WhatsApp"** → Selecciona tu credencial de Twilio
- Abre el nodo **"Crear Ticket en Firestore"** → Selecciona tu credencial de Google
- Abre el nodo **"Enviar Confirmación WhatsApp"** → Selecciona tu credencial de Twilio

---

## PASO 4 — Obtener la URL del Webhook y Conectarlo a Twilio

1. Activa el workflow en N8N (toggle en la esquina superior)
2. Abre el nodo **"Webhook Twilio"** → Copia la **"Production URL"**
   - Será algo como: `https://tu-n8n.cloud/webhook/whatsapp-ticket-bot`
3. Ve a tu dashboard de Twilio → **Messaging → WhatsApp Sandbox Settings**
4. Pega esa URL en el campo **"When a message comes in"**
5. Método: **POST**
6. Click en **Save**

---

## PASO 5 — Probar el Bot

Envía un mensaje desde tu WhatsApp al número sandbox de Twilio:

```
👤 Tú:    "hola"
🤖 Bot:   "👋 Hola Juan! Soy el asistente de soporte de ELSPEC ANDINA..."
           [Menú de tipos de equipo]

👤 Tú:    "1"
🤖 Bot:   "🖥️ Laptop registrado. ¿Cuál es el serial?"

👤 Tú:    "LAP-001"
🤖 Bot:   "📝 Describe el problema..."

👤 Tú:    "No enciende, hace sonido extraño"
🤖 Bot:   "🚦 ¿Qué tan urgente es?"

👤 Tú:    "3"
🤖 Bot:   "✅ ¡Ticket creado! Número de caso: #A3F21B"
```

### Verificar en la App Web
- Ve a tu sistema ELSPEC 2.0 → **Módulo de Atención**
- El ticket aparecerá con el título: `[WhatsApp] Daño en equipo: Laptop — LAP-001`
- Tipo: `Soporte`, Estado: `Abierto`, Prioridad según lo que elegiste

---

## Preguntas Frecuentes

**¿El bot pierde el estado si N8N se reinicia?**
Sí, el estado de conversación se guarda en la memoria del workflow. En producción recomendamos agregar un nodo de Redis para persistencia permanente.

**¿Puedo restablecer una conversación atascada?**
Sí, el usuario puede escribir "hola", "menu" o "reiniciar" en cualquier momento para empezar de nuevo.

**¿Cómo paso a producción (Meta Cloud API)?**
Cuando quieras salir del sandbox, creamos un segundo workflow que usa Meta WhatsApp Cloud API. La lógica del bot es idéntica, solo cambia el nodo de envío.

---

## Próximos Flujos Disponibles

- 📅 **Flujo 2 — Programar Visitas** desde WhatsApp
- 📊 **Flujo 3 — Reportes con IA** por comando de WhatsApp
