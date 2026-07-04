# Módulo de Ventas

Versión del documento: 1.0

Última actualización: Junio 2026

---

# Objetivo

El módulo de Ventas constituye el núcleo operacional de la Plataforma Nook.

Su propósito es registrar todas las transacciones realizadas por el negocio, independientemente del canal de venta, permitiendo posteriormente integrar inventario, fidelización, campañas, suscripciones e inteligencia comercial.

Este módulo NO busca reemplazar un sistema tributario ni emitir documentos válidos para el SII.

Su objetivo es administrar la operación del negocio.

---

# Objetivos de negocio

- Registrar el 100% de las ventas.
- Estandarizar el registro operacional.
- Automatizar procesos posteriores.
- Alimentar los indicadores del negocio.
- Servir como origen de información para el resto de la plataforma.

---

# Filosofía

Cada venta representa un evento de negocio.

Registrar una venta no solo significa almacenar un monto.

Una venta genera información para:

- Inventario.
- Fidelización.
- Campañas.
- Dashboard.
- Inteligencia Comercial.

Por esta razón el módulo será considerado el punto de partida de toda la operación.

---

# Alcance

Cada transacción deberá registrar como mínimo:

## Información general

- Fecha
- Hora
- Canal
- Medio de pago
- Observaciones

---

## Detalle

Cada venta podrá contener una cantidad variable de líneas.

Cada línea contendrá:

- Categoría
- Producto
- Sabor
- Cantidad
- Precio unitario
- Descuento
- Total

El sistema mostrará inicialmente tres líneas vacías.

El usuario podrá agregar o eliminar líneas libremente.

Siempre deberán permanecer visibles al menos tres líneas.

---

## Totales

El sistema calculará automáticamente:

- Subtotal
- Descuentos por línea
- Descuento general
- Total final

No se permitirán cálculos manuales.

---

# Canales

Inicialmente existirán los siguientes canales:

- Local
- Web
- Uber Eats
- Rappi
- Pedidos Ya
- Venta con factura
- Otros

El catálogo deberá ser configurable.

---

# Medios de pago

Inicialmente:

- Efectivo
- Débito
- Crédito
- Transferencia

También deberán ser configurables.

---

# Pricing

El sistema utilizará una lista maestra de precios.

Cada línea obtendrá automáticamente el precio correspondiente.

Los descuentos podrán aplicarse:

- Por línea.
- Sobre el total.

---

# Documentos

Toda venta podrá generar un comprobante imprimible.

Este documento NO constituye un documento tributario.

Su propósito será entregar al cliente el detalle de la compra y servir como respaldo operacional.

En el futuro podrán existir distintos formatos:

- Ticket cliente.
- Comanda.
- Resumen de retiro.
- Documento interno.

---

# Historial

Todas las ventas quedarán registradas.

El usuario podrá visualizar:

Vista resumida.

↓

Vista expandida.

Cada venta podrá desplegar el detalle completo de productos.

---

# Eliminaciones

Será posible:

- Eliminar una venta completa.
- Eliminar líneas individuales.

Toda eliminación quedará registrada para auditoría en futuras versiones.

---

# Integraciones

El módulo se integrará automáticamente con:

## Inventario

Cada venta descontará automáticamente el stock.

---

## Fidelización

Cuando corresponda, la venta generará automáticamente los sellos.

---

## Campañas

Permitirá medir campañas según ventas reales.

---

## Dashboard

Actualizará indicadores en tiempo real.

---

## Inteligencia Comercial

Constituirá la principal fuente de información analítica.

---

# Diseño

El módulo será diseñado exclusivamente para escritorio.

No se priorizará la experiencia móvil.

La totalidad de la operación deberá poder realizarse sin desplazamiento vertical.

Se privilegiarán:

- velocidad.
- pocos clics.
- lectura inmediata.
- operación continua.

---

# Evolución futura

El módulo podrá incorporar posteriormente:

- Devoluciones.
- Notas internas.
- Caja diaria.
- Apertura y cierre de caja.
- Usuarios por turno.
- Impresión automática.
- Integración con impresoras térmicas.
- Integración con sistemas tributarios.
- Integración con POS externos.

---

# Estado

Actualmente el módulo se encuentra en etapa de diseño funcional.

Su implementación comenzará una vez finalizado el proceso de documentación general de la plataforma.