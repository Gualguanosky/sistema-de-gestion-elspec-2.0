# Sistema de Gestión de Tickets - ELSPEC ANDINA

![Estado del Proyecto](https://img.shields.io/badge/Estado-Producci%C3%B3n-success?style=for-the-badge)
![Versión](https://img.shields.io/badge/Versi%C3%B3n-1.0.0-blue?style=for-the-badge&logo=semver)

Este proyecto es una solución integral diseñada para la gestión eficiente de solicitudes de soporte técnico y requerimientos internos en **ELSPEC ANDINA**. La plataforma centraliza las operaciones del departamento IT, permitiendo un seguimiento detallado desde la creación de incidencias hasta su resolución y cierre, garantizando transparencia y trazabilidad en cada paso.

## 🚀 Características Principales

### 🛡️ Control de Acceso Basado en Roles (RBAC)
- **Administrador IT**: Panel de control completo con métricas en tiempo real, gestión total de tickets y administración de usuarios.
- **Usuario Estándar**: Interfaz simplificada para la creación de solicitudes y seguimiento de sus propios casos.

### 🎫 Gestión Avanzada de Tickets
- **Ciclo de Vida Completo**: Creación, Asignación, Edición, y Cierre de tickets.
- **Priorización Inteligente**: Clasificación por niveles de urgencia (Baja, Media, Alta) con indicadores visuales.
- **Flujo de Resolución Documentada**: Al cerrar un ticket, se registra obligatoriamente la solución técnica aplicada y recomendaciones preventivas.
- **Papelera de Reciclaje (Soft Delete)**: Eliminación lógica de registros para auditoría y recuperación de datos.

### 📊 Reportes y Métricas
- **Generador de Informes PDF**: Exportación automática de reportes ejecutivos con tablas detalladas de incidentes.
- **Dashboard Interactivo**: Visualización de KPIs clave (Tickets Totales, Pendientes, Resueltos) para la toma de decisiones.

## 🛠️ Arquitectura Tecnológica

El sistema ha sido construido utilizando un stack moderno y escalable, priorizando el rendimiento y la experiencia de usuario:

- **Frontend**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/) para una interfaz reactiva y de alto rendimiento.
- **Backend (BaaS)**: [Firebase Firestore](https://firebase.google.com/) para base de datos NoSQL en tiempo real.
- **Estilos**: CSS3 Moderno con diseño **Glassmorphism**, Variables CSS para temas dinámicos y diseño totalmente **Responsive**.
- **Iconografía**: [Lucide React](https://lucide.dev/) para una interfaz visual limpia y consistente.
- **Utilidades**: 
  - `jspdf` & `jspdf-autotable` para la generación de documentos PDF profesionales.
  - Custom Hooks (`useAuth`, `useTickets`) para una gestión eficiente del estado y lógica de negocio.

## 📂 Estructura del Proyecto

La arquitectura de directorios sigue las mejores prácticas de modularización:

```bash
src/
├── assets/          # Recursos estáticos (imágenes, logos)
├── components/      # Componentes UI reutilizables
│   ├── Dashboard.jsx      # Núcleo de la interfaz administrativa
│   ├── Login.jsx          # Autenticación segura
│   ├── UserManagement.jsx # ABM de usuarios
│   └── ReportGenerator.jsx # Lógica de exportación a PDF
├── hooks/           # Lógica de negocio extraída (Custom Hooks)
│   ├── useAuth.js         # Gestión de sesión y permisos
│   └── useTickets.js      # CRUD y suscripciones a Firestore
├── services/        # Capa de comunicación con servicios externos
│   ├── firebase.js        # Configuración del SDK
│   └── db.js              # Métodos de acceso a datos abstractos
├── App.jsx          # Enrutamiento y Layout principal
└── main.jsx         # Punto de entrada y manejo de errores globales
```

## 🔧 Instalación y Despliegue

### Prerrequisitos
- Node.js (v18 o superior)
- npm o yarn

### Configuración Local

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/tu-usuario/sistema-tickets-elspec.git
    cd sistema-tickets-elspec
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar Variables de Entorno:**
    El proyecto requiere una configuración de Firebase. Asegurate de tener el archivo `.env` o configurar `firebase.js` con tus credenciales.

4.  **Ejecutar en desarrollo:**
    ```bash
    npm run dev
    ```

### Compilación para Producción

Para generar los archivos estáticos optimizados para despliegue:

```bash
npm run build
```

## 🔐 Credenciales de Acceso (Demo)

El sistema viene pre-configurado con usuarios para pruebas rápidas (ver `src/services/db.js`):

| Rol | Usuario | Contraseña |
| --- | --- | --- |
| **Admin** | `alejandro` | `******` |
| **Usuario** | `user` | `user` |

---

<div align="center">
  <p>Desarrollado con ❤️ para <b>ELSPEC ANDINA</b> - Innovación y Eficiencia Operativa</p>
  <p>© 2024 Ingeniería de Sistemas</p>
</div>
