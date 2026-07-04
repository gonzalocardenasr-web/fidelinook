# Módulo de Campañas

Versión del documento: 1.0

Última actualización: Junio 2026

---

# Objetivo

El módulo de Campañas permite crear, programar y ejecutar acciones promocionales dirigidas a los clientes de Nook.

Su objetivo es aumentar la frecuencia de compra, incentivar el retorno al local y entregar beneficios segmentados de manera completamente digital.

El módulo constituye el principal canal de marketing directo de la plataforma.

---

# Objetivos de negocio

- Incrementar visitas al local.
- Aumentar ventas.
- Incentivar la recompra.
- Entregar beneficios personalizados.
- Medir la efectividad de las campañas.

---

# Funcionalidades actuales

## Creación de campañas

Cada campaña permite definir:

- Nombre interno.
- Nombre del premio.
- Descripción.
- Duración del beneficio.
- Fecha y hora de lanzamiento.

Las campañas nacen en estado "Borrador".

---

## Estados

Las campañas pueden encontrarse en los siguientes estados:

- Borrador
- Programada
- Lanzando
- Lanzada
- Fallida

Cada transición representa una etapa del ciclo de vida de la campaña.

---

## Programación

Una campaña puede programarse para ejecutarse posteriormente.

Actualmente la ejecución es manual desde el panel administrativo.

En versiones futuras podrá automatizarse mediante tareas programadas.

---

## Ejecución

Al ejecutar una campaña el sistema:

- identifica los clientes objetivo.
- asigna el premio correspondiente.
- registra la trazabilidad.
- envía el correo electrónico.
- actualiza las métricas de la campaña.

La ejecución evita asignar dos veces el mismo premio a un cliente.

---

## Campañas de prueba

El sistema permite ejecutar campañas sobre un único correo electrónico.

Este modo:

- no modifica el estado de la campaña.
- no altera métricas.
- permite validar completamente el flujo antes del lanzamiento.

---

## Correos electrónicos

Cada campaña genera automáticamente un correo utilizando la plantilla institucional de Nook.

El correo incluye:

- premio asignado.
- descripción.
- vigencia.
- acceso directo a la tarjeta.

---

## Visualización para el cliente

Los premios provenientes de campañas aparecen destacados en la tarjeta del cliente.

Los premios se clasifican automáticamente en:

- Activos.
- Usados.
- Caducados.

---

# Flujo funcional

Administrador crea campaña

↓

Borrador

↓

Programar

↓

Programada

↓

Ejecutar

↓

Asignación de premios

↓

Envío de correos

↓

Cliente recibe beneficio

↓

Cliente canjea premio

↓

Campaña registra resultados

---

# Dashboard

Actualmente el sistema registra:

- Clientes objetivo.
- Premios asignados.
- Estado de la campaña.

El dashboard evolucionará para incorporar indicadores comerciales más avanzados.

---

# Modelo de datos

Tablas involucradas:

- campanas
- campana_clientes
- clientes

Los premios continúan almacenándose dentro del registro del cliente.

---

# Reglas de negocio

Una campaña:

- no puede ejecutarse dos veces.
- no puede asignar premios duplicados.
- no modifica campañas de prueba.
- solo considera clientes elegibles para comunicaciones.

---

# Decisiones de diseño

Durante el desarrollo se optó por una ejecución manual.

Las razones fueron:

- mayor control operacional.
- menor complejidad.
- posibilidad de validar resultados.
- facilidad para corregir errores antes de automatizar.

La automatización completa quedó planificada para una etapa posterior.

---

# Mejoras futuras

Se encuentran identificadas las siguientes mejoras:

- Segmentación avanzada.
- Programación automática.
- Campañas recurrentes.
- Campañas por comportamiento.
- Campañas por cumpleaños.
- Campañas por aniversario.
- Campañas para clientes inactivos.
- Reenvío masivo de correos de activación.
- Dashboard avanzado de efectividad.
- Historial completo por cliente.
- Duplicación de campañas.
- Archivo histórico de campañas.

---

# Estado actual

El módulo se encuentra operativo en producción.

Actualmente permite ejecutar campañas reales sobre la base de clientes y constituye uno de los principales mecanismos de marketing de Nook.

Las siguientes etapas estarán enfocadas principalmente en automatización, segmentación y análisis de resultados.