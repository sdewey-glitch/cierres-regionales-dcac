/**
 * ═══════════════════════════════════════════════════════════════
 *  SERVICIO DE ENVÍO DE MAILS + DRIVE — deCampo aCampo v3
 *  
 *  Recibe POST desde la web app de cierres:
 *  - Guarda el PDF en Drive (carpeta del mes)
 *  - Envía el mail con el PDF adjunto
 *  - Soporta conversión HTML -> PDF y retorno de base64 para vista previa
 * ═══════════════════════════════════════════════════════════════
 */

// ID de la carpeta raíz "Cierres AC" en Drive
var CARPETA_RAIZ_ID = "1ryE13Qo7C_DAknwFTZq9QWKUhkUOu4Oh";

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    // 1. Obtener o generar el PDF Blob
    var pdfBlob;
    if (data.pdfBase64) {
      var decoded = Utilities.base64Decode(data.pdfBase64);
      pdfBlob = Utilities.newBlob(decoded, 'application/pdf', data.pdfFileName || 'cierre.pdf');
    } else if (data.htmlContent) {
      // Crear archivo HTML temporal
      var tempFile = DriveApp.createFile('temp_' + Date.now() + '.html', data.htmlContent, 'text/html');
      // Convertir a PDF
      pdfBlob = tempFile.getAs('application/pdf').setName(data.pdfFileName || 'cierre.pdf');
      // Borrar temp
      tempFile.setTrashed(true);
    } else {
      throw new Error("No pdfBase64 nor htmlContent provided");
    }

    // 2. Si es solo PREVIEW, devolver el PDF en base64
    if (data.action === 'preview') {
      var base64 = Utilities.base64Encode(pdfBlob.getBytes());
      return _json({
        success: true,
        pdfBase64: base64
      });
    }

    // 3. Obtener destinatarios para envío
    var to = data.action === 'test' ? (data.testEmail || Session.getActiveUser().getEmail()) : data.to;
    var cc = data.action === 'test' ? null : (data.cc || null);
    var subject = data.subject;
    var body = data.body;

    // 4. Guardar archivo en la carpeta de Drive del mes
    var driveLink = "";
    try {
      var folder = _getOrCreateMonthFolder(data.year || new Date().getFullYear().toString(), data.month || "1");
      var file = folder.createFile(pdfBlob);
      driveLink = file.getUrl();
    } catch (driveErr) {
      Logger.log("Error guardando en Drive: " + driveErr.message);
    }

    // 5. Enviar por email
    var emailOptions = {
      to: to,
      subject: subject,
      body: body,
      attachments: [pdfBlob]
    };
    if (cc) {
      emailOptions.cc = cc;
    }
    
    MailApp.sendEmail(emailOptions);

    return _json({
      success: true,
      sender: Session.getActiveUser().getEmail(),
      to: to,
      driveLink: driveLink,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    Logger.log("Error en doPost: " + err.message);
    return _json({
      success: false,
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
}

var MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function _getOrCreateMonthFolder(year, month) {
  var raiz = DriveApp.getFolderById(CARPETA_RAIZ_ID);
  
  // Buscar/crear carpeta del año
  var carpetaYear;
  var añoFolders = raiz.getFoldersByName(year);
  if (añoFolders.hasNext()) {
    carpetaYear = añoFolders.next();
  } else {
    carpetaYear = raiz.createFolder(year);
  }
  
  // Buscar/crear carpeta del mes
  var mesNombre = MESES[parseInt(month, 10) - 1] || 'Mes';
  var nombreCarpeta = 'Cierre ' + mesNombre + ' ' + year;
  
  var mesFolders = carpetaYear.getFoldersByName(nombreCarpeta);
  if (mesFolders.hasNext()) {
    return mesFolders.next();
  } else {
    return carpetaYear.createFolder(nombreCarpeta);
  }
}

function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
