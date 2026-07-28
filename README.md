# 🍦 Healditos Pro

**Healditos Pro** es un sistema moderno de administración de ventas e inventario para heladerías y pequeños negocios. Está diseñado para ofrecer una experiencia rápida, segura y totalmente sincronizada con la nube mediante **Supabase**, permitiendo gestionar productos, inventario, ventas y reportes en tiempo real.

---

## ✨ Características

- 📦 Gestión completa de productos
- 📊 Dashboard con estadísticas de ventas
- 🛒 Carrito de compras
- 📉 Control automático de inventario
- ☁️ Sincronización en tiempo real con Supabase
- 🔒 Base de datos como única fuente de verdad (Single Source of Truth)
- ⚡ Guardado automático de cambios
- 📱 Integración con WhatsApp para pedidos
- 🤖 Chatbot con IA
- 📈 Gráficas y reportes
- 📄 Exportación de información en PDF
- 📱 Diseño Responsive
- 🔐 Checkout protegido contra sobreventa mediante bloqueos atómicos en PostgreSQL

---

# 🛠 Tecnologías

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Lucide React
- Recharts
- Motion

### Backend

- Express
- Node.js
- TypeScript

### Base de Datos

- Supabase
- PostgreSQL

### IA

- Google GenAI

### Despliegue

- Netlify Functions
- Netlify

---

# 🏗 Arquitectura

```
React
   │
   ▼
Express API
   │
   ▼
Supabase
(PostgreSQL)
```

La aplicación utiliza una arquitectura **Direct-to-Cloud**, donde Supabase actúa como la única fuente de datos oficial.

No existe almacenamiento local como respaldo, evitando inconsistencias y problemas de sincronización.

---

# 🚀 Instalación

## Clonar el proyecto

```bash
git clone https://github.com/TU-USUARIO/healditos-pro.git
```

```bash
cd healditos-pro
```

## Instalar dependencias

```bash
npm install
```

## Variables de entorno

Crear un archivo `.env`

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GOOGLE_API_KEY=
```

---

## Ejecutar en desarrollo

```bash
npm run dev
```

---

## Construir para producción

```bash
npm run build
```

---

## Ejecutar producción

```bash
npm start
```

---

# 📂 Estructura del proyecto

```
src/
│
├── components/
├── App.tsx
├── index.css
│
server/
├── server.ts
├── db.ts
├── chatbot.ts
├── supabase.ts
│
netlify/
├── functions/
│
public/
│
assets/
```

---

# 🔒 Seguridad

La aplicación implementa:

- Validación de datos
- Sincronización automática
- Persistencia inmediata
- Verificación de stock desde servidor
- Checkout atómico
- Bloqueos `SELECT ... FOR UPDATE` en PostgreSQL para evitar ventas simultáneas del mismo producto.

---

# ⚡ Funcionalidades principales

## Inventario

- Crear productos
- Editar productos
- Eliminar productos
- Ajustar stock

## Ventas

- Registro de ventas
- Historial
- Estadísticas
- Reportes

## Configuración

- Configuración del negocio
- Persistencia automática

## IA

- Chatbot integrado para asistencia

---

# 📈 Estado del proyecto

Actualmente el proyecto se encuentra estable y cuenta con:

- ✅ Sincronización en tiempo real
- ✅ Arquitectura Direct-to-Cloud
- ✅ Persistencia automática
- ✅ Protección contra condiciones de carrera (Race Conditions)
- ✅ Compatibilidad con registros antiguos
- ✅ Base de datos centralizada

---

# 🤝 Contribuciones

Las contribuciones son bienvenidas.

1. Haz un Fork
2. Crea una rama

```bash
git checkout -b feature/nueva-funcionalidad
```

3. Haz Commit

```bash
git commit -m "Nueva funcionalidad"
```

4. Haz Push

```bash
git push origin feature/nueva-funcionalidad
```

5. Abre un Pull Request

---

# 📄 Licencia

Este proyecto se distribuye bajo la licencia MIT.

---

# 👨‍💻 Autor

**Andrés Ramírez**

Desarrollado para la administración inteligente de heladerías mediante tecnologías modernas como React, Supabase y PostgreSQL.

---

## ⭐ Si este proyecto te resulta útil, no olvides dejar una estrella en GitHub.
