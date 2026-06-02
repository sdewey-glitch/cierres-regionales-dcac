/**
 * ═══════════════════════════════════════════════════════════════
 *  SERVICIO DE ENVÍO DE MAILS + DRIVE — deCampo aCampo v2
 *  
 *  Recibe POST desde la web app de cierres:
 *  - Guarda el PDF en Drive (carpeta del mes)
 *  - Envía el mail con el PDF adjunto
 *  
 *  Corre como el usuario que despliega → tiene cuota de Drive
 * ═══════════════════════════════════════════════════════════════
 */

// ID de la carpeta raíz "Cierres AC" en Drive
var CARPETA_RAIZ_ID = "1ryE13Qo7C_DAknwFTZq9QWKUhkUOu4Oh";

/**
 * Endpoint POST
 * 
 * Body (JSON):
 * {
 *   "action": "send" | "test",
 *   "to": "email@destino.com",
 *   "cc": "email1@cc.com,email2@cc.com",
 *   "subject": "Cierre de Mayo 2026 - Augusto Reynot",
 *   "body": "Buenas tardes Augusto!...",
 *   "pdfBase64": "JVBERi0xLjQ...",  // PDF como base64
 *   "pdfFileName": "Augusto Reynot - Mayo 2026.pdf",
 *   "year": "2026",
 *   "month": "5",
 *   "testEmail": "sdewey@decampoacampo.com"
 * }
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    var to = data.action === 'test' ? (data.testEmail || Session.getActiveUser().getEmail()) : data.to;
    var cc = data.action === 'test' ? null : (data.cc || null);
    var subject = data.subject;
    var body = data.body;
    var pdfBase64 = data.pdfBase64;
    var pdfFileName = data.pdfFileName || 'cierre.pdf';
    var year = data.year || '2026';
    var month = data.month || '1';
    
    if (!to || !subject || !body) {
      return _json({ success: false, error: "Faltan campos: to, subject, body" });
    }
    
    var pdfBlob = null;
    var driveLink = '';
    
    // ── Guardar PDF en Drive si viene base64 ──
    if (pdfBase64) {
      try {
        var decoded = Utilities.base64Decode(pdfBase64);
        pdfBlob = Utilities.newBlob(decoded, 'application/pdf', pdfFileName);
        
        // Buscar/crear carpeta del mes
        var carpetaMes = _getOrCreateMonthFolder(year, month);
        
        // Verificar si ya existe un archivo con el mismo nombre
        var existentes = carpetaMes.getFilesByName(pdfFileName);
        if (existentes.hasNext()) {
          // Reemplazar: borrar el viejo
          var viejo = existentes.next();
          viejo.setTrashed(true);
          Logger.log('♻️ Reemplazando PDF existente: ' + pdfFileName);
        }
        
        var archivo = carpetaMes.createFile(pdfBlob);
        driveLink = archivo.getUrl();
        Logger.log('📁 PDF guardado en Drive: ' + driveLink);
        
      } catch (driveErr) {
        Logger.log('⚠️ Error guardando en Drive: ' + driveErr.message);
        // Continúa sin Drive — igual envía el mail
      }
    }
    
    // ── Enviar mail ──
    var mailOptions = {
      to: to,
      subject: subject,
      body: body.replace(/<[^>]*>/g, ''),  // plaintext fallback
    };
    
    if (cc) mailOptions.cc = cc;
    if (body.indexOf('<') !== -1) mailOptions.htmlBody = body;
    if (pdfBlob) mailOptions.attachments = [pdfBlob];
    
    MailApp.sendEmail(mailOptions);
    
    var sender = Session.getActiveUser().getEmail();
    Logger.log('✅ Mail enviado a ' + to + ' desde ' + sender);
    
    return _json({
      success: true,
      sender: sender,
      to: to,
      cc: cc || '',
      driveLink: driveLink,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    Logger.log('❌ Error: ' + err.message);
    return _json({ success: false, error: err.message });
  }
}

/**
 * Endpoint GET — Health check
 */
function doGet(e) {
  return _json({
    status: 'ok',
    service: 'DCAC Mail + Drive Service',
    sender: Session.getActiveUser().getEmail(),
    dailyQuotaRemaining: MailApp.getRemainingDailyQuota(),
    timestamp: new Date().toISOString()
  });
}

// ═══════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════

var MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

/**
 * Busca o crea la carpeta del mes dentro de Cierres AC/{year}/
 */
function _getOrCreateMonthFolder(year, month) {
  var raiz = DriveApp.getFolderById(CARPETA_RAIZ_ID);
  
  // Buscar/crear carpeta del año
  var carpetaYear;
  var añoFolders = raiz.getFoldersByName(year);
  if (añoFolders.hasNext()) {
    carpetaYear = añoFolders.next();
  } else {
    carpetaYear = raiz.createFolder(year);
    Logger.log('📂 Carpeta año creada: ' + year);
  }
  
  // Buscar/crear carpeta del mes
  var mesNombre = MESES[parseInt(month) - 1] || 'Mes';
  var nombreCarpeta = 'Cierre ' + mesNombre + ' ' + year;
  
  var mesFolders = carpetaYear.getFoldersByName(nombreCarpeta);
  if (mesFolders.hasNext()) {
    return mesFolders.next();
  } else {
    var nueva = carpetaYear.createFolder(nombreCarpeta);
    Logger.log('📂 Carpeta mes creada: ' + nombreCarpeta);
    return nueva;
  }
}

function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Test local
 */
function testEnvio() {
  var result = doPost({
    postData: {
      contents: JSON.stringify({
        action: 'test',
        to: Session.getActiveUser().getEmail(),
        subject: '🧪 Test — Servicio DCAC v2',
        body: 'Test del servicio de mail + Drive.',
        testEmail: Session.getActiveUser().getEmail()
      })
    }
  });
  Logger.log(result.getContent());
}
