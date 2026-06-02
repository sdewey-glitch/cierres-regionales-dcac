/**
 * Test: Gmail API con Service Account + Domain-Wide Delegation
 * 
 * Intenta enviar un mail como sdewey@ usando el service account.
 * Si falla, significa que hay que habilitar delegation en admin.google.com
 * 
 * Ejecutar: npx ts-node test_gmail_api.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { google } from 'googleapis';

const SENDER = 'sdewey@decampoacampo.com';

async function main() {
    const serviceEmail = process.env.Google_mail || '';
    const privateKey = (process.env.Google_key || '').replace(/\\n/g, '\n');

    console.log('🔑 Service Account:', serviceEmail);
    console.log('📧 Intentando enviar como:', SENDER);

    // Crear auth con impersonación (subject = el usuario que queremos impersonar)
    const auth = new google.auth.JWT({
        email: serviceEmail,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/gmail.send'],
        subject: SENDER,  // ← Esto es la impersonación
    });

    const gmail = google.gmail({ version: 'v1', auth });

    // Construir el email en formato RFC 2822
    const to = SENDER; // Auto-envío para test
    const subject = '🧪 Test Gmail API — Módulo de Cierres';
    const body = [
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        `To: ${to}`,
        `From: Santos Dewey <${SENDER}>`,
        `Subject: ${subject}`,
        '',
        `<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">`,
        `  <div style="background: #1f5f99; padding: 16px 24px; border-radius: 12px 12px 0 0;">`,
        `    <span style="border: 2px solid white; border-radius: 6px; padding: 4px 8px; color: white; font-weight: 900; font-size: 14px;">dCaC</span>`,
        `    <span style="color: white; font-weight: 700; font-size: 18px; margin-left: 12px;">deCampo aCampo</span>`,
        `  </div>`,
        `  <div style="background: white; padding: 32px 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">`,
        `    <h2 style="color: #1a1a1f;">¡Gmail API funciona! 🎉</h2>`,
        `    <p style="color: #4a5568;">El service account puede enviar mails como <strong>${SENDER}</strong>.</p>`,
        `    <p style="color: #4a5568;">Esto significa que también puede enviar como cualquier otro @decampoacampo.com.</p>`,
        `    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-top: 20px;">`,
        `      <p style="margin: 0; color: #166534; font-weight: 600;">✅ Domain-Wide Delegation activa</p>`,
        `      <p style="margin: 4px 0 0; color: #15803d; font-size: 13px;">El mail aparece en "Enviados" y las respuestas llegan al Gmail del remitente.</p>`,
        `    </div>`,
        `  </div>`,
        `</div>`,
    ].join('\r\n');

    // Encodear a base64url
    const encodedMessage = Buffer.from(body)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    try {
        console.log('\n📤 Enviando...');
        const res = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedMessage,
            },
        });

        console.log('✅ ¡Mail enviado exitosamente!');
        console.log('   Message ID:', res.data.id);
        console.log(`\n📬 Revisá tu bandeja: ${SENDER}`);
        console.log('   (también aparece en "Enviados")');

    } catch (e: any) {
        console.error('❌ Error:', e.message);
        
        if (e.message.includes('unauthorized_client') || e.message.includes('access_denied')) {
            console.log('\n══════════════════════════════════════════════');
            console.log('⚠️  Domain-Wide Delegation NO está habilitada.');
            console.log('══════════════════════════════════════════════');
            console.log('\nPara habilitarla (3 min, lo hace el admin de Google Workspace):');
            console.log('');
            console.log('1. Ir a: https://admin.google.com');
            console.log('2. Seguridad → Acceso y control de datos → Controles de API');
            console.log('3. "Administrar la delegación en todo el dominio"');
            console.log('4. Click "Agregar nuevo"');
            console.log('5. ID de cliente:', serviceEmail);
            console.log('6. Alcances: https://www.googleapis.com/auth/gmail.send');
            console.log('7. Click "Autorizar"');
            console.log('');
            console.log('Después volvé a correr este test.');
        } else {
            console.log('\nDetalle:', JSON.stringify(e.response?.data || e, null, 2));
        }
    }
}

main().catch(console.error);
