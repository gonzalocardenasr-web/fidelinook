# INC-FID-01 — Cierre técnico (12-10-2026)

## Problema
Ventas entregadas antes de la validación de correo/tarjeta no acreditaban automáticamente sellos al activar la cuenta.

## Regla funcional
Las ventas elegibles entregadas se consideran para fidelización aunque la validación del cliente ocurra después. Primera fecha de compra elegible: 1 sello base + 1 sello de primera compra; mínimo diario $3.000; sello adicional por cada $20.000 elegibles; agregación por día comercial de America/Santiago. Reglas sujetas a configuración vigente de `loyalty_rules`.

## P0.2 — Corrección histórica (ejecutada y verificada)
- 11 clientes; 12 ventas; +23 sellos; saldos agregados antes/después: 3/26.
- IDs de cliente y proyección diaria: 600/68, 640/377, 685/815, 687/832, 696/882, 698/915, 713/1180, 748/1764, 749/1791, 758/1879, 764/1919.
- Créditos: +2 por cada cliente salvo #749 (+3). Los créditos posteriores de #685 y #758 permanecieron intactos.
- SQL de validación posterior: 11/11 `OK`, 0 sellos pendientes. No ejecutar de nuevo el backfill.
- **Importante:** no se dispone aquí de un archivo fuente verificado del SQL histórico exactamente ejecutado; no se presenta una reconstrucción como si fuera ese original. Conservar el script original de Supabase si se encuentra en el historial del editor.

## P0.1 — Prevención permanente (desplegada)
- Se reemplazó `public.activate_customer_by_token(p_token text,p_activation_source text)` preservando validaciones, evento y respuesta principal.
- Se recorren fechas de ventas entregadas, se reconstruye proyección diaria, se reconcilia y se convierte el saldo a premios con las funciones existentes.
- Se retiró el filtro `o.delivered_at <= v_activation_at` de la selección de fechas para evitar omisiones por marca temporal y alinear selección/reconstrucción.
- Migración final: `supabase/migrations/INC-FID-01-P0.1-ajuste-final.sql`. Resultado informado: `Success`.

## Evidencia y limitaciones
- Auditoría de solo lectura: 2.470 órdenes entregadas con fecha, columnas y firmas compatibles, clave `daily_loyalty_id` confirmada.
- Se inspeccionó la definición instalada **antes** del ajuste final; el SQL de ajuste verificó la definición final dentro de su transacción.
- **No se ejecutó una prueba funcional de activación**. Estado: resuelto técnicamente, con validación end-to-end pendiente/no realizada por decisión del usuario.

## Reversión / continuidad
- Ante un fallo de activación relacionado con fidelización, preservar error y evidencia antes de intervenir; evitar reejecutar el backfill histórico.
- Para revertir el RPC, recuperar la versión anterior desde el historial de migraciones o respaldo de PostgreSQL; no se incluye un rollback improvisado.
- No se añadieron objetos permanentes nuevos.
