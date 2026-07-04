# Backlog de la Plataforma Nook

Versión del documento: 1.0

Última actualización: Junio 2026

---

# Visión

La Plataforma Nook evolucionará de un sistema de fidelización hacia una plataforma integral para administrar la operación completa del negocio.

Cada nueva funcionalidad deberá generar una capacidad reutilizable para el resto del sistema.

No se desarrollarán funcionalidades aisladas.

---

# Estado actual

Actualmente la plataforma cuenta con los siguientes módulos operativos:

- Fidelización
- Clientes
- Campañas
- Suscripciones
- Dashboard

La siguiente etapa incorpora la operación completa del negocio.

---

# Roadmap

## Etapa 1

### Catálogo Maestro

Objetivo:

Crear una única fuente de verdad para todos los SKU del negocio.

Incluye:

- Productos
- Categorías
- Sabores
- Packaging
- Toppings
- Canales disponibles
- Tipo operacional
- Configuración del producto
- Pricing

Estado:

Pendiente

Prioridad:

Muy Alta

---

## Etapa 2

### Operación

Objetivo:

Registrar todas las ventas del negocio.

Incluye:

- Nueva venta
- Historial
- Eliminaciones
- Impresión de comprobantes
- Integración con Fidelización

Estado:

Pendiente

Prioridad:

Muy Alta

---

## Etapa 3

### Inventario

Objetivo:

Administrar el stock operativo.

Incluye:

- Stock
- Compras
- Ajustes
- Mermas
- Descuento automático
- Alertas

Estado:

Pendiente

Prioridad:

Alta

---

## Etapa 4

### Centro de Operaciones

Objetivo:

Crear una pantalla única para administrar el negocio.

Incluirá:

- Ventas
- Clientes
- Campañas
- Inventario
- Alertas
- Suscripciones
- Indicadores

Estado:

Diseño

---

## Etapa 5

### Inteligencia Comercial

Objetivo:

Transformar los datos en recomendaciones.

Ejemplos:

- Productos con mayor rotación.
- Próximos quiebres de stock.
- Clientes inactivos.
- Productos más rentables.
- ROI campañas.
- Predicción de compras.

Estado:

Visión

---

# Mejoras de corto plazo

## Clientes

- Reenvío masivo de correos de activación.
- Mejorar exportación CSV.
- Gestión de preferencias de comunicación.

---

## Campañas

- Dashboard avanzado.
- Segmentación.
- Campañas automáticas.
- Campañas por comportamiento.
- Campañas de cumpleaños.
- Campañas de aniversario.

---

## Fidelización

- Historial de movimientos.
- Parametrización del programa.
- Beneficios por nivel.
- Premios configurables.

---

## Dashboard

- Centro de Operaciones.
- KPIs ejecutivos.
- Alertas inteligentes.
- Indicadores de ventas.

---

# Refactorización

Las siguientes mejoras técnicas se realizarán únicamente cuando generen valor para la evolución del producto.

## Catálogo Maestro

Eliminar lógica específica de productos distribuida en distintos módulos.

Centralizar toda la configuración.

---

## Premios

Evaluar migración desde JSON hacia estructura normalizada cuando el volumen de información lo justifique.

---

## Historial

Incorporar trazabilidad completa de:

- Sellos
- Premios
- Inventario
- Ventas

---

## Arquitectura

Separar progresivamente:

Experiencia Cliente

↓

Operación

↓

Inteligencia

---

# Ideas futuras

- Motor de recomendaciones.
- Clientes VIP.
- Automatizaciones.
- Campañas inteligentes.
- Integración con POS.
- Integración con SII.
- Integración con impresoras térmicas.
- Aplicación móvil para operación.
- Gestión de múltiples locales.
- Multiempresa.

---

# Principio rector

Toda nueva funcionalidad deberá responder primero a una necesidad del negocio y luego traducirse en una capacidad reutilizable para la plataforma.

El objetivo es construir un producto simple, escalable y mantenible, evitando desarrollos específicos que dificulten su evolución futura.