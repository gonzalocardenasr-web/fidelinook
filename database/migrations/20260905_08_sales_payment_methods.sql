CREATE OR REPLACE FUNCTION public.create_local_sale_with_order(
    p_customer_id bigint,
    p_payment_method text,
    p_items jsonb,
    p_cash_register_session_id bigint,
    p_actor_role text DEFAULT NULL::text,
    p_order_notes text DEFAULT NULL::text,
    p_channel text DEFAULT 'local'::text,
    p_external_order_id text DEFAULT NULL::text,
    p_promotional_stamps integer DEFAULT 0,
    p_promotion_reason text DEFAULT NULL::text,
    p_manual_discount_type text DEFAULT NULL::text,
    p_manual_discount_value integer DEFAULT NULL::integer,
    p_manual_discount_reason text DEFAULT NULL::text,
    p_manual_discount_notes text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$

declare
    v_sale_id bigint;
    v_order_id bigint;
    v_business_date date;
    v_daily_number integer;
    v_display_code text;

    v_cash_register_status text;

    v_subtotal integer := 0;
    v_discount_total integer := 0;
    v_total integer := 0;

    v_pot_quantity integer := 0;
    v_pot_subtotal integer := 0;
    v_pot_discount_rate numeric(5,4) := 0;
    v_pot_discount_total integer := 0;

    -- Parte del descuento de potes que realmente afecta
    -- monto elegible de loyalty.
    v_loyalty_pot_subtotal integer := 0;
    v_loyalty_pot_discount_total integer := 0;

    v_gift_discount_total integer := 0;

    -- Se conserva para compatibilidad/auditorÃ­a del resultado.
    v_custom_payable_subtotal integer := 0;

    -- Suma de total_price de todas las lÃ­neas cuyo snapshot
    -- loyalty_eligible = true.
    v_loyalty_eligible_line_subtotal integer := 0;

    v_loyalty_eligible_before_manual integer := 0;
    v_loyalty_manual_discount integer := 0;
    v_loyalty_eligible_total integer := 0;

    v_total_before_manual_discount integer := 0;

    v_manual_discount_type text;
    v_manual_discount_value integer;
    v_manual_discount_amount integer := 0;
    v_manual_discount_reason text;
    v_manual_discount_notes text;

    v_item jsonb;
    v_option jsonb;

    v_item_type text;

    v_custom_name text;
    v_custom_unit_price integer;

    -- Snapshot definitivo para la lÃ­nea actual.
    v_item_loyalty_eligible boolean := false;

    v_product public.products%rowtype;

    v_price integer;
    v_extra_unit_price integer;

    v_coffee_option_id bigint;
    v_coffee_option_code text;
    v_coffee_option_count integer;
    v_coffee_option_price integer;
    v_coffee_inventory_quantity numeric;

    v_unit_price integer;
    v_gross_line_total integer;
    v_line_discount integer;
    v_final_line_total integer;
    v_qty integer;

    v_sale_item_id bigint;

    v_is_gift boolean;
    v_gift_reason text;

    v_channel text;
    v_external_order_id text;
    v_payment_method text;

    v_promotional_stamps integer;
    v_promotion_reason text;

    v_inventory_result jsonb;

begin

    -- ================================================================
    -- 1. CAJA
    -- ================================================================

    if p_cash_register_session_id is null then
        raise exception
            'Debes abrir la caja antes de registrar una venta.';
    end if;


    select status
    into v_cash_register_status
    from public.cash_register_sessions
    where id = p_cash_register_session_id
    for update;


    if not found then
        raise exception
            'La sesiÃ³n de caja indicada no existe.';
    end if;


    if v_cash_register_status <> 'OPEN' then
        raise exception
            'La caja ya no se encuentra abierta. Actualiza el POS.';
    end if;


    -- ================================================================
    -- 2. ITEMS
    -- ================================================================

    if p_items is null
       or jsonb_typeof(p_items) <> 'array'
       or jsonb_array_length(p_items) = 0
    then
        raise exception
            'La venta debe tener al menos un Ã­tem.';
    end if;


    -- ================================================================
    -- 3. CANAL
    -- ================================================================

    v_channel :=
        lower(
            trim(
                coalesce(
                    nullif(p_channel, ''),
                    'local'
                )
            )
        );


    if v_channel not in (
        'local',
        'shopify',
        'uber_eats',
        'rappi'
    ) then
        raise exception
            'Canal de venta invÃ¡lido: %',
            v_channel;
    end if;


    v_external_order_id :=
        nullif(
            trim(coalesce(p_external_order_id, '')),
            ''
        );


    if v_channel <> 'local'
       and v_external_order_id is null
    then
        raise exception
            'Los pedidos digitales requieren un nÃºmero externo.';
    end if;

    if v_channel = 'local' then
        v_payment_method :=
            lower(
                trim(
                    coalesce(
                        p_payment_method,
                        ''
                    )
                )
            );

        if v_payment_method not in (
            'efectivo',
            'tarjeta',
            'transferencia'
        ) then
            raise exception
                'Medio de pago inválido para venta local: %',
                coalesce(p_payment_method, '');
        end if;
    else
        v_payment_method := 'pago_electronico';
    end if;


    if v_external_order_id is not null
       and exists (
            select 1
            from public.sales
            where channel = v_channel
              and external_order_id = v_external_order_id
       )
    then
        raise exception
            'El pedido externo % ya fue registrado para el canal %.',
            v_external_order_id,
            v_channel;
    end if;


    -- ================================================================
    -- 4. SELLOS PROMOCIONALES
    -- ================================================================

    v_promotional_stamps :=
        coalesce(p_promotional_stamps, 0);


    v_promotion_reason :=
        nullif(
            trim(coalesce(p_promotion_reason, '')),
            ''
        );


    if v_promotional_stamps < 0
       or v_promotional_stamps > 5
    then
        raise exception
            'Los sellos promocionales deben estar entre 0 y 5.';
    end if;


    if v_promotional_stamps > 0
       and p_customer_id is null
    then
        raise exception
            'Los sellos promocionales requieren un cliente.';
    end if;


    if v_promotional_stamps > 0
       and v_promotion_reason is null
    then
        raise exception
            'El motivo de los sellos promocionales es obligatorio.';
    end if;


    if v_promotional_stamps = 0 then
        v_promotion_reason := null;
    end if;


    -- ================================================================
    -- 5. DESCUENTO MANUAL
    -- ================================================================

    v_manual_discount_type :=
        nullif(
            lower(trim(coalesce(p_manual_discount_type, ''))),
            ''
        );


    v_manual_discount_value :=
        p_manual_discount_value;


    v_manual_discount_reason :=
        nullif(
            lower(trim(coalesce(p_manual_discount_reason, ''))),
            ''
        );


    v_manual_discount_notes :=
        nullif(
            trim(coalesce(p_manual_discount_notes, '')),
            ''
        );


    if v_manual_discount_type is null then

        v_manual_discount_value := null;
        v_manual_discount_reason := null;
        v_manual_discount_notes := null;

    else

        if v_manual_discount_type not in ('percent', 'fixed') then
            raise exception
                'Tipo de descuento manual invÃ¡lido.';
        end if;


        if v_manual_discount_value is null
           or v_manual_discount_value <= 0
        then
            raise exception
                'El valor del descuento manual debe ser mayor que cero.';
        end if;


        if v_manual_discount_type = 'percent'
           and v_manual_discount_value > 100
        then
            raise exception
                'El descuento porcentual no puede superar 100%%.';
        end if;


        if v_manual_discount_reason not in (
            'courtesy',
            'complaint',
            'agreement',
            'exceptional_promotion',
            'service_error',
            'other'
        ) then
            raise exception
                'Motivo de descuento manual invÃ¡lido.';
        end if;


        if v_manual_discount_reason = 'other'
           and v_manual_discount_notes is null
        then
            raise exception
                'Debes especificar el motivo del descuento manual.';
        end if;

    end if;


    -- ================================================================
    -- 6. FECHA COMERCIAL
    -- ================================================================

    v_business_date :=
        (now() at time zone 'America/Santiago')::date;


    -- ================================================================
    -- 7. CREAR VENTA CABECERA
    -- ================================================================

    insert into public.sales (
        customer_id,
        channel,
        external_order_id,
        integration_source,
        received_at,
        status,
        subtotal,
        discount_total,
        total,
        payment_status,
        payment_method,
        actor_role,
        cash_register_session_id,
        confirmed_at,
        promotional_stamps,
        promotion_reason,
        manual_discount_type,
        manual_discount_value,
        manual_discount_amount,
        manual_discount_reason,
        manual_discount_notes
    )
    values (
        p_customer_id,
        v_channel,
        v_external_order_id,

        case
            when v_channel = 'local'
                then 'pos'
            else 'manual'
        end,

        now(),
        'confirmed',
        0,
        0,
        0,
        'paid',

        v_payment_method,

        p_actor_role,
        p_cash_register_session_id,
        now(),
        v_promotional_stamps,
        v_promotion_reason,
        v_manual_discount_type,
        v_manual_discount_value,
        0,
        v_manual_discount_reason,
        v_manual_discount_notes
    )

    returning id
    into v_sale_id;


    -- ================================================================
    -- 8. PROCESAR LÃNEAS
    -- ================================================================

    for v_item in
        select *
        from jsonb_array_elements(p_items)
    loop

        v_item_type :=
            upper(
                trim(
                    coalesce(
                        nullif(v_item->>'item_type', ''),
                        'PRODUCT'
                    )
                )
            );


        if v_item_type not in ('PRODUCT', 'CUSTOM') then
            raise exception
                'Tipo de lÃ­nea invÃ¡lido: %',
                v_item_type;
        end if;


        v_qty :=
            greatest(
                1,
                coalesce(
                    (v_item->>'quantity')::integer,
                    1
                )
            );


        -- Reset por cada lÃ­nea.
        v_item_loyalty_eligible := false;


        -- ============================================================
        -- 8A. CUSTOM
        -- ============================================================

        if v_item_type = 'CUSTOM' then

            v_custom_name :=
                nullif(
                    trim(
                        coalesce(
                            v_item->>'custom_name',
                            ''
                        )
                    ),
                    ''
                );


            v_custom_unit_price :=
                coalesce(
                    (v_item->>'unit_price')::integer,
                    0
                );


            if v_custom_name is null then
                raise exception
                    'El Ã­tem personalizado requiere un nombre.';
            end if;


            if v_custom_unit_price <= 0 then
                raise exception
                    'El Ã­tem personalizado requiere un precio mayor que cero.';
            end if;


            if lower(
                coalesce(
                    v_item->>'is_gift',
                    'false'
                )
            ) in ('true', '1')
            then
                raise exception
                    'Los Ã­tems personalizados no pueden registrarse como regalo.';
            end if;


            if jsonb_typeof(v_item->'options') = 'array'
               and jsonb_array_length(v_item->'options') > 0
            then
                raise exception
                    'Los Ã­tems personalizados no pueden incluir opciones de catÃ¡logo.';
            end if;


            -- --------------------------------------------------------
            -- P0.04
            -- CUSTOM puede declarar explÃ­citamente elegibilidad.
            --
            -- Caller antiguo / atributo ausente:
            --      FALSE
            --
            -- Atributo presente:
            --      debe ser JSON boolean real.
            -- --------------------------------------------------------

            if v_item ? 'loyalty_eligible' then

                if jsonb_typeof(v_item->'loyalty_eligible') <> 'boolean' then
                    raise exception
                        'La elegibilidad de fidelizaciÃ³n del Ã­tem personalizado % debe ser booleana.',
                        v_custom_name;
                end if;


                v_item_loyalty_eligible :=
                    (v_item->>'loyalty_eligible')::boolean;

            else

                v_item_loyalty_eligible := false;

            end if;


            v_unit_price :=
                v_custom_unit_price;


            v_gross_line_total :=
                v_unit_price * v_qty;


            v_line_discount := 0;


            v_final_line_total :=
                v_gross_line_total;


            insert into public.sale_items (
                sale_id,
                item_type,
                product_id,
                product_sku,
                product_name,
                quantity,
                list_unit_price,
                unit_price,
                discount_total,
                total_price,
                is_gift,
                gift_reason,
                loyalty_eligible,
                notes
            )
            values (
                v_sale_id,
                'CUSTOM',
                null,
                null,
                v_custom_name,
                v_qty,
                v_unit_price,
                v_unit_price,
                0,
                v_final_line_total,
                false,
                null,
                v_item_loyalty_eligible,
                nullif(v_item->>'notes', '')
            )

            returning id
            into v_sale_item_id;


            v_subtotal :=
                v_subtotal
                + v_gross_line_total;


            v_custom_payable_subtotal :=
                v_custom_payable_subtotal
                + v_final_line_total;


            if v_item_loyalty_eligible then

                v_loyalty_eligible_line_subtotal :=
                    v_loyalty_eligible_line_subtotal
                    + v_final_line_total;

            end if;


            continue;

        end if;


        -- ============================================================
        -- 8B. PRODUCT
        -- ============================================================

        select *
        into v_product
        from public.products
        where id =
              (v_item->>'product_id')::bigint

          and is_active = true;


        if not found then
            raise exception
                'Producto no existe o estÃ¡ inactivo.';
        end if;


        -- ------------------------------------------------------------
        -- P0.04
        -- El cliente/frontend NO puede decidir la elegibilidad de un
        -- producto de catÃ¡logo.
        --
        -- Siempre se toma directamente del catÃ¡logo server-side.
        -- ------------------------------------------------------------

        v_item_loyalty_eligible :=
            coalesce(
                v_product.generates_stamps,
                false
            );


        v_extra_unit_price :=
            greatest(
                0,
                coalesce(
                    (v_item->>'extra_unit_price')::integer,
                    0
                )
            );


        v_coffee_option_id := null;
        v_coffee_option_code := null;
        v_coffee_option_count := 0;
        v_coffee_option_price := null;
        v_coffee_inventory_quantity := null;


        -- ============================================================
        -- CAFÃ‰
        -- ============================================================

        if upper(
            trim(
                coalesce(
                    v_product.sku,
                    ''
                )
            )
        ) = 'CAFE'
        then

            if jsonb_typeof(v_item->'options') <> 'array' then
                raise exception
                    'El producto CafÃ© requiere seleccionar exactamente un tipo de cafÃ©.';
            end if;


            select
                count(*)::integer,
                min(cov.id),
                min(cov.code)

            into
                v_coffee_option_count,
                v_coffee_option_id,
                v_coffee_option_code

            from jsonb_array_elements(
                v_item->'options'
            ) option_json

            join public.catalog_option_values cov
              on cov.id =
                 (option_json->>'option_value_id')::bigint

             and cov.is_active = true

            join public.catalog_option_groups cog
              on cog.id = cov.group_id

             and cog.code = 'coffee_type'

             and cog.is_active = true

            where lower(
                trim(
                    coalesce(
                        option_json->>'option_group_code',
                        ''
                    )
                )
            ) = 'coffee_type';


            if jsonb_array_length(v_item->'options') <> 1
               or v_coffee_option_count <> 1
               or v_coffee_option_id is null
            then
                raise exception
                    'El producto CafÃ© requiere seleccionar exactamente un tipo de cafÃ© vÃ¡lido.';
            end if;


            select
                pop.price,
                pop.inventory_quantity

            into
                v_coffee_option_price,
                v_coffee_inventory_quantity

            from public.product_option_prices pop

            where pop.product_id =
                  v_product.id

              and pop.option_value_id =
                  v_coffee_option_id

              and pop.channel =
                  'local'

              and pop.price_list =
                  'general'

              and pop.is_active =
                  true

              and pop.valid_from <=
                  now()

              and (
                    pop.valid_to is null
                    or pop.valid_to > now()
              )

            order by
                pop.valid_from desc

            limit 1;


            if v_coffee_option_price is null then
                raise exception
                    'El tipo de cafÃ© seleccionado no tiene un precio activo.';
            end if;


            if v_coffee_inventory_quantity is null
               or v_coffee_inventory_quantity <= 0
            then
                raise exception
                    'El tipo de cafÃ© seleccionado no tiene un consumo de inventario vÃ¡lido.';
            end if;


            -- Backend autoritativo.
            v_extra_unit_price :=
                v_coffee_option_price;

        end if;


        -- ============================================================
        -- REGALO
        -- ============================================================

        v_is_gift :=
            lower(
                coalesce(
                    nullif(
                        v_item->>'is_gift',
                        ''
                    ),
                    'false'
                )
            ) in ('true', '1');


        v_gift_reason :=
            nullif(
                trim(
                    coalesce(
                        v_item->>'gift_reason',
                        ''
                    )
                ),
                ''
            );


        if v_is_gift
           and v_gift_reason is null
        then
            raise exception
                'El producto % estÃ¡ marcado como regalo y requiere motivo.',
                v_product.name;
        end if;


        if not v_is_gift then
            v_gift_reason := null;
        end if;


        -- ============================================================
        -- PRECIO PRODUCTO
        -- ============================================================

        select
            pp.price

        into
            v_price

        from public.product_prices pp

        where pp.product_id =
              v_product.id

          and pp.channel =
              'local'

          and pp.price_list =
              'general'

          and pp.is_active =
              true

          and pp.valid_from <=
              now()

          and (
                pp.valid_to is null
                or pp.valid_to > now()
          )

        order by
            pp.valid_from desc

        limit 1;


        if v_price is null then
            raise exception
                'Producto sin precio activo: %',
                v_product.name;
        end if;


        v_unit_price :=
            v_price
            + v_extra_unit_price;


        v_gross_line_total :=
            v_unit_price
            * v_qty;


        v_line_discount :=
            case
                when v_is_gift
                    then v_gross_line_total
                else 0
            end;


        v_final_line_total :=
            v_gross_line_total
            - v_line_discount;


        -- ============================================================
        -- SNAPSHOT sale_items
        -- ============================================================

        insert into public.sale_items (
            sale_id,
            item_type,
            product_id,
            product_sku,
            product_name,
            quantity,
            list_unit_price,
            unit_price,
            discount_total,
            total_price,
            is_gift,
            gift_reason,
            loyalty_eligible,
            notes
        )
        values (
            v_sale_id,
            'PRODUCT',
            v_product.id,
            v_product.sku,
            v_product.name,
            v_qty,
            v_unit_price,
            v_unit_price,
            v_line_discount,
            v_final_line_total,
            v_is_gift,
            v_gift_reason,
            v_item_loyalty_eligible,
            nullif(v_item->>'notes', '')
        )

        returning id
        into v_sale_item_id;


        v_subtotal :=
            v_subtotal
            + v_gross_line_total;


        v_gift_discount_total :=
            v_gift_discount_total
            + v_line_discount;


        -- El snapshot controla la contribuciÃ³n monetaria.
        -- Si es regalo, v_final_line_total = 0.
        if v_item_loyalty_eligible then

            v_loyalty_eligible_line_subtotal :=
                v_loyalty_eligible_line_subtotal
                + v_final_line_total;

        end if;


        -- ============================================================
        -- POT DISCOUNT
        -- ============================================================

        if not v_is_gift
           and v_product.sku in (
                'POT-16-LISTO',
                'POT-16-ARMADO'
           )
        then

            v_pot_quantity :=
                v_pot_quantity
                + v_qty;


            v_pot_subtotal :=
                v_pot_subtotal
                + v_gross_line_total;


            -- SÃ³lo esta fracciÃ³n puede reducir el monto loyalty.
            if v_item_loyalty_eligible then

                v_loyalty_pot_subtotal :=
                    v_loyalty_pot_subtotal
                    + v_gross_line_total;

            end if;

        end if;


        -- ============================================================
        -- OPCIONES
        -- ============================================================

        if upper(
            trim(
                coalesce(
                    v_product.sku,
                    ''
                )
            )
        ) = 'CAFE'
        then

            insert into public.sale_item_options (
                sale_item_id,
                option_group_code,
                option_value_id,
                option_value_name,
                quantity
            )

            select
                v_sale_item_id,
                'coffee_type',
                cov.id,
                cov.name,
                v_coffee_inventory_quantity

            from public.catalog_option_values cov

            where cov.id =
                  v_coffee_option_id

              and cov.is_active =
                  true;


            if not found then
                raise exception
                    'No fue posible registrar el tipo de cafÃ© seleccionado.';
            end if;


        elsif jsonb_typeof(v_item->'options') = 'array' then

            for v_option in

                select *
                from jsonb_array_elements(
                    v_item->'options'
                )

            loop

                insert into public.sale_item_options (
                    sale_item_id,
                    option_group_code,
                    option_value_id,
                    option_value_name,
                    quantity
                )

                select
                    v_sale_item_id,
                    v_option->>'option_group_code',
                    cov.id,
                    cov.name,

                    coalesce(
                        (v_option->>'quantity')::numeric,
                        1
                    )

                from public.catalog_option_values cov

                where cov.id =
                      (v_option->>'option_value_id')::bigint

                  and cov.is_active =
                      true;


                if not found then
                    raise exception
                        'OpciÃ³n invÃ¡lida.';
                end if;

            end loop;

        end if;

    end loop;


    -- ================================================================
    -- 9. DESCUENTO POT
    -- ================================================================

    v_pot_discount_rate :=
        case
            when v_pot_quantity >= 6
                then 0.15

            when v_pot_quantity >= 4
                then 0.10

            else 0
        end;


    v_pot_discount_total :=
        round(
            v_pot_subtotal
            * v_pot_discount_rate
        )::integer;


    -- Parte loyalty del descuento de potes.
    v_loyalty_pot_discount_total :=
        round(
            v_loyalty_pot_subtotal
            * v_pot_discount_rate
        )::integer;


    -- ================================================================
    -- 10. TOTAL ANTES DE DESCUENTO MANUAL
    -- ================================================================

    v_total_before_manual_discount :=
        greatest(
            0,

            v_subtotal
            - v_gift_discount_total
            - v_pot_discount_total
        );


    -- ================================================================
    -- 11. DESCUENTO MANUAL
    -- ================================================================

    if v_manual_discount_type = 'percent' then

        v_manual_discount_amount :=
            round(
                v_total_before_manual_discount
                * v_manual_discount_value
                / 100.0
            )::integer;


    elsif v_manual_discount_type = 'fixed' then

        if v_manual_discount_value >
           v_total_before_manual_discount
        then
            raise exception
                'El descuento manual no puede superar el total vigente.';
        end if;


        v_manual_discount_amount :=
            v_manual_discount_value;


    else

        v_manual_discount_amount := 0;

    end if;


    v_manual_discount_amount :=
        least(
            v_manual_discount_amount,
            v_total_before_manual_discount
        );


    -- ================================================================
    -- 12. TOTAL COMERCIAL
    -- ================================================================

    v_discount_total :=
        v_gift_discount_total
        + v_pot_discount_total
        + v_manual_discount_amount;


    v_total :=
        greatest(
            0,

            v_total_before_manual_discount
            - v_manual_discount_amount
        );


    -- ================================================================
    -- 13. MONTO ELEGIBLE LOYALTY
    --
    -- Fuente:
    --   snapshots sale_items.loyalty_eligible
    --
    -- Nunca se vuelve a consultar products para construir este monto.
    -- ================================================================

    v_loyalty_eligible_before_manual :=
        greatest(
            0,

            v_loyalty_eligible_line_subtotal
            - v_loyalty_pot_discount_total
        );


    -- ================================================================
    -- 14. DESCUENTO MANUAL SOBRE MONTO ELEGIBLE
    -- ================================================================

    v_loyalty_manual_discount :=
        case

            when v_manual_discount_type = 'percent'
            then
                least(
                    v_loyalty_eligible_before_manual,

                    round(
                        v_loyalty_eligible_before_manual
                        * v_manual_discount_value
                        / 100.0
                    )::integer
                )


            when v_manual_discount_type = 'fixed'
            then
                least(
                    v_manual_discount_amount,
                    v_loyalty_eligible_before_manual
                )


            else 0

        end;


    v_loyalty_eligible_total :=
        greatest(
            0,

            v_loyalty_eligible_before_manual
            - v_loyalty_manual_discount
        );


    -- ================================================================
    -- 15. GUARDRAILS PATRIMONIALES
    -- ================================================================

    if v_loyalty_eligible_total < 0 then
        raise exception
            'El monto elegible de fidelizaciÃ³n no puede ser negativo.';
    end if;


    if v_loyalty_eligible_total > v_total then
        raise exception
            'El monto elegible de fidelizaciÃ³n no puede superar el total de la venta.';
    end if;


    -- Todas las lÃ­neas deben haber quedado snapshotteadas.
    if exists (
        select 1
        from public.sale_items
        where sale_id = v_sale_id
          and loyalty_eligible is null
    ) then
        raise exception
            'Una o mÃ¡s lÃ­neas quedaron sin snapshot de elegibilidad.';
    end if;


    -- ================================================================
    -- 16. ACTUALIZAR CABECERA
    -- ================================================================

    update public.sales

    set
        subtotal =
            v_subtotal,

        discount_total =
            v_discount_total,

        total =
            v_total,

        loyalty_eligible_total =
            v_loyalty_eligible_total,

        manual_discount_type =
            v_manual_discount_type,

        manual_discount_value =
            v_manual_discount_value,

        manual_discount_amount =
            v_manual_discount_amount,

        manual_discount_reason =
            v_manual_discount_reason,

        manual_discount_notes =
            v_manual_discount_notes

    where id = v_sale_id;


    -- ================================================================
    -- 17. ORDEN
    -- ================================================================

    v_daily_number :=
        public.next_daily_order_number(
            v_business_date
        );


    v_display_code :=
        to_char(
            v_business_date,
            'DD-MM'
        )
        || ' #'
        || lpad(
            v_daily_number::text,
            3,
            '0'
        );


    insert into public.orders (
        sale_id,
        business_date,
        daily_order_number,
        display_order_code,
        status,
        notes
    )
    values (
        v_sale_id,
        v_business_date,
        v_daily_number,
        v_display_code,
        'pending',
        nullif(
            p_order_notes,
            ''
        )
    )

    returning id
    into v_order_id;


    -- ================================================================
    -- 18. EVENTO ORDEN
    -- ================================================================

    insert into public.order_events (
        order_id,
        event_type,
        previous_status,
        new_status,
        actor_role,
        notes
    )
    values (
        v_order_id,
        'order_created',
        null,
        'pending',
        p_actor_role,

        case
            when v_channel = 'local'
            then
                'Pedido local creado al confirmar la venta.'

            else
                'Pedido externo ingresado manualmente. Canal: '
                || v_channel
                || '. Referencia: '
                || coalesce(
                    v_external_order_id,
                    'sin referencia'
                )
        end
    );


    -- ================================================================
    -- 19. INVENTARIO
    -- ================================================================

    v_inventory_result :=
        public.process_sale_inventory(
            v_sale_id
        );


    -- ================================================================
    -- 20. RESPUESTA
    -- ================================================================

    return jsonb_build_object(

        'sale_id',
        v_sale_id,

        'order_id',
        v_order_id,

        'display_order_code',
        v_display_code,

        'channel',
        v_channel,

        'external_order_id',
        v_external_order_id,

        'cash_register_session_id',
        p_cash_register_session_id,


        'subtotal',
        v_subtotal,

        'discount_total',
        v_discount_total,

        'total',
        v_total,


        'custom_payable_subtotal',
        v_custom_payable_subtotal,

        'loyalty_eligible_line_subtotal',
        v_loyalty_eligible_line_subtotal,

        'loyalty_pot_subtotal',
        v_loyalty_pot_subtotal,

        'loyalty_pot_discount_total',
        v_loyalty_pot_discount_total,

        'loyalty_eligible_before_manual',
        v_loyalty_eligible_before_manual,

        'loyalty_manual_discount',
        v_loyalty_manual_discount,

        'loyalty_eligible_total',
        v_loyalty_eligible_total,


        'pot_quantity',
        v_pot_quantity,

        'pot_subtotal',
        v_pot_subtotal,

        'pot_discount_rate',
        v_pot_discount_rate,

        'pot_discount_total',
        v_pot_discount_total,


        'gift_discount_total',
        v_gift_discount_total,


        'total_before_manual_discount',
        v_total_before_manual_discount,

        'manual_discount_type',
        v_manual_discount_type,

        'manual_discount_value',
        v_manual_discount_value,

        'manual_discount_amount',
        v_manual_discount_amount,

        'manual_discount_reason',
        v_manual_discount_reason,

        'manual_discount_notes',
        v_manual_discount_notes,


        'promotional_stamps',
        v_promotional_stamps,

        'promotion_reason',
        v_promotion_reason,


        'inventory',
        v_inventory_result
    );

end;

$function$;
