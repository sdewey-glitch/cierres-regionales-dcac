/**
 * Test de envío de mail via Gmail SMTP (Nodemailer)
 * 
 * Ejecutar: npx ts-node test_gmail.ts
 * 
 * ANTES: Generar App Password en https://myaccount.google.com/apppasswords
 *        y ponerla en GMAIL_APP_PASSWORD abajo.
 */
import nodemailer from 'nodemailer';

// ══════════════════════════════════════════════
//  CONFIGURAR ACÁ
// ══════════════════════════════════════════════
const GMAIL_USER = 'sdewey@decampoacampo.com';
const GMAIL_APP_PASSWORD = '';  // ← Pegar acá la App Password de 16 caracteres (sin espacios)
// ══════════════════════════════════════════════

async function main() {
    if (!GMAIL_APP_PASSWORD) {
        console.log('❌ Falta la App Password!');
        console.log('');
        console.log('1. Ir a: https://myaccount.google.com/apppasswords');
        console.log('2. Loguearte con:', GMAIL_USER);
        console.log('3. Crear contraseña para "Mail" / "Otro" → "Cierres DCAC"');
        console.log('4. Copiar el código de 16 letras');
        console.log('5. Pegarlo en GMAIL_APP_PASSWORD de este archivo');
        console.log('6. Volver a correr: npx ts-node test_gmail.ts');
        return;
    }

    console.log('📧 Configurando transporte SMTP de Gmail...');
    
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: GMAIL_USER,
            pass: GMAIL_APP_PASSWORD,
        },
    });

    // Verificar conexión
    console.log('🔌 Verificando conexión...');
    try {
        await transporter.verify();
        console.log('✅ Conexión SMTP exitosa!');
    } catch (e: any) {
        console.error('❌ Error de conexión:', e.message);
        console.log('\nPosibles causas:');
        console.log('  - App Password incorrecta');
        console.log('  - 2FA no habilitado (necesario para App Passwords)');
        console.log('  - Cuenta de Google Workspace con restricciones de admin');
        return;
    }

    // Enviar mail de prueba
    console.log('\n📤 Enviando mail de prueba...');
    
    try {
        const info = await transporter.sendMail({
            from: `Santos Dewey <${GMAIL_USER}>`,
            to: GMAIL_USER,  // Se auto-envía
            subject: '🧪 Test Gmail SMTP — Módulo de Envío de Cierres',
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: #1f5f99; padding: 16px 24px; border-radius: 12px 12px 0 0;">
                        <div style="display: inline-block; border: 2px solid white; border-radius: 6px; padding: 4px 8px; color: white; font-weight: 900; font-size: 14px; letter-spacing: -0.5px; margin-right: 12px;">dCaC</div>
                        <span style="color: white; font-weight: 700; font-size: 18px; vertical-align: middle;">deCampo aCampo</span>
                    </div>
                    <div style="background: white; padding: 32px 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                        <h2 style="color: #1a1a1f; margin: 0 0 16px 0;">¡Test exitoso! 🎉</h2>
                        <p style="color: #4a5568; line-height: 1.6; margin: 0 0 16px 0;">
                            Gmail SMTP funciona perfectamente. Los cierres se pueden enviar desde <strong>${GMAIL_USER}</strong>.
                        </p>
                        <p style="color: #4a5568; line-height: 1.6; margin: 0 0 16px 0;">
                            Ventajas vs Resend:
                        </p>
                        <ul style="color: #4a5568; line-height: 1.8;">
                            <li>✅ Sin verificación de dominio</li>
                            <li>✅ Aparece en tu carpeta "Enviados"</li>
                            <li>✅ Las respuestas llegan a tu Gmail</li>
                            <li>✅ Podés cambiar el remitente a otro @decampoacampo.com</li>
                        </ul>
                        <div style="background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-top: 24px;">
                            <p style="margin: 0; font-size: 13px; color: #718096;">
                                <strong>Timestamp:</strong> ${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}
                            </p>
                        </div>
                    </div>
                    <p style="text-align: center; font-size: 11px; color: #a0aec0; margin-top: 16px;">
                        Motor de Cierres v4 — deCampo aCampo
                    </p>
                </div>
            `,
        });

        console.log('✅ Mail enviado exitosamente!');
        console.log('   Message ID:', info.messageId);
        console.log('   Response:', info.response);
        console.log(`\n📬 Revisá tu bandeja: ${GMAIL_USER}`);
        console.log('   (también debería aparecer en "Enviados")');
        
    } catch (e: any) {
        console.error('❌ Error enviando:', e.message);
    }
}

main().catch(console.error);
