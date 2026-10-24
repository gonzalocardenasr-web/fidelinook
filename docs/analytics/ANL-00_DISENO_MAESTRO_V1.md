# NOOK · Diseño Maestro de Analytics
**Código:** ANL-00 · **Versión:** 1.0 · **Fecha:** 23-10-2026  
**Estado:** línea base funcional propuesta para validación; factibilidad técnica pendiente de auditoría DEV-ANL-02.0.

## 1. Propósito y alcance
Construir una capa transversal de inteligencia de negocio para Nook que permita entender resultados, identificar causas, decidir acciones y anticipar demanda. El alcance incluye ventas, clientes, fidelización, productos, sabores, inventario, bachas, compras/abastecimiento, operación, rentabilidad, proyecciones y expansión. El diseño objetivo no se limita a la información disponible actualmente: las capacidades sin fuente suficiente permanecerán visibles como **Próximamente / En construcción**, sin presentar métricas ficticias.

**Perspectivas:** dueño del negocio (crecimiento y rentabilidad); gestión comercial (captación, conversión y recurrencia); operación (capacidad, abastecimiento y mermas); expansión futura (multilocal, digital y franquicias).

## 2. Objetivo estratégico explícito
Crecer desde una base reportada de **más de 700 registros** a **más de 2.000 registros al 31-03-2027**. No usar 700 como conteo exacto. El tablero calculará base válida, altas netas, trayectoria objetivo, proyección, brecha y ritmo requerido con el dato real y la fecha de corte. Separar rigurosamente: registrado, comprador identificado, comprador activo (ventana configurable, sugerencia 90 días), recurrente (>=2 compras), inactivo y recuperado. La cantidad registrada no demuestra actividad comercial.

## 3. Principios aprobados
1. Portal Analytics con **vistas separadas por dominio**; evitar mezclar indicadores no relacionados.
2. Tres niveles de análisis: **N1 Resumen ejecutivo**, **N2 páginas temáticas**, **N3 profundización y trazabilidad** al detalle transaccional autorizado.
3. **Rankings como capacidad transversal**: clientes, productos, tipos de producto, sabores por formato, ventas, fidelización, inventario y operación.
4. Recuperar análisis históricos de Excel y ampliarlos, especialmente cantidades mensuales de **simples, dobles, triples, potes 16 oz y otros formatos**, y sabores de potes.
5. Filtros temporales, comparaciones, segmentación, ordenamiento, evolución, exportación y drill-down donde correspondan.
6. Ninguna cifra inventada. Diferenciar disponible, derivable, parcial y sin fuente; distinguir también estado de implementación.
7. Métricas reconciliables, con definición, grano, fuente, filtros, exclusiones, dueño y pruebas.
8. Mantener decisiones aprobadas aunque una capacidad no sea factible hoy; toda retirada o cambio se documenta.
9. Acceso a datos personales y financieros conforme a RBAC; agregados preferidos cuando no se requiere identificación.
10. Diseñar para futuro multicanal, multisucursal y franquicias sin fingir que esas operaciones ya existen.

## 4. Mapa maestro de vistas
| Grupo | Vista | Preguntas/funcionalidad | Prioridad funcional |
|---|---|---|---|
| Dirección | Resumen ejecutivo | KPIs, variación, metas, alertas, principales impulsores | P0 |
| Comercial | Ventas | ingresos, tickets, canales, horas, días, períodos | P0 |
| Comercial | Ranking de productos | SKU, tipos, formatos, cantidades, ingresos, mix, evolución | P0 |
| Comercial | Ranking de sabores | sabores por formato, unidades/selecciones, participación, evolución | P0 |
| Comercial | Comportamiento de compra | canastas, asociaciones, productos por venta | P1 |
| Comercial | Rankings transversales | top N y evolución de distintas dimensiones | P0 |
| Clientes | Base y crecimiento | registros, compradores, meta 2.000, brecha, activación | P0 |
| Clientes | Ranking de clientes | frecuencia, gasto, recencia, ticket, LTV observado | P0 |
| Clientes | Retención y cohortes | segunda compra, frecuencia, abandono, recuperación | P1 |
| Fidelización | Programa | sellos, premios, canjes, vencimientos, embudo | P1 |
| Fidelización | Impacto | compra posterior, recurrencia, costo del beneficio; sin atribución causal espuria | P2 |
| Operaciones | Inventario | stock, entradas, salidas, ajustes, cobertura y quiebres | P1 |
| Operaciones | Rotación de bachas | apertura, agotamiento, días abiertos, consumo y reposición | P1 |
| Operaciones | Preparación | cola, tiempos por etapa, demanda horaria, anomalías | P1 |
| Abastecimiento | Compras y recepciones | proveedor, volumen, costo, plazos, diferencias | P2 |
| Finanzas | Rentabilidad | margen bruto y contribución por producto/canal, descuentos y premios | P2 |
| Planificación | Proyecciones | demanda, estacionalidad, escenarios, capacidad | P2 |
| Planificación | Expansión | unidades, sucursales, canales, franquicias futuras | P3 |

## 5. Catálogo inicial de preguntas e indicadores (IDs estables)
### Dirección y ventas
- **ANL-VTA-001** Ingresos reconocidos de ventas confirmadas y pagadas por fecha comercial, canal y período.
- **ANL-VTA-002** Número de ventas/tickets elegibles; distinguir ventas de pedidos.
- **ANL-VTA-003** Ticket promedio = ingresos elegibles / ventas elegibles, mismo universo.
- **ANL-VTA-004** Evolución diaria, semanal, mensual y acumulada; variación comparable contra período previo y año anterior cuando exista historia.
- **ANL-VTA-005** Rankings de días de semana, horas, fines de semana y feriados, con denominadores comparables.
- **ANL-VTA-006** Mix de canales, descuentos, pagos y productos por ticket.
### Productos y sabores
- **ANL-PRD-001** Unidades por tipo/formato: simple, doble, triple, pote listo 16 oz, pote armado 16 oz y otros; evolución por mes y período arbitrario.
- **ANL-PRD-002** Ranking de SKU/productos por unidades e ingresos; participación y tendencia.
- **ANL-PRD-003** Ranking de sabores por formato, distinguiendo sabor del pote listo, selecciones del pote armado y opciones de otros productos.
- **ANL-PRD-004** Mix por familia, canal, día y horario; comparaciones y variación.
- **ANL-PRD-005** Combinaciones frecuentes y productos por transacción.
- **ANL-PRD-006** Demanda de sabores versus disponibilidad y consumo estimado; no equiparar selección de sabor a volumen consumido.
### Clientes
- **ANL-CLI-001** Base registrada válida y crecimiento neto.
- **ANL-CLI-002** Meta >2.000 al 31-03-2027: trayectoria, brecha y ritmo requerido.
- **ANL-CLI-003** Compradores identificados y conversión registro → primera compra.
- **ANL-CLI-004** Clientes activos 30/60/90 días y compradores recurrentes.
- **ANL-CLI-005** Ranking de clientes por gasto, transacciones, frecuencia, recencia y ticket; controles de privacidad.
- **ANL-CLI-006** Cohortes por primer registro y primera compra; segunda compra a 30/60/90 días.
- **ANL-CLI-007** Inactivos, recuperados y valor histórico observado (no confundir con LTV predictivo).
### Fidelización
- **ANL-FID-001** Sellos acreditados/usados, premios emitidos/disponibles/vencidos/canjeados.
- **ANL-FID-002** Embudo de acumulación → emisión → canje, con cohortes y tiempos.
- **ANL-FID-003** Compras antes/después de premios, con advertencia de sesgo de selección.
- **ANL-FID-004** Clientes próximos a premio o con premio disponible e inactividad, sujeto a permisos.
### Inventario, compras y operación
- **ANL-INV-001** Conciliación stock inicial + entradas − salidas ± ajustes = stock final.
- **ANL-INV-002** Rotación de SKU, bachas, días entre apertura y agotamiento, stock inmovilizado.
- **ANL-INV-003** Cobertura, quiebres y reposición sugerida; distinguir observado de estimado.
- **ANL-COM-001** Recepciones por proveedor, SKU, período, cantidad y diferencias.
- **ANL-COM-002** Costos de adquisición, tendencias, plazo y cumplimiento si existen datos confiables.
- **ANL-OPE-001** Tiempos de preparación por etapa, cola, canal, día y hora; secuencias válidas.
### Economía y futuro
- **ANL-FIN-001** Costo de ventas y margen bruto por SKU/formato/canal, condicionado a costeo confiable.
- **ANL-FIN-002** Descuentos, premios y contribución comercial por canal.
- **ANL-PLA-001** Pronósticos de venta, demanda y abastecimiento con escenarios y estacionalidad.
- **ANL-EXP-001** Comparaciones futuras por sucursal, territorio y modelo de operación.

## 6. Rankings: contrato UX común
Ranking con selector de dimensión, métrica (unidades, ingresos, frecuencia, etc.), período, canal/familia cuando corresponda, Top 5/10/20/todos, ordenamiento, participación, variación y evolución temporal. Drill-down desde ranking a serie histórica y a transacciones cuando existan permisos. No comparar directamente unidades de distinta naturaleza; mostrar unidades de medida y denominadores. Permitir exportar CSV/Excel. Cada vista decide filtros pertinentes; no forzar filtros semánticamente inválidos.

**Ejemplos prioritarios:** ¿Cuántos simples/dobles/potes desde agosto 2026? ¿Qué sabores de pote 16 oz lideran? ¿Qué clientes compran más? ¿Qué días venden más? ¿Qué bachas rotan más rápido?

## 7. Reglas de medición y cautelas
- Universo comercial inicial de referencia: `sales.status='confirmed'` y `sales.payment_status='paid'`, monto canónico `sales.revenue`; **confirmar con auditoría** antes de codificar. Fecha comercial `orders.business_date` donde corresponda; revisar ventas sin orden y zona horaria Chile.
- Recuento de producto: cantidad de líneas `sale_items.quantity`, evitando multiplicación por opciones y joins. Separar ventas pagadas, regalos, descuentos, anulaciones, devoluciones y cambios.
- Dos potes 16 oz distintos: **listo (catálogo fijo de sabores)** y **armado en local (sabores de bachas abiertas)**. Nunca agregarlos como una sola entidad sin filtro explícito.
- Una selección de sabor no equivale necesariamente a una unidad de producto ni a litros consumidos.
- Días hábiles = lunes a viernes no feriados; fines de semana/feriados = sábados, domingos y feriados de Chile, incluso entre semana. Auditar calendario y cambios horarios.
- Rocciato produce; Nook vende. Costos de Rocciato y costos comerciales de Nook no son automáticamente equivalentes.
- Márgenes, atribución de marketing y efectos causales solo cuando existan fuentes y métodos válidos.
- No asumir historia completa de sabores ni atributos en transacciones antiguas: reportar cobertura.

## 8. Navegación y estados de construcción
`/gestion/analytics` como portal; rutas hijas temáticas por definir en diseño técnico, sin fijarlas prematuramente. Estados visibles: **Disponible** (datos y cálculos validados), **En construcción** (implementación en curso), **Parcial** (fuente incompleta y limitación visible), **Próximamente** (capacidad definida sin implementación/fuente), **Sin datos** (filtros sin registros). No presentar placeholders como valores reales.

## 9. Roadmap de entregas
- **DEV-ANL-02.0:** auditoría de código, APIs, esquema, calidad y cobertura histórica; matriz disponible/derivable/parcial/no disponible.
- **02.1:** catálogo semántico validado, reglas, prioridades y diseño UX por vistas.
- **02.2:** arquitectura técnica de agregaciones, filtros, seguridad y rendimiento.
- **02.3:** primera ola de valor: rankings de productos, sabores, clientes, crecimiento de registros y base ejecutiva reconciliada.
- **02.4+:** ventas avanzadas, fidelización, cohortes, inventario/bachas, preparación, compras, rentabilidad, proyecciones y expansión según dependencias.
- QA por métrica contra datos fuente; registro de limitaciones y actualización documental por DEV.

## 10. Gobernanza y control de cambios
Este archivo es el **diseño maestro funcional**. La auditoría puede cambiar la clasificación de factibilidad y la secuencia de implementación, pero no borrar silenciosamente vistas o preguntas aprobadas. Cada modificación registrará fecha, versión, decisión, motivo, impacto e indicadores afectados. Las decisiones técnicas viven en ANL-01/02/03 y se referencian desde aquí.

## 11. Registro de decisiones V1.0
- D-001: portal multivista, no dashboard único.
- D-002: tres niveles ejecutivo/temático/detalle.
- D-003: rankings transversales y drill-down.
- D-004: recuperar conteos históricos de formatos y sabores.
- D-005: objetivo >2.000 registrados al 31-03-2027, separado de clientes activos.
- D-006: preservar vistas futuras con estado Próximamente/En construcción.
- D-007: auditoría técnica posterior al diseño funcional.
- D-008: reglas de negocio trazables, sin datos inventados.

## 12. Pendientes explícitos de validación
Verificar modelo real de ventas y fecha comercial, integridad del histórico desde agosto 2026, distinción de SKU y opciones de sabor, registros de clientes, tablas de fidelización, movimientos y bachas, recepciones, costos, proveedores, fuentes de marketing y calidad de las marcas temporales de preparación. Confirmar nomenclatura final de rutas y permisos antes de implementación. **No marcar como disponible ninguna métrica hasta auditarla.**
