SELECT
  *
FROM
  (
    -- ES IMPORTANTEN MANTENER ACTUALIZADO EL LISTADO PARA LOS COMERCIALES POR REGION Y POR OFICINA Y CANAL
    WITH dicc_usuarios AS (
      SELECT
        usuario AS id_usuario,
        CASE
          WHEN usuario IN (80328, 56283, 95000, 69562, 115716, 112581, 113392, 696) THEN 'Cordoba'
          WHEN usuario IN (36755, 91953, 110006, 105876, 100587, 570) THEN 'Entre Rios'
          WHEN usuario IN (82766, 11581) THEN 'Santa Fe'
          WHEN usuario IN (82763, 87064, 71247) THEN 'Buenos Aires'
          WHEN usuario IN (115336, 113764, 80813) THEN 'Bs As Central'
          WHEN usuario IN (115379, 362) THEN 'Bs As Ayacucho'
          WHEN usuario IN (49567) THEN 'La Pampa'
          WHEN usuario IN (109444) THEN 'Formosa'
          ELSE 'Sin Asignar'
        END AS provincia_asignada,
        CASE
          WHEN usuario IN (80328, 56283, 95000, 69562, 115716, 112581, 113392, 696) THEN 'Oficina Rio 4to'
          WHEN usuario IN (36755, 91953, 110006, 105876, 570, 100587) THEN 'Oficina Entre Rios'
          WHEN usuario IN (82763, 87064, 71247) THEN 'Oficina Bavio'
          ELSE ''
        END AS oficina_asignada,
        CASE
          WHEN usuario IN (
            56283,
            69562,
            80328,
            95000,
            113392,
            112581,
            82763,
            87064,
            110006,
            91953,
            36755,
            105876,
            112941,
            113764,
            101887,
            110007,
            109444,
            49567,
            82766,
            20128,
            112939,
            115336,
            115716
          ) THEN 'Regional'
          WHEN usuario IN (696, 100587, 71247, 241) THEN 'Directo'
          WHEN usuario IN (
            107943,
            266,
            9155,
            298,
            432,
            13125,
            20324,
            111340,
            306,
            78552,
            15223,
            111622,
            256,
            33181,
            14679,
            33664,
            18186,
            26342,
            24989,
            62011,
            36459,
            64625,
            6054,
            362,
            80813
          ) THEN 'Representante'
          ELSE 'Comisionista'
        END AS canal_asignado
      FROM
        dcac.usuarios
    ),
    aso_comercial AS (
      SELECT
        st.id AS ID,
        st.razon_social AS razon_social,
        concat(u.nombre, ' ', u.apellido) AS asoc_com
      FROM
        dcac.sociedades_tags AS st
        LEFT JOIN dcac.usuarios AS u ON st.asociado_comercial = u.usuario
    ),
    repre_vinc AS (
      SELECT
        ST.id AS id,
        ST.razon_social AS razon_social,
        arrayStringConcat(
          groupUniqArray(concat(R.nombre, ' ', R.apellido)),
          ', '
        ) AS representante
      FROM
        dcac.rel_usuarios_sociedades AS RUS
        INNER JOIN dcac.clientes_x_representantes AS CXR ON CXR.cliente = RUS.usuario
        INNER JOIN dcac.representantes AS R ON R.usuario = CXR.representante
        INNER JOIN dcac.sociedades_tags AS ST ON ST.id = RUS.sociedad
      WHERE
        RUS.usuario != 0
        AND RUS.estado = 0
        AND ST.estado = 0
      GROUP BY
        ST.id,
        ST.razon_social
    ),
    Vendedoras AS (
      SELECT
        n.id AS ID,
        st.razon_social AS RS_Vendedora,
        if(
          concat(u.nombre, ' ', u.apellido) = ''
          OR u.nombre IS NULL,
          aso_comercial.asoc_com,
          concat(u.nombre, ' ', u.apellido)
        ) AS asoc_com_vend,
        repre_vinc.representante AS repre_vendedor
      FROM
        dcac.negocios AS n
        LEFT JOIN dcac.sociedades_tags AS st ON n.sociedad_vendedora = st.id
        LEFT JOIN dcac.usuarios AS u ON n.asociado_comercial = u.usuario
        LEFT JOIN aso_comercial ON n.sociedad_vendedora = aso_comercial.ID
        LEFT JOIN repre_vinc ON repre_vinc.id = n.sociedad_vendedora
      WHERE
        n.sociedad_vendedora IS NOT NULL
        AND toDateOrNull(toString(n.fecha)) > '2023-12-01'
      UNION
      DISTINCT
      SELECT
        r.revisacion AS ID,
        st.razon_social AS RS_Vendedora,
        aso_comercial.asoc_com AS asoc_com_vend,
        repre_vinc.representante AS repre_vendedor
      FROM
        dcac.revisaciones AS r
        LEFT JOIN dcac.sociedades_tags AS st ON r.sociedad_vendedora = st.id
        LEFT JOIN dcac.usuarios AS u ON r.asociado_comercial = u.usuario
        LEFT JOIN aso_comercial ON r.sociedad_vendedora = aso_comercial.ID
        LEFT JOIN repre_vinc ON repre_vinc.id = r.sociedad_vendedora
      WHERE
        r.sociedad_vendedora IS NOT NULL
    ),
    Compradoras AS (
      SELECT
        nl.negocio AS ID,
        st.razon_social AS RS_Compradora,
        aso_comercial.asoc_com AS asoc_com_compra,
        repre_vinc.representante AS repre_comprador
      FROM
        negocios.liquidaciones AS nl
        LEFT JOIN dcac.sociedades_tags AS st ON nl.sociedad_compradora = st.id
        LEFT JOIN aso_comercial ON aso_comercial.ID = nl.sociedad_compradora
        LEFT JOIN repre_vinc ON repre_vinc.id = nl.sociedad_compradora
      WHERE
        nl.sociedad_compradora IS NOT NULL
        AND toDateOrNull(toString(nl.fecha_carga)) > '2023-12-01'
      GROUP BY
        nl.negocio,
        st.razon_social,
        aso_comercial.asoc_com,
        repre_vinc.representante
      UNION
      DISTINCT
      SELECT
        lxi.revisacion AS ID,
        st.razon_social AS RS_Compradora,
        aso_comercial.asoc_com AS asoc_com_compra,
        repre_vinc.representante AS repre_comprador
      FROM
        dcac.lotes_x_interesados AS lxi
        LEFT JOIN dcac.sociedades_tags AS st ON lxi.sociedad_compradora = st.id
        LEFT JOIN aso_comercial ON aso_comercial.ID = lxi.sociedad_compradora
        LEFT JOIN repre_vinc ON repre_vinc.id = lxi.sociedad_compradora
      WHERE
        lxi.sociedad_compradora IS NOT NULL
      GROUP BY
        lxi.revisacion,
        st.razon_social,
        aso_comercial.asoc_com,
        repre_vinc.representante
    ),
    ESTADOS_Invernada AS (
      SELECT
        ID_Revisacion,
        substring(max(Estado_Con_Peso), 4) AS ESTADOS_Invernada
      FROM
        (
          SELECT
            RS.revisacion AS ID_Revisacion,
            CASE
              WHEN toString(RS.estado) = '4'
              AND toString(RS.estado_b) = '6'
              AND toString(RS.no_concretado) = '0'
              AND AR.resultado_real_total != 0
              AND (
                (
                  (
                    toInt32OrZero(toString(DTC.plazo_c1)) != 0
                    AND toInt32OrZero(toString(DTC.plazo_c2)) != 0
                    AND toInt32OrZero(toString(DTC.plazo_c3)) != 0
                    AND toInt32OrZero(toString(DTC.plazo_c4)) != 0
                  )
                  OR (
                    toInt32OrZero(toString(DTC.plazo_c1)) = 0
                    AND toInt32OrZero(toString(DTC.plazo_c2)) != 0
                    AND toInt32OrZero(toString(DTC.plazo_c3)) != 0
                    AND toInt32OrZero(toString(DTC.plazo_c4)) != 0
                    AND toInt32OrZero(toString(DTC.plazo_c1_p)) > 0
                  )
                  AND toString(AR.fecha_pago_real_1) NOT IN ('', '0000-00-00')
                  AND toString(AR.fecha_pago_real_2) NOT IN ('', '0000-00-00')
                  AND toString(AR.fecha_pago_real_3) NOT IN ('', '0000-00-00')
                  AND toString(AR.fecha_pago_real_4) NOT IN ('', '0000-00-00')
                )
                OR (
                  (
                    toInt32OrZero(toString(DTC.plazo_c1)) != 0
                    AND toInt32OrZero(toString(DTC.plazo_c2)) != 0
                    AND toInt32OrZero(toString(DTC.plazo_c3)) != 0
                  )
                  OR (
                    toInt32OrZero(toString(DTC.plazo_c1)) = 0
                    AND toInt32OrZero(toString(DTC.plazo_c2)) != 0
                    AND toInt32OrZero(toString(DTC.plazo_c3)) != 0
                    AND toInt32OrZero(toString(DTC.plazo_c1_p)) > 0
                  )
                  AND toString(AR.fecha_pago_real_1) NOT IN ('', '0000-00-00')
                  AND toString(AR.fecha_pago_real_2) NOT IN ('', '0000-00-00')
                  AND toString(AR.fecha_pago_real_3) NOT IN ('', '0000-00-00')
                )
                OR (
                  (
                    toInt32OrZero(toString(DTC.plazo_c1)) != 0
                    AND toInt32OrZero(toString(DTC.plazo_c2)) != 0
                  )
                  OR (
                    toInt32OrZero(toString(DTC.plazo_c1)) = 0
                    AND toInt32OrZero(toString(DTC.plazo_c2)) != 0
                    AND toInt32OrZero(toString(DTC.plazo_c1_p)) > 0
                  )
                  AND toString(AR.fecha_pago_real_1) NOT IN ('', '0000-00-00')
                  AND toString(AR.fecha_pago_real_2) NOT IN ('', '0000-00-00')
                )
                OR (
                  (
                    toInt32OrZero(toString(DTC.plazo_c1)) = 0
                    AND toInt32OrZero(toString(DTC.plazo_c1_p)) > 0
                  )
                  AND toString(AR.fecha_pago_real_1) NOT IN ('', '0000-00-00')
                )
                OR (
                  (toInt32OrZero(toString(DTC.plazo_c1)) != 0)
                  AND toString(AR.fecha_pago_real_1) NOT IN ('', '0000-00-00')
                )
              ) THEN '14_Negocios Terminados'
              WHEN toString(RS.estado) = '4'
              AND toString(RS.estado_b) = '6'
              AND toString(RS.no_concretado) = '0'
              AND toString(DTC.fecha_carga_final) NOT IN ('', '0000-00-00')
              AND (
                (
                  toString(AR.fecha_pago_real_1) IN ('', '0000-00-00')
                  AND today() > addDays(
                    toDateOrNull(toString(DTC.fecha_carga_final)),
                    toInt32OrZero(toString(DTC.plazo_c1))
                  )
                )
                OR (
                  toString(AR.fecha_pago_real_1) NOT IN ('', '0000-00-00')
                  AND toInt32OrZero(toString(DTC.plazo_c2)) > 0
                  AND toString(AR.fecha_pago_real_2) IN ('', '0000-00-00')
                  AND today() > addDays(
                    toDateOrNull(toString(DTC.fecha_carga_final)),
                    toInt32OrZero(toString(DTC.plazo_c2))
                  )
                )
                OR (
                  toString(AR.fecha_pago_real_2) NOT IN ('', '0000-00-00')
                  AND toInt32OrZero(toString(DTC.plazo_c3)) > 0
                  AND toString(AR.fecha_pago_real_3) IN ('', '0000-00-00')
                  AND today() > addDays(
                    toDateOrNull(toString(DTC.fecha_carga_final)),
                    toInt32OrZero(toString(DTC.plazo_c3))
                  )
                )
                OR (
                  toString(AR.fecha_pago_real_3) NOT IN ('', '0000-00-00')
                  AND toInt32OrZero(toString(DTC.plazo_c4)) > 0
                  AND toString(AR.fecha_pago_real_4) IN ('', '0000-00-00')
                  AND today() > addDays(
                    toDateOrNull(toString(DTC.fecha_carga_final)),
                    toInt32OrZero(toString(DTC.plazo_c4))
                  )
                )
              ) THEN '13_Pagos Vencidos'
              WHEN toString(RS.estado) = '4'
              AND toString(RS.estado_b) = '6'
              AND toString(RS.no_concretado) = '0'
              AND (
                (
                  toString(AR.fecha_pago_real_1) IN ('', '0000-00-00')
                  AND today() <= addDays(
                    toDateOrNull(toString(DTC.fecha_carga_final)),
                    toInt32OrZero(toString(DTC.plazo_c1))
                  )
                )
                OR (
                  toString(AR.fecha_pago_real_1) NOT IN ('', '0000-00-00')
                  AND toInt32OrZero(toString(DTC.plazo_c2)) > 0
                  AND toString(AR.fecha_pago_real_2) IN ('', '0000-00-00')
                  AND today() <= addDays(
                    toDateOrNull(toString(DTC.fecha_carga_final)),
                    toInt32OrZero(toString(DTC.plazo_c2))
                  )
                )
                OR (
                  toString(AR.fecha_pago_real_2) NOT IN ('', '0000-00-00')
                  AND toInt32OrZero(toString(DTC.plazo_c3)) > 0
                  AND toString(AR.fecha_pago_real_3) IN ('', '0000-00-00')
                  AND today() <= addDays(
                    toDateOrNull(toString(DTC.fecha_carga_final)),
                    toInt32OrZero(toString(DTC.plazo_c3))
                  )
                )
                OR (
                  toString(AR.fecha_pago_real_3) NOT IN ('', '0000-00-00')
                  AND toInt32OrZero(toString(DTC.plazo_c4)) > 0
                  AND toString(AR.fecha_pago_real_4) IN ('', '0000-00-00')
                  AND today() <= addDays(
                    toDateOrNull(toString(DTC.fecha_carga_final)),
                    toInt32OrZero(toString(DTC.plazo_c4))
                  )
                )
              ) THEN '12_Cerrada'
              WHEN toString(RS.estado) = '4'
              AND toString(RS.estado_b) = '6'
              AND toString(RS.no_concretado) = '0' THEN '12_Cerrada'
              WHEN toString(RS.estado) = '4'
              AND toString(RS.estado_b) = '5'
              AND toString(RS.no_concretado) = '0' THEN '11_Liquidadas'
              WHEN toString(RS.estado) = '4'
              AND toString(RS.estado_b) = '4'
              AND toString(RS.no_concretado) = '0' THEN '10_A Liquidar'
              WHEN toString(RS.estado) = '4'
              AND toString(RS.estado_b) = '3' THEN '09_Cargadas'
              WHEN toString(RS.estado) = '4'
              AND toString(RS.estado_b) = '2' THEN '08_A Cargar'
              WHEN toString(RS.estado) = '4'
              AND toString(RS.estado_b) = '0' THEN '07_Vendido'
              WHEN toString(RS.estado) = '7' THEN '06_No Concretadas'
              WHEN toString(RS.estado) = '5' THEN '05_Dadas de Baja'
              WHEN toString(RS.estado) IN ('3', '11', '12')
              AND toString(RS.estado_b) = '0' THEN '04_Publicado'
              WHEN toString(RS.estado) = '6'
              AND toString(RS.estado_b) = '0' THEN '04_Publicado'
              WHEN toString(RS.estado) = '6' THEN '03_Publicado Oculto' -- FIX: Biblia confirma estado=0 = Ofrecimiento (no estado=1)
              WHEN toString(RS.estado) = '0' THEN '02_Ofrecimientos'
              ELSE '01_Revisar Logica'
            END AS Estado_Con_Peso
          FROM
            dcac.revisaciones AS RS
            LEFT JOIN dcac.detalles_carga AS DTC ON RS.revisacion = DTC.revisacion
            LEFT JOIN dcac.analisis_resultados AS AR ON RS.revisacion = AR.revisacion
        )
      GROUP BY
        ID_Revisacion
    ),
    ESTADOS AS (
      SELECT
        n.id AS ID_Negocio,
        CASE
          WHEN toString(n.borrado) != '1'
          AND toString(n.no_concretado) != '1'
          AND toString(n.tipo) = '3'
          AND toString(n.directo) = '1' THEN 'TROPAS VENDIDAS'
          WHEN toString(n.borrado) != '1'
          AND toString(n.no_concretado) != '1'
          AND toString(n.tipo) = '9'
          AND toString(n.directo) = '1' THEN 'TROPAS A CARGAR'
          WHEN toString(n.borrado) != '1'
          AND toString(n.no_concretado) != '1'
          AND toString(n.tipo) = '7'
          AND toString(n.directo) = '1'
          AND toFloat64OrZero(toString(l.kg_carne)) = 0 THEN 'TROPAS CARGADAS'
          WHEN toString(n.borrado) != '1'
          AND toString(n.no_concretado) != '1'
          AND toString(n.tipo) = '13'
          AND toString(n.directo) = '1' THEN 'FAENADAS'
          WHEN toString(n.borrado) != '1'
          AND toString(n.no_concretado) != '1'
          AND toString(n.tipo) = '4'
          AND toString(n.directo) = '1' THEN 'TROPAS A LIQUIDAR'
          WHEN toString(n.borrado) != '1'
          AND toString(n.no_concretado) != '1'
          AND toString(n.tipo) = '5'
          AND toString(n.directo) = '1' THEN 'LIQUIDADAS' -- FIX: Negocios Terminados PRIMERO — si el pago esta confirmado es Terminado
          -- aunque el plazo haya vencido (pagos tarde no son Pagos Vencidos)
          WHEN toString(n.borrado) != '1'
          AND toString(n.no_concretado) != '1'
          AND toString(n.tipo) = '8'
          AND toString(n.directo) = '1'
          AND toString(lo.lo_fecha_pago_real) NOT IN ('', '0000-00-00') THEN 'NEGOCIOS TERMINADOS'
          WHEN toString(n.borrado) != '1'
          AND toString(n.no_concretado) != '1'
          AND toString(n.tipo) = '8'
          AND toString(n.directo) = '1'
          AND (
            addDays(
              toDateOrNull(toString(lo.lo_fecha_faena_real)),
              toInt32OrZero(toString(l.plazo2)) + toInt32OrZero(toString(l.plazo_promedio))
            ) >= today()
          )
          AND (
            toString(lo.lo_fecha_faena_real) NOT IN ('', '0000-00-00')
          )
          AND (
            toString(lo.lo_fecha_pago_real) IN ('', '0000-00-00')
            OR lo.lo_fecha_pago_real IS NULL
          ) THEN 'CERRADOS'
          WHEN toString(n.borrado) != '1'
          AND toString(n.no_concretado) != '1'
          AND toString(n.tipo) = '8'
          AND toString(n.directo) = '1'
          AND (
            addDays(
              toDateOrNull(toString(lo.lo_fecha_faena_real)),
              toInt32OrZero(toString(l.plazo2)) + toInt32OrZero(toString(l.plazo_promedio))
            ) < today()
          )
          AND (
            toString(lo.lo_fecha_faena_real) NOT IN ('', '0000-00-00')
          )
          AND (
            toString(lo.lo_fecha_pago_real) IN ('', '0000-00-00')
            OR lo.lo_fecha_pago_real IS NULL
          )
          AND toInt32OrZero(toString(l.negocio)) > 7300 THEN 'PAGOS VENCIDOS'
          ELSE '0'
        END AS ESTADO
      FROM
        dcac.negocios AS n
        LEFT JOIN negocios.liquidacion_oficial AS lo ON n.id = lo.lo_negocio
        LEFT JOIN negocios.liquidaciones AS l ON lo.lo_negocio = l.negocio
      WHERE
        toString(n.borrado) != '1'
        AND toString(n.estado) = '1'
        AND toString(n.directo) = '1'
        AND toString(n.no_concretado) != '1'
        AND (
          toInt32OrZero(toString(n.tipo)) >= 3
          AND toInt32OrZero(toString(n.tipo)) <= 9
          OR toString(n.tipo) = '13'
        )
        AND lo.lo_tipo_liquid = 'interna'
      GROUP BY
        ID_Negocio,
        ESTADO
    ),
    RepreCompraInvernada AS (
      SELECT
        lxi.revisacion,
        arrayStringConcat(
          groupUniqArray(concat(u.nombre, ' ', u.apellido)),
          ', '
        ) AS RepresentanteCompra
      FROM
        dcac.lotes_x_interesados AS lxi
        LEFT JOIN dcac.usuarios AS u ON u.usuario = lxi.representante_de_compra
      GROUP BY
        lxi.revisacion
    ),
    RepreVentaInv AS (
      SELECT
        r.revisacion AS id,
        arrayStringConcat(
          groupUniqArray(concat(u.nombre, ' ', u.apellido)),
          ', '
        ) AS RepresentanteVenta
      FROM
        dcac.revisaciones AS r
        LEFT JOIN dcac.usuarios AS u ON u.usuario = r.representante
      GROUP BY
        r.revisacion
    ),
    FechaFaenaReal AS (
      SELECT
        lo_negocio,
        max(
          toDateOrNull(
            if(
              toString(lo_fecha_faena_real) IN ('', '0000-00-00'),
              NULL,
              toString(lo_fecha_faena_real)
            )
          )
        ) AS lo_fecha_faena_real
      FROM
        negocios.liquidacion_oficial
      WHERE
        lo_tipo_liquid = 'interna'
      GROUP BY
        lo_negocio
    ),
    -- FIX: dedup liquidacion_oficial para evitar filas duplicadas con datos corruptos
    LiquidacionOficialUnica AS (
      SELECT
        *
      FROM
        (
          SELECT
            *,
            ROW_NUMBER() OVER (
              PARTITION BY lo_negocio
              ORDER BY
                if(
                  toString(lo_fecha_pago_real) NOT IN ('', '0000-00-00')
                  AND lo_fecha_pago_real IS NOT NULL,
                  1,
                  0
                ) DESC,
                lo_id DESC
            ) AS rn
          FROM
            negocios.liquidacion_oficial
          WHERE
            lo_tipo_liquid = 'interna'
        )
      WHERE
        rn = 1
    ),
    -- FIX: dedup analisis_resultados — algunas filas tienen datos corruptos (resultado_real en cientos de millones)
    AnalisisResultadosUnica AS (
      SELECT
        *
      FROM
        (
          SELECT
            *,
            ROW_NUMBER() OVER (
              PARTITION BY negocio
              ORDER BY
                if(
                  abs(
                    toFloat64OrZero(toString(rendimiento_financiero_real))
                  ) < 100,
                  1,
                  0
                ) DESC,
                analisis_resultados_id DESC
            ) AS rn
          FROM
            dcac.analisis_resultados
        )
      WHERE
        rn = 1
    ),
    AnalisisResultadosUnicaRev AS (
      SELECT
        *
      FROM
        (
          SELECT
            *,
            ROW_NUMBER() OVER (
              PARTITION BY revisacion
              ORDER BY
                if(
                  abs(
                    toFloat64OrZero(toString(rendimiento_financiero_real))
                  ) < 100,
                  1,
                  0
                ) DESC,
                analisis_resultados_id DESC
            ) AS rn
          FROM
            dcac.analisis_resultados
        )
      WHERE
        rn = 1
    ) -- ==========================================
    -- INICIA EL UNION DE FAENA E INVERNADA
    -- ==========================================
    SELECT
      DISTINCT toInt64OrZero(toString(n.id)) AS id_lote,
      n.updated_at AS op_updated_at,
      CASE
        WHEN toString(n.borrado) = '1' OR toString(n.no_concretado) = '1' THEN toDateOrNull(toString(nc.created_at))
        WHEN toString(n.tipo) IN ('0', '10', '11', '12') THEN toDateOrNull(nullIf(toString(n.fecha_publicacion), '0000-00-00'))
        WHEN toString(n.mag) = '1' THEN toDateOrNull(nullIf(toString(n.fecha_vendida), '0000-00-00'))
        ELSE coalesce(
          FechaFaenaReal.lo_fecha_faena_real,
          toDateOrNull(nullIf(toString(nl.fecha_faena), '0000-00-00'))
        )
      END AS fecha_operacion,
      coalesce(
        toDateOrNull(
          if(
            toString(n.fecha_publicacion) IN ('', '0000-00-00'),
            NULL,
            toString(n.fecha_publicacion)
          )
        ),
        toDateOrNull(toString(n.fecha))
      ) AS fecha_publicaciones,
      concat(
        toString(
          toYear(
            coalesce(
              FechaFaenaReal.lo_fecha_faena_real,
              toDateOrNull(nullIf(toString(nl.fecha_faena), '0000-00-00'))
            )
          )
        ),
        leftPad(
          toString(
            toMonth(
              coalesce(
                FechaFaenaReal.lo_fecha_faena_real,
                toDateOrNull(nullIf(toString(nl.fecha_faena), '0000-00-00'))
              )
            )
          ),
          2,
          '0'
        )
      ) AS Fecha_op,
      concat(
        toString(
          toYear(
            coalesce(
              toDateOrNull(
                if(
                  toString(n.fecha_publicacion) IN ('', '0000-00-00'),
                  NULL,
                  toString(n.fecha_publicacion)
                )
              ),
              toDateOrNull(toString(n.fecha))
            )
          )
        ),
        leftPad(
          toString(
            toMonth(
              coalesce(
                toDateOrNull(
                  if(
                    toString(n.fecha_publicacion) IN ('', '0000-00-00'),
                    NULL,
                    toString(n.fecha_publicacion)
                  )
                ),
                toDateOrNull(toString(n.fecha))
              )
            )
          ),
          2,
          '0'
        )
      ) AS Fecha_pub,
      'Faena' AS Tipo,
      CASE
        WHEN (
          toString(n.estado) = '1'
          AND toString(n.borrado) != '1'
          AND toString(n.directo) = '0'
          AND toString(n.no_concretado) != '1'
          AND (
            toInt32OrZero(toString(n.tipo)) >= 0
            AND toInt32OrZero(toString(n.tipo)) <= 9
          )
          AND toString(n.mag) = '1'
        ) THEN 'MAG'
        ELSE 'Faena'
      END AS UN,
      -- === CAMPOS NUEVOS ===
      CASE
        WHEN toInt32OrZero(toString(n.categoria)) = 1 THEN 'TM'
        WHEN toInt32OrZero(toString(n.categoria)) = 2 THEN 'TH'
        WHEN toInt32OrZero(toString(n.categoria)) = 3 THEN 'TM - TH'
        WHEN toInt32OrZero(toString(n.categoria)) = 4 THEN 'NT - VQ'
        WHEN toInt32OrZero(toString(n.categoria)) = 5 THEN 'VCI'
        WHEN toInt32OrZero(toString(n.categoria)) = 7 THEN 'VCP'
        WHEN toInt32OrZero(toString(n.categoria)) = 8 THEN 'NT'
        WHEN toInt32OrZero(toString(n.categoria)) = 9 THEN 'VQ'
        WHEN toInt32OrZero(toString(n.categoria)) = 10 THEN 'NV'
        WHEN toInt32OrZero(toString(n.categoria)) = 12 THEN 'TR'
        WHEN toInt32OrZero(toString(n.categoria)) = 13 THEN 'VCC'
        WHEN toInt32OrZero(toString(n.categoria)) = 14 THEN 'VQP'
        WHEN toInt32OrZero(toString(n.categoria)) = 16 THEN 'VcG'
        WHEN toInt32OrZero(toString(n.categoria)) = 17 THEN 'VcM'
        WHEN toInt32OrZero(toString(n.categoria)) = 18 THEN 'VcC'
        WHEN toInt32OrZero(toString(n.categoria)) = 19 THEN 'TrG'
        WHEN toInt32OrZero(toString(n.categoria)) = 20 THEN 'TrM'
        WHEN toInt32OrZero(toString(n.categoria)) = 21 THEN 'TrC'
        WHEN toInt32OrZero(toString(n.categoria)) = 27 THEN 'MEJ'
        WHEN toInt32OrZero(toString(n.categoria)) = 28 THEN 'MyTM'
        WHEN toInt32OrZero(toString(n.categoria)) = 29 THEN 'MyTH'
        WHEN toInt32OrZero(toString(n.categoria)) = 31 THEN 'MEJ - VQ'
        WHEN toInt32OrZero(toString(n.categoria)) = 32 THEN 'V y VQ'
        WHEN toInt32OrZero(toString(n.categoria)) = 34 THEN 'NV y VQ'
        WHEN toInt32OrZero(toString(n.categoria)) = 35 THEN 'V y NV'
        WHEN toInt32OrZero(toString(n.categoria)) = 37 THEN 'TR y V'
        WHEN toInt32OrZero(toString(n.categoria)) = 40 THEN 'VQpM'
        WHEN toInt32OrZero(toString(n.categoria)) = 42 THEN 'VCut'
        WHEN toInt32OrZero(toString(n.categoria)) = 43 THEN 'VCutC'
        ELSE coalesce(cat.nombre, 'Falta_Agregar')
      END AS categoria,
      concat(part.descripcion, ', ', prov.abreviatura) AS origen,
      CASE
        WHEN toString(n.destino) = '1' THEN 'CS'
        WHEN toString(n.destino) = '2' THEN 'H'
        WHEN toString(n.destino) = '3' THEN 'UE'
        WHEN toString(n.destino) = '4' THEN '481'
        ELSE 'N/E'
      END AS destino,
      toInt32OrZero(toString(nl.plazo_promedio)) AS plazo,
      toFloat64OrZero(toString(n.peso)) AS kg,
      -- =====================
      Vendedoras.RS_Vendedora AS RS_Vendedora,
      Compradoras.RS_Compradora AS RS_Compradora,
      -- BLINDAJE APLICADO ACÁ
      toInt32OrZero(
        toString(
          CASE
            WHEN toFloat64OrZero(toString(lo.lo_total_cabezas)) > 0 THEN toString(lo.lo_total_cabezas)
            WHEN toString(n.tipo_jaula) = '1' THEN '35'
            WHEN toString(n.tipo_jaula) = '2' THEN '50'
            WHEN toFloat64OrZero(toString(nl.cantidad_liquidada)) > 0 THEN toString(nl.cantidad_liquidada)
            ELSE '0'
          END
        )
      ) AS Cabezas,
      -- importe_vendedor con fallback a proyectado (lógica Q94)
      coalesce(
        nullIf(
          toFloat64OrZero(toString(ar.importe_comprador)),
          0
        ),
        toFloat64OrZero(toString(arp.importe_comprador))
      ) AS importe_vendedor,
      toFloat64OrZero(toString(ar.importe_vendedor)) AS importe_comprador,
      toFloat64OrZero(toString(ar.bonificacion_total)) AS bonificacion_vendedor,
      toFloat64OrZero('0') AS bonificacion_comprador,
      toFloat64OrZero(toString(ar.resultado_final)) AS resultado_total_proyectado,
      -- resultado_final basado en lógica Q94
      -- FIX: si resultado_real_total es >10x resultado_final, es dato corrupto → usar resultado_final
      toFloat64OrZero(
        toString(
          CASE
            WHEN toInt32OrZero(toString(n.tipo)) = 8
            AND toString(lo.lo_fecha_pago_real) NOT IN ('', '0000-00-00')
            AND toFloat64OrZero(toString(ar.resultado_real_total)) > 0
            AND (
              toFloat64OrZero(toString(ar.resultado_final)) = 0
              OR toFloat64OrZero(toString(ar.resultado_real_total)) <= toFloat64OrZero(toString(ar.resultado_final)) * 10
            ) THEN toString(ar.resultado_real_total)
            WHEN toInt32OrZero(toString(n.tipo)) IN (4, 5, 8) THEN toString(ar.resultado_final)
            ELSE toString(arp.resultado_proyectado)
          END
        )
      ) AS resultado_final,
      -- rendimiento: eco + financiero (lógica Q94)
      (
        CASE
          WHEN toInt32OrZero(toString(n.tipo)) IN (3, 9) THEN toFloat64OrZero(toString(arp.rendimiento_economico))
          ELSE toFloat64OrZero(toString(ar.rendimiento_economico))
        END + CASE
          WHEN toString(lo.lo_fecha_pago_real) NOT IN ('', '0000-00-00') THEN toFloat64OrZero(toString(ar.rendimiento_financiero_real))
          WHEN toInt32OrZero(toString(n.tipo)) IN (3, 9) THEN toFloat64OrZero(toString(arp.rendimiento_financiero))
          ELSE toFloat64OrZero(toString(ar.rendimiento_financiero))
        END
      ) AS rendimiento,
      toInt32OrZero(toString(nl.plazo_promedio)) AS AEP,
      toFloat64OrZero(toString(ar.atraso_pago)) AS atraso_pago,
      concat(rv.nombre, ' ', rv.apellido) AS repre_vendedor,
      CASE
        WHEN concat(acc.nombre, ' ', acc.apellido) = 'Ignacio Diehl'
        OR Compradoras.repre_comprador IN ('Oficina Rio 4to', 'Oficina Entre Rios') THEN if(
          Compradoras.repre_comprador != '',
          Compradoras.repre_comprador,
          'Ignacio Diehl'
        )
        ELSE ''
      END AS repre_comprador,
      concat(acv.nombre, ' ', acv.apellido) AS AC_Vend,
      concat(acv.nombre, ' ', acv.apellido) AS asociado_comercial_id_vend,
      Vendedoras.asoc_com_vend AS asociado_comercial_soc_vend,
      concat(acc.nombre, ' ', acc.apellido) AS AC_Comp,
      concat(acc.nombre, ' ', acc.apellido) AS asociado_comercial_id_comp,
      Compradoras.asoc_com_compra AS asociado_comercial_soc_comp,
      CASE
        WHEN du_comp_ac.oficina_asignada != ''
        AND du_comp_ac.oficina_asignada IS NOT NULL THEN du_comp_ac.oficina_asignada
        WHEN Compradoras.repre_comprador = 'Oficina Rio 4to'
        AND coalesce(Compradoras.asoc_com_compra, '') NOT IN (
          'David Menghi',
          'Valentin Torriglia',
          'Alexis Deambrocio',
          'Santiago Julian',
          'Santiago Zonni',
          'Facu Alonso',
          'Sebastian Rivarola'
        ) THEN 'Oficina Rio 4to'
        WHEN Compradoras.repre_comprador IN (
          'Carlos Ricciardi Mierez',
          'Hugo Ganis',
          'Juan José Loza',
          'Manuel Pons',
          'Alejo Broggi',
          'Carlos Lostalo',
          'Fabio Muaraccioli'
        )
        OR Compradoras.asoc_com_compra IN (
          'Carlos Ricciardi Mierez',
          'Hugo Ganis',
          'Juan José Loza',
          'Manuel Pons',
          'Alejo Broggi',
          'Carlos Lostalo',
          'Fabio Muaraccioli'
        ) THEN 'Oficina Entre Rios'
        WHEN Compradoras.repre_comprador IN ('Sebastian Saparrat', 'Emiliano Sanchez')
        OR Compradoras.asoc_com_compra IN ('Sebastian Saparrat', 'Emiliano Sanchez') THEN 'Oficina Bavio'
      END AS Oficina_Compra,
      CASE
        WHEN toString(n.borrado) = '1' THEN 'BAJA'
        WHEN toString(n.no_concretado) = '1' THEN 'NO CONCRETADAS'
        WHEN toString(n.tipo) = '0'
        AND toString(n.estado) = '0' THEN 'OFRECIMIENTOS'
        WHEN toString(n.tipo) IN ('0', '10', '11', '12')
        AND toString(n.estado) = '1' THEN 'PUBLICADO'
        WHEN toString(n.tipo) IN ('3', '4', '5', '7', '8', '9', '13') THEN 'CONCRETADA'
        ELSE 'REVISAR'
      END AS ESTADO,
      -- ACÁ EL ESTADO UNIFICADO (basado en lógica Q94):
      CASE
        -- =============================================
        -- BAJAS Y NO CONCRETADAS (Jerarquía principal)
        -- =============================================
        WHEN toString(n.borrado) = '1' THEN 'Dadas de Baja'
        WHEN toString(n.no_concretado) = '1' THEN 'No Concretadas' -- =============================================
        -- CONCRETADAS — pipeline de faena
        -- =============================================
        -- REGLA PARA MAG
        WHEN toString(n.directo) = '0'
        AND toString(n.mag) = '1'
        AND toString(lo.lo_fecha_pago_real) NOT IN ('', '0000-00-00') THEN 'Negocios Terminados'
        WHEN toString(n.directo) = '0'
        AND toString(n.mag) = '1' THEN 'Cerradas'
        WHEN toInt32OrZero(toString(n.tipo)) = 3 THEN 'Tropas Vendidas'
        WHEN toInt32OrZero(toString(n.tipo)) = 9 THEN 'Tropas a Cargar'
        WHEN toInt32OrZero(toString(n.tipo)) = 7
        AND toFloat64OrZero(toString(nl.kg_carne)) = 0 THEN 'Tropas Cargadas'
        WHEN toInt32OrZero(toString(n.tipo)) = 7
        AND toFloat64OrZero(toString(nl.kg_carne)) > 0 THEN 'Faenadas'
        WHEN toInt32OrZero(toString(n.tipo)) = 13 THEN 'Faenadas'
        WHEN toInt32OrZero(toString(n.tipo)) = 4 THEN 'Tropas a Liquidar'
        WHEN toInt32OrZero(toString(n.tipo)) = 5 THEN 'Liquidadas'
        WHEN toInt32OrZero(toString(n.tipo)) = 8
        AND (
          FechaFaenaReal.lo_fecha_faena_real IS NULL
          OR FechaFaenaReal.lo_fecha_faena_real > today()
        ) THEN 'A Faenar' -- FIX: Negocios Terminados PRIMERO — pago confirmado = Terminado
        -- aunque el plazo haya vencido (pagos tarde no son Pagos Vencidos)
        WHEN toInt32OrZero(toString(n.tipo)) = 8
        AND toString(lo.lo_fecha_pago_real) NOT IN ('', '0000-00-00') THEN 'Negocios Terminados'
        WHEN toInt32OrZero(toString(n.tipo)) = 8
        AND FechaFaenaReal.lo_fecha_faena_real IS NOT NULL
        AND FechaFaenaReal.lo_fecha_faena_real <= today()
        AND (
          toString(lo.lo_fecha_pago_real) IN ('', '0000-00-00')
          OR lo.lo_fecha_pago_real IS NULL
        )
        AND addDays(
          FechaFaenaReal.lo_fecha_faena_real,
          toInt32OrZero(toString(nl.plazo2)) + toInt32OrZero(toString(nl.plazo_promedio))
        ) >= today() THEN 'Cerradas'
        WHEN toInt32OrZero(toString(n.tipo)) = 8
        AND FechaFaenaReal.lo_fecha_faena_real IS NOT NULL
        AND FechaFaenaReal.lo_fecha_faena_real <= today()
        AND (
          toString(lo.lo_fecha_pago_real) IN ('', '0000-00-00')
          OR lo.lo_fecha_pago_real IS NULL
        )
        AND addDays(
          FechaFaenaReal.lo_fecha_faena_real,
          toInt32OrZero(toString(nl.plazo2)) + toInt32OrZero(toString(nl.plazo_promedio))
        ) < today()
        AND toInt32OrZero(toString(n.id)) > 7300 THEN 'Pagos Vencidos'
        WHEN toInt32OrZero(toString(n.tipo)) = 8
        AND FechaFaenaReal.lo_fecha_faena_real IS NOT NULL
        AND FechaFaenaReal.lo_fecha_faena_real <= today()
        AND (
          toString(lo.lo_fecha_pago_real) IN ('', '0000-00-00')
          OR lo.lo_fecha_pago_real IS NULL
        )
        AND addDays(
          FechaFaenaReal.lo_fecha_faena_real,
          toInt32OrZero(toString(nl.plazo2)) + toInt32OrZero(toString(nl.plazo_promedio))
        ) < today()
        AND toInt32OrZero(toString(n.id)) <= 7300 THEN 'Cerradas' -- =============================================
        -- OFRECIMIENTOS / PUBLICADAS
        -- =============================================
        WHEN toString(n.tipo) = '0'
        AND toString(n.estado) = '0' THEN 'Ofrecimientos'
        WHEN toString(n.tipo) = '0'
        AND toString(n.estado) = '6' THEN 'Publicado Oculto'
        WHEN toString(n.tipo) IN ('0', '10', '11', '12')
        AND toString(n.estado) IN ('1', '3') THEN 'Publicadas'
        ELSE 'Revisar Logica'
      END AS Estado_Trop,
      CASE
        WHEN toInt32OrZero(toString(nc.motivo)) = 1 THEN 'Vendio por otro lado'
        WHEN toInt32OrZero(toString(nc.motivo)) = 2 THEN 'No la comercializo'
        WHEN toInt32OrZero(toString(nc.motivo)) = 3 THEN 'La cerro y se borro'
        WHEN toInt32OrZero(toString(nc.motivo)) = 4 THEN 'No contesto'
        WHEN toInt32OrZero(toString(nc.motivo)) = 5 THEN 'La dio de baja solo'
        ELSE '-'
      END AS Motivo_NC,
      CASE
        WHEN cd_cotizaciones.lote_nro IS NOT NULL
        AND toString(cd_cotizaciones.faena) = '1' THEN toInt32OrZero('1')
        ELSE toInt32OrZero('0')
      END AS cotizada,
      CASE
        WHEN du_vend_ac.provincia_asignada != 'Sin Asignar'
        AND du_vend_ac.provincia_asignada IS NOT NULL THEN du_vend_ac.provincia_asignada
        WHEN coalesce(
          Vendedoras.asoc_com_vend,
          Vendedoras.repre_vendedor
        ) IN (
          'David Menghi',
          'Valentin Torriglia',
          'Alexis Deambrocio',
          'Santiago Julian',
          'Santiago Zonni',
          'Facu Alonso',
          'Sebastian Rivarola'
        )
        OR Vendedoras.repre_vendedor IN ('Oficina Rio 4to') THEN 'Cordoba'
        WHEN coalesce(
          Vendedoras.asoc_com_vend,
          Vendedoras.repre_vendedor
        ) IN (
          'Manuel Pons',
          'Juan José Loza',
          'Carlos Ricciardi Mierez',
          'Hugo Ganis',
          'Alejo Borggi'
        )
        OR Vendedoras.repre_vendedor IN (
          'Oficina Entre Rios',
          'Hugo Ganis',
          'Carlos Lostalo'
        ) THEN 'Entre Rios'
        WHEN coalesce(
          Vendedoras.asoc_com_vend,
          Vendedoras.repre_vendedor
        ) IN ('Jose Olmedo', 'Ramiro Aramburu') THEN 'Santa Fe'
        WHEN coalesce(
          Vendedoras.asoc_com_vend,
          Vendedoras.repre_vendedor
        ) IN ('Sebastian Saparrat', 'Emiliano Sanchez')
        OR Vendedoras.repre_vendedor IN ('Oficina Bavio') THEN 'Buenos Aires'
        WHEN coalesce(
          Vendedoras.asoc_com_vend,
          Vendedoras.repre_vendedor
        ) IN ('Ignacio Diehl', 'Sebastian Poullion')
        OR Vendedoras.repre_vendedor IN ('Oficina Bs As Central') THEN 'Bs As Central'
        WHEN coalesce(
          Vendedoras.asoc_com_vend,
          Vendedoras.repre_vendedor
        ) IN ('Facundo Sansot')
        OR Vendedoras.repre_vendedor IN ('Segundo Videla Dorna') THEN 'Bs As Ayacucho'
        WHEN coalesce(
          Vendedoras.asoc_com_vend,
          Vendedoras.repre_vendedor
        ) IN ('Alan Garcia', 'Facundo Martin') THEN 'La Pampa'
        WHEN coalesce(
          Vendedoras.asoc_com_vend,
          Vendedoras.repre_vendedor
        ) IN ('Marcelo Barboza') THEN 'Formosa'
      END AS Prov_AC_Vend,
      CASE
        WHEN du_comp_ac.provincia_asignada != 'Sin Asignar'
        AND du_comp_ac.provincia_asignada IS NOT NULL THEN du_comp_ac.provincia_asignada
        WHEN coalesce(
          Compradoras.asoc_com_compra,
          Compradoras.repre_comprador
        ) IN (
          'David Menghi',
          'Valentin Torriglia',
          'Alexis Deambrocio',
          'Santiago Julian',
          'Santiago Zonni',
          'Sebastian Rivarola'
        )
        OR Compradoras.repre_comprador IN ('Oficina Rio 4to') THEN 'Cordoba'
        WHEN coalesce(
          Compradoras.asoc_com_compra,
          Compradoras.repre_comprador
        ) IN (
          'Manuel Pons',
          'Juan José Loza',
          'Carlos Ricciardi Mierez',
          'Hugo Ganis',
          'Alejo Borggi'
        )
        OR Compradoras.repre_comprador IN (
          'Oficina Entre Rios',
          'Hugo Ganis',
          'Carlos Lostalo'
        ) THEN 'Entre Rios'
        WHEN coalesce(
          Compradoras.asoc_com_compra,
          Compradoras.repre_comprador
        ) IN ('Jose Olmedo', 'Ramiro Aramburu') THEN 'Santa Fe'
        WHEN coalesce(
          Compradoras.asoc_com_compra,
          Compradoras.repre_comprador
        ) IN ('Sebastian Saparrat', 'Emiliano Sanchez')
        OR Compradoras.repre_comprador IN ('Oficina Bavio') THEN 'Buenos Aires'
        WHEN coalesce(
          Compradoras.asoc_com_compra,
          Compradoras.repre_comprador
        ) IN ('Ignacio Diehl', 'Sebastian Poullion')
        OR Compradoras.repre_comprador IN ('Oficina Bs As Central') THEN 'Bs As Central'
        WHEN coalesce(
          Compradoras.asoc_com_compra,
          Compradoras.repre_comprador
        ) IN ('Facundo Sansot')
        OR Compradoras.repre_comprador IN ('Segundo Videla Dorna') THEN 'Bs As Ayacucho'
        WHEN coalesce(
          Compradoras.asoc_com_compra,
          Compradoras.repre_comprador
        ) IN ('Alan Garcia', 'Facundo Martin') THEN 'La Pampa'
        WHEN coalesce(
          Compradoras.asoc_com_compra,
          Compradoras.repre_comprador
        ) IN ('Marcelo Barboza') THEN 'Formosa'
      END AS Prov_AC_Comp,
      CASE
        WHEN du_vend_ac.canal_asignado = 'Regional' THEN 'Regional'
        WHEN coalesce(
          Vendedoras.asoc_com_vend,
          Vendedoras.repre_vendedor
        ) IN (
          'Facundo Sansot',
          'Sebastian Saparrat',
          'Emiliano Sanchez',
          'Sebastian Poullion',
          'Ignacio Diehl',
          'Lucila Frutos',
          'Manuel Pons',
          'Hugo Ganis',
          'Juan José Loza',
          'Nicolas Echezarreta',
          'Alejo Broggi',
          'Valentin Torriglia',
          'Santiago Julian',
          'David Menghi',
          'Alexis Deambrocio',
          'Sebastian Rivarola',
          'Facundo Alonso',
          'Alan Garcia',
          'Lucia Sposito',
          'Jose Olmedo',
          'Pablo Cieri',
          'Agustin Mascotena',
          'Marcelo Barboza',
          'Agustin Acuna',
          'Augusto Reynot',
          'Marcelo Rapp',
          'Santiago Bunge',
          'Joaquin Verdechia',
          'Simon De Aduriz'
        ) THEN 'Regional'
        WHEN coalesce(
          Vendedoras.asoc_com_vend,
          Vendedoras.repre_vendedor
        ) != ''
        OR (
          Vendedoras.repre_vendedor IS NOT NULL
          AND Vendedoras.repre_vendedor != ''
        ) THEN CASE
          WHEN Vendedoras.repre_vendedor IN (
            'Facundo Sansot',
            'Sebastian Saparrat',
            'Emiliano Sanchez',
            'Sebastian Poullion',
            'Ignacio Diehl',
            'Lucila Frutos',
            'Manuel Pons',
            'Hugo Ganis',
            'Juan José Loza',
            'Nicolas Echezarreta',
            'Alejo Broggi',
            'Valentin Torriglia',
            'Santiago Julian',
            'David Menghi',
            'Alexis Deambrocio',
            'Sebastian Rivarola',
            'Facundo Alonso',
            'Alan Garcia',
            'Lucia Sposito',
            'Jose Olmedo',
            'Pablo Cieri',
            'Agustin Mascotena',
            'Marcelo Barboza',
            'Agustin Acuna',
            'Augusto Reynot',
            'Marcelo Rapp',
            'Santiago Bunge',
            'Joaquin Verdechia',
            'Simon De Aduriz'
          ) THEN 'Regional'
          WHEN Vendedoras.repre_vendedor IN (
            'Hacienda Pedro Genta',
            'Alberto Bernaudo',
            'Pedro de Hagen',
            'Maxi Oliveri',
            'Oficina Rio 4to',
            'Oficina Entre Rios',
            'Oficina Bavio'
          ) THEN 'Directo'
          WHEN Vendedoras.repre_vendedor IN (
            'Alejandro Bridger',
            'Escritorio Enrique Gonzalez',
            'Segundo Videla Dorna',
            'Gonzalo Aduriz',
            'Ignacio Diehl',
            'Alejandro Ballve',
            'Alberto Brosa',
            'Mario Vera',
            'Alejandro Martin.',
            'Francisco Echeverz',
            'Marcelo Schang',
            'Rodolfo Aldasoro',
            'Nicolas Gurmindo',
            'Marcelo Schafer',
            'Mariano Rodriguez Alcobendas',
            'Esteban Enrique Avendaño',
            'Oscar Clos',
            'Santiago Sitja',
            'Marcelo Aguilar',
            'Franco Barrionuevo',
            'Luis Maria de Hagen',
            'Martin Petricevich',
            'Sebastian Rios',
            'Agustin Irastorza',
            'Mariano Laborde',
            'Ignacio Urruty',
            'Belisario Castillo Marin',
            'Oficina Rio 4to',
            'Oficina Bavio',
            'Oficina Bs As Central',
            'Oficina Entre Rios'
          ) THEN 'Representante'
          WHEN toFloat64OrZero(toString(ar.bonificacion_vendedor)) < 0.01
          AND toFloat64OrZero(toString(ar.bonificacion_vendedor)) > -0.01 THEN 'Directo'
          ELSE 'Comisionista'
        END
        ELSE 'Directo'
      END AS Canal_Venta,
      CASE
        WHEN du_comp_ac.canal_asignado = 'Regional' THEN 'Regional'
        WHEN coalesce(
          Compradoras.asoc_com_compra,
          Compradoras.repre_comprador
        ) IN (
          'Facundo Sansot',
          'Sebastian Saparrat',
          'Emiliano Sanchez',
          'Sebastian Poullion',
          'Ignacio Diehl',
          'Lucila Frutos',
          'Manuel Pons',
          'Hugo Ganis',
          'Juan José Loza',
          'Nicolas Echezarreta',
          'Alejo Broggi',
          'Valentin Torriglia',
          'Santiago Julian',
          'David Menghi',
          'Alexis Deambrocio',
          'Sebastian Rivarola',
          'Facundo Alonso',
          'Alan Garcia',
          'Lucia Sposito',
          'Jose Olmedo',
          'Pablo Cieri',
          'Agustin Mascotena',
          'Marcelo Barboza',
          'Agustin Acuna',
          'Augusto Reynot',
          'Marcelo Rapp',
          'Santiago Bunge',
          'Joaquin Verdechia',
          'Simon De Aduriz'
        ) THEN 'Regional'
        WHEN coalesce(
          Compradoras.asoc_com_compra,
          Compradoras.repre_comprador
        ) != ''
        OR (
          Compradoras.repre_comprador IS NOT NULL
          AND Compradoras.repre_comprador != ''
        ) THEN CASE
          WHEN Compradoras.repre_comprador IN (
            'Facundo Sansot',
            'Sebastian Saparrat',
            'Emiliano Sanchez',
            'Sebastian Poullion',
            'Ignacio Diehl',
            'Lucila Frutos',
            'Manuel Pons',
            'Hugo Ganis',
            'Juan José Loza',
            'Nicolas Echezarreta',
            'Alejo Broggi',
            'Valentin Torriglia',
            'Santiago Julian',
            'David Menghi',
            'Alexis Deambrocio',
            'Sebastian Rivarola',
            'Facundo Alonso',
            'Alan Garcia',
            'Lucia Sposito',
            'Jose Olmedo',
            'Pablo Cieri',
            'Agustin Mascotena',
            'Marcelo Barboza',
            'Agustin Acuna',
            'Augusto Reynot',
            'Marcelo Rapp',
            'Santiago Bunge',
            'Joaquin Verdechia',
            'Simon De Aduriz'
          ) THEN 'Regional'
          WHEN Compradoras.repre_comprador IN (
            'Hacienda Pedro Genta',
            'Alberto Bernaudo',
            'Pedro de Hagen',
            'Maxi Oliveri',
            'Oficina Rio 4to',
            'Oficina Entre Rios',
            'Oficina Bavio'
          ) THEN 'Directo'
          WHEN Compradoras.repre_comprador IN (
            'Alejandro Bridger',
            'Escritorio Enrique Gonzalez',
            'Segundo Videla Dorna',
            'Gonzalo Aduriz',
            'Ignacio Diehl',
            'Alejandro Ballve',
            'Alberto Brosa',
            'Mario Vera',
            'Alejandro Martin.',
            'Francisco Echeverz',
            'Marcelo Schang',
            'Rodolfo Aldasoro',
            'Nicolas Gurmindo',
            'Marcelo Schafer',
            'Mariano Rodriguez Alcobendas',
            'Esteban Enrique Avendaño',
            'Oscar Clos',
            'Santiago Sitja',
            'Marcelo Aguilar',
            'Franco Barrionuevo',
            'Luis Maria de Hagen',
            'Martin Petricevich',
            'Sebastian Rios',
            'Agustin Irastorza',
            'Mariano Laborde',
            'Ignacio Urruty',
            'Belisario Castillo Marin',
            'Oficina Rio 4to',
            'Oficina Bavio',
            'Oficina Bs As Central',
            'Oficina Entre Rios'
          ) THEN 'Representante'
          ELSE 'Comisionista'
        END
        ELSE 'Directo'
      END AS Canal_compra,
      CASE
        WHEN du_vend_ac.oficina_asignada != ''
        AND du_vend_ac.oficina_asignada IS NOT NULL THEN du_vend_ac.oficina_asignada
        WHEN Vendedoras.repre_vendedor = 'Oficina Rio 4to'
        AND coalesce(Vendedoras.asoc_com_vend, '') NOT IN (
          'David Menghi',
          'Valentin Torriglia',
          'Alexis Deambrocio',
          'Santiago Julian',
          'Santiago Zonni',
          'Facu Alonso',
          'Sebastian Rivarola'
        ) THEN 'Oficina Rio 4to'
        WHEN Vendedoras.repre_vendedor IN (
          'Carlos Ricciardi Mierez',
          'Hugo Ganis',
          'Juan José Loza',
          'Manuel Pons',
          'Alejo Broggi',
          'Carlos Lostalo',
          'Fabio Muaraccioli'
        )
        OR Vendedoras.asoc_com_vend IN (
          'Carlos Ricciardi Mierez',
          'Hugo Ganis',
          'Juan José Loza',
          'Manuel Pons',
          'Alejo Broggi',
          'Carlos Lostalo',
          'Fabio Muaraccioli'
        ) THEN 'Oficina Entre Rios'
        WHEN Vendedoras.repre_vendedor IN ('Sebastian Saparrat', 'Emiliano Sanchez')
        OR Vendedoras.asoc_com_vend IN ('Sebastian Saparrat', 'Emiliano Sanchez') THEN 'Oficina Bavio'
      END AS Oficina_Venta,
      concat(uc.nombre, ' ', uc.apellido) AS Usuario_comp_g,
      CASE
        WHEN toString(n.comprado_fecha) != ''
        AND toString(n.comprado_fecha) != '0000-00-00 00:00:00' THEN 'CI'
        ELSE ''
      END AS ACT_CI,
      concat(us_o.nombre, ' ', us_o.apellido) AS usuario_op,
      concat(us_c.nombre, ' ', us_c.apellido) AS usuario_acotz,
      toInt32OrZero(
        toString(
          toWeek(
            coalesce(
              toDateOrNull(
                if(
                  toString(n.fecha_publicacion) IN ('', '0000-00-00'),
                  NULL,
                  toString(n.fecha_publicacion)
                )
              ),
              toDateOrNull(toString(n.fecha))
            )
          )
        )
      ) AS numero_semana,
      toInt32OrZero(
        toString(
          toYear(toDateOrNull(toString(n.fecha_publicacion)))
        )
      ) AS YAER,
      CASE
        WHEN toString(n.fecha_publicacion) IN ('', '0000-00-00', '0000-00-00 00:00:00') THEN ''
        ELSE concat(
          'Q',
          toString(
            toQuarter(toDateOrNull(toString(n.fecha_publicacion)))
          )
        )
      END AS Trimestre,
      CASE
        WHEN toString(n.tipo) = '8'
        AND toString(n.no_concretado) != '1'
        AND toString(n.borrado) != '1' THEN toInt32OrZero('1')
        ELSE toInt32OrZero('0')
      END AS Cierre,
      toInt64OrZero(toString(n.asociado_comercial)) AS id_ac_vend,
      toInt64OrZero(toString(nl.asociado_comercial_comprador)) AS id_ac_comp,
      toInt64OrZero(toString(n.creado_rep)) AS id_rep_vend,
      toInt64OrZero('0') AS id_rep_comp,
      toInt64OrNull(toString(sv.cuit)) AS cuit_vendedor,
      toInt32OrZero(toString(n.partido)) AS part_id_vend,
      toInt64OrNull(toString(sc.cuit)) AS cuit_comprador,
      toDateOrNull(nullIf(toString(n.fecha), '0000-00-00')) AS fecha_concretada,
      concat(us_op.nombre, ' ', us_op.apellido) AS operador_nombre
    FROM
      dcac.negocios AS n
      LEFT JOIN ESTADOS ON n.id = ESTADOS.ID_Negocio
      LEFT JOIN dcac.representantes AS r ON n.creado_rep = r.usuario
      LEFT JOIN negocios.liquidaciones AS nl ON n.id = nl.negocio
      LEFT JOIN dcac.sociedades_tags AS sv ON n.sociedad_vendedora = sv.id
      LEFT JOIN dcac.sociedades_tags AS sc ON nl.sociedad_compradora = sc.id
      LEFT JOIN dcac.categorias AS cat ON n.categoria = cat.categoria
      LEFT JOIN dcac.provincias AS prov ON n.provincia = prov.provincia
      LEFT JOIN dcac.partidos AS part ON n.partido = part.partido
      LEFT JOIN AnalisisResultadosUnica AS ar ON n.id = ar.negocio
      LEFT JOIN dcac.analisis_resultados_proyectado AS arp ON n.id = arp.negocio
      LEFT JOIN dcac.usuarios AS acsv ON sv.asociado_comercial = acsv.usuario
      LEFT JOIN dcac.usuarios AS acv ON n.asociado_comercial = acv.usuario
      LEFT JOIN dcac.usuarios AS rv ON n.creado_rep = rv.usuario -- FIX: usar CTE dedup para evitar duplicados de liquidacion_oficial
      LEFT JOIN LiquidacionOficialUnica AS lo ON n.id = lo.lo_negocio
      LEFT JOIN dcac.usuarios AS acsc ON sc.asociado_comercial = acsc.usuario
      LEFT JOIN dcac.usuarios AS acc ON nl.asociado_comercial_comprador = acc.usuario
      LEFT JOIN FechaFaenaReal ON FechaFaenaReal.lo_negocio = n.id
      LEFT JOIN negocios.cd_cotizaciones AS cd_cotizaciones ON n.id = cd_cotizaciones.lote_nro
      LEFT JOIN dcac.usuarios AS uc ON uc.usuario = n.comprado_por
      LEFT JOIN dcac.informes_baja AS nc ON n.id = nc.negocio
      LEFT JOIN negocios.compra_inmediata_faena AS ci ON n.id = ci.negocio
      AND toString(ci.comprada) = '1'
      LEFT JOIN dcac.usuarios AS us_o ON n.generado_por = us_o.usuario
      AND toString(us_o.perfil) = '3'
      LEFT JOIN dcac.usuarios AS us_op ON n.operador = us_op.usuario
      LEFT JOIN negocios.cd_logs_estado AS cdl ON cd_cotizaciones.id = cdl.cd_cotizacion_id
      AND toString(cdl.estado) = '1'
      LEFT JOIN dcac.usuarios AS us_c ON cdl.usuario = us_c.usuario
      LEFT JOIN Vendedoras ON Vendedoras.ID = n.id
      LEFT JOIN Compradoras ON Compradoras.ID = n.id
      LEFT JOIN dicc_usuarios AS du_vend_ac ON n.asociado_comercial = du_vend_ac.id_usuario
      LEFT JOIN dicc_usuarios AS du_comp_ac ON nl.asociado_comercial_comprador = du_comp_ac.id_usuario
    WHERE
      toDateOrNull(toString(n.fecha)) >= '2023-12-01'
    UNION ALL
    SELECT
      DISTINCT toInt64OrZero(toString(r.revisacion)) AS id_lote,
      r.updated_at AS op_updated_at,
      CASE
        WHEN toString(r.estado) = '5' OR toString(r.estado) = '7' THEN toDateOrNull(toString(nc.created_at))
        WHEN toString(r.estado) IN ('0', '3', '6', '11', '12') THEN toDateOrNull(nullIf(toString(r.fecha_publicacion), '0000-00-00'))
        ELSE coalesce(
          toDateOrNull(nullIf(toString(dc.fecha_carga_final), '0000-00-00')),
          toDateOrNull(nullIf(toString(dc.fecha_carga), '0000-00-00')),
          addDays(toDateOrNull(nullIf(toString(r.fecha_vendida), '0000-00-00')), 7)
        )
      END AS fecha_operacion,
      coalesce(
        toDateOrNull(
          if(
            toString(r.fecha_publicacion) IN ('', '0000-00-00'),
            NULL,
            toString(r.fecha_publicacion)
          )
        ),
        toDateOrNull(toString(r.fecha_hora))
      ) AS fecha_publicaciones,
      concat(
        toString(
          toYear(
            coalesce(
              toDateOrNull(
                nullIf(toString(dc.fecha_carga_final), '0000-00-00')
              ),
              toDateOrNull(nullIf(toString(dc.fecha_carga), '0000-00-00')),
              addDays(
                toDateOrNull(nullIf(toString(r.fecha_vendida), '0000-00-00')),
                7
              )
            )
          )
        ),
        leftPad(
          toString(
            toMonth(
              coalesce(
                toDateOrNull(
                  nullIf(toString(dc.fecha_carga_final), '0000-00-00')
                ),
                toDateOrNull(nullIf(toString(dc.fecha_carga), '0000-00-00')),
                addDays(
                  toDateOrNull(nullIf(toString(r.fecha_vendida), '0000-00-00')),
                  7
                )
              )
            )
          ),
          2,
          '0'
        )
      ) AS Fecha_op,
      concat(
        toString(
          toYear(
            coalesce(
              toDateOrNull(
                if(
                  toString(r.fecha_publicacion) IN ('', '0000-00-00'),
                  NULL,
                  toString(r.fecha_publicacion)
                )
              ),
              toDateOrNull(toString(r.fecha_hora))
            )
          )
        ),
        leftPad(
          toString(
            toMonth(
              coalesce(
                toDateOrNull(
                  if(
                    toString(r.fecha_publicacion) IN ('', '0000-00-00'),
                    NULL,
                    toString(r.fecha_publicacion)
                  )
                ),
                toDateOrNull(toString(r.fecha_hora))
              )
            )
          ),
          2,
          '0'
        )
      ) AS Fecha_pub,
      'Invernada' AS Tipo,
      CASE
        WHEN ir.tipo_precio = 'KILO'
        OR c.categoria IN (1, 2, 3, 4, 8, 9, 10, 27, 28, 29, 30, 31, 33, 34, 39) THEN CASE
          WHEN toString(ir.zona) IN ('2') THEN 'Invernada Neo'
          ELSE 'Invernada'
        END
        ELSE 'Cria'
      END AS UN,
      -- === CAMPOS NUEVOS ===
      CASE
        WHEN toInt32OrZero(toString(r.categoria)) = 1 THEN 'TM'
        WHEN toInt32OrZero(toString(r.categoria)) = 2 THEN 'TH'
        WHEN toInt32OrZero(toString(r.categoria)) = 3 THEN 'TM - TH'
        WHEN toInt32OrZero(toString(r.categoria)) = 4 THEN 'NT - VQ'
        WHEN toInt32OrZero(toString(r.categoria)) = 5 THEN 'VCI'
        WHEN toInt32OrZero(toString(r.categoria)) = 7 THEN 'VCP'
        WHEN toInt32OrZero(toString(r.categoria)) = 8 THEN 'NT'
        WHEN toInt32OrZero(toString(r.categoria)) = 9 THEN 'VQ'
        WHEN toInt32OrZero(toString(r.categoria)) = 10 THEN 'NV'
        WHEN toInt32OrZero(toString(r.categoria)) = 12 THEN 'TR'
        WHEN toInt32OrZero(toString(r.categoria)) = 13 THEN 'VCC'
        WHEN toInt32OrZero(toString(r.categoria)) = 14 THEN 'VQP'
        WHEN toInt32OrZero(toString(r.categoria)) = 16 THEN 'VcG'
        WHEN toInt32OrZero(toString(r.categoria)) = 17 THEN 'VcM'
        WHEN toInt32OrZero(toString(r.categoria)) = 18 THEN 'VcC'
        WHEN toInt32OrZero(toString(r.categoria)) = 19 THEN 'TrG'
        WHEN toInt32OrZero(toString(r.categoria)) = 20 THEN 'TrM'
        WHEN toInt32OrZero(toString(r.categoria)) = 21 THEN 'TrC'
        WHEN toInt32OrZero(toString(r.categoria)) = 27 THEN 'MEJ'
        WHEN toInt32OrZero(toString(r.categoria)) = 28 THEN 'MyTM'
        WHEN toInt32OrZero(toString(r.categoria)) = 29 THEN 'MyTH'
        WHEN toInt32OrZero(toString(r.categoria)) = 31 THEN 'MEJ - VQ'
        WHEN toInt32OrZero(toString(r.categoria)) = 32 THEN 'V y VQ'
        WHEN toInt32OrZero(toString(r.categoria)) = 34 THEN 'NV y VQ'
        WHEN toInt32OrZero(toString(r.categoria)) = 35 THEN 'V y NV'
        WHEN toInt32OrZero(toString(r.categoria)) = 37 THEN 'TR y V'
        WHEN toInt32OrZero(toString(r.categoria)) = 40 THEN 'VQpM'
        WHEN toInt32OrZero(toString(r.categoria)) = 42 THEN 'VCut'
        WHEN toInt32OrZero(toString(r.categoria)) = 43 THEN 'VCutC'
        ELSE coalesce(c.nombre, 'Falta_Agregar')
      END AS categoria,
      concat(part.descripcion, ', ', prov.abreviatura) AS origen,
      '' AS destino,
      toInt32OrZero(toString(dc.aep_comprador)) AS plazo,
      toFloat64OrZero(toString(r.peso)) AS kg,
      -- =====================
      Vendedoras.RS_Vendedora AS RS_Vendedora,
      Compradoras.RS_Compradora AS RS_Compradora,
      -- BLINDAJE APLICADO ACÁ
      toInt32OrZero(
        toString(
          CASE
            WHEN toString(dc.cantidad_animales) = ''
            OR dc.cantidad_animales IS NULL THEN toString(r.cantidad)
            ELSE dc.cantidad_animales
          END
        )
      ) AS Cabezas,
      -- importe_vendedor con fallback a proyectado (lógica Q98)
      coalesce(
        nullIf(toFloat64OrZero(toString(ar.importe_vendedor)), 0),
        toFloat64OrZero(toString(arp.importe_vendedor))
      ) AS importe_vendedor,
      toFloat64OrZero(toString(ar.importe_comprador)) AS importe_comprador,
      toFloat64OrZero(toString(ar.bonificacion_vendedor)) AS bonificacion_vendedor,
      toFloat64OrZero(toString(ar.bonificacion_comprador)) AS bonificacion_comprador,
      toFloat64OrZero(toString(ar.resultado_final)) AS resultado_total_proyectado,
      -- resultado_final basado en lógica Q98
      toFloat64OrZero(
        toString(
          CASE
            WHEN toInt32OrZero(toString(r.estado_b)) = 6
            AND toFloat64OrNull(
              nullIf(trim(toString(ar.resultado_real_total)), '')
            ) IS NOT NULL THEN toString(ar.resultado_real_total)
            WHEN toInt32OrZero(toString(r.estado_b)) IN (4, 5, 6) THEN toString(ar.resultado_final)
            ELSE toString(arp.resultado_final)
          END
        )
      ) AS resultado_final,
      -- rendimiento directo (lógica Q98)
      CASE
        WHEN toInt32OrZero(toString(r.estado_b)) = 6
        AND toFloat64OrNull(
          nullIf(trim(toString(ar.resultado_real_total)), '')
        ) IS NOT NULL
        AND toFloat64OrZero(toString(ar.rendimiento_real_total)) < 150 THEN toFloat64OrZero(toString(ar.rendimiento_real_total))
        WHEN toInt32OrZero(toString(r.estado_b)) = 6 THEN toFloat64OrZero(toString(ar.rendimiento_final))
        ELSE toFloat64OrZero(toString(arp.rendimiento_final))
      END AS rendimiento,
      toInt32OrZero(toString(dc.aep_comprador)) AS AEP,
      toFloat64OrZero(toString(ar.atraso_pago)) AS atraso_pago,
      rvi.RepresentanteVenta AS repre_vendedor,
      rci.RepresentanteCompra AS repre_comprador,
      concat(acv.nombre, ' ', acv.apellido) AS AC_Vend,
      concat(acv.nombre, ' ', acv.apellido) AS asociado_comercial_id_vend,
      Vendedoras.asoc_com_vend AS asociado_comercial_soc_vend,
      concat(acc.nombre, ' ', acc.apellido) AS AC_Comp,
      concat(acc.nombre, ' ', acc.apellido) AS asociado_comercial_id_comp,
      Compradoras.asoc_com_compra AS asociado_comercial_soc_comp,
      CASE
        WHEN du_comp_ac.oficina_asignada != ''
        AND du_comp_ac.oficina_asignada IS NOT NULL THEN du_comp_ac.oficina_asignada
        WHEN Compradoras.repre_comprador = 'Oficina Rio 4to'
        AND coalesce(Compradoras.asoc_com_compra, '') NOT IN (
          'David Menghi',
          'Valentin Torriglia',
          'Alexis Deambrocio',
          'Santiago Julian',
          'Santiago Zonni',
          'Facu Alonso',
          'Sebastian Rivarola'
        ) THEN 'Oficina Rio 4to'
        WHEN Compradoras.repre_comprador IN (
          'Carlos Ricciardi Mierez',
          'Hugo Ganis',
          'Juan José Loza',
          'Manuel Pons',
          'Alejo Broggi',
          'Carlos Lostalo',
          'Fabio Muaraccioli'
        )
        OR Compradoras.asoc_com_compra IN (
          'Carlos Ricciardi Mierez',
          'Hugo Ganis',
          'Juan José Loza',
          'Manuel Pons',
          'Alejo Broggi',
          'Carlos Lostalo',
          'Fabio Muaraccioli'
        ) THEN 'Oficina Entre Rios'
        WHEN Compradoras.repre_comprador IN ('Sebastian Saparrat', 'Emiliano Sanchez')
        OR Compradoras.asoc_com_compra IN ('Sebastian Saparrat', 'Emiliano Sanchez') THEN 'Oficina Bavio'
      END AS Oficina_Compra,
      CASE
        -- FIX: Biblia confirma estado=0 = Ofrecimiento INV (no estado=1)
        WHEN toString(r.estado) = '0' THEN 'OFRECIMIENTOS'
        WHEN toString(r.estado) IN ('3', '11', '12')
        AND toString(r.estado_b) = '0' THEN 'PUBLICADO'
        WHEN toString(r.estado) = '6'
        AND toString(r.estado_b) = '0' THEN 'PUBLICADO'
        WHEN toString(r.estado) = '4' THEN 'CONCRETADA'
        WHEN toString(r.estado) = '5' THEN 'BAJA'
        WHEN toString(r.estado) = '6' THEN 'OCULTO'
        WHEN toString(r.estado) = '7' THEN 'NO CONCRETADAS'
        ELSE 'REVISAR'
      END AS ESTADO,
      -- Estado Trop Invernada — nunca debe quedar en 'Otro'
      CASE
        WHEN toString(r.estado) = '5' THEN 'Dadas de Baja'
        WHEN toString(r.estado) = '7'
        OR toString(r.no_concretado) = '1' THEN 'No Concretadas'
        WHEN toInt32OrZero(toString(r.estado)) != 4 THEN CASE
          -- FIX: Biblia confirma estado=0 = Ofrecimiento INV
          WHEN toString(r.estado) = '0' THEN 'Ofrecimientos'
          WHEN toString(r.estado) IN ('3', '11', '12')
          AND toString(r.estado_b) = '0' THEN 'Publicadas'
          WHEN toString(r.estado) = '6'
          AND toString(r.estado_b) = '0' THEN 'Publicadas'
          WHEN toString(r.estado) = '6' THEN 'Publicado Oculto'
          ELSE 'Revisar Logica'
        END
        WHEN toInt32OrZero(toString(r.estado_b)) = 0 THEN 'Tropas Vendidas'
        WHEN toInt32OrZero(toString(r.estado_b)) = 2 THEN 'Tropas a Cargar'
        WHEN toInt32OrZero(toString(r.estado_b)) = 3 THEN 'Tropas Cargadas'
        WHEN toInt32OrZero(toString(r.estado_b)) = 4 THEN 'Tropas a Liquidar'
        WHEN toInt32OrZero(toString(r.estado_b)) = 5 THEN 'Liquidadas' -- FIX: Negocios Terminados va PRIMERO — si todos los pagos estan completos es Terminado,
        -- aunque alguno haya llegado tarde (que es lo que causaba el falso "Pagos Vencidos")
        WHEN toInt32OrZero(toString(r.estado_b)) = 6
        AND (
          (
            toInt32OrZero(toString(dc.plazo_c1)) != 0
            AND toString(ar.fecha_pago_real_1) NOT IN ('', '0000-00-00')
            AND (
              toInt32OrZero(toString(dc.plazo_c2)) = 0
              OR toString(ar.fecha_pago_real_2) NOT IN ('', '0000-00-00')
            )
            AND (
              toInt32OrZero(toString(dc.plazo_c3)) = 0
              OR toString(ar.fecha_pago_real_3) NOT IN ('', '0000-00-00')
            )
            AND (
              toInt32OrZero(toString(dc.plazo_c4)) = 0
              OR toString(ar.fecha_pago_real_4) NOT IN ('', '0000-00-00')
            )
          )
          OR (
            toInt32OrZero(toString(dc.plazo_c1)) = 0
            AND toInt32OrZero(toString(dc.plazo_c1_p)) > 0
            AND toString(ar.fecha_pago_real_1) NOT IN ('', '0000-00-00')
          )
        ) THEN 'Negocios Terminados'
        WHEN toInt32OrZero(toString(r.estado_b)) = 6
        AND toDateOrNull(
          nullIf(toString(dc.fecha_carga_final), '0000-00-00')
        ) IS NOT NULL
        AND (
          (
            toString(ar.fecha_pago_real_1) IN ('', '0000-00-00')
            AND addDays(
              toDateOrNull(
                nullIf(toString(dc.fecha_carga_final), '0000-00-00')
              ),
              toInt32OrZero(toString(dc.plazo_c1))
            ) < today()
          )
          OR (
            toString(ar.fecha_pago_real_1) NOT IN ('', '0000-00-00')
            AND toInt32OrZero(toString(dc.plazo_c2)) > 0
            AND toString(ar.fecha_pago_real_2) IN ('', '0000-00-00')
            AND addDays(
              toDateOrNull(
                nullIf(toString(dc.fecha_carga_final), '0000-00-00')
              ),
              toInt32OrZero(toString(dc.plazo_c2))
            ) < today()
          )
          OR (
            toString(ar.fecha_pago_real_2) NOT IN ('', '0000-00-00')
            AND toInt32OrZero(toString(dc.plazo_c3)) > 0
            AND toString(ar.fecha_pago_real_3) IN ('', '0000-00-00')
            AND addDays(
              toDateOrNull(
                nullIf(toString(dc.fecha_carga_final), '0000-00-00')
              ),
              toInt32OrZero(toString(dc.plazo_c3))
            ) < today()
          )
          OR (
            toString(ar.fecha_pago_real_3) NOT IN ('', '0000-00-00')
            AND toInt32OrZero(toString(dc.plazo_c4)) > 0
            AND toString(ar.fecha_pago_real_4) IN ('', '0000-00-00')
            AND addDays(
              toDateOrNull(
                nullIf(toString(dc.fecha_carga_final), '0000-00-00')
              ),
              toInt32OrZero(toString(dc.plazo_c4))
            ) < today()
          )
        ) THEN 'Pagos Vencidos'
        WHEN toInt32OrZero(toString(r.estado_b)) = 6
        AND toDateOrNull(
          nullIf(toString(dc.fecha_carga_final), '0000-00-00')
        ) IS NOT NULL
        AND (
          (
            toString(ar.fecha_pago_real_1) IN ('', '0000-00-00')
            AND addDays(
              toDateOrNull(
                nullIf(toString(dc.fecha_carga_final), '0000-00-00')
              ),
              toInt32OrZero(toString(dc.plazo_c1))
            ) >= today()
          )
          OR (
            toString(ar.fecha_pago_real_1) NOT IN ('', '0000-00-00')
            AND toInt32OrZero(toString(dc.plazo_c2)) > 0
            AND toString(ar.fecha_pago_real_2) IN ('', '0000-00-00')
            AND addDays(
              toDateOrNull(
                nullIf(toString(dc.fecha_carga_final), '0000-00-00')
              ),
              toInt32OrZero(toString(dc.plazo_c2))
            ) >= today()
          )
          OR (
            toString(ar.fecha_pago_real_2) NOT IN ('', '0000-00-00')
            AND toInt32OrZero(toString(dc.plazo_c3)) > 0
            AND toString(ar.fecha_pago_real_3) IN ('', '0000-00-00')
            AND addDays(
              toDateOrNull(
                nullIf(toString(dc.fecha_carga_final), '0000-00-00')
              ),
              toInt32OrZero(toString(dc.plazo_c3))
            ) >= today()
          )
          OR (
            toString(ar.fecha_pago_real_3) NOT IN ('', '0000-00-00')
            AND toInt32OrZero(toString(dc.plazo_c4)) > 0
            AND toString(ar.fecha_pago_real_4) IN ('', '0000-00-00')
            AND addDays(
              toDateOrNull(
                nullIf(toString(dc.fecha_carga_final), '0000-00-00')
              ),
              toInt32OrZero(toString(dc.plazo_c4))
            ) >= today()
          )
        ) THEN 'Cerradas' -- FIX: si estado_b=6 pero sin fecha_carga_final, sigue siendo Cerrada (pendiente de carga)
        WHEN toInt32OrZero(toString(r.estado_b)) = 6 THEN 'Cerradas'
      END AS Estado_Trop,
      CASE
        WHEN toInt32OrZero(toString(nc.motivo)) = 1 THEN 'Vendio por otro lado'
        WHEN toInt32OrZero(toString(nc.motivo)) = 2 THEN 'No la comercializo'
        WHEN toInt32OrZero(toString(nc.motivo)) = 3 THEN 'La cerro y se borro'
        WHEN toInt32OrZero(toString(nc.motivo)) = 4 THEN 'No contesto'
        WHEN toInt32OrZero(toString(nc.motivo)) = 5 THEN 'La dio de baja solo'
        ELSE '-'
      END AS Motivo_NC,
      CASE
        WHEN cd_cotizaciones.lote_nro IS NOT NULL
        AND toString(cd_cotizaciones.faena) = '0' THEN toInt32OrZero('1')
        ELSE toInt32OrZero('0')
      END AS cotizada,
      CASE
        WHEN du_vend_ac.provincia_asignada != 'Sin Asignar'
        AND du_vend_ac.provincia_asignada IS NOT NULL THEN du_vend_ac.provincia_asignada
        WHEN coalesce(
          Vendedoras.asoc_com_vend,
          Vendedoras.repre_vendedor
        ) IN (
          'David Menghi',
          'Valentin Torriglia',
          'Alexis Deambrocio',
          'Santiago Julian',
          'Santiago Zonni',
          'Facu Alonso',
          'Sebastian Rivarola'
        )
        OR Vendedoras.repre_vendedor IN ('Oficina Rio 4to') THEN 'Cordoba'
        WHEN coalesce(
          Vendedoras.asoc_com_vend,
          Vendedoras.repre_vendedor
        ) IN (
          'Manuel Pons',
          'Juan José Loza',
          'Carlos Ricciardi Mierez',
          'Hugo Ganis',
          'Alejo Borggi'
        )
        OR Vendedoras.repre_vendedor IN (
          'Oficina Entre Rios',
          'Hugo Ganis',
          'Carlos Lostalo'
        ) THEN 'Entre Rios'
        WHEN coalesce(
          Vendedoras.asoc_com_vend,
          Vendedoras.repre_vendedor
        ) IN ('Jose Olmedo', 'Ramiro Aramburu') THEN 'Santa Fe'
        WHEN coalesce(
          Vendedoras.asoc_com_vend,
          Vendedoras.repre_vendedor
        ) IN ('Sebastian Saparrat', 'Emiliano Sanchez')
        OR Vendedoras.repre_vendedor IN ('Oficina Bavio') THEN 'Buenos Aires'
        WHEN coalesce(
          Vendedoras.asoc_com_vend,
          Vendedoras.repre_vendedor
        ) IN ('Ignacio Diehl', 'Sebastian Poullion')
        OR Vendedoras.repre_vendedor IN ('Oficina Bs As Central') THEN 'Bs As Central'
        WHEN coalesce(
          Vendedoras.asoc_com_vend,
          Vendedoras.repre_vendedor
        ) IN ('Facundo Sansot')
        OR Vendedoras.repre_vendedor IN ('Segundo Videla Dorna') THEN 'Bs As Ayacucho'
        WHEN coalesce(
          Vendedoras.asoc_com_vend,
          Vendedoras.repre_vendedor
        ) IN ('Alan Garcia', 'Facundo Martin') THEN 'La Pampa'
        WHEN coalesce(
          Vendedoras.asoc_com_vend,
          Vendedoras.repre_vendedor
        ) IN ('Marcelo Barboza') THEN 'Formosa'
      END AS Prov_AC_Vend,
      CASE
        WHEN du_comp_ac.provincia_asignada != 'Sin Asignar'
        AND du_comp_ac.provincia_asignada IS NOT NULL THEN du_comp_ac.provincia_asignada
        WHEN coalesce(
          Compradoras.asoc_com_compra,
          Compradoras.repre_comprador
        ) IN (
          'David Menghi',
          'Valentin Torriglia',
          'Alexis Deambrocio',
          'Santiago Julian',
          'Santiago Zonni',
          'Sebastian Rivarola'
        )
        OR Compradoras.repre_comprador IN ('Oficina Rio 4to') THEN 'Cordoba'
        WHEN coalesce(
          Compradoras.asoc_com_compra,
          Compradoras.repre_comprador
        ) IN (
          'Manuel Pons',
          'Juan José Loza',
          'Carlos Ricciardi Mierez',
          'Hugo Ganis',
          'Alejo Borggi'
        )
        OR Compradoras.repre_comprador IN (
          'Oficina Entre Rios',
          'Hugo Ganis',
          'Carlos Lostalo'
        ) THEN 'Entre Rios'
        WHEN coalesce(
          Compradoras.asoc_com_compra,
          Compradoras.repre_comprador
        ) IN ('Jose Olmedo', 'Ramiro Aramburu') THEN 'Santa Fe'
        WHEN coalesce(
          Compradoras.asoc_com_compra,
          Compradoras.repre_comprador
        ) IN ('Sebastian Saparrat', 'Emiliano Sanchez')
        OR Compradoras.repre_comprador IN ('Oficina Bavio') THEN 'Buenos Aires'
        WHEN coalesce(
          Compradoras.asoc_com_compra,
          Compradoras.repre_comprador
        ) IN ('Ignacio Diehl', 'Sebastian Poullion')
        OR Compradoras.repre_comprador IN ('Oficina Bs As Central') THEN 'Bs As Central'
        WHEN coalesce(
          Compradoras.asoc_com_compra,
          Compradoras.repre_comprador
        ) IN ('Facundo Sansot')
        OR Compradoras.repre_comprador IN ('Segundo Videla Dorna') THEN 'Bs As Ayacucho'
        WHEN coalesce(
          Compradoras.asoc_com_compra,
          Compradoras.repre_comprador
        ) IN ('Alan Garcia', 'Facundo Martin') THEN 'La Pampa'
        WHEN coalesce(
          Compradoras.asoc_com_compra,
          Compradoras.repre_comprador
        ) IN ('Marcelo Barboza') THEN 'Formosa'
      END AS Prov_AC_Comp,
      CASE
        WHEN du_vend_ac.canal_asignado = 'Regional' THEN 'Regional'
        WHEN coalesce(
          Vendedoras.asoc_com_vend,
          Vendedoras.repre_vendedor
        ) IN (
          'Facundo Sansot',
          'Sebastian Saparrat',
          'Emiliano Sanchez',
          'Sebastian Poullion',
          'Ignacio Diehl',
          'Lucila Frutos',
          'Manuel Pons',
          'Hugo Ganis',
          'Juan José Loza',
          'Nicolas Echezarreta',
          'Alejo Broggi',
          'Valentin Torriglia',
          'Santiago Julian',
          'David Menghi',
          'Alexis Deambrocio',
          'Sebastian Rivarola',
          'Facundo Alonso',
          'Alan Garcia',
          'Lucia Sposito',
          'Jose Olmedo',
          'Pablo Cieri',
          'Agustin Mascotena',
          'Marcelo Barboza',
          'Agustin Acuna',
          'Augusto Reynot',
          'Marcelo Rapp',
          'Santiago Bunge',
          'Joaquin Verdechia',
          'Simon De Aduriz'
        ) THEN 'Regional'
        WHEN coalesce(
          Vendedoras.asoc_com_vend,
          Vendedoras.repre_vendedor
        ) != ''
        OR (
          Vendedoras.repre_vendedor IS NOT NULL
          AND Vendedoras.repre_vendedor != ''
        ) THEN CASE
          WHEN Vendedoras.repre_vendedor IN (
            'Facundo Sansot',
            'Sebastian Saparrat',
            'Emiliano Sanchez',
            'Sebastian Poullion',
            'Ignacio Diehl',
            'Lucila Frutos',
            'Manuel Pons',
            'Hugo Ganis',
            'Juan José Loza',
            'Nicolas Echezarreta',
            'Alejo Broggi',
            'Valentin Torriglia',
            'Santiago Julian',
            'David Menghi',
            'Alexis Deambrocio',
            'Sebastian Rivarola',
            'Facundo Alonso',
            'Alan Garcia',
            'Lucia Sposito',
            'Jose Olmedo',
            'Pablo Cieri',
            'Agustin Mascotena',
            'Marcelo Barboza',
            'Agustin Acuna',
            'Augusto Reynot',
            'Marcelo Rapp',
            'Santiago Bunge',
            'Joaquin Verdechia',
            'Simon De Aduriz'
          ) THEN 'Regional'
          WHEN Vendedoras.repre_vendedor IN (
            'Hacienda Pedro Genta',
            'Alberto Bernaudo',
            'Pedro de Hagen',
            'Maxi Oliveri',
            'Oficina Rio 4to',
            'Oficina Entre Rios',
            'Oficina Bavio'
          ) THEN 'Directo'
          WHEN Vendedoras.repre_vendedor IN (
            'Alejandro Bridger',
            'Escritorio Enrique Gonzalez',
            'Segundo Videla Dorna',
            'Gonzalo Aduriz',
            'Ignacio Diehl',
            'Alejandro Ballve',
            'Alberto Brosa',
            'Mario Vera',
            'Alejandro Martin.',
            'Francisco Echeverz',
            'Marcelo Schang',
            'Rodolfo Aldasoro',
            'Nicolas Gurmindo',
            'Marcelo Schafer',
            'Mariano Rodriguez Alcobendas',
            'Esteban Enrique Avendaño',
            'Oscar Clos',
            'Santiago Sitja',
            'Marcelo Aguilar',
            'Franco Barrionuevo',
            'Luis Maria de Hagen',
            'Martin Petricevich',
            'Sebastian Rios',
            'Agustin Irastorza',
            'Mariano Laborde',
            'Ignacio Urruty',
            'Belisario Castillo Marin',
            'Oficina Rio 4to',
            'Oficina Bavio',
            'Oficina Bs As Central',
            'Oficina Entre Rios'
          ) THEN 'Representante'
          WHEN toFloat64OrZero(toString(ar.bonificacion_vendedor)) < 0.01
          AND toFloat64OrZero(toString(ar.bonificacion_vendedor)) > -0.01 THEN 'Directo'
          ELSE 'Comisionista'
        END
        ELSE 'Directo'
      END AS Canal_Venta,
      CASE
        WHEN du_comp_ac.canal_asignado = 'Regional' THEN 'Regional'
        WHEN coalesce(
          Compradoras.asoc_com_compra,
          Compradoras.repre_comprador
        ) IN (
          'Facundo Sansot',
          'Sebastian Saparrat',
          'Emiliano Sanchez',
          'Sebastian Poullion',
          'Ignacio Diehl',
          'Lucila Frutos',
          'Manuel Pons',
          'Hugo Ganis',
          'Juan José Loza',
          'Nicolas Echezarreta',
          'Alejo Broggi',
          'Valentin Torriglia',
          'Santiago Julian',
          'David Menghi',
          'Alexis Deambrocio',
          'Sebastian Rivarola',
          'Facundo Alonso',
          'Alan Garcia',
          'Lucia Sposito',
          'Jose Olmedo',
          'Pablo Cieri',
          'Agustin Mascotena',
          'Marcelo Barboza',
          'Agustin Acuna',
          'Augusto Reynot',
          'Marcelo Rapp',
          'Santiago Bunge',
          'Joaquin Verdechia',
          'Simon De Aduriz'
        ) THEN 'Regional'
        WHEN coalesce(
          Compradoras.asoc_com_compra,
          Compradoras.repre_comprador
        ) != ''
        OR (
          Compradoras.repre_comprador IS NOT NULL
          AND Compradoras.repre_comprador != ''
        ) THEN CASE
          WHEN Compradoras.repre_comprador IN (
            'Facundo Sansot',
            'Sebastian Saparrat',
            'Emiliano Sanchez',
            'Sebastian Poullion',
            'Ignacio Diehl',
            'Lucila Frutos',
            'Manuel Pons',
            'Hugo Ganis',
            'Juan José Loza',
            'Nicolas Echezarreta',
            'Alejo Broggi',
            'Valentin Torriglia',
            'Santiago Julian',
            'David Menghi',
            'Alexis Deambrocio',
            'Sebastian Rivarola',
            'Facundo Alonso',
            'Alan Garcia',
            'Lucia Sposito',
            'Jose Olmedo',
            'Pablo Cieri',
            'Agustin Mascotena',
            'Marcelo Barboza',
            'Agustin Acuna',
            'Augusto Reynot',
            'Marcelo Rapp',
            'Santiago Bunge',
            'Joaquin Verdechia',
            'Simon De Aduriz'
          ) THEN 'Regional'
          WHEN Compradoras.repre_comprador IN (
            'Hacienda Pedro Genta',
            'Alberto Bernaudo',
            'Pedro de Hagen',
            'Maxi Oliveri',
            'Oficina Rio 4to',
            'Oficina Entre Rios',
            'Oficina Bavio'
          ) THEN 'Directo'
          WHEN Compradoras.repre_comprador IN (
            'Alejandro Bridger',
            'Escritorio Enrique Gonzalez',
            'Segundo Videla Dorna',
            'Gonzalo Aduriz',
            'Ignacio Diehl',
            'Alejandro Ballve',
            'Alberto Brosa',
            'Mario Vera',
            'Alejandro Martin.',
            'Francisco Echeverz',
            'Marcelo Schang',
            'Rodolfo Aldasoro',
            'Nicolas Gurmindo',
            'Marcelo Schafer',
            'Mariano Rodriguez Alcobendas',
            'Esteban Enrique Avendaño',
            'Oscar Clos',
            'Santiago Sitja',
            'Marcelo Aguilar',
            'Franco Barrionuevo',
            'Luis Maria de Hagen',
            'Martin Petricevich',
            'Sebastian Rios',
            'Agustin Irastorza',
            'Mariano Laborde',
            'Ignacio Urruty',
            'Belisario Castillo Marin',
            'Oficina Rio 4to',
            'Oficina Bavio',
            'Oficina Bs As Central',
            'Oficina Entre Rios'
          ) THEN 'Representante'
          ELSE 'Comisionista'
        END
        ELSE 'Directo'
      END AS Canal_compra,
      CASE
        WHEN du_vend_ac.oficina_asignada != ''
        AND du_vend_ac.oficina_asignada IS NOT NULL THEN du_vend_ac.oficina_asignada
        WHEN Vendedoras.repre_vendedor = 'Oficina Rio 4to'
        AND coalesce(Vendedoras.asoc_com_vend, '') NOT IN (
          'David Menghi',
          'Valentin Torriglia',
          'Alexis Deambrocio',
          'Santiago Julian',
          'Santiago Zonni',
          'Facu Alonso',
          'Sebastian Rivarola'
        ) THEN 'Oficina Rio 4to'
        WHEN Vendedoras.repre_vendedor IN (
          'Carlos Ricciardi Mierez',
          'Hugo Ganis',
          'Juan José Loza',
          'Manuel Pons',
          'Alejo Broggi',
          'Carlos Lostalo',
          'Fabio Muaraccioli'
        )
        OR Vendedoras.asoc_com_vend IN (
          'Carlos Ricciardi Mierez',
          'Hugo Ganis',
          'Juan José Loza',
          'Manuel Pons',
          'Alejo Broggi',
          'Carlos Lostalo',
          'Fabio Muaraccioli'
        ) THEN 'Oficina Entre Rios'
        WHEN Vendedoras.repre_vendedor IN ('Sebastian Saparrat', 'Emiliano Sanchez')
        OR Vendedoras.asoc_com_vend IN ('Sebastian Saparrat', 'Emiliano Sanchez') THEN 'Oficina Bavio'
      END AS Oficina_Venta,
      concat(uc.nombre, ' ', uc.apellido) AS Usuario_comp_g,
      CASE
        WHEN toString(r.comprado_fecha) != ''
        AND toString(r.comprado_fecha) != '0000-00-00 00:00:00' THEN 'CI'
        ELSE ''
      END AS ACT_CI,
      '' AS usuario_op,
      '' AS usuario_acotz,
      toInt32OrZero(
        toString(
          toWeek(
            coalesce(
              toDateOrNull(
                if(
                  toString(r.fecha_publicacion) IN ('', '0000-00-00'),
                  NULL,
                  toString(r.fecha_publicacion)
                )
              ),
              toDateOrNull(toString(r.fecha_hora))
            )
          )
        )
      ) AS numero_semana,
      toInt32OrZero(
        toString(
          toYear(toDateOrNull(toString(r.fecha_publicacion)))
        )
      ) AS YAER,
      CASE
        WHEN toString(r.fecha_publicacion) IN ('', '0000-00-00', '0000-00-00 00:00:00') THEN ''
        ELSE concat(
          'Q',
          toString(
            toQuarter(toDateOrNull(toString(r.fecha_publicacion)))
          )
        )
      END AS Trimestre,
      CASE
        WHEN toString(r.estado) = '4'
        AND toString(r.estado_b) IN ('6', '5', '4')
        AND toString(r.no_concretado) = '0' THEN toInt32OrZero('1')
        ELSE toInt32OrZero('0')
      END AS Cierre,
      toInt64OrZero(toString(r.asociado_comercial)) AS id_ac_vend,
      toInt64OrZero(toString(lxi.asociado_comercial_comprador)) AS id_ac_comp,
      toInt64OrZero(toString(r.representante)) AS id_rep_vend,
      toInt64OrZero(toString(lxi.representante_de_compra)) AS id_rep_comp,
      toInt64OrNull(toString(sv.cuit)) AS cuit_vendedor,
      toInt32OrZero(toString(r.partido)) AS part_id_vend,
      toInt64OrNull(toString(sc.cuit)) AS cuit_comprador,
      toDateOrNull(nullIf(toString(r.fecha_vendida), '0000-00-00')) AS fecha_concretada,
      concat(us_op.nombre, ' ', us_op.apellido) AS operador_nombre
    FROM
      dcac.revisaciones AS r
      LEFT JOIN dcac.detalles_carga AS dc ON r.revisacion = dc.revisacion
      LEFT JOIN dcac.sociedades_tags AS sv ON r.sociedad_vendedora = sv.id
      LEFT JOIN dcac.lotes_x_interesados AS lxi ON r.revisacion = lxi.revisacion
      LEFT JOIN dcac.sociedades_tags AS sc ON lxi.sociedad_compradora = sc.id
      LEFT JOIN AnalisisResultadosUnicaRev AS ar ON r.revisacion = ar.revisacion
      LEFT JOIN dcac.analisis_resultados_proyectado AS arp ON r.revisacion = arp.revisacion
      LEFT JOIN dcac.usuarios AS acsv ON sv.asociado_comercial = acsv.usuario
      LEFT JOIN dcac.usuarios AS acv ON r.asociado_comercial = acv.usuario
      LEFT JOIN dcac.usuarios AS acsc ON sc.asociado_comercial = acsc.usuario
      LEFT JOIN dcac.usuarios AS acc ON lxi.asociado_comercial_comprador = acc.usuario
      LEFT JOIN ESTADOS_Invernada ON r.revisacion = ESTADOS_Invernada.ID_Revisacion
      LEFT JOIN negocios.cd_cotizaciones AS cd_cotizaciones ON r.revisacion = cd_cotizaciones.lote_nro
      LEFT JOIN dcac.informes_revisaciones AS ir ON r.revisacion = ir.revisacion
      LEFT JOIN dcac.categorias AS c ON c.categoria = r.categoria
      LEFT JOIN dcac.provincias AS prov ON r.provincia = prov.provincia
      LEFT JOIN dcac.partidos AS part ON r.partido = part.partido
      LEFT JOIN dcac.usuarios AS uc ON uc.usuario = r.comprado_por
      LEFT JOIN Vendedoras ON Vendedoras.ID = r.revisacion
      LEFT JOIN Compradoras ON Compradoras.ID = r.revisacion
      LEFT JOIN RepreCompraInvernada AS rci ON rci.revisacion = r.revisacion
      LEFT JOIN RepreVentaInv AS rvi ON rvi.id = r.revisacion
      LEFT JOIN dcac.informes_baja AS nc ON r.revisacion = nc.revisacion
      LEFT JOIN dicc_usuarios AS du_vend_ac ON r.asociado_comercial = du_vend_ac.id_usuario
      LEFT JOIN dicc_usuarios AS du_comp_ac ON lxi.asociado_comercial_comprador = du_comp_ac.id_usuario
      LEFT JOIN dcac.usuarios AS us_op ON r.adm_solicitud = us_op.usuario
    WHERE
      toDateOrNull(toString(r.fecha_hora)) >= '2023-12-01'
  ) AS reporte_final
WHERE
  1 = 1
  AND coalesce(RS_Vendedora, '') NOT ILIKE '%Test%'
  AND coalesce(RS_Vendedora, '') NOT ILIKE '%Prueba%'
  AND coalesce(RS_Vendedora, '') != 'Don Emilito SA'
  AND coalesce(RS_Compradora, '') NOT ILIKE '%Test%'
  AND coalesce(RS_Compradora, '') NOT ILIKE '%Prueba%'
  AND coalesce(RS_Compradora, '') != 'Don Emilito SA'
  AND coalesce(repre_vendedor, '') NOT ILIKE '%Test%'
  AND coalesce(repre_vendedor, '') NOT ILIKE '%Prueba%'
  AND coalesce(repre_comprador, '') NOT ILIKE '%Test%'
  AND coalesce(repre_comprador, '') NOT ILIKE '%Prueba%'
  AND coalesce(AC_Vend, '') NOT ILIKE '%Test%'
  AND coalesce(AC_Vend, '') NOT ILIKE '%Prueba%'
  AND coalesce(AC_Comp, '') NOT ILIKE '%Test%'
  AND coalesce(AC_Comp, '') NOT ILIKE '%Prueba%'
  AND coalesce(usuario_op, '') NOT ILIKE '%Test%'
  AND coalesce(usuario_op, '') NOT ILIKE '%Prueba%'
  AND coalesce(usuario_acotz, '') NOT ILIKE '%Test%'
  AND coalesce(usuario_acotz, '') NOT ILIKE '%Prueba%'
ORDER BY
  op_updated_at DESC,
  fecha_operacion DESC,
  Cabezas DESC,
  importe_vendedor DESC
LIMIT
  1 BY id_lote,
  Tipo