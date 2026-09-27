# STATUS PACK — PLATAFORMA NOOK

**Última actualización:** 27-09-2026
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
- DEV-AUTH-01
  - DEV-AUTH-01.0 — Radiografía de autenticación/autorización
  - DEV-AUTH-01.1 — Motor de autenticación operacional
  - DEV-AUTH-01.2 — Motor RBAC
  - DEV-AUTH-01.3A–01.3I — Aplicación de matriz de roles
  - DEV-AUTH-01.4 — Gestión de usuarios operacionales
  - DEV-AUTH-01.5 — Retiro legacy, cierre RBAC y pruebas negativas

SEC-P0-01 está cerrado y no debe reabrirse sin nueva evidencia.

### Siguiente desarrollo

- DEV-UX-ARCH-01 — Rediseñar arquitectura de información, navegación y superficies por rol.

El frontend Analytics se construirá después de definir esta arquitectura y deberá consumir la capa analítica ya cerrada en DEV-ANL-01.

### Backlog / deuda conocida

- DEV-AUDIT-01 — Auditoría operacional por usuario, estación y evento
- DEV-LOY-EXP-02 — Automatizar expiración de premios y revisar acción manual global
- DEV-AUTH-UX-01 — Estándar UX para creación/definición de contraseñas
- DEV-UX-POS-01 — Evolución del workspace POS dentro de la arquitectura definitiva
- SEC-HARD-01
- DEV-SUP-01
- DEV-OPS-01.1/01.2
- DEV-OPS-01.3/01.4
- DEV-POS-PERF-01
- DEV-ENV-01
- AUD-GOLIVE-01
- OBS-EMAIL-01
- TECH-CAT-01
- TECH-CAT-02
- deuda de hardcode CAT
- deuda TypeScript preexistente
- deuda ESLint preexistente

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

**Estado general: CERRADO**

DEV-AUTH-01 estableció la arquitectura definitiva de identidad y autorización operacional.

### Arquitectura vigente

`Supabase Auth → auth.users → operational_users → sesión operacional verificada → RBAC server-side`

Existen dos dominios separados:

1. clientes del programa de fidelización;
2. usuarios operacionales de Plataforma Nook.

`clientes` NO representa usuarios operacionales.

La coincidencia de email entre ambos dominios no crea relación de identidad ni permisos.

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

`legacy_key` permanece físicamente en la tabla como deuda de limpieza, pero ya no participa en autenticación ni autorización.

Roles operacionales vigentes:

- `cashier`
- `admin`
- `superadmin`

Supabase Auth actúa como proveedor de identidad.

Para obtener una sesión operacional válida deben cumplirse:

- token Supabase Auth válido;
- `auth.users.id ↔ operational_users.auth_user_id`;
- usuario operacional existente;
- `is_active = true`;
- rol operacional válido.

La existencia aislada de un usuario en `auth.users` no concede acceso operacional.

### Autenticación

La autenticación operacional legacy fue retirada en DEV-AUTH-01.5.

Ya no se aceptan:

- `ADMIN_USERNAME` / `ADMIN_PASSWORD`;
- `SUPERADMIN_USERNAME` / `SUPERADMIN_PASSWORD`;
- login mediante `legacy_key`;
- cookies `fidelinook_*` como prueba de identidad.

Las cookies legacy solamente pueden seguir siendo eliminadas por `/api/logout` como limpieza transitoria de navegadores antiguos.

La cookie operacional vigente es:

`nook_op_access_token`

La identidad asociada se valida server-side contra Supabase Auth y `operational_users`.

### Gestión de usuarios

DEV-AUTH-01.4 incorporó gestión de usuarios operacionales exclusiva para `superadmin`.

Superficie actual:

`/admin/usuarios`

Permite:

- listar usuarios operacionales;
- crear cashier/admin/superadmin;
- vincular identidad Supabase Auth;
- enviar/re-enviar invitación;
- editar nombre;
- cambiar rol;
- activar/desactivar usuario.

No se utiliza hard delete como operación normal.

Guardrails implementados:

- un superadmin no puede desactivarse a sí mismo;
- un superadmin no puede degradarse a sí mismo;
- no se puede dejar la plataforma sin al menos un superadmin activo.

El flujo de alta es:

`superadmin crea usuario → Supabase Auth → operational_users → invitación → usuario define contraseña → login operacional`

### Validación productiva

DEV-AUTH-01.5 fue desplegado y validado en producción el 27-09-2026.

QA aprobado:

- login cashier: OK;
- login admin: OK;
- login superadmin: OK;
- credencial legacy admin: rechazada;
- credencial legacy superadmin: rechazada;
- logout operacional: OK;
- redirección posterior a logout: `/admin/login`.

---

## 13. Motor RBAC vigente

La autorización operacional utiliza capacidades explícitas.

No se utiliza una jerarquía numérica implícita de roles.

Principio:

`identidad autenticada ≠ autorización`

`lib/operation-auth.ts` resuelve quién es el usuario.

`lib/operation-rbac.ts` resuelve qué capacidades tiene.

La autorización efectiva debe aplicarse server-side.

El ocultamiento de botones, links o módulos en frontend no constituye autorización.

### Capacidades vigentes

- `sales.operate`
- `sales.export`
- `orders.operate`
- `customers.operate`
- `loyalty.operate`
- `cash.operate`
- `catalog.read`
- `catalog.manage`
- `inventory.stock.read`
- `inventory.movements.operate`
- `inventory.receipts.manage`
- `inventory.config.manage`
- `campaigns.manage`
- `subscriptions.operate`
- `subscriptions.manage`
- `subscriptions.delete`
- `analytics.view`
- `users.manage`

### Respuesta de autorización

- sesión inválida/no autenticada → HTTP 401
- sesión válida sin capacidad → HTTP 403

---

## 14. Matriz de roles vigente

### Cashier

Capacidades operacionales:

- POS / ventas;
- pedidos y preparación;
- búsqueda/operación de clientes necesaria para venta;
- loyalty y canjes;
- caja;
- lectura de catálogo;
- inventario operacional;
- suscripciones operacionales.

No posee:

- `sales.export`;
- Analytics;
- gestión de catálogo;
- recepciones/configuración de inventario;
- gestión de campañas;
- gestión de planes/configuración de suscripciones;
- gestión de usuarios.

La capacidad `customers.operate` no implica que la arquitectura definitiva deba exponer al cashier una pantalla administrativa global de Clientes. Esa separación entre capacidad operacional y superficie de navegación se resolverá en DEV-UX-ARCH-01.

### Admin

Incluye capacidades operacionales y además:

- Analytics;
- exportaciones;
- catálogo y precios;
- recepciones/compras;
- configuración de inventario;
- campañas/CRM;
- gestión/configuración de suscripciones.

No administra usuarios ni acciones reservadas explícitamente a superadmin.

### Superadmin

Incluye las capacidades de admin y además:

- gestión de usuarios;
- roles;
- activación/desactivación;
- eliminación de suscripciones;
- acciones sensibles reservadas a máximo privilegio.

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

## 15. Decisiones de arquitectura pendientes

El cierre de AUTH permite iniciar el rediseño de arquitectura de información y navegación sin volver a intervenir el fundamento de identidad.

El siguiente desarrollo es:

**DEV-UX-ARCH-01 — Rediseñar arquitectura de información y navegación por rol**

No asumir que la estructura histórica de páginas constituye la arquitectura final.

### Workspace operacional

Hipótesis a evaluar:

`/operacion` puede evolucionar hacia el workspace principal de operación local.

Capacidades candidatas dentro de ese workspace:

- POS;
- Cola de Preparación;
- Historial;
- Inventario operacional;
- Caja;
- contexto operacional de campañas vigentes.

La denominación “Nueva Venta” debería revisarse a favor de “POS”.

### Gestión vs operación

Separar explícitamente:

- capacidad operacional;
- capacidad administrativa;
- superficie visible/navegable.

Ejemplo:

`customers.operate` puede ser necesario para que cashier busque y seleccione clientes en POS sin que ello obligue a exponer una pantalla administrativa global de Clientes.

Otro ejemplo:

`campaigns.manage` corresponde a administración de campañas por admin/superadmin, mientras el cashier necesita únicamente contexto operacional sobre campañas vigentes: beneficio, condiciones, vigencia y forma de aplicación.

### Navegación y preservación de estado POS

Requisito:

Navegar hacia otros módulos no debe provocar pérdida accidental de una venta activa ni del estado relevante del POS.

Abrir todos los módulos en pestañas separadas es una alternativa de diseño, no una decisión cerrada. DEV-UX-ARCH-01 deberá resolver el patrón definitivo evitando tanto pérdida de estado como proliferación innecesaria de pestañas.

### Contexto de caja

El workspace deberá permitir identificar claramente quién abrió la caja y/o quién es responsable de la sesión vigente.

### Espacio disponible del POS

Evaluar el uso del espacio disponible para información operacional relevante, incluyendo campañas activas, alertas o accesos contextuales, sin degradar velocidad de operación.

---

## 16. Estaciones/tablets de preparación

Existe un requerimiento adicional para dispositivos dedicados a preparación.

Situación:

- actualmente existe una tablet utilizada para cola de preparación;
- se proyecta una segunda tablet dedicada a preparación de pedidos web.

No utilizar cuentas `admin` en tablets compartidas.

Objetivo:

Una estación de preparación debe:

- autenticarse con identidad restringida;
- ingresar directamente a su cola correspondiente;
- visualizar únicamente las funciones necesarias;
- no acceder a POS, caja, clientes, loyalty, administración, Analytics, catálogo administrativo ni otras superficies no requeridas;
- quedar protegida server-side, no solamente mediante ocultamiento de navegación.

Identidades candidatas:

- Preparación Local;
- Preparación Web.

Todavía NO está cerrada la decisión de modelar estas estaciones mediante un nuevo rol `preparation` o mediante una extensión de capacidades/identidad de estación.

DEV-UX-ARCH-01 deberá resolver la experiencia y superficie.

DEV-AUDIT-01 deberá distinguir conceptualmente:

- actor/persona;
- estación/dispositivo.

Una identidad de estación permite conocer qué dispositivo ejecutó una acción, pero no necesariamente qué persona física estaba utilizándolo.

---

## 17. DEV-AUDIT-01 — Auditoría operacional

**Estado: BACKLOG**

La nueva identidad individual de operadores habilita trazabilidad, pero todavía no existe un log operacional integral.

Objetivo futuro:

Registrar eventos relevantes de manera append-only.

Campos candidatos:

- usuario operacional;
- auth user;
- rol al momento del evento;
- estación/dispositivo cuando corresponda;
- tipo de evento;
- recurso;
- identificador del recurso;
- timestamp UTC;
- metadata;
- IP/user-agent cuando sea técnicamente pertinente.

Eventos candidatos:

- LOGIN_SUCCESS;
- LOGOUT;
- SALE_CREATED;
- ORDER_STATUS_CHANGED;
- CASH_OPENED;
- CASH_CLOSED;
- INVENTORY_ADJUSTMENT;
- RECEIPT_CREATED;
- CAMPAIGN_CHANGED;
- USER_CHANGED.

Inicialmente, accesos fuera de horario deben observarse/auditarse; no bloquearse automáticamente sin una regla de negocio explícita.

---

## 18. DEV-LOY-EXP-02 — Expiración de premios

**Estado: BACKLOG**

Revisar el ciclo completo de expiración de premios de campañas.

Principio funcional esperado:

Un premio debe expirar por su fecha límite/vigencia, no porque un usuario presione manualmente un botón global.

El DEV deberá:

- identificar la fuente canónica de vencimiento;
- revisar la semántica real de `expire_customer_rewards`;
- automatizar la expiración cuando termine la vigencia;
- verificar cómo consultas/canjes tratan premios vencidos;
- revisar la necesidad de mantener una acción manual de contingencia.

Si permanece una acción manual global, su autorización deberá evaluarse para admin/superadmin y nunca asumirse como operación cashier.

No mezclar este cambio con AUTH ya cerrado.

---

## 19. DEV-AUTH-UX-01 — UX de contraseñas

**Estado: BACKLOG**

Toda superficie en que un usuario cree o defina contraseña debe incorporar:

- control mostrar/ocultar contraseña;
- confirmación de contraseña;
- validación de coincidencia antes de enviar.

Auditar como mínimo `/activar-acceso` y cualquier otro flujo vigente de definición/restablecimiento de contraseña.

---

## 20. Deuda técnica conocida

### TypeScript

Existe deuda TypeScript preexistente al cierre de DEV-AUTH-01.

Baseline observado: 12 errores primarios conocidos en:

- `app/api/dashboard/overview/route.ts`;
- `app/api/operacion/sales/export/route.ts`;
- `app/api/subscriptions/register-consumption/route.ts`;
- `app/clientes/page.tsx`;
- `app/operacion/page.tsx`;
- `components/operations/OrderQueueCard.tsx`.

No atribuir estos errores automáticamente a DEV posteriores.

Resolverlos mediante trabajo técnico controlado cuando corresponda.

### ESLint

Existe deuda ESLint preexistente.

Último diagnóstico conocido:

- 46 problemas;
- 16 errores;
- 30 warnings.

No mezclar correcciones masivas de lint con DEV funcionales no relacionados.

---

## 21. Decisiones pendientes de negocio/métrica

No forzar definiciones hasta contar con criterio suficiente para:

- denominador definitivo de redemption rate;
- umbral de cliente activo/inactivo/churn;
- umbral de low stock;
- turnover real de inventario;
- rentabilidad;
- forecasting/predicción.

---

## 22. Secuencia estratégica vigente

Secuencia acordada:

1. DEV-AUTH-01 — CERRADO;
2. actualizar Status Pack — ESTE CORTE;
3. DEV-UX-ARCH-01 — arquitectura final de información/navegación/workspaces por rol;
4. iniciar implementación de frontend/flujo definitivo según arquitectura aprobada;
5. construir Analytics UI dentro de esa arquitectura;
6. abordar DEV específicos del backlog según prioridad y dependencia.

Analytics backend permanece cerrado y disponible para consumo.

El frontend Analytics no debe construirse como una arquitectura paralela ni utilizarse para definir la navegación general de Plataforma Nook.

---

## 23. Documentación legacy

Los documentos históricos de `docs/` creados durante etapas anteriores continúan siendo útiles como referencia conceptual, pero varios estados funcionales quedaron obsoletos.

En particular, documentación que aún presenta Ventas, Inventario, Inteligencia Comercial o AUTH como módulos futuros/en curso NO representa el estado vigente.

No eliminar ni reescribir masivamente esos documentos sin un DEV documental específico.

---

## 24. Punto exacto de continuidad

### Cerrado inmediatamente antes de este corte

- DEV-ANL-01 — backend analítico;
- DEV-CASH-02 — retiro recomendado y comprobante de cierre;
- DEV-AUTH-01 — identidad operacional, RBAC, gestión de usuarios y retiro legacy.

### Siguiente trabajo

**DEV-UX-ARCH-01 — Rediseñar arquitectura de información y navegación por rol**

Objetivo:

Definir la arquitectura final del frontend antes de continuar agregando superficies independientes.

Debe resolver, como mínimo:

- shell/navegación por rol;
- workspace operacional;
- módulos visibles por rol;
- separación entre operación y administración;
- preservación de estado del POS;
- pantalla global de Clientes vs uso contextual de clientes;
- campañas vigentes para operación vs gestión de campañas;
- caja y responsable de sesión;
- estaciones/tablets de preparación;
- convivencia futura de Analytics dentro de la arquitectura;
- superficies legacy que se mantienen, migran o desaparecen;
- orden de migración hacia la arquitectura definitiva.

### Restricciones

- no debilitar RBAC ya cerrado;
- no usar ocultamiento frontend como sustituto de autorización;
- no mezclar clientes con usuarios operacionales;
- no abrir Analytics directamente a `authenticated`;
- no utilizar `service_role` en browser;
- no diseñar navegación únicamente alrededor de las URLs históricas;
- priorizar continuidad operacional del POS durante la migración.

### Primera acción DEV-UX-ARCH-01

Levantar un inventario funcional de las superficies actuales y clasificarlas por:

1. operación;
2. administración;
3. analítica;
4. cliente/público;
5. infraestructura/técnico.

Luego mapear cada superficie contra:

- rol autorizado;
- capacidad RBAC;
- frecuencia de uso;
- criticidad operacional;
- dependencia con POS;
- estado actual: conservar / mover / rediseñar / retirar.

No implementar todavía cambios masivos de frontend antes de cerrar este blueprint.