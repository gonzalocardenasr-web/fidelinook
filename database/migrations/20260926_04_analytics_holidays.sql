-- ============================================================
-- DEV-ANL-01
-- Analytics Holidays 2025-2026
--
-- Objetivo:
-- Completar analytics.calendar con feriados nacionales
-- aplicables a la operación de Nook.
--
-- Fuentes verificadas:
--   - Gobierno de Chile
--   - Servicio Electoral de Chile
--   - legislación vigente para feriados móviles
--
-- IMPORTANTE:
-- Se registra la fecha efectiva del feriado.
-- No se intenta reconstruir dinámicamente legislación futura.
-- ============================================================


-- ============================================================
-- 1. FERIADOS 2025
-- ============================================================

UPDATE analytics.calendar AS c
SET
    is_holiday = true,
    holiday_name = h.holiday_name
FROM (
    VALUES
        (DATE '2025-01-01', 'Año Nuevo'),
        (DATE '2025-04-18', 'Viernes Santo'),
        (DATE '2025-04-19', 'Sábado Santo'),
        (DATE '2025-05-01', 'Día del Trabajo'),
        (DATE '2025-05-21', 'Día de las Glorias Navales'),
        (DATE '2025-06-20', 'Día Nacional de los Pueblos Indígenas'),
        (DATE '2025-06-29', 'San Pedro y San Pablo / Elecciones Primarias'),
        (DATE '2025-07-16', 'Día de la Virgen del Carmen'),
        (DATE '2025-08-15', 'Asunción de la Virgen'),
        (DATE '2025-09-18', 'Independencia Nacional'),
        (DATE '2025-09-19', 'Día de las Glorias del Ejército'),
        (DATE '2025-10-12', 'Encuentro de Dos Mundos'),
        (DATE '2025-10-31', 'Día de las Iglesias Evangélicas y Protestantes'),
        (DATE '2025-11-01', 'Día de Todos los Santos'),
        (DATE '2025-11-16', 'Elecciones Presidenciales y Parlamentarias'),
        (DATE '2025-12-08', 'Inmaculada Concepción'),
        (DATE '2025-12-14', 'Segunda Votación Presidencial'),
        (DATE '2025-12-25', 'Navidad')
) AS h(calendar_date, holiday_name)
WHERE c.calendar_date = h.calendar_date;


-- ============================================================
-- 2. FERIADOS 2026
-- ============================================================

UPDATE analytics.calendar AS c
SET
    is_holiday = true,
    holiday_name = h.holiday_name
FROM (
    VALUES
        (DATE '2026-01-01', 'Año Nuevo'),
        (DATE '2026-04-03', 'Viernes Santo'),
        (DATE '2026-04-04', 'Sábado Santo'),
        (DATE '2026-05-01', 'Día del Trabajo'),
        (DATE '2026-05-21', 'Día de las Glorias Navales'),
        (DATE '2026-06-21', 'Día Nacional de los Pueblos Indígenas'),
        (DATE '2026-06-29', 'San Pedro y San Pablo'),
        (DATE '2026-07-16', 'Día de la Virgen del Carmen'),
        (DATE '2026-08-15', 'Asunción de la Virgen'),
        (DATE '2026-09-18', 'Independencia Nacional'),
        (DATE '2026-09-19', 'Día de las Glorias del Ejército'),
        (DATE '2026-10-12', 'Encuentro de Dos Mundos'),
        (DATE '2026-10-31', 'Día Nacional de las Iglesias Evangélicas y Protestantes'),
        (DATE '2026-11-01', 'Día de Todos los Santos'),
        (DATE '2026-12-08', 'Inmaculada Concepción'),
        (DATE '2026-12-25', 'Navidad')
) AS h(calendar_date, holiday_name)
WHERE c.calendar_date = h.calendar_date;