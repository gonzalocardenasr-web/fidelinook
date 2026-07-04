# Módulo de Fidelización

Versión del documento: 1.0

Última actualización: Junio 2026

---

# Objetivo

El módulo de Fidelización constituye el núcleo sobre el cual nació Fideli-Nook.

Su propósito es incentivar la recompra mediante un sistema digital de sellos y premios, reemplazando completamente las tradicionales tarjetas físicas.

El cliente puede consultar en cualquier momento el estado de su tarjeta, los sellos acumulados y los premios disponibles.

---

# Objetivos de negocio

- Incrementar la frecuencia de compra.
- Mejorar la retención de clientes.
- Digitalizar el programa de fidelización.
- Obtener información para futuras campañas.
- Integrarse con el resto de la operación.

---

# Funcionalidades actuales

## Tarjeta pública

Cada cliente posee una tarjeta pública accesible mediante un token único.

La tarjeta permite visualizar:

- Nombre del cliente.
- Cantidad de sellos.
- Premio destacado.
- Premios activos.
- Premios usados.
- Premios caducados.

No requiere autenticación.

---

## Tarjeta privada

Los clientes registrados pueden iniciar sesión y acceder a una versión privada de la tarjeta.

Esta versión incorpora funcionalidades adicionales y servirá como punto de acceso para futuras mejoras.

---

## Programa de sellos

El programa actual utiliza la siguiente lógica:

- Cada compra válida genera un sello.
- Al completar seis sellos se obtiene un premio.
- El premio queda disponible para su canje.

El número de sellos podrá modificarse mediante configuración en futuras versiones.

---

## Premios

Actualmente existen dos orígenes posibles para un premio:

### Programa de fidelización

Premios obtenidos por acumulación de sellos.

### Campañas

Premios asignados automáticamente por campañas promocionales.

---

## Estados de un premio

Cada premio puede encontrarse en uno de los siguientes estados:

- Activo
- Usado
- Caducado

Visualmente los premios se presentan agrupados por estado.

---

# Flujo funcional

Cliente realiza compra

↓

Administrador agrega sello

↓

Cliente completa seis sellos

↓

Sistema genera premio

↓

Cliente visualiza premio

↓

Cliente realiza canje

↓

Premio pasa a estado "Usado"

---

# Componentes principales

El módulo está compuesto por:

- Tarjeta pública.
- Tarjeta privada.
- Administración de sellos.
- Administración de premios.
- Visualización de historial.

---

# Integraciones

Actualmente el módulo se integra con:

## Campañas

Permite asignar premios adicionales a determinados clientes.

---

## Dashboard

Entrega indicadores relacionados con:

- Clientes inscritos.
- Tarjetas activas.
- Premios disponibles.

---

## Suscripciones

Permitirá entregar beneficios exclusivos a clientes suscritos.

---

## Ventas (planificado)

Cada venta registrada podrá generar automáticamente los sellos correspondientes.

Esto eliminará la necesidad de asignarlos manualmente.

---

# Decisiones de diseño

Durante el desarrollo del MVP se optó por almacenar los premios como un objeto JSON dentro del registro del cliente.

Esta decisión permitió:

- Reducir complejidad.
- Acelerar el desarrollo.
- Simplificar las consultas.
- Validar rápidamente el modelo de negocio.

Cuando el volumen de clientes lo justifique, podrá migrarse a una estructura completamente normalizada sin afectar la experiencia del usuario.

---

# Mejoras futuras

Se encuentran identificadas las siguientes oportunidades de evolución:

- Historial completo de movimientos de sellos.
- Configuración dinámica del programa.
- Múltiples programas de fidelización.
- Premios segmentados.
- Premios automáticos por cumpleaños.
- Premios automáticos por aniversario.
- Beneficios asociados a nivel de cliente (Bronce, Plata, Oro, etc.).

---

# Estado actual

El módulo se encuentra operativo en producción y constituye una de las funcionalidades más estables de la plataforma.

Las futuras mejoras estarán enfocadas principalmente en automatización, trazabilidad y analítica, manteniendo la simplicidad de uso para clientes y administradores.