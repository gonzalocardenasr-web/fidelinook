# DEV-UX-ARCH-01 — Arquitectura de Plataforma Nook

**Estado:** EN CURSO  
**Fecha de corte:** 2026-09-30  
**Documento:** Arquitectura objetivo vigente

---

## 1. Propósito

DEV-UX-ARCH-01 consolida Plataforma Nook como una única plataforma interna organizada por capacidades, roles y contexto de uso.

El objetivo no es rediseñar módulos aisladamente, sino construir una arquitectura común que permita integrar progresivamente las superficies existentes sin un big-bang.

---

## 2. Arquitectura funcional objetivo

Plataforma Nook se organiza conceptualmente en tres dominios internos:

### Operación

- POS
- Preparación
- Historial
- Inventario operacional
- Caja

### Gestión

- Analytics
- Clientes
- Catálogo
- Inventario administrativo
- Campañas
- Suscripciones

### Administración

- Usuarios
- Auditoría futura

Cliente/público permanece como dominio separado de la plataforma interna.

Fideli-Nook mantiene su lógica de tarjeta/token y no debe confundirse con identidad operacional.

---

## 3. Principios arquitectónicos

1. Una plataforma, no múltiples paneles independientes.
2. Navegación definida por capabilities.
3. Ocultar una superficie no sustituye autorización server-side.
4. Los clientes loyalty y los usuarios operacionales son dominios de identidad distintos.
5. PlatformShell constituye la carcasa común de las superficies internas estándar.
6. Las superficies especializadas pueden usar un modo de presentación distinto cuando exista una razón operacional explícita.
7. No realizar migraciones big-bang.
8. Preservar lógica funcional estable mientras se moderniza arquitectura y UX.
9. No reabrir Auth/session sin evidencia concreta mientras INC-PERF-01.7 permanezca en observación.
10. Retirar legacy de forma controlada una vez reemplazado y sin consumidores legítimos.
11. Las superficies dentro de PlatformShell no deben repetir un page header cuando el shell ya entrega contexto suficiente de sección y módulo. Las acciones o indicadores necesarios deben integrarse en la primera superficie funcional. Los modos especializados sin topbar, como Preparation Station Mode, pueden divergir de esta regla.
12. El canvas corporativo transversal de Plataforma Nook es `#F4DCE8`. PlatformShell es responsable de suministrar este fondo; las superficies gestionables se presentan como tarjetas o paneles blancos directamente sobre el canvas, evitando fondos intermedios de página que generen doble canvas.
13. Las vistas internas operacionales deben utilizar el viewport disponible sin generar scroll vertical del documento en condiciones normales de escritorio. Las áreas estructurales permanecen visibles y el contenido variable debe resolver su crecimiento mediante regiones internas con `min-h-0` y `overflow-auto`; en tablas extensas, el cuerpo debe desplazarse internamente manteniendo encabezados visibles.

---

## 4. Roles operacionales vigentes

Roles persistidos:

- `superadmin`
- `admin`
- `cashier`
- `preparation`

El rol `preparation` fue incorporado durante DEV-UX-ARCH-01.3B.1.

Su capability operacional es:

`orders.operate`

No crear roles distintos para Preparación Local y Preparación Web.

Las identidades de estación pueden diferenciarse como cuentas, pero comparten el mismo rol salvo nueva necesidad funcional demostrada.

---

## 5. PlatformShell

PlatformShell es la carcasa estándar de Plataforma Nook.

Responsabilidades:

- navegación capability-driven;
- contexto de identidad operacional;
- agrupación conceptual Operación / Gestión / Administración;
- breadcrumbs/contexto de módulo;
- acceso a cierre de sesión en usuarios estándar;
- superficie consistente para módulos internos.

PlatformShell no debe asumir que todas las superficies requieren exactamente la misma ergonomía.

Preparación Station Mode constituye la primera excepción especializada.

---

## 6. POS

POS es una superficie CORE operacional.

Estado:

`DEV-UX-ARCH-01.3A — COMPLETADO`

El estándar visual validado se encuentra en:

`docs/POS_UI_VOCABULARY_V1.md`

Este vocabulario constituye el baseline visual de las superficies internas estándar.

El rediseño arquitectónico no debe degradar:

- velocidad operacional;
- densidad;
- contexto de venta;
- comportamiento funcional;
- preservación futura del estado de una venta activa.

---

## 7. Preparación

Preparación posee dos modos de presentación.

### Platform Mode

Usuarios autorizados estándar:

- acceden dentro de PlatformShell;
- conservan navegación correspondiente a sus capabilities;
- utilizan `/operacion/cola`;
- Preparación se comporta como una superficie operacional de la plataforma.

### Preparation Station Mode

Identidades con rol `preparation`:

- ingresan directamente a `/operacion/cola`;
- no muestran sidebar;
- no muestran topbar global;
- no muestran navegación general;
- no muestran logout visible;
- otras rutas internas son reconducidas a `/operacion/cola`;
- `/admin/login` permanece disponible como vía técnica;
- autorización efectiva permanece server-side mediante RBAC.

La ausencia de logout visible es deliberada para una estación dedicada.

La optimización final touch-first para tablet ~8–9" se realizará posteriormente en DEV-UX-ARCH-01.7.

---

## 8. Seguridad de estación

La arquitectura de estación utiliza:

Supabase Auth  
→ `operational_users`  
→ sesión operacional verificada  
→ RBAC server-side  
→ capability `orders.operate`

No utiliza:

- nombre hardcodeado;
- email hardcodeado;
- ID hardcodeado;
- un segundo sistema Auth;
- ocultamiento frontend como única barrera.

`UXARCH-OPEN-001` queda CERRADO.

---

## 9. Historial

Historial pertenece a Operación, no a Analytics.

Debe integrarse a PlatformShell preservando:

- funcionalidad vigente;
- filtros;
- detalle de venta;
- impresión;
- acciones operacionales autorizadas;
- optimizaciones de performance existentes;
- límite/carga definidos durante INC-PERF-01.HIST-01, HIST-FIX y HIST-02.

La integración arquitectónica no debe reconstruir innecesariamente su backend.

Estado:

`DEV-UX-ARCH-01.3B.3 — COMPLETADO`

Historial opera dentro de PlatformShell como superficie operacional, preservando su ventana móvil de 15 días, filtros, paginación, detalle y acciones existentes.

---

## 10. Inventario

Inventario posee dos naturalezas conceptuales:

### Inventario operacional

Funciones de uso frecuente durante operación.

### Inventario administrativo

Recepciones, ajustes, configuración y otras capacidades de gestión.

La separación definitiva de superficies se realizará incrementalmente sin duplicar la fuente de datos ni la lógica de inventario.

---

## 11. Analytics

Analytics pertenece a Gestión.

El backend analítico está cerrado y sigue el principio:

`DATA → METRICS → VISUALIZATION`

La UI Analytics debe construirse dentro de Plataforma Nook y no como arquitectura paralela.

Acceso previsto:

- admin;
- superadmin.

No exponer `service_role` al browser ni abrir Analytics directamente a `authenticated`.

---

## 11A. Integración de Gestión y readiness operacional

### DEV-UX-ARCH-01.4.1 — Analytics + Clientes

**Estado: COMPLETADO**

Analytics y Clientes fueron integrados a PlatformShell preservando sus capacidades y autorización vigentes.

Decisiones:

- Analytics pertenece a Gestión y requiere `analytics.view`.
- Clientes utiliza `customers.operate` y mantiene naturaleza operacional donde corresponda.
- se eliminó navegación/header legacy redundante;
- se corrigió el endpoint de loyalty utilizado desde Clientes;
- TypeScript y build productivo fueron validados.

Clientes conserva deuda UX relevante y requiere una intervención posterior de mayor alcance para ajustarse completamente al estándar de viewport operacional. No resolver esa deuda mediante parches CSS aislados.

### DEV-UX-ARCH-01.4.2 — Cashier Operational Readiness

**Estado: COMPLETADO**

El workspace de cashier queda operacionalmente preparado bajo la nueva arquitectura.

Superficies disponibles:

- POS;
- Preparación en Platform Mode;
- Historial;
- Inventario operacional;
- Caja;
- Clientes según `customers.operate`.

Reglas vigentes:

- navegación capability-driven;
- seguridad efectiva server-side;
- `cash.operate` permite operación de caja;
- `cash.audit` queda reservado a admin/superadmin para cierres históricos, detalle y trazabilidad;
- cashier puede abrir, operar y cerrar su caja, pero no consultar auditoría histórica;
- Recepciones/configuración de inventario no se exponen a cashier;
- cierre de sesión se mantiene como última opción de navegación para usuarios estándar;
- Preparation Station Mode mantiene deliberadamente ausencia de logout visible.

### Canvas corporativo

Se adopta transversalmente para las superficies internas:

- canvas base: `#F4DCE8`;
- violeta primario Nook: `#4C00F7`;
- PlatformShell suministra el canvas;
- las superficies gestionables utilizan tarjetas/paneles blancos;
- no crear un segundo fondo de página entre el canvas y las tarjetas;
- el POS constituye la referencia visual principal de esta relación canvas/superficie.

### Operational viewport

Las superficies internas deben converger hacia:

`viewport fijo → superficies blancas → regiones flexibles → min-h-0 → scroll interno`

El scroll de documento no es el patrón objetivo para vistas operacionales de escritorio.

Historial ya implementa este contrato. Clientes y partes de Caja mantienen deuda pendiente.

### `/operacion` y Resumen Operativo

La ruta `/operacion` conserva temporalmente funciones de launcher legacy y no representa una capacidad arquitectónica definitiva.

Sin embargo, **Resumen Operativo sí constituye una capacidad operacional que debe preservarse**.

Antes de retirar el launcher en DEV-UX-ARCH-01.5:

- extraer/preservar Resumen Operativo como superficie operacional;
- mantener información diaria útil para conciliación operacional;
- permitir al cashier contrastar ventas, monto y transacciones registradas en Nook con fuentes externas disponibles;
- no confundir Resumen Operativo con Analytics.

Landing objetivo:

- cashier → Resumen Operativo;
- preparation → `/operacion/cola`;
- admin/superadmin → pendiente de decisión en `UXARCH-OPEN-003`.

### Deuda UX explícita

No bloquea Cashier Operational Readiness, pero debe resolverse dentro de DEV-UX-ARCH-01:

- modernización de Clientes y adopción completa del operational viewport;
- rediseño estructural del cierre de Caja para operar sin scroll de documento;
- mejorar densidad/legibilidad de tabla de auditoría de Caja para admin/superadmin;
- exportación histórica de ventas mediante `sales.export`;
- retiro del launcher legacy sólo después de preservar Resumen Operativo;
- normalización visual/tipográfica restante en superficies de Gestión/Admin.

## 12. Estado de implementación

- 01.1 — Arquitectura objetivo y reglas UX — COMPLETADO.
- 01.2 — PlatformShell / carcasa base — COMPLETADO.
- 01.3A — POS — COMPLETADO.
- 01.3B.1 — Identidad/autorización de Preparación — COMPLETADO.
- TECH-TS-01 — Baseline TypeScript — COMPLETADO.
- 01.3B.2 — Platform Mode + Preparation Station Mode — COMPLETADO.
- 01.3B.3 — Historial — COMPLETADO.
- 01.4.1 — Analytics + Clientes — COMPLETADO.
- 01.4.2 — Cashier Operational Readiness — COMPLETADO.
- TECH-ENC-01 — Normalización UTF-8 y eliminación de mojibake — COMPLETADO.
- 01.4 — Gestión/Admin — EN CURSO.
- 01.5 — Preservar Resumen Operativo y retirar launcher legacy — PENDIENTE.
- 01.6 — Separaciones contextuales — PENDIENTE.
- 01.7 — Preparación touch/tablet final — PENDIENTE.
- 01.8 — Persistencia de venta activa — PENDIENTE.
- 01.9 — Normalización UX — PENDIENTE.
- 01.10 — Consolidación — PENDIENTE.

---

## 13. Decisiones abiertas

### UXARCH-OPEN-001

CERRADO.

Identidad de estación resuelta mediante rol `preparation` + `orders.operate`.

### UXARCH-OPEN-002

Persistencia/preservación de venta activa durante navegación.

PENDIENTE.

### UXARCH-OPEN-003

Ruta inicial definitiva para admin/superadmin una vez retirado el launcher legacy.

PENDIENTE.

### UXARCH-OPEN-004

Evolución futura de superficies Fideli-Nook / cliente público.

PENDIENTE.

### UXARCH-OPEN-005

Exportación histórica de ventas.

PENDIENTE.

Definición vigente:

- Historial operacional mantiene una ventana móvil máxima de 15 días.
- No ampliar esa ventana para resolver necesidades administrativas.
- La exportación histórica debe ubicarse en Gestión y requerir `sales.export`.
- Debe permitir seleccionar un rango temporal mayor sin previsualizar el dataset completo en pantalla.
- Reutilizar la capacidad de exportación server-side existente y preservar procesamiento paginado/batch.
- Antes de habilitar rangos extensos, definir límites operacionales razonables.

---

## 14. Restricciones vigentes

No:

- debilitar RBAC;
- utilizar ocultamiento frontend como seguridad;
- mezclar clientes con usuarios operacionales;
- modificar Auth/session sin evidencia;
- reintroducir refresh duplicado;
- crear arquitecturas paralelas por módulo;
- reconstruir lógica funcional estable únicamente por razones visuales;
- mantener indefinidamente launcher/componentes legacy una vez reemplazados.

---

## 15. Punto de continuidad

Estado del frente operacional:

`Cashier Operational Readiness — COMPLETADO`

Las superficies requeridas para cashier están integradas y funcionales bajo PlatformShell, con autorización capability-driven y RBAC server-side.

Siguiente implementación:

`DEV-UX-ARCH-01.4 — Continuar integración de Gestión/Admin`

Objetivo inmediato:

Continuar la integración arquitectónica de las superficies de Gestión y Administración para admin/superadmin, aplicando los estándares ya cerrados:

- PlatformShell;
- navegación capability-driven;
- canvas corporativo `#F4DCE8`;
- superficies gestionables blancas;
- eliminación de page headers redundantes;
- operational viewport cuando la naturaleza de la superficie lo requiera;
- preservación de lógica funcional estable;
- separación explícita entre operación, gestión y administración;
- autorización server-side vigente.

No realizar una nueva radiografía general del repositorio.

Las deudas detectadas en Clientes, Caja, exportación histórica y launcher legacy permanecen registradas y deben resolverse dentro de la secuencia de DEV-UX-ARCH-01 sin bloquear el avance hacia Gestión/Admin.

TECH-TS-01 y TECH-ENC-01 están cerrados. El baseline vigente exige:

- `npx.cmd tsc --noEmit` → 0 errores;
- código ejecutable sin mojibake conocido;
- archivos nuevos/modificados en UTF-8;
- `.editorconfig` como contrato de encoding y finales de línea.
