const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  try {
    console.log("Lanzando navegador para test de impresión...");
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    // Set a good viewport
    await page.setViewport({ width: 1280, height: 1024 });
    
    console.log("Navegando a la app local...");
    await page.goto('http://localhost:5174/', { waitUntil: 'networkidle2' });
    
    console.log("Cambiando a la pestaña Simulador...");
    // The tabs are buttons. Let's find the one with text "Simulador"
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const simBtn = buttons.find(b => b.innerText.includes('Simulador'));
      if (simBtn) simBtn.click();
    });
    
    // Wait for the simulator to render
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log("Generando PDF (Emulando impresión)...");
    await page.emulateMediaType('print');
    await page.pdf({
      path: 'test_proposal.pdf',
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
    });
    
    console.log("¡Impresión PDF exitosa! Guardado en test_proposal.pdf");
    await browser.close();
  } catch (error) {
    console.error("Error en test de impresión:", error);
    process.exit(1);
  }
})();
