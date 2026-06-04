/**
 * APPS SCRIPT — Bootstrap inicial de "Ajustes Historico" (v2)
 * -------------------------------------------------------
 * Este script se corre UNA SOLA VEZ para poblar la hoja "Ajustes Historico"
 * con los datos de la hoja "Bajada_Estatica" (que ya tiene el Q95 de los últimos meses).
 *
 * CORRECCIONES v2:
 *  - Solo guarda operaciones CONCRETADAS (filtra por columna ESTADO)
 *  - Usa repre_vendedor / repre_comprador para los nombres de AC
 *  - Parsea fecha_operacion correctamente como YYYYMM aunque venga como objeto Date
 *
 * CÓMO USARLO:
 * 1. Abrí el Google Sheet "3_Cierres_y_Liquidaciones"
 * 2. Extensiones → Apps Script
 * 3. Pegá este código reemplazando el bloque completo anterior
 * 4. Presioná "Ejecutar" sobre la función bootstrapAjustesHistorico()
 * 5. Aceptá los permisos cuando te lo pida
 */

function bootstrapAjustesHistorico() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── 1. Leer hoja fuente: Bajada_Estatica ──────────────────────────────────
  const fuenteSheet = ss.getSheetByName('Bajada_Estatica');
  if (!fuenteSheet) {
    SpreadsheetApp.getUi().alert('❌ No se encontró la hoja "Bajada_Estatica". Asegurate de haber corrido un cierre primero.');
    return;
  }

  const fuenteData = fuenteSheet.getDataRange().getValues();
  if (fuenteData.length < 2) {
    SpreadsheetApp.getUi().alert('❌ La hoja "Bajada_Estatica" está vacía.');
    return;
  }

  // ── 2. Mapear columnas por nombre ─────────────────────────────────────────
  const headers = fuenteData[0].map(function(h) { return String(h).trim().toLowerCase(); });

  function col(names) {
    for (var i = 0; i < names.length; i++) {
      var idx = headers.indexOf(names[i].toLowerCase().trim());
      if (idx !== -1) return idx;
    }
    return -1;
  }

  var iAnoMesCierre = col(['añomes_cierre', 'anomes_cierre', 'a\u00f1omes_cierre']);
  var iFechaOp      = col(['fecha_operacion', 'fecha_op', 'fecha operacion']);
  var iIdLote       = col(['id_lote', 'id']);
  var iResultado    = col(['resultado_final']);
  var iResultAdj    = col(['resultado_final_ajustado', 'resultado_ajustado']);
  var iEstado       = col(['estado']);
  var iEstadoTrop   = col(['estado_trop']);
  // Nombres AC: el Q95 guarda los nombres reales en repre_vendedor / repre_comprador
  var iAcVend       = col(['repre_vendedor', 'ac_vend', 'asociado_comercial_soc_vend', 'asociado_comercial_id_vend']);
  var iAcComp       = col(['repre_comprador', 'ac_comp', 'asociado_comercial_soc_comp', 'asociado_comercial_id_comp']);

  Logger.log('Mapeo de columnas:');
  Logger.log('AñoMes_Cierre: ' + iAnoMesCierre + ' | fecha_op: ' + iFechaOp + ' | id_lote: ' + iIdLote);
  Logger.log('resultado_final: ' + iResultado + ' | ESTADO: ' + iEstado + ' | repre_vendedor: ' + iAcVend + ' | repre_comprador: ' + iAcComp);

  if (iIdLote === -1 || iFechaOp === -1) {
    SpreadsheetApp.getUi().alert(
      '❌ No se encontraron columnas clave en Bajada_Estatica.\n' +
      'id_lote: col ' + iIdLote + ' | fecha_operacion: col ' + iFechaOp + '\n\n' +
      'Primeras columnas: ' + headers.slice(0, 15).join(', ')
    );
    return;
  }

  // ── 3. Filtrar solo CONCRETADAS y construir filas ─────────────────────────
  var ESTADOS_INVALIDOS = ['PUBLICADO', 'NO CONCRETADAS', 'OFRECIMIENTOS', 'BAJA',
                            'REVISAR', 'PUBLICADAS', 'DADAS DE BAJA', 'PUBLICADO OCULTO'];
  var outputRows = [];
  var totalLeidas = 0;
  var omitidas = 0;

  for (var i = 1; i < fuenteData.length; i++) {
    var row = fuenteData[i];
    totalLeidas++;

    // Filtrar por estado
    var estado     = iEstado     !== -1 ? String(row[iEstado]).trim().toUpperCase()     : '';
    var estadoTrop = iEstadoTrop !== -1 ? String(row[iEstadoTrop]).trim().toUpperCase() : '';
    if (ESTADOS_INVALIDOS.indexOf(estado) !== -1 || ESTADOS_INVALIDOS.indexOf(estadoTrop) !== -1) {
      omitidas++;
      continue;
    }

    // AñoMes_Cierre (ya viene como YYYYMM en la primera columna de Bajada_Estatica)
    var anoMesCierre = iAnoMesCierre !== -1 ? String(row[iAnoMesCierre]).trim() : '';

    // AñoMes_Tropa: parsear fecha_operacion (puede venir como Date o String)
    var anoMesTropa = '';
    var fechaVal = iFechaOp !== -1 ? row[iFechaOp] : null;
    if (fechaVal instanceof Date) {
      var y = fechaVal.getFullYear();
      var m = String(fechaVal.getMonth() + 1);
      if (m.length < 2) m = '0' + m;
      anoMesTropa = '' + y + m;
    } else if (fechaVal) {
      var fechaStr = String(fechaVal).trim();
      if (fechaStr.indexOf('-') !== -1 && fechaStr.length >= 7) {
        anoMesTropa = fechaStr.substring(0, 4) + fechaStr.substring(5, 7);
      } else if (fechaStr.length === 6 && !isNaN(Number(fechaStr))) {
        anoMesTropa = fechaStr;
      }
    }

    var idTropa     = iIdLote    !== -1 ? row[iIdLote]    : '';
    var resultado   = iResultado !== -1 ? row[iResultado] : '';
    var resultAdj   = iResultAdj !== -1 ? row[iResultAdj] : '';
    var acVendedor  = iAcVend    !== -1 ? row[iAcVend]    : '';
    var acComprador = iAcComp    !== -1 ? row[iAcComp]    : '';

    if (!idTropa && !anoMesTropa) continue;

    outputRows.push([anoMesCierre, anoMesTropa, idTropa, resultado, resultAdj, acVendedor, acComprador]);
  }

  if (outputRows.length === 0) {
    SpreadsheetApp.getUi().alert(
      '⚠️ No se generaron filas.\n' +
      'Total leídas: ' + totalLeidas + '\n' +
      'Omitidas (no concretadas): ' + omitidas
    );
    return;
  }

  // ── 4. Escribir en Ajustes Historico ──────────────────────────────────────
  var destSheet = ss.getSheetByName('Ajustes Historico');
  if (!destSheet) {
    destSheet = ss.insertSheet('Ajustes Historico');
  }
  destSheet.clearContents();

  var headerRow = [['AñoMes_Cierre', 'AñoMes_Tropa', 'ID_Tropa', 'Resultado', 'Resultado_Ajustado', 'AC_Vendedor', 'AC_Comprador']];
  var allData = headerRow.concat(outputRows);
  destSheet.getRange(1, 1, allData.length, 7).setValues(allData);

  // ── 5. Formato visual ──────────────────────────────────────────────────────
  var hRange = destSheet.getRange(1, 1, 1, 7);
  hRange.setFontWeight('bold');
  hRange.setBackground('#1a3a5c');
  hRange.setFontColor('#ffffff');
  hRange.setHorizontalAlignment('center');

  destSheet.setColumnWidth(1, 130);
  destSheet.setColumnWidth(2, 120);
  destSheet.setColumnWidth(3, 100);
  destSheet.setColumnWidth(4, 140);
  destSheet.setColumnWidth(5, 160);
  destSheet.setColumnWidth(6, 200);
  destSheet.setColumnWidth(7, 200);
  destSheet.setFrozenRows(1);

  // ── 6. Resumen final ──────────────────────────────────────────────────────
  var resumen = '✅ Bootstrap completo!\n\n' +
    'Filas leídas: ' + totalLeidas + '\n' +
    'Omitidas (no concretadas): ' + omitidas + '\n' +
    'Guardadas en Ajustes Historico: ' + outputRows.length;

  SpreadsheetApp.getActiveSpreadsheet().toast(resumen, 'Éxito', 8);
  Logger.log(resumen);
}
