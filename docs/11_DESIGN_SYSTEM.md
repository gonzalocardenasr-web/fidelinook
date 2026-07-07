# Nook Platform Design System

Versión: 1.0
Estado: Activo
Última actualización: Julio 2026

---

# Objetivo

Este documento define los principios de diseño UX/UI de la Plataforma Nook.

No describe únicamente colores o componentes visuales.

Define la forma en que se diseñan las interfaces de usuario, la interacción entre módulos y los criterios que deben seguirse para desarrollar cualquier nueva funcionalidad.

Toda decisión de diseño deberá respetar este documento.

---

# Principios

La Plataforma Nook no es un sitio web.

Es una plataforma operacional para administrar una heladería.

Por lo tanto cada interfaz debe diseñarse considerando el contexto real de uso.

---

# Existen dos mundos

La plataforma posee dos tipos de usuarios completamente distintos.

## Mundo 1

Cliente

Utiliza:

- Smartphone
- Navegación ocasional
- Tiempo de uso corto

Ejemplos

- Tarjeta digital
- Registro
- Activación
- Premios
- Suscripciones

---

## Mundo 2

Operación

Utiliza:

- Laptop
- Uso continuo
- Jornada completa
- Alta frecuencia de interacción

Ejemplos

- Caja
- Preparación
- Catálogo
- Clientes
- Dashboard

Las decisiones de UX de un mundo NO deben condicionar al otro.

---

# Cliente

## Filosofía

Mobile First.

Dispositivo de referencia:

iPhone 11.

Toda pantalla debe visualizarse correctamente en ese tamaño.

Si el dispositivo es mayor:

Se aprovecha el espacio adicional.

Nunca se debe depender de pantallas grandes.

---

# Operación

## Filosofía

Desktop First.

La plataforma será utilizada principalmente desde notebooks de:

14"

15"

No se diseña pensando en tablets.

No se diseña pensando en móviles.

---

# Filosofía operacional

Operación NO es un sitio web.

Operación es una estación de trabajo.

Debe permanecer abierta durante toda la jornada.

La navegación debe minimizar cambios de contexto.

---

# Uso del espacio

Se debe aprovechar todo el ancho disponible.

No dejar grandes márgenes únicamente por razones estéticas.

Cada zona de pantalla debe aportar valor operacional.

---

# Layout Operacional

La plataforma utilizará un layout persistente.

```
┌────────────┬──────────────────────────────┬─────────────────┐
│            │                              │                 │
│ Navegación │        Módulo activo         │ Panel Contexto  │
│            │                              │                 │
└────────────┴──────────────────────────────┴─────────────────┘
```

---

## Navegación

La navegación permanecerá visible.

Ejemplo

- Inicio
- Venta
- Pedidos
- Catálogo
- Clientes
- Fidelización
- Dashboard

El usuario nunca debe perder contexto.

---

## Panel central

Contiene el módulo principal.

Debe utilizar el mayor porcentaje del ancho.

---

## Panel de contexto

Contiene información complementaria.

Ejemplos:

Cliente

Caja

Operador

Alertas

Premios

Suscripciones

Pedidos pendientes

Nunca debe duplicar información del módulo principal.

---

# Pantallas operacionales

Toda pantalla debe responder:

¿Qué necesito hacer?

¿Qué necesito saber?

¿Qué acción sigue?

---

# Scroll

Regla general:

Evitar scroll vertical durante la operación principal.

Especialmente en:

Venta

Caja

Preparación

Si existe scroll, debe pertenecer únicamente a listas secundarias.

Nunca debe ocultar la acción principal.

---

# Acción principal

Toda pantalla debe tener una única acción principal claramente identificable.

Ejemplos

Confirmar venta

Guardar

Crear campaña

Activar suscripción

Nunca debe desaparecer del viewport.

---

# Botones

Todo botón debe:

tener hover

tener active

mostrar claramente que es interactivo

Los botones principales deben destacar visualmente.

---

# Feedback

Toda acción debe entregar feedback.

Ejemplos

Guardado correctamente.

Pedido creado.

Cliente encontrado.

Premio aplicado.

Nunca dejar al usuario sin confirmación.

---

# Componentes

Todo componente debe ser reutilizable.

No duplicar interfaces.

Si un componente puede utilizarse en dos módulos:

Debe vivir fuera del módulo específico.

Ejemplo

components/

No

operacion/components/

si será utilizado por otros módulos.

---

# Modalidad POS

La caja tendrá reglas propias.

Principios:

Siempre mostrar el pedido.

Siempre mostrar el total.

Siempre mostrar Confirmar Venta.

Nunca obligar al usuario a desplazarse para cerrar la venta.

---

# Construcción del pedido

Los productos NO deben mostrarse como una lista infinita.

La construcción del pedido será guiada.

Categoría

↓

Producto

↓

Configuración

↓

Agregar

↓

Pedido

---

# Pedido

El pedido debe ser compacto.

No mostrar configuraciones ya terminadas.

Editar mediante modal.

No expandir verticalmente innecesariamente.

---

# Cliente

La información del cliente debe ser contextual.

No debe obligar a cambiar de pantalla.

Ejemplo:

Nombre

Sellos

Premios

Suscripción

Última visita

Observaciones

---

# Fidelización

La fidelización debe integrarse de forma natural en la operación.

Nunca debe sentirse como un sistema separado.

---

# Estados

Todo cambio de estado debe ser visible.

Ejemplos

Pendiente

Preparando

Listo

Entregado

Cancelado

Los colores deben ser consistentes en toda la plataforma.

---

# Performance

Toda pantalla operacional debe sentirse inmediata.

Evitar recargas completas.

Actualizar únicamente la información necesaria.

---

# Accesibilidad

Todos los controles deben poder utilizarse:

con mouse

con teclado

Los textos deben mantener suficiente contraste.

---

# Consistencia

Una misma acción debe comportarse igual en toda la plataforma.

Guardar siempre significa guardar.

Cancelar siempre significa cancelar.

Eliminar siempre significa eliminar.

---

# Arquitectura

La UX nunca debe aumentar la deuda técnica.

Toda nueva pantalla deberá:

reutilizar componentes

reutilizar APIs

reutilizar lógica

---

# Regla de oro

La Plataforma Nook debe optimizar el trabajo del equipo.

Cada clic innecesario es deuda operacional.

Cada cambio de contexto innecesario es deuda cognitiva.

Cada pantalla debe diseñarse para ayudar a trabajar, no solamente para verse bien.
