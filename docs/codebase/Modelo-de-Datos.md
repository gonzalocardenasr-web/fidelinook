## Table `clientes`

### Columns

| Name                                    | Type          | Constraints      |
| --------------------------------------- | ------------- | ---------------- |
| `id`                                    | `int8`        | Primary Identity |
| `nombre`                                | `text`        |                  |
| `correo`                                | `text`        | Nullable Unique  |
| `telefono`                              | `text`        | Nullable Unique  |
| `sellos`                                | `int4`        | Nullable         |
| `premios`                               | `jsonb`       | Nullable         |
| `created_At`                            | `timestamptz` | Nullable         |
| `public_token`                          | `text`        | Nullable         |
| `email_verificado`                      | `bool`        |                  |
| `tarjeta_activa`                        | `bool`        |                  |
| `token_verificacion`                    | `text`        | Nullable         |
| `token_verificacion_creado_en`          | `timestamptz` | Nullable         |
| `fecha_activacion`                      | `timestamptz` | Nullable         |
| `fecha_ultimo_sello`                    | `timestamptz` | Nullable         |
| `fecha_ultimo_canje`                    | `timestamptz` | Nullable         |
| `fecha_ultimo_recordatorio_inactividad` | `timestamptz` | Nullable         |
| `auth_user_id`                          | `uuid`        | Nullable         |
| `acepta_terminos`                       | `bool`        | Nullable         |
| `acepta_marketing`                      | `bool`        | Nullable         |
| `fecha_aceptacion`                      | `timestamptz` | Nullable         |
| `version_terminos`                      | `text`        | Nullable         |
| `marketing_preferencia_definida`        | `bool`        | Nullable         |

## Table `subscription_templates`

### Columns

| Name                     | Type          | Constraints |
| ------------------------ | ------------- | ----------- |
| `id`                     | `int8`        | Primary     |
| `code`                   | `text`        | Unique      |
| `name`                   | `text`        |             |
| `billing_period`         | `text`        |             |
| `duration_months`        | `int4`        |             |
| `pots_per_month`         | `int4`        |             |
| `toppings_per_month`     | `int4`        |             |
| `wafer_packs_per_month`  | `int4`        |             |
| `cookie_packs_per_month` | `int4`        |             |
| `is_active`              | `bool`        |             |
| `created_at`             | `timestamptz` |             |
| `pots_per_cycle`         | `int4`        |             |
| `toppings_per_cycle`     | `int4`        |             |
| `wafer_packs_per_cycle`  | `int4`        |             |
| `cookie_packs_per_cycle` | `int4`        |             |

## Table `subscription_claims`

### Columns

| Name                    | Type          | Constraints     |
| ----------------------- | ------------- | --------------- |
| `id`                    | `int8`        | Primary         |
| `source`                | `text`        |                 |
| `status`                | `text`        |                 |
| `template_id`           | `int8`        |                 |
| `claim_code`            | `text`        | Nullable Unique |
| `external_reference`    | `text`        | Nullable        |
| `assigned_cliente_id`   | `int8`        | Nullable        |
| `claimed_by_cliente_id` | `int8`        | Nullable        |
| `created_by_admin`      | `text`        | Nullable        |
| `notes`                 | `text`        | Nullable        |
| `claimed_at`            | `timestamptz` | Nullable        |
| `expires_at`            | `timestamptz` | Nullable        |
| `created_at`            | `timestamptz` |                 |

## Table `subscriptions`

### Columns

| Name              | Type          | Constraints |
| ----------------- | ------------- | ----------- |
| `id`              | `int8`        | Primary     |
| `cliente_id`      | `int8`        |             |
| `template_id`     | `int8`        |             |
| `claim_id`        | `int8`        | Nullable    |
| `status`          | `text`        |             |
| `start_date`      | `date`        |             |
| `end_date`        | `date`        | Nullable    |
| `next_cycle_date` | `date`        | Nullable    |
| `activated_at`    | `timestamptz` |             |
| `created_at`      | `timestamptz` |             |

## Table `subscription_consumptions`

### Columns

| Name               | Type          | Constraints      |
| ------------------ | ------------- | ---------------- |
| `id`               | `int8`        | Primary Identity |
| `subscription_id`  | `int8`        |                  |
| `cliente_id`       | `int8`        |                  |
| `cycle_number`     | `int4`        |                  |
| `cycle_start_date` | `date`        |                  |
| `cycle_end_date`   | `date`        |                  |
| `potes`            | `int4`        |                  |
| `toppings`         | `int4`        |                  |
| `barquillos`       | `int4`        |                  |
| `galletas`         | `int4`        |                  |
| `created_at`       | `timestamptz` |                  |

## Table `campanas`

### Columns

| Name                 | Type          | Constraints |
| -------------------- | ------------- | ----------- |
| `id`                 | `int8`        | Primary     |
| `nombre_interno`     | `text`        |             |
| `premio_nombre`      | `text`        |             |
| `premio_descripcion` | `text`        |             |
| `duracion_horas`     | `int4`        |             |
| `fecha_lanzamiento`  | `timestamptz` |             |
| `recurrencia`        | `text`        |             |
| `estado`             | `text`        |             |
| `creado_por`         | `text`        | Nullable    |
| `created_at`         | `timestamptz` |             |
| `launched_at`        | `timestamptz` | Nullable    |
| `total_objetivo`     | `int4`        | Nullable    |
| `total_enviados`     | `int4`        | Nullable    |
| `error_message`      | `text`        | Nullable    |
| `updated_at`         | `timestamptz` | Nullable    |
| `cancelada_at`       | `timestamptz` | Nullable    |

## Table `campana_clientes`

### Columns

| Name            | Type          | Constraints |
| --------------- | ------------- | ----------- |
| `id`            | `int8`        | Primary     |
| `campana_id`    | `int8`        |             |
| `cliente_id`    | `int8`        |             |
| `premio_id`     | `text`        |             |
| `estado`        | `text`        |             |
| `asignado_at`   | `timestamptz` |             |
| `email_enviado` | `bool`        | Nullable    |
| `email_error`   | `text`        | Nullable    |
| `canjeado_at`   | `timestamptz` | Nullable    |
| `vencimiento`   | `timestamptz` |             |
| `created_at`    | `timestamptz` |             |
