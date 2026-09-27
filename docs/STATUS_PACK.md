# STATUS PACK — PLATAFORMA NOOK

**Última actualización:** 26-09-2026  
**Estado:** Documento vivo  
**Propósito:** Fuente de continuidad técnica y funcional del desarrollo de Plataforma Nook.

---

## 1. Principio de uso

Este documento registra el estado vigente del proyecto, decisiones cerradas, arquitectura relevante, deuda conocida y siguiente punto de continuidad.

Cuando exista contradicción con documentación histórica en `docs/`, prevalece este Status Pack para estados y decisiones posteriores a dichos documentos.

El archivo `docs/STATUS_PACK.md` constituye la fotografía vigente del proyecto. Su historial y versiones anteriores se conservan mediante Git; no crear copias versionadas paralelas del Status Pack salvo necesidad documental explícita.

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

Los usuarios operacionales constituyen un dominio de identidad separado de los clientes. La tabla `operational_users` es la fuente canónica de identidad operacional y se vinculará con Supabase Auth para autenticación.

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
- DEV-CASH-02
- DEV-CAT-01
- SEC-P0-01
- DEV-ANL-01
- DEV-AUTH-01.0 — Radiografía de autenticación, usuarios y autorización

SEC-P0-01 está cerrado y no debe reabrirse sin nueva evidencia.

### En curso / siguiente desarrollo

- DEV-AUTH-01 — Usuarios, roles y permisos
  - DEV-AUTH-01.0 — Radiografía: CERRADO
  - DEV-AUTH-01.1 — Motor de autenticación: SIGUIENTE
  - DEV-AUTH-01.2 — Motor de autorización/RBAC
  - DEV-AUTH-01.3 — Aplicación de matriz de roles
  - DEV-AUTH-01.4 — Gestión de usuarios operacionales por superadmin
  - DEV-AUTH-01.5 — Retiro de auth legacy + auditoría final + pruebas negativas

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

No abrir acceso directo a `authenticated` durante DEV-AUTH-01.

El acceso futuro a Analytics deberá resolverse mediante autorización server-side controlada. Los roles autorizados serán `admin` y `superadmin`; `cashier` no tendrá acceso a Analytics.

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

Cobertura observada en compras al cierre de DEV-ANL-01:

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

## 11. DEV-CASH-02 — Retiro recomendado y comprobante de cierre

**Estado: CERRADO**

Objetivo:

Incorporar al cierre de caja una recomendación determinística de retiro de efectivo que permita mantener el fondo de apertura de la sesión y separar claramente:

1. la cuadratura contable de caja; y
2. el retiro físico de efectivo.

### Regla canónica

El fondo objetivo que debe quedar en caja es:

`targetRetainedAmount = openingAmount`

No existe un monto fijo hardcodeado.

El efectivo esperado NO redefine el fondo objetivo.

La diferencia de caja continúa calculándose independientemente:

`cash_difference = counted_cash_amount - expected_cash_amount`

### Comportamiento

- si el efectivo contado permite conservar exactamente el fondo de apertura, se recomienda el retiro correspondiente;
- la composición busca preservar sencillo;
- si el efectivo contado es menor al fondo de apertura, no se recomienda retiro y todo el efectivo permanece en caja;
- si existe efectivo suficiente pero las denominaciones no permiten construir exactamente el fondo, el cierre se bloquea hasta reorganizar la composición.

### Comprobante

Se incorporó comprobante de cierre de caja en formato térmico 80 mm con estándar visual Nook.

Incluye:

- sesión;
- responsable;
- fecha/hora;
- fondo de apertura;
- efectivo esperado;
- efectivo contado;
- diferencia de caja;
- composición del retiro recomendado;
- total retiro;
- fondo que queda.

### Validación productiva

QA funcional real realizado el 26-09-2026 durante cierre efectivo de jornada.

Caso validado:

- sesión: #70
- fondo de apertura: CLP 30.000
- efectivo esperado: CLP 46.500
- efectivo contado: CLP 46.500
- diferencia: CLP 0
- retiro recomendado: CLP 16.500
- fondo remanente: CLP 30.000

Composición de retiro impresa:

- CLP 10.000 × 1
- CLP 5.000 × 1
- CLP 1.000 × 1
- CLP 500 × 1

El comprobante físico 80 mm fue impreso y validado correctamente.

Commit de implementación:

`f3aa498 — DEV-CASH-02: implementar retiro recomendado y comprobante de cierre`

---

## 12. DEV-AUTH-01 — Usuarios, roles y permisos

**Estado general: EN CURSO**

### DEV-AUTH-01.0 — Radiografía

**Estado: CERRADO**

La radiografía confirmó que existen dos dominios conceptualmente distintos:

1. clientes/usuarios de cuenta cliente;
2. usuarios operacionales de Plataforma Nook.

No deben mezclarse.

### Identidad operacional

Tabla canónica:

`public.operational_users`

Campos relevantes:

- `id`
- `username`
- `display_name`
- `role`
- `is_active`
- `legacy_key`
- `auth_user_id`

Roles modelados actualmente:

- `superadmin`
- `admin`
- `cashier`

La tabla tiene RLS habilitado y acceso directo restringido a `service_role`.

### Estado actual observado

Existen al menos los usuarios operacionales legacy:

- Super Administrador — `superadmin`
- Administrador — `admin`

El usuario `superadmin` se encuentra vinculado mediante `auth_user_id` a Supabase Auth.

El usuario `admin` todavía no tiene `auth_user_id`.

La existencia de un registro en `auth.users` NO convierte por sí sola a una persona en usuario operacional. El acceso operacional requiere una vinculación válida con `operational_users`.

### Autenticación legacy actual

El login operacional actual todavía utiliza credenciales definidas por variables de entorno para `admin` y `superadmin`.

Después del login se generan cookies:

- `fidelinook_auth`
- `fidelinook_role`
- `fidelinook_user_id`

El helper operacional actual acepta solamente:

- `admin`
- `superadmin`

Por tanto, aunque `cashier` existe en el modelo de datos, todavía no puede utilizar el esquema operacional general de autenticación/autorización.

La sesión legacy actual no constituye todavía una identidad operacional verificada server-side contra Supabase Auth en cada solicitud.

### Middleware

El middleware actual es legacy y de alcance insuficiente.

Protege explícitamente solamente:

- `/`
- `/admin`

No debe considerarse la barrera definitiva de autorización de la plataforma.

### APIs

La autorización está distribuida entre:

- `getOperationSession`;
- validaciones de rol específicas en APIs;
- controles frontend;
- mecanismos independientes para funcionalidades públicas/cliente/cron/email.

La radiografía identificó 79 rutas API:

- 60 utilizan `getOperationSession`;
- 19 no lo utilizan.

Las 19 rutas restantes NO deben clasificarse automáticamente como vulnerables: incluyen rutas públicas, cliente, autenticación, cron y email con modelos de acceso distintos.

Cada una deberá evaluarse según su función durante la fase de hardening/autorización.

---

## 13. Arquitectura objetivo de autenticación

Arquitectura acordada:

`Supabase Auth → auth.users → operational_users → sesión operacional verificada → RBAC`

Supabase Auth actuará como proveedor de identidad.

`operational_users` continuará siendo la fuente canónica para:

- pertenencia al dominio operacional;
- rol;
- estado activo/inactivo;
- identidad operacional estable.

Un usuario operacional válido deberá cumplir, como mínimo:

- sesión Supabase Auth válida;
- vínculo mediante `auth_user_id`;
- registro existente en `operational_users`;
- `is_active = true`;
- rol operacional válido.

No utilizar `service_role` en browser.

No confiar en ocultamiento frontend como mecanismo de autorización.

La autorización efectiva debe verificarse server-side.

Las credenciales legacy y cookies legacy deberán retirarse progresivamente después de completar y validar el nuevo flujo.

---

## 14. Matriz de roles aprobada

Se utilizará RBAC simple.

No construir inicialmente un motor dinámico de permisos por usuario.

### Cashier

Acceso operacional cotidiano:

- POS / registrar ventas;
- pedidos y preparación;
- búsqueda de clientes;
- loyalty y canjes;
- caja diaria;
- lectura de catálogo necesaria para vender;
- inventario operacional;
- suscripciones operacionales.

No accede a Analytics.

### Admin

Incluye operación normal más gestión:

- capacidades operacionales;
- Analytics;
- catálogo y precios;
- compras/recepciones de inventario;
- configuración de inventario;
- campañas/CRM;
- exportaciones;
- configuración/planes de suscripciones.

No administra usuarios/roles ni acciones de máxima sensibilidad reservadas a `superadmin`.

### Superadmin

Acceso completo.

Además:

- crear/gestionar usuarios operacionales;
- cambiar roles;
- activar/desactivar operadores;
- acciones destructivas o sensibles de máximo nivel.

### Inventario

| Función                             | cashier | admin | superadmin |
| ----------------------------------- | ------- | ----- | ---------- |
| Stock actual                        | Sí      | Sí    | Sí         |
| Apertura de bachas                  | Sí      | Sí    | Sí         |
| Movimientos internos / ajustes      | Sí      | Sí    | Sí         |
| Historial de movimientos            | Sí      | Sí    | Sí         |
| Recepciones de mercadería / compras | No      | Sí    | Sí         |
| Configuración/mappings inventario   | No      | Sí    | Sí         |

### Analytics

| Rol        | Acceso |
| ---------- | ------ |
| cashier    | No     |
| admin      | Sí     |
| superadmin | Sí     |

---

## 15. Estrategia DEV-AUTH-01

Descomposición acordada:

### DEV-AUTH-01.1 — Motor de autenticación

Objetivo:

Migrar la identidad operacional desde credenciales legacy/cookies de confianza hacia una sesión Supabase Auth verificable server-side y vinculada a `operational_users`.

### DEV-AUTH-01.2 — Motor de autorización

Objetivo:

Construir una capa RBAC centralizada sobre la identidad operacional verificada.

### DEV-AUTH-01.3 — Aplicación de matriz de roles

Objetivo:

Aplicar sistemáticamente la matriz `cashier/admin/superadmin` a APIs y superficies funcionales existentes.

### DEV-AUTH-01.4 — Gestión de usuarios

Objetivo:

Permitir a `superadmin` administrar usuarios operacionales, roles y estado activo/inactivo.

### DEV-AUTH-01.5 — Retiro legacy y auditoría final

Objetivo:

- retirar credenciales/env legacy;
- retirar cookies legacy como prueba de identidad;
- revisar rutas restantes;
- ejecutar pruebas negativas de autorización;
- verificar ausencia de escalamiento horizontal/vertical de privilegios.

---

## 16. Decisiones pendientes de negocio/métrica

No forzar definiciones hasta contar con criterio suficiente para:

- denominador definitivo de redemption rate;
- umbral de cliente activo/inactivo/churn;
- umbral de low stock;
- turnover real de inventario;
- rentabilidad;
- forecasting/predicción.

---

## 17. Secuencia estratégica acordada

No construir todavía el frontend Analytics.

Secuencia:

1. completar DEV-AUTH-01;
2. revisar y corregir autorización existente/legacy;
3. definir arquitectura final del frontend;
4. construir Analytics UI sobre la capa analítica ya cerrada.

Analytics permanece `service_role`-only mientras DEV-AUTH-01 no esté cerrado.

---

## 18. Documentación legacy

Los documentos históricos de `docs/` creados durante etapas anteriores continúan siendo útiles como referencia conceptual, pero varios estados funcionales quedaron obsoletos.

En particular, documentación que aún presenta Ventas, Inventario o Inteligencia Comercial como módulos futuros NO representa el estado actual.

No eliminar ni reescribir masivamente esos documentos sin un DEV documental específico.

---

## 19. Punto exacto de continuidad

### Cerrado inmediatamente antes de este corte

- DEV-ANL-01 — backend analítico
- DEV-CASH-02 — retiro recomendado y comprobante de cierre
- DEV-AUTH-01.0 — radiografía de autenticación/autorización

### Siguiente trabajo

**DEV-AUTH-01.1 — Motor de autenticación operacional**

Objetivo inmediato:

Reemplazar progresivamente el esquema legacy basado en credenciales de entorno y cookies de confianza por autenticación operacional basada en Supabase Auth, vinculada a `operational_users` y verificada server-side.

### Restricciones de implementación

- no mezclar clientes con usuarios operacionales;
- no abrir Analytics directamente a `authenticated`;
- no utilizar `service_role` en browser;
- no retirar el mecanismo legacy hasta tener el reemplazo validado;
- no romper acceso productivo durante la migración;
- mantener posibilidad de rollback durante el cambio de autenticación;
- aplicar cambios de autorización después de establecer una identidad operacional confiable.

### Primera acción DEV-AUTH-01.1

Inspeccionar y definir el mecanismo exacto de sesión Supabase Auth para operadores considerando la arquitectura actual:

- `lib/supabase-server.ts`;
- `lib/supabase.ts`;
- `lib/supabase-admin.ts`;
- `/api/login`;
- `/api/session`;
- `/api/logout`;
- `/admin/login`;
- `lib/operation-auth.ts`.

Resolver explícitamente la convivencia entre:

- autenticación cliente existente;
- autenticación operacional;
- cookies SSR de Supabase;
- vínculo `auth.users ↔ operational_users`.

No modificar autenticación productiva hasta cerrar este diseño técnico.
