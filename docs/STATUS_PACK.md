# STATUS PACK — PLATAFORMA NOOK

**Última actualización:** 26-09-2026  
**Estado:** Documento vivo  
**Propósito:** Fuente de continuidad técnica y funcional del desarrollo de Plataforma Nook.

---

## 1. Principio de uso

Este documento registra el estado vigente del proyecto, decisiones cerradas, arquitectura relevante, deuda conocida y siguiente punto de continuidad.

Cuando exista contradicción con documentación histórica en `docs/`, prevalece este Status Pack para estados y decisiones posteriores a dichos documentos.

Actualizar este documento:
- al cerrar un DEV relevante;
- después de cambios importantes de arquitectura o modelo de datos;
- antes de un corte o despliegue relevante;
- como máximo cada 8–12 iteraciones significativas.

---

## 2. Visión actual

Plataforma Nook evolucionó desde Fideli-Nook hacia una plataforma operacional integral para Nook.

La arquitectura funcional actualmente comprende, entre otros:

- clientes y fidelización;
- ventas y POS;
- catálogo maestro;
- inventario;
- caja;
- pedidos y operación;
- campañas/email;
- capa analítica.

`clientes` representa clientes del programa de fidelización y NO usuarios operacionales autenticados.

Los usuarios operacionales se administran separadamente mediante Supabase Auth y el modelo de roles de la plataforma.

---

## 3. Estado de desarrollos relevantes

### Cerrados

- Loyalty P0.01–P0.05
- DEV-EMAIL-01
- DEV-EMAIL-02
- DEV-EMAIL-03
- DEV-LOY-EXP-01
- DEV-LOY-RED-01
- DEV-LOY-TERMS-01
- INC-LOY-01
- INC-LOY-02
- DEV-CASH-01
- DEV-CAT-01
- SEC-P0-01
- DEV-ANL-01

SEC-P0-01 está cerrado y no debe reabrirse sin nueva evidencia.

### Deuda / futuros conocidos

- SEC-HARD-01
- DEV-SUP-01
- DEV-OPS-01.1/01.2
- DEV-OPS-01.3/01.4
- DEV-POS-PERF-01
- DEV-ENV-01
- AUD-GOLIVE-01
- DEV-LOY-EXP-02
- OBS-EMAIL-01
- TECH-CAT-01
- TECH-CAT-02
- deuda de hardcode CAT

Mailing/Resend permanece en stand-by por decisión explícita.

---

## 4. DEV-ANL-01 — Backend analítico

**Estado: CERRADO**

Principio arquitectónico:

`DATA → METRICS → VISUALIZATION`

Los dashboards no deben reconstruir métricas independientemente desde tablas operacionales. La lógica analítica debe resolverse en la capa de datos/métricas y luego ser consumida por las visualizaciones.

### Estado por componente

- ANL-01.0 Foundations — cerrado
- ANL-01.1 Sales & commercial performance — cerrado
- ANL-01.2 Products & mix — cerrado
- ANL-01.3 Customers & loyalty — cerrado
- ANL-01.4 Channels & promotions — cerrado
- ANL-01.5 Temporal analysis — cerrado
- ANL-01.6 Inventory & operations — cerrado
- ANL-01.7 Cash & payment methods — cerrado
- ANL-01.8 Profitability — diagnóstico cerrado; capability diferida
- ANL-01.9 Consolidated consumption layer — cerrado

No se construyó todavía el frontend Analytics.

---

## 5. Arquitectura Analytics

Se creó el schema PostgreSQL:

`analytics`

Migraciones:

1. `20260926_01_analytics_foundation.sql`
2. `20260926_02_analytics_extended_foundation.sql`
3. `20260926_03_analytics_security_defaults.sql`
4. `20260926_04_analytics_holidays.sql`
5. `20260926_05_analytics_commercial_layer.sql`
6. `20260926_06_analytics_operations_layer.sql`
7. `20260926_07_analytics_consumption_layer.sql`

### Seguridad

La capa Analytics permanece intencionalmente restringida a `service_role`.

Actualmente:

- `anon` → sin SELECT
- `authenticated` → sin SELECT
- `service_role` → SELECT

No abrir acceso a `authenticated` hasta cerrar el DEV específico de usuarios, roles y permisos.

---

## 6. Fuentes y reglas canónicas Analytics

### Venta válida

Una venta comercial válida cumple:

- `sales.status = 'confirmed'`
- `sales.payment_status = 'paid'`

Ventas canceladas no participan en revenue, tickets, unidades ni mix.

### Revenue

Fuente canónica:

`sales.revenue`

Los items participan en análisis de producto, pero no reemplazan el revenue canónico de la venta.

Cuando existe descuento residual a nivel ticket, se distribuye proporcionalmente entre items para obtener `allocated_revenue`.

La suma de `allocated_revenue` debe reconciliar con `sales.revenue`, aceptando únicamente diferencias decimales computacionales insignificantes.

### Fecha y hora

- fecha comercial canónica: `orders.business_date`
- hora comercial: `sales.confirmed_at` convertida a `America/Santiago`

### Clientes

- `clientes` = clientes loyalty
- `sales.customer_id` identifica venta asociada a cliente
- la historia observada moderna es todavía corta; no interpretar frecuencia observada como retención/churn estructural

### Productos custom

Items sin `product_id` válido se preservan como líneas custom/no catálogo.

Participan en reconciliación monetaria.

No deben contaminar rankings explícitos de productos de catálogo.

### Loyalty

Fuentes:

- estado: `loyalty_accounts`
- ledger: `loyalty_movements`
- rewards: `customer_rewards`

Movimientos orgánicos relevantes:

- `sale_credit`
- `sale_reversal`
- `reward_conversion`

Movimientos históricos, restauraciones y correcciones no deben interpretarse como comportamiento orgánico de compra.

### Inventario

- estado actual: `inventory_stock`
- historia efectiva: movimientos de inventario
- considerar transacciones `POSTED`
- usar `quantity_change`; no inferir signo solamente desde el tipo de movimiento
- movimientos `SALE` de inventario no reemplazan las ventas comerciales

### Caja

Diferencia:

- `0` = balanced
- `< 0` = short
- `> 0` = over

Conservar diferencia signed y absolute como métricas distintas.

### Operación

Tiempos:

- waiting = `prep_started_at - created_at`
- effective preparation = `ready_at - prep_started_at`
- until ready = `ready_at - created_at`

Mediana como indicador principal y promedio como complemento debido a distribuciones sesgadas.

---

## 7. Calendario analítico

Existe `analytics.calendar` para el período 2025-01-01 a 2030-12-31.

Semántica:

- `weekday` = lunes a viernes no feriado
- `weekend_holiday` = sábado, domingo o feriado

Feriados 2025–2026 cargados en la capa analítica.

---

## 8. Rentabilidad — limitación conocida

Actualmente NO existe información suficiente para calcular COGS o márgenes con integridad.

Cobertura observada en compras:

- líneas de compra: 138
- líneas con costo: 27
- cobertura por líneas: 19,57%
- cantidad comprada: 2.390
- cantidad con costo: 152
- cobertura por cantidad: 6,36%

Por tanto permanecen diferidos:

- COGS
- margen bruto
- margen por producto/SKU
- margen por ticket
- margen por canal
- rentabilidad por cliente

No estimar ni fabricar estos indicadores.

`analytics.v_data_quality_summary` expone esta limitación mediante `profitability_metrics_available = false`.

---

## 9. Validación final DEV-ANL-01

Estado observado al cierre:

- tickets válidos: 1.914
- revenue: CLP 18.757.111
- gross revenue: CLP 19.357.645
- descuentos: CLP 600.534
- unidades: 4.361
- ventas identificadas: 542
- sale item rows: 3.043
- custom sale item rows: 114

La reconciliación de revenue entre venta e items asignados quedó validada.

Estos valores son snapshots de validación al cierre y NO constantes del sistema.

---

## 10. Capa consolidada disponible

DEV-ANL-01.9 incorporó:

- `analytics.v_executive_daily`
- `analytics.v_sales_consumption`
- `analytics.v_sale_item_consumption`
- `analytics.v_customer_consumption`
- `analytics.v_customer_product_preferences`
- `analytics.v_channel_daily`
- `analytics.v_product_daily`
- `analytics.v_payment_method_daily`
- `analytics.v_hourly_daily`
- `analytics.v_data_quality_summary`

Estas vistas constituyen la principal interfaz analítica para futuras capas de consumo/frontend.

---

## 11. Decisiones pendientes de negocio/métrica

No forzar definiciones hasta contar con criterio suficiente para:

- denominador definitivo de redemption rate;
- umbral de cliente activo/inactivo/churn;
- umbral de low stock;
- turnover real de inventario;
- rentabilidad;
- forecasting/predicción.

---

## 12. Próxima secuencia acordada

No construir todavía el frontend Analytics.

Secuencia:

1. usuarios, roles y permisos;
2. revisar y corregir autorización existente/legacy;
3. definir arquitectura final del frontend;
4. construir Analytics UI sobre la capa analítica ya cerrada.

Objetivo inmediato:

**Auditar el modelo actual de usuarios operacionales, roles y permisos antes de modificarlo.**

Analytics deberá poder ser consultado por `admin` y `superadmin`, pero no por roles operacionales como `cajera`.

La implementación exacta debe definirse después de inspeccionar el modelo actual; no asumir estructura ni permisos existentes.

---

## 13. Documentación legacy

Los documentos históricos de `docs/` creados durante etapas anteriores continúan siendo útiles como referencia conceptual, pero varios estados funcionales quedaron obsoletos.

En particular, documentación que aún presenta Ventas, Inventario o Inteligencia Comercial como módulos futuros NO representa el estado actual.

No eliminar ni reescribir masivamente esos documentos sin un DEV documental específico.

---

## 14. Punto exacto de continuidad

**DEV-ANL-01: cerrado.**

Siguiente trabajo:

**Auditoría de usuarios operacionales, roles, permisos y autorización actual de Plataforma Nook.**

Primera acción del siguiente DEV:

Levantar evidencia del modelo actual en:

- Supabase Auth;
- perfiles/roles en PostgreSQL;
- RLS y policies;
- middleware;
- autorización server-side;
- controles de acceso frontend;
- rutas operacionales existentes.

No modificar permisos hasta terminar esta radiografía.
