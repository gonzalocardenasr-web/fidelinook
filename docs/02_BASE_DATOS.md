# Modelo de Datos

Versión del documento: 1.0

Última actualización: Junio 2026

---

# Objetivo

Este documento describe las entidades principales que conforman la base de datos de Fideli-Nook y las relaciones existentes entre ellas.

No pretende reemplazar el modelo físico de PostgreSQL, sino servir como documentación funcional para comprender la estructura de la información.

---

# Principios

La base de datos fue diseñada siguiendo los siguientes principios:

- Una única fuente de verdad para cada dato.
- Evitar duplicidad de información.
- Relaciones simples.
- Escalabilidad.
- Facilidad de consulta.
- Compatibilidad con futuras funcionalidades.

---

# Entidades actuales

Actualmente existen las siguientes entidades principales.

## Clientes

Representa a cada persona inscrita en el programa.

Información principal:

- id
- nombre
- correo
- teléfono
- fecha de registro
- sellos
- premios
- acepta marketing
- estado de verificación
- token público
- token de verificación

Relaciones:

Clientes ← Campañas

Clientes ← Suscripciones

Clientes ← Premios

---

## Campañas

Representa una campaña promocional.

Información principal:

- id
- nombre
- descripción
- duración
- estado
- fecha programación
- fecha ejecución
- alcance
- premios entregados
- premios canjeados

Estados posibles:

- borrador
- programada
- lanzando
- lanzada
- fallida

---

## Premios

Actualmente los premios se almacenan dentro del campo JSON de cada cliente.

Cada premio contiene información como:

- nombre
- descripción
- origen
- campaña
- vigencia
- estado
- fecha creación
- fecha canje

En futuras versiones podrá evaluarse migrar esta información a una tabla independiente.

---

## Suscripciones

Permite asignar beneficios periódicos a determinados clientes.

Información principal:

- cliente
- tipo
- estado
- fechas
- beneficios

---

# Relaciones actuales

```
Cliente
   │
   ├──────── Premios
   │
   ├──────── Suscripción
   │
   └──────── Campañas
```

---

# Modelo futuro

Durante las siguientes etapas del proyecto se incorporarán nuevas entidades.

## Productos

Representará todos los SKU existentes.

Ejemplos:

- Helados
- Paletas
- Café
- Brownies
- Galletas
- Insumos
- Materiales internos

Será la entidad maestra utilizada por Ventas e Inventario.

---

## Sabores

Permitirá mantener un catálogo independiente de sabores.

Esto evitará repetir información dentro de las ventas.

---

## Ventas

Cada venta corresponderá a una transacción.

Contendrá:

- Canal
- Medio de pago
- Fecha
- Total
- Descuentos
- Observaciones

Cada venta tendrá múltiples líneas de detalle.

---

## VentaDetalle

Cada línea contendrá:

- Producto
- Sabor
- Cantidad
- Precio
- Descuento
- Total

---

## Inventario

Permitirá mantener el stock disponible de cada SKU.

Contendrá:

- SKU
- Stock actual
- Stock mínimo
- Unidad
- Ubicación

---

## MovimientosInventario

Toda modificación del inventario generará un movimiento.

Ejemplos:

- Compra
- Ajuste
- Venta
- Merma
- Consumo interno

Esto permitirá reconstruir completamente el historial del stock.

---

# Modelo conceptual futuro

```
Clientes
      │
      ├──────── Premios
      │
      ├──────── Campañas
      │
      └──────── Suscripciones

Productos
      │
      ├──────── Sabores
      │
      ├──────── Inventario
      │
      └──────── VentaDetalle

Ventas
      │
      └──────── VentaDetalle

Inventario
      │
      └──────── Movimientos
```

---

# Filosofía

La base de datos debe evolucionar sin perder consistencia.

Cada nueva funcionalidad deberá integrarse al modelo existente antes de crear nuevas tablas.

Se privilegiará siempre un diseño simple, entendible y mantenible por sobre soluciones excesivamente complejas.