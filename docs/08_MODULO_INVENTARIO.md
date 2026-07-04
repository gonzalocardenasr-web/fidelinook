# Módulo de Inventario

Versión del documento: 1.0

Última actualización: Junio 2026

---

# Objetivo

El módulo de Inventario administra todos los productos e insumos utilizados por Nook.

Su propósito es mantener un control permanente del stock disponible y abastecer automáticamente la operación del negocio.

El inventario constituye la principal fuente de información para la planificación de compras.

---

# Objetivos de negocio

- Conocer el stock disponible.
- Reducir quiebres de stock.
- Planificar compras.
- Automatizar descuentos por ventas.
- Controlar mermas.
- Generar información para Inteligencia Comercial.

---

# Filosofía

El inventario no representa únicamente cantidades almacenadas.

Representa la capacidad futura de operar el negocio.

Cada movimiento modifica la capacidad operacional de Nook.

---

# Alcance

El módulo administrará todos los SKU utilizados por la empresa.

Incluyendo:

- Productos para venta.
- Materias primas.
- Packaging.
- Insumos.
- Productos de limpieza.
- Material de oficina.
- Otros activos consumibles.

---

# Catálogo maestro

Todo SKU deberá existir previamente en un catálogo maestro.

Cada SKU tendrá como mínimo:

- Código
- Nombre
- Categoría
- Unidad
- Estado
- Stock mínimo
- Stock objetivo

En futuras versiones podrán incorporarse proveedores y costos.

---

# Movimientos

Todo cambio de inventario generará un movimiento.

Tipos iniciales:

- Compra
- Venta
- Ajuste
- Merma
- Consumo interno

Nunca se modificará el stock directamente.

Siempre existirá un movimiento que explique la variación.

---

# Flujo operacional

Compra

↓

Ingreso de stock

↓

Ventas

↓

Descuento automático

↓

Stock actualizado

↓

Alertas

↓

Nueva compra

---

# Integraciones

## Operación

Cada venta descontará automáticamente los productos correspondientes.

---

## Dashboard

Permitirá visualizar:

- Stock crítico.
- Productos agotados.
- Inventario valorizado.
- Productos próximos a agotarse.

---

## Inteligencia Comercial

Permitirá responder preguntas como:

- ¿Qué productos rotan más?
- ¿Qué sabores presentan mayor consumo?
- ¿Cuál será el próximo producto en agotarse?
- ¿Qué debería comprarse esta semana?

---

# Alertas

El sistema incorporará alertas automáticas.

Ejemplos:

- Stock bajo.
- Producto agotado.
- Compra sugerida.
- Producto sin movimiento.
- Próximo vencimiento (si aplica).

---

# Diseño

El módulo será diseñado para escritorio.

El usuario deberá visualizar la mayor cantidad posible de información sin desplazamiento vertical.

Se privilegiarán:

- filtros rápidos.
- edición inmediata.
- indicadores visuales.
- colores de estado.

---

# Evolución futura

El módulo podrá incorporar posteriormente:

- Proveedores.
- Órdenes de compra.
- Recepción de mercadería.
- Costos históricos.
- Kardex.
- Lotes.
- Fecha de vencimiento.
- Inventarios físicos.
- Conteos cíclicos.
- Integración con códigos de barra.
- Integración con QR.

---

# Estado

Actualmente el módulo se encuentra en etapa de diseño funcional.

Su desarrollo comenzará inmediatamente después del módulo Operación.