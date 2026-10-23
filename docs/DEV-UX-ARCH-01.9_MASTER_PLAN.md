# DEV-UX-ARCH-01.9 — MASTER PLAN

**Proyecto:** Plataforma Nook  
**Versión:** 1.0 — línea base funcional para implementación  
**Fecha:** 22 de octubre de 2026  
**Estado:** Decisiones funcionales consolidadas; auditoría de dependencias y ejecución pendientes  
**Ruta de destino en repositorio:** `docs/DEV-UX-ARCH-01.9_MASTER_PLAN.md`

> **Regla rectora:** Este documento fija el **qué** de la arquitectura funcional. La investigación del **cómo** implementarlo no autoriza alterar acuerdos. Toda desviación funcional requiere propuesta explícita, evaluación de impacto y aprobación antes de programar.

## 1. Propósito, alcance y fuentes

Reorganizar la Plataforma Nook en tres contextos coherentes, conservar capacidades y continuidad operacional, simplificar navegación, aplicar RBAC efectivo y permitir evolución modular. El cambio de URLs no es por sí solo una mejora: se deben preservar flujos, estados y contratos existentes.

**Evidencia disponible:** radiografía de 44 páginas `DEV-UX-ARCH-01.9_P0.01B_FUNCIONAL.txt`, decisiones de arquitectura adoptadas en la conversación y definición previa de los módulos. El reporte inspecciona páginas y referencias seleccionadas; **no constituye una auditoría exhaustiva de todos los componentes, endpoints o enlaces**.

**Fuera del alcance inicial:** rediseñar integralmente POS, Caja, Catálogo o Inventario; reemplazar la lógica de negocio; cambiar modelos de datos sin necesidad probada; retirar rutas públicas o activar lanzamiento masivo de campañas. Esas iniciativas requieren alcance y validación propios.

## 2. Decisiones cerradas e inmodificables sin aprobación

| ID | Decisión |
|---|---|
| D-01 | Tres contextos: **Operación**, **Gestión** y **Administración**. |
| D-02 | Trece módulos navegables vigentes: seis de Operación, seis de Gestión y uno de Administración. Auditoría es futura y no cuenta como módulo implementado. |
| D-03 | **Resumen Operativo** es la primera opción del menú Operación, antes de POS, accesible mediante navegación normal en `/operacion/resumen`. |
| D-04 | `/operacion` no presenta una página: redirige a `/operacion/resumen`. |
| D-05 | Cashier, Admin y Superadmin ingresan inicialmente a `/operacion/resumen` tras autenticarse. |
| D-06 | La cuenta de **estación de preparación** accede únicamente a su cola/interfaz restringida, sin navegación general, y no aterriza en Resumen Operativo. |
| D-07 | Cashier conserva en POS búsqueda/selección de clientes, consulta operacional, sellos, premios, campañas vigentes y aplicación de suscripciones; no necesita acceso a Gestión → Clientes. |
| D-08 | Gestión está disponible para Admin/Superadmin; Administración → Usuarios solo para Superadmin. La visibilidad del menú no reemplaza autorización efectiva en rutas y API. |
| D-09 | Campañas **administrativas** (crear, editar, probar, programar, lanzar, cancelar, histórico) se separan de campañas **vigentes aplicables en POS**. No habilitar lanzamientos masivos por esta migración. |
| D-10 | Inventario operacional y administrativo tienen responsabilidades diferentes; recepciones se ubican en Gestión. |
| D-11 | POS funciona como espacio de trabajo persistente: proteger venta/carrito en curso ante navegación, actualización o cambios de contexto. |
| D-12 | Interfaz en español y lenguaje de negocio; por ejemplo **Bacha** y **Producto preparado**. |
| D-13 | No se presume una cuenta autenticada de cliente público. Los flujos públicos de Fideli-Nook se evalúan conforme a su mecanismo vigente de tarjeta/token. |
| D-14 | No eliminar ni inutilizar rutas, impresiones, activaciones, enlaces públicos o flujos de venta sin comprobar referencias y ofrecer compatibilidad cuando corresponda. |
| D-15 | Resumen Operativo representa la **operación diaria y su estado actual**; Analytics concentra series históricas, comparaciones, cohortes y análisis gerencial. |

## 3. Árbol canónico TO-BE y RBAC

```text
Plataforma Nook
├── Operación                         Cashier / Admin / Superadmin
│   ├── Resumen Operativo            /operacion/resumen     [primera opción y landing]
│   ├── POS                          /operacion/pos
│   ├── Preparación                  /operacion/preparacion
│   ├── Historial                    /operacion/historial
│   ├── Inventario                   /operacion/inventario
│   └── Caja                         /operacion/caja
├── Gestión                           Admin / Superadmin
│   ├── Analytics                    /gestion/analytics
│   ├── Clientes                     /gestion/clientes
│   ├── Catálogo                     /gestion/catalogo
│   ├── Inventario                   /gestion/inventario
│   ├── Campañas                     /gestion/campanas
│   └── Suscripciones                /gestion/suscripciones
├── Administración                    Superadmin
│   ├── Usuarios                     /administracion/usuarios
│   └── Auditoría                    [futuro; no implementar aún]
└── Estación de preparación           Rol estación; cola propia, sin shell general
```

**Acceso:** `/operacion` → `/operacion/resumen` para sesión interna autorizada. La raíz `/` resuelve acceso según sesión y tipo de usuario; no debe convertir por accidente la experiencia pública en una redirección interna. Para usuarios no autenticados, definir acceso/login apropiado sin crear bucles. La estación llega directamente a su interfaz de preparación. Verificar diferencias entre ruta de preparación del personal y vista específica de estación antes de consolidar.

## 4. Contratos funcionales

### 4.1 Resumen Operativo — `/operacion/resumen`

- **Visibilidad:** Cashier, Admin y Superadmin; primera opción de Operación, disponible siempre desde el menú.
- **Propósito:** vista de situación de la jornada, diseñada para un monitor de 14 pulgadas, con densidad adecuada y objetivo de una pantalla sin desplazamiento vertical en condiciones de referencia.
- **Dimensión ventas:** ventas del día, cantidad de transacciones y ticket promedio; desglose por canal cuando sea pertinente.
- **Dimensión clientes/fidelización:** clientes nuevos, sellos acumulados, porcentaje de ventas con cliente identificado por número de transacciones y por monto vendido, con denominadores definidos de forma independiente.
- **Dimensión premios:** premios generados, canjeados, descuentos aplicados y próximos a vencer, según disponibilidad real de eventos y reglas verificadas.
- **Dimensión operación:** cola de preparación, pedidos listos, alertas relevantes y últimos movimientos; consulta rápida de cliente si resulta útil y no duplica innecesariamente POS.
- **No reemplaza:** POS, módulos de gestión ni Analytics.
- **Pendiente de contrato técnico:** fuentes/estados elegibles, cancelaciones, ventas web/local, ventana temporal `America/Santiago`, definiciones de sello/premio, umbral de vencimiento (7 días solo hipótesis), frecuencia de actualización, permisos por dato y tratamiento de datos faltantes.
- **Regla:** no inventar cifras, no mezclar eventos y saldos, no presentar indicadores no verificables.

### 4.2 POS — `/operacion/pos`

Conservar creación de venta, selección de SKU/variantes/sabores, cliente, fidelización, canjes, campañas vigentes, suscripciones, pago, comprobante y envío a preparación según capacidades existentes. El carrito y la venta activa deben sobrevivir navegación/refresh conforme al contrato que se valide. Las funciones administrativas de clientes/campañas no se trasladan al POS.

### 4.3 Preparación — `/operacion/preparacion`

Preservar colas, separación por estación local/web cuando aplique y transiciones de estado autorizadas. El rol estación es distinto de roles de persona y debe estar restringido tanto en frontend como en backend. Evitar dar acceso accidental a Caja, POS, Clientes o Gestión.

### 4.4 Historial, Caja e Inventario operacional

Historial: consulta, filtros, detalle y reimpresión. Caja: apertura, movimientos, cierre, arqueo e impresión. Inventario operacional: stock, bachas, movimientos y ajustes. No mezclar recepciones/configuraciones administrativas sin autorización.

### 4.5 Gestión y Administración

Analytics: análisis histórico, evolución de ventas y clientes, segmentación y retención. Clientes: ficha, historial, fidelización y suscripciones administrativas. Catálogo: productos, variantes, precios y configuración. Inventario administrativo: recepciones y parametrizaciones. Campañas: ciclo de vida administrativo, sin habilitar lanzamiento masivo. Suscripciones: planes y activaciones. Usuarios: roles/capacidades solo Superadmin.

## 5. Matriz completa AS-IS → TO-BE (44 páginas)

**Leyenda:** M = migrar conservando funcionalidad; C = conservar; R = redirigir; V = verificar antes de retirar/alterar. Las rutas auxiliares no tienen por qué figurar en navegación. Las rutas dinámicas mantienen sus parámetros.

| # | Ruta AS-IS | TO-BE / acción | Tipo |
|---:|---|---|:---:|
| 1 | `/activar-acceso` | Mantener flujo; auditar | C |
| 2 | `/activar-cuenta` | Mantener provisionalmente; auditar | V |
| 3 | `/admin/login` | Mantener acceso interno; revisar unificación | C |
| 4 | `/admin` | Redirigir a destino inicial por rol | R |
| 5 | `/admin/usuarios` | `/administracion/usuarios` | M |
| 6 | `/campanas/[id]` | `/gestion/campanas/[id]` | M |
| 7 | `/campanas` | `/gestion/campanas` | M |
| 8 | `/clientes` | `/gestion/clientes` | M |
| 9 | `/dashboard` | `/gestion/analytics` | M |
| 10 | `/login` | Verificar si público, interno o legado | V |
| 11 | `/mi-cuenta` | Candidata a retiro; comprobar enlaces y uso | V |
| 12 | `/mi-cuenta/perfil` | Candidata a retiro; comprobar enlaces y uso | V |
| 13 | `/mi-cuenta/suscripciones` | Candidata a retiro; comprobar enlaces y uso | V |
| 14 | `/mi-cuenta/tarjeta` | Candidata a retiro; comprobar enlaces y uso | V |
| 15 | `/operacion/caja/cierre/[sessionId]/imprimir` | Mantener impresión | C |
| 16 | `/operacion/caja` | Sin cambio | C |
| 17 | `/operacion/catalogo` | `/gestion/catalogo` | M |
| 18 | `/operacion/cola` | `/operacion/preparacion` | M |
| 19 | `/operacion/imprimir/mensaje` | Mantener impresión | C |
| 20 | `/operacion/inventario/ajustes` | Sin cambio | C |
| 21 | `/operacion/inventario/bachas` | Sin cambio | C |
| 22 | `/operacion/inventario/movimientos` | Sin cambio | C |
| 23 | `/operacion/inventario` | Sin cambio; mejorar integración posteriormente | C |
| 24 | `/operacion/inventario/recepciones/[transactionId]` | `/gestion/inventario/recepciones/[transactionId]` | M |
| 25 | `/operacion/inventario/recepciones/nueva` | `/gestion/inventario/recepciones/nueva` | M |
| 26 | `/operacion/inventario/recepciones` | `/gestion/inventario/recepciones` | M |
| 27 | `/operacion/inventario/stock` | Sin cambio | C |
| 28 | `/operacion` | `/operacion/resumen` (sin página propia) | R |
| 29 | `/operacion/ventas/imprimir/[saleId]` | Mantener impresión | C |
| 30 | `/operacion/ventas/imprimir-pack/[saleId]` | Mantener impresión | C |
| 31 | `/operacion/ventas/nueva` | `/operacion/pos` | M |
| 32 | `/operacion/ventas` | `/operacion/historial` | M |
| 33 | `/operacion/ventas/ticket/[saleId]` | Mantener impresión/ticket | C |
| 34 | `/` | Entrada sensible a sesión/rol; preservar público | V |
| 35 | `/recuperar-contrasena` | Mantener provisionalmente; auditar | V |
| 36 | `/register` | Verificar posible duplicidad con `/registro` | V |
| 37 | `/registro` | Mantener provisionalmente; auditar | V |
| 38 | `/restablecer-contrasena` | Mantener provisionalmente; auditar | V |
| 39 | `/suscripciones` | `/gestion/suscripciones` | M |
| 40 | `/t/[id]` | Mantener enlaces/token; auditar | C |
| 41 | `/tarjeta` | Mantener provisionalmente; auditar | V |
| 42 | `/terminos` | Mantener | C |
| 43 | `/verificar` | Mantener provisionalmente; auditar | V |
| 44 | `/verificar-registro` | Mantener provisionalmente; auditar | V |

**Rutas nuevas canónicas:** `/operacion/resumen`, `/operacion/pos`, `/operacion/preparacion`, `/operacion/historial`, `/gestion/analytics`, `/gestion/clientes`, `/gestion/catalogo`, `/gestion/inventario`, `/gestion/campanas`, `/gestion/suscripciones`, `/administracion/usuarios` y sus subrutas justificadas. No asumir que todas se crean en el primer DEV.

## 6. Restricciones transversales y seguridad

1. **RBAC en capas:** menú, páginas, acciones y API; comprobar comportamiento con Cashier, Admin, Superadmin, estación y sin sesión.
2. **Compatibilidad:** identificar todos los `href`, `router.push`, redirects, emails, enlaces QR, comprobantes y referencias externas antes de desactivar rutas; redirecciones con preservación de parámetros y query strings cuando corresponda.
3. **Continuidad de venta:** ninguna migración puede perder carrito, pago, boleta, canje ni emisión de preparación; proteger navegación durante venta activa.
4. **Integridad de inventario:** no alterar reglas de descuentos, bachas abiertas, ajustes, movimientos, recepciones o SKU por un traslado de pantalla.
5. **Integridad de caja:** no alterar apertura, cierre, arqueo, movimientos o impresión.
6. **Privacidad:** no exponer datos de clientes o reportes gerenciales a roles no autorizados.
7. **Campañas:** conservar bloqueos existentes de lanzamiento masivo hasta decisión independiente.
8. **Idiomas y UX:** interfaz en español; compatibilidad con pantallas de 14 pulgadas y estaciones en tablet según contexto.
9. **Cambios acotados:** evitar refactorizaciones extensas de páginas grandes durante migración de rutas.
10. **Diagnósticos seguros:** scripts iniciales de solo lectura; no editar base de datos, archivos de configuración sensibles ni desplegar sin validación.

## 7. Pendientes técnicos — no reabren decisiones funcionales

| ID | Verificación pendiente | Entregable |
|---|---|---|
| T-01 | Referencias internas y externas a rutas AS-IS | Inventario de enlaces y estrategia de redirección |
| T-02 | Autenticación, middleware, cookies, `PlatformShell`, `platform-navigation`, RBAC y redirecciones actuales | Matriz de roles, sesiones y destinos sin bucles |
| T-03 | Dependencias de componentes/servicios de `/operacion` | Plan de extracción hacia Resumen sin perder funciones |
| T-04 | Endpoints y eventos para KPIs del Resumen | Contrato por indicador: fórmula, fuente, filtro, permisos y actualización |
| T-05 | Flujo de preparación y diferencias entre personal y estación | Mapa de vistas, permisos y transiciones |
| T-06 | Persistencia de venta y enlaces de impresión | Casos E2E de continuidad |
| T-07 | Rutas públicas de registro, tarjeta, activación y cuenta heredada | Retener/redirigir/retirar con evidencia |
| T-08 | Recepciones y funciones administrativas de inventario | Separación de permisos y dependencias |

Si un hallazgo técnico exige variar una decisión cerrada, registrar solicitud de cambio; **no aplicar silenciosamente**.

## 8. Backlog secuencial y primer cambio

| Etapa | Alcance | Cierre requerido |
|---|---|---|
| **P0.02B** | Auditoría de dependencias y rutas | Referencias, auth/RBAC, riesgos y compatibilidad identificados |
| **DEV-UX-ARCH-01.10** | Shell, navegación, destinos iniciales por rol y base de `/operacion/resumen` | Resumen visible como primera opción; `/operacion` redirige; todos los roles aterrizan correctamente; sin regresiones |
| **DEV-UX-ARCH-01.11** | Resumen Operativo funcional | Capacidades útiles trasladadas; métricas validadas con fuentes y fórmulas; una pantalla objetivo |
| **DEV-UX-ARCH-01.12** | POS, Preparación, Historial | Flujos operacionales E2E y compatibilidad |
| **DEV-UX-ARCH-01.13** | Gestión y Administración | Rutas, navegación y permisos validados |
| **DEV-UX-ARCH-01.14** | Inventario administrativo | Recepciones y configuraciones separadas de operación |
| **DEV-UX-ARCH-01.15** | Rutas legadas, flujos públicos, consolidación y QA | Sin enlaces rotos, pérdida de capacidades ni accesos indebidos |

**Primer cambio de código:** DEV-UX-ARCH-01.10, pero **solo después de P0.02B mínimo enfocado** en autenticación, shell y enlaces a `/operacion`. El primer cambio debe ser pequeño, reversible y probado antes de avanzar a los siguientes módulos.

## 9. Criterios de aceptación del primer cambio

- [ ] `Resumen Operativo` figura como primera opción de Operación para Cashier/Admin/Superadmin.
- [ ] Al pulsarlo, navega a `/operacion/resumen`.
- [ ] `/operacion` redirige a `/operacion/resumen` sin pantalla intermedia.
- [ ] Después del login, Cashier/Admin/Superadmin aterrizan en Resumen Operativo.
- [ ] Estación de preparación aterriza en su interfaz restringida, sin menú general.
- [ ] No autenticados reciben un acceso adecuado, sin bucles ni exposición de datos.
- [ ] No se pierde ninguna función actualmente ofrecida por `/operacion`; si no se migra en el primer cambio, se preserva por compatibilidad temporal comprobada.
- [ ] Los enlaces existentes siguen funcionando o redirigen con seguridad.
- [ ] POS, Caja, Inventario, Preparación, Clientes y fidelización superan smoke tests.
- [ ] TypeScript, compilación y verificaciones de permisos superan el baseline acordado; registrar cualquier error preexistente.
- [ ] Se actualizan `docs/STATUS_PACK.md` y este Master Plan con estado real y decisiones, no con supuestos.

## 10. Gobierno del plan, evidencia y despliegue

**Estados permitidos de una decisión:** `APROBADA`, `PENDIENTE`, `PROPUESTA DE CAMBIO`, `REEMPLAZADA CON APROBACIÓN`. No sustituir una decisión aprobada mediante notas ambiguas o comentarios de código.

**Control de cambios:** cada solicitud debe incluir ID de decisión afectada, motivo, evidencia, impacto en roles/UX/datos/compatibilidad, alternativa, recomendación y aprobación expresa. Actualizar versión del Master Plan y registro de cambios.

**Regla de DEV:** definir alcance y no-alcance; realizar cambio mínimo; ejecutar comprobaciones locales; revisar diferencias; validar por rol y flujo; actualizar documentación; entregar bloque Git al finalizar el DEV; desplegar y comprobar producción cuando corresponda. No declarar `COMPLETADO` sin evidencias.

**Status Pack:** `docs/STATUS_PACK.md` debe referenciar este plan y mantener progreso, último DEV validado, incidencias y siguiente acción. Actualizar al cierre de DEV, antes de despliegue/corte, ante cambios arquitectónicos o como máximo cada 8–12 iteraciones relevantes.

## 11. Registro de cambios

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-10-22 | Consolidación inicial de decisiones, árbol de 13 módulos, 44 rutas, restricciones y primer DEV. |

---

**Próxima acción:** ejecutar P0.02B de solo lectura enfocado en auth, RBAC, navegación, redirecciones y dependencias de `/operacion`; luego preparar y ejecutar DEV-UX-ARCH-01.10 contra esta línea base.

## 12. Seguimiento de implementaciÃ³n â€” 22-10-2026

Esta secciÃ³n complementa la lÃ­nea base v1.0 sin sustituir el backlog de la secciÃ³n 8 ni alterar las decisiones D-01 a D-15.

- **DEV-UX-ARCH-01.10:** shell, Resumen como primera opciÃ³n, redirecciÃ³n de `/operacion` y aterrizaje por rol reportados como desplegados y validados en la conversaciÃ³n.
- **DEV-UX-ARCH-01.11 P1/P2A/P2B:** Resumen Operativo compacto, indicadores y eventos de premios implementados progresivamente; TypeScript y build reportados exitosos; visualizaciÃ³n productiva aprobada.
- **DEV-UX-ARCH-01.11 P3/P3.1:** consulta rÃ¡pida de cliente en panel lateral superpuesto. P3 presentÃ³ error JSX, corregido en P3.1; TypeScript y build posteriores exitosos, despliegue y QA visual aprobados por el usuario. UX validada como versiÃ³n funcional, no necesariamente TO-BE definitiva.
- **DEV-UX-ARCH-01.11 P4:** cierre documental original bloqueado por coincidencia textual demasiado estricta del instalador; no equivale a defecto del backlog. P4.2 sustituye solo el procedimiento documental.
- **Pendiente explÃ­cito:** conciliaciÃ³n de KPIs del Resumen con la regla canÃ³nica de Analytics (venta `confirmed` + `paid`, `sales.revenue`, fecha comercial); no introducir cambios sin auditorÃ­a de datos. RestricciÃ³n de Cashier para GestiÃ³n/Clientes permanece diferida por decisiÃ³n del usuario, sin revocar su consulta operacional.
- **Siguiente DEV:** DEV-UX-ARCH-01.12 â€” POS, PreparaciÃ³n e Historial, comenzando por auditorÃ­a de referencias, compatibilidad y preservaciÃ³n de venta activa. No renombrar rutas sin mapa de dependencias.

**Evidencia de cierre documental:** esta anotaciÃ³n registra validaciones comunicadas; no afirma QA E2E integral, pruebas RBAC negativas ni commit/push de P4.2 hasta que se acrediten.
