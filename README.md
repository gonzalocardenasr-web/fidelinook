This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


# Fideli-NooK 🍦

Sistema de fidelización digital para Nook Heladería de Autora.

## Objetivo

Reemplazar tarjetas físicas por una tarjeta digital simple, rápida y fácil de usar, enfocada en la operación del local.

## Estado del Proyecto

✅ MVP Cerrado  
📅 Marzo 2026  
🚀 En producción

Dominio:
https://fidelidad.nookheladeria.cl

---

## Alcance MVP

El MVP incluye:

### Cliente

- Registro de cliente
- Verificación de correo
- Activación de tarjeta
- Tarjeta digital
- Acumulación de sellos
- Generación automática de premio
- Canje de premio
- Correos transaccionales

### Operación Local

- Panel admin
- Validación de compra
- Generación automática de sellos
- Generación automática de premios
- Canje de premios
- QR registro cliente

---

## Flujo del Cliente

1. Cliente se registra
2. Cliente verifica correo
3. Tarjeta se activa
4. Cliente acumula sellos
5. Cliente gana premio
6. Cliente canjea premio

---

## Flujo del Local

1. Registrar cliente
2. Validar compra
3. Sumar sello
4. Generar premio
5. Canjear premio

---

## Stack Tecnológico

- Next.js
- Supabase
- Resend
- Vercel

---

## Estructura del Proyecto
- app/
- admin/
- api/
- registro/
- t/
- tarjeta/

- lib/
- email/

- public/


---

## Seguridad

- Verificación obligatoria de correo
- Tarjeta activada solo tras verificación
- Token público para tarjeta
- Validación backend

---

## Próxima Etapa

Ver documento:

docs/Backlog.md

---

## Proyecto

Fideli-NooK  
Nook Heladería de Autora  
Tomás Moro 695, Local 4  
Las Condes