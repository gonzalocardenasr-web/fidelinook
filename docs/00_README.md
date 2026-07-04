# Fideli-Nook

Versión del documento: 1.0

Última actualización: Junio 2026

---

# Descripción

Fideli-Nook es la plataforma interna de fidelización, campañas, suscripciones y gestión operacional desarrollada para Nook Heladería de Autora.

El sistema fue construido inicialmente para administrar el programa de fidelización mediante sellos digitales y posteriormente evolucionó hasta transformarse en la plataforma central de operación del negocio.

Actualmente el sistema integra funcionalidades para:

- Programa de fidelización.
- Gestión de clientes.
- Campañas promocionales.
- Correos automáticos.
- Dashboard ejecutivo.
- Gestión de suscripciones.

En las siguientes versiones incorporará además:

- Registro de ventas.
- Gestión de inventario.
- Inteligencia comercial.
- Analítica operacional.

---

# Objetivos del proyecto

El objetivo principal es concentrar en una única plataforma toda la operación digital de Nook, disminuyendo procesos manuales y permitiendo tomar mejores decisiones comerciales.

El sistema busca ser simple de operar para el equipo interno, manteniendo una experiencia moderna para los clientes.

---

# Stack tecnológico

Frontend

- Next.js (App Router)
- React
- TypeScript
- TailwindCSS

Backend

- Next.js API Routes

Base de datos

- Supabase PostgreSQL

Autenticación

- Supabase Auth

Emails

- Resend

Hosting

- Vercel

Repositorio

- GitHub

---

# Módulos existentes

## Fidelización

- Tarjeta digital
- Programa de sellos
- Premios
- Historial de premios

## Clientes

- Registro
- Verificación por correo
- Gestión administrativa
- Exportación CSV

## Campañas

- Creación
- Programación
- Lanzamiento
- Correos automáticos
- Dashboard de resultados

## Suscripciones

- Administración
- Asignación
- Beneficios

## Dashboard

- Indicadores generales
- Clientes
- Suscripciones
- Campañas

---

# Módulos planificados

- Ventas
- Inventario
- Inteligencia comercial

---

# Flujo de desarrollo

Todo cambio sigue el siguiente proceso:

Diseño funcional

↓

Diseño visual

↓

Modelo de datos

↓

Implementación

↓

Deploy automático mediante GitHub + Vercel

---

# Deploy

Todo el desarrollo se realiza mediante Git.

Flujo estándar:

git add .

git commit -m "mensaje"

git push

Vercel genera automáticamente el deployment.

---

# Variables de entorno

Las variables de entorno NO forman parte del repositorio.

Se recuperan desde:

Vercel

Settings

Environment Variables

Archivo local:

.env.local

---

# Documentación

La carpeta docs contiene la documentación oficial del proyecto.

Todo nuevo módulo debe ser documentado antes de comenzar su desarrollo.

---

# Estado del proyecto

Actualmente Fideli-Nook se encuentra en etapa de operación productiva y continúa evolucionando mediante desarrollos incrementales.