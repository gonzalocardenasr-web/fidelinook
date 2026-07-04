# Arquitectura de Fideli-Nook

Versión del documento: 1.0

Última actualización: Junio 2026

---

# Objetivo

Este documento describe la arquitectura general de Fideli-Nook, los componentes que lo conforman y la forma en que interactúan entre sí.

El objetivo es que cualquier desarrollador pueda comprender rápidamente la estructura del sistema antes de realizar modificaciones o incorporar nuevos módulos.

---

# Arquitectura General

Fideli-Nook está construido como una aplicación web moderna basada en Next.js, utilizando Supabase como plataforma Backend-as-a-Service (BaaS), Resend para el envío de correos electrónicos y Vercel como plataforma de despliegue continuo.

La arquitectura privilegia la simplicidad operacional, la escalabilidad y un bajo costo de mantenimiento.

```
                   Usuarios
                        │
                        ▼
              Aplicación Next.js
                        │
        ┌───────────────┼────────────────┐
        │               │                │
        ▼               ▼                ▼
     API Routes     Supabase        Resend
        │               │                │
        │        ┌──────┼──────┐         │
        │        │      │      │         │
        ▼        ▼      ▼      ▼         ▼
   Lógica     PostgreSQL Auth Storage  Emails
                        │
                        ▼
                    Dashboard
```

---

# Componentes

## Frontend

Tecnologías:

- Next.js (App Router)
- React
- TypeScript
- TailwindCSS

Responsabilidades:

- Interfaces de usuario.
- Navegación.
- Validaciones.
- Experiencia de usuario.

---

## Backend

Implementado mediante API Routes de Next.js.

Responsabilidades:

- Reglas de negocio.
- Gestión de campañas.
- Gestión de premios.
- Gestión de clientes.
- Dashboard.
- Integración con Supabase.
- Integración con Resend.

---

## Base de datos

Proveedor:

Supabase PostgreSQL

Responsabilidades:

- Persistencia de toda la información.
- Seguridad mediante Row Level Security cuando aplica.
- Relaciones entre módulos.

---

## Autenticación

Proveedor:

Supabase Auth

Responsabilidades:

- Registro de usuarios.
- Inicio de sesión.
- Recuperación de contraseña.
- Verificación de correo electrónico.

---

## Correos electrónicos

Proveedor:

Resend

Responsabilidades:

- Confirmación de registro.
- Recuperación de contraseña.
- Campañas promocionales.
- Comunicaciones futuras.

---

## Hosting

Proveedor:

Vercel

Responsabilidades:

- Hosting.
- Deploy automático.
- Variables de entorno.
- Escalabilidad.

---

# Módulos actuales

Actualmente la plataforma está organizada en los siguientes módulos:

- Fidelización
- Clientes
- Campañas
- Suscripciones
- Dashboard

Todos comparten la misma base de datos y utilizan componentes comunes cuando es posible.

---

# Arquitectura Modular

La plataforma fue diseñada para crecer mediante módulos independientes.

Cada módulo debe:

- Tener responsabilidades claramente definidas.
- Reutilizar componentes existentes.
- Evitar duplicar lógica.
- Compartir únicamente la información necesaria.

---

# Próximos módulos

La siguiente etapa contempla incorporar:

## Ventas

Registro operacional de todas las transacciones realizadas por el negocio.

---

## Inventario

Administración del stock de productos para venta e insumos internos.

---

## Inteligencia Comercial

Cruce de información entre:

- Ventas
- Inventario
- Fidelización
- Campañas
- Suscripciones

Con el objetivo de apoyar la toma de decisiones.

---

# Principios de desarrollo

Todo nuevo desarrollo debe seguir los siguientes principios:

- Simplicidad antes que complejidad.
- Una única fuente de verdad para los datos.
- Interfaces limpias y consistentes.
- Reutilización de componentes.
- Separación entre lógica de negocio e interfaz.
- Diseño primero, implementación después.

---

# Flujo de desarrollo

Todo módulo nuevo seguirá el siguiente proceso:

1. Diseño funcional.
2. Diseño visual.
3. Modelo de datos.
4. Implementación.
5. Validación.
6. Deploy.
7. Documentación.

No se desarrollarán funcionalidades directamente sin haber definido previamente su diseño funcional.

---

# Escalabilidad

La arquitectura fue diseñada para permitir incorporar nuevos módulos sin modificar significativamente los existentes.

Esto permitirá evolucionar Fideli-Nook desde una plataforma de fidelización hacia un sistema integral de operación para Nook Heladería.