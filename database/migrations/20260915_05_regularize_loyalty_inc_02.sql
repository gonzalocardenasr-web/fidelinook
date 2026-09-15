-- ================================================================
-- INC-LOY-02B
-- Regularizar sellos omitidos por elegibilidad incorrecta
--
-- Alcance:
--   - 7 sellos omitidos por el defecto estructural PRODUCT.
--   - 1 sello omitido por clasificación operacional CUSTOM.
--   - 8 sellos totales en 6 clientes.
--
-- Decisión:
--   - No se reescriben snapshots históricos de ventas.
--   - La reparación se registra explícitamente en el ledger.
--   - Cada compensación posee idempotency_key determinística.
--   - Después de acreditar se ejecuta la conversión canónica de
--     sellos a premios, que además sincroniza el modelo legacy.
-- ================================================================

do $$
declare
    v_case record;
    v_movement_result jsonb;
    v_conversion_result jsonb;
    v_account_balance integer;
    v_legacy_balance integer;
begin

    -- ------------------------------------------------------------
    -- 1. VALIDAR IDENTIDAD DE LOS CLIENTES
    -- ------------------------------------------------------------

    if not exists (
        select 1
        from public.clientes
        where id = 228
          and lower(trim(correo)) = 'tanguita@gmail.com'
    ) then
        raise exception
            'INC-LOY-02: identidad inválida para customer_id 228.';
    end if;

    if not exists (
        select 1
        from public.clientes
        where id = 508
          and lower(trim(correo)) = 'angelafungapp@gmail.com'
    ) then
        raise exception
            'INC-LOY-02: identidad inválida para customer_id 508.';
    end if;

    if not exists (
        select 1
        from public.clientes
        where id = 514
          and lower(trim(correo)) = 'walsenconstanza@gmail.com'
    ) then
        raise exception
            'INC-LOY-02: identidad inválida para customer_id 514.';
    end if;

    if not exists (
        select 1
        from public.clientes
        where id = 668
          and lower(trim(correo)) = 'e.quilen@gmail.com'
    ) then
        raise exception
            'INC-LOY-02: identidad inválida para customer_id 668.';
    end if;

    if not exists (
        select 1
        from public.clientes
        where id = 724
          and lower(trim(correo)) = 'mpbastiasb@hotmail.com'
    ) then
        raise exception
            'INC-LOY-02: identidad inválida para customer_id 724.';
    end if;

    if not exists (
        select 1
        from public.clientes
        where id = 726
          and lower(trim(correo)) = 'fabiola.rubiom26@gmail.com'
    ) then
        raise exception
            'INC-LOY-02: identidad inválida para customer_id 726.';
    end if;


    -- ------------------------------------------------------------
    -- 2. ACREDITAR COMPENSACIONES
    --
    -- PRODUCT:
    --   Timo       +1
    --   Angela     +1
    --   Constanza  +3
    --   Efrain     +1
    --   Maria Paz  +1
    --
    -- CUSTOM:
    --   Fabiola    +1
    -- ------------------------------------------------------------

    for v_case in
        select *
        from (
            values
                (228::bigint, 1, 'PRODUCT', 'sale:664'),
                (508::bigint, 1, 'PRODUCT', 'sale:1493'),
                (514::bigint, 3, 'PRODUCT', 'sales:544,1213,1395'),
                (668::bigint, 1, 'PRODUCT', 'sale:690'),
                (724::bigint, 1, 'PRODUCT', 'sale:1596'),
                (726::bigint, 1, 'CUSTOM',  'sale:1629')
        ) as x(
            customer_id,
            stamp_delta,
            correction_scope,
            affected_sales
        )
    loop

        select public.record_loyalty_movement(
            p_customer_id :=
                v_case.customer_id,

            p_movement_type :=
                'incident_correction',

            p_stamp_delta :=
                v_case.stamp_delta,

            p_source :=
                'loyalty_incident_correction',

            p_source_reference :=
                'INC-LOY-02:' || v_case.customer_id,

            p_sale_id :=
                null,

            p_reward_id :=
                null,

            p_reason :=
                'Regularización INC-LOY-02 por sellos omitidos durante cálculo histórico de fidelización.',

            p_actor_role :=
                'system',

            p_actor_identifier :=
                'migration:20260915_05',

            p_reversal_of_movement_id :=
                null,

            p_occurred_at :=
                now(),

            p_idempotency_key :=
                'INC-LOY-02:stamp-compensation:'
                || v_case.customer_id,

            p_metadata :=
                jsonb_build_object(
                    'incidentCode',
                        'INC-LOY-02',

                    'correctionScope',
                        v_case.correction_scope,

                    'affectedSales',
                        v_case.affected_sales,

                    'stampDelta',
                        v_case.stamp_delta,

                    'reason',
                        case
                            when v_case.correction_scope = 'PRODUCT'
                            then
                                'Formal PRODUCT lines were incorrectly excluded from daily loyalty accumulation.'
                            else
                                'Known operational CUSTOM eligibility classification error.'
                        end
                )
        )
        into v_movement_result;

        if (v_movement_result->>'movement_id')::bigint is null then
            raise exception
                'INC-LOY-02: no se obtuvo movimiento válido para customer_id %.',
                v_case.customer_id;
        end if;


        -- --------------------------------------------------------
        -- 3. CONVERTIR SI EL NUEVO SALDO ALCANZA EL UMBRAL.
        --
        -- Esta función también sincroniza:
        --   loyalty_accounts
        --   clientes.sellos
        --   clientes.premios
        -- --------------------------------------------------------

        select public.convert_loyalty_stamps_to_rewards(
            p_customer_id :=
                v_case.customer_id,

            p_actor_role :=
                'system',

            p_actor_identifier :=
                'migration:20260915_05',

            p_reason :=
                'Conversión posterior a regularización INC-LOY-02.'
        )
        into v_conversion_result;


        -- --------------------------------------------------------
        -- 4. GUARDRAIL DE SINCRONIZACIÓN
        -- --------------------------------------------------------

        select current_stamp_balance
        into v_account_balance
        from public.loyalty_accounts
        where customer_id = v_case.customer_id;


        select sellos
        into v_legacy_balance
        from public.clientes
        where id = v_case.customer_id;


        if v_account_balance is distinct from v_legacy_balance then
            raise exception
                'INC-LOY-02: saldo canónico y legacy no coinciden para customer_id %.',
                v_case.customer_id;
        end if;

    end loop;


    -- ------------------------------------------------------------
    -- 5. GUARDRAIL: DEBEN EXISTIR EXACTAMENTE LAS 6
    --    COMPENSACIONES DE ESTA MIGRACIÓN Y SUMAR +8 SELLOS.
    -- ------------------------------------------------------------

    if (
        select count(*)
        from public.loyalty_movements
        where idempotency_key in (
            'INC-LOY-02:stamp-compensation:228',
            'INC-LOY-02:stamp-compensation:508',
            'INC-LOY-02:stamp-compensation:514',
            'INC-LOY-02:stamp-compensation:668',
            'INC-LOY-02:stamp-compensation:724',
            'INC-LOY-02:stamp-compensation:726'
        )
    ) <> 6 then
        raise exception
            'INC-LOY-02: cantidad inesperada de movimientos de compensación.';
    end if;


    if (
        select coalesce(sum(stamp_delta), 0)
        from public.loyalty_movements
        where idempotency_key in (
            'INC-LOY-02:stamp-compensation:228',
            'INC-LOY-02:stamp-compensation:508',
            'INC-LOY-02:stamp-compensation:514',
            'INC-LOY-02:stamp-compensation:668',
            'INC-LOY-02:stamp-compensation:724',
            'INC-LOY-02:stamp-compensation:726'
        )
    ) <> 8 then
        raise exception
            'INC-LOY-02: delta total de compensación distinto de +8.';
    end if;

end;
$$;