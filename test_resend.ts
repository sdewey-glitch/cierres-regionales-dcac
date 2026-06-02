/**
 * Test rápido de Resend — manda un mail de prueba a sdewey@decampoacampo.com
 * 
 * Ejecutar: npx ts-node test_resend.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function main() {
    const API_KEY = process.env.RESEND_API_KEY;
    console.log('🔑 API Key:', API_KEY ? `${API_KEY.substring(0, 10)}...` : '❌ NO ENCONTRADA');

    // ── Paso 1: Verificar dominio ──
    console.log('\n📋 Verificando dominios configurados en Resend...');
    try {
        const domains = await resend.domains.list();
        console.log('Dominios:', JSON.stringify(domains, null, 2));
    } catch (e: any) {
        console.log('⚠️  Error listando dominios:', e.message);
    }

    // ── Paso 2: Intentar enviar un mail de test ──
    console.log('\n📧 Enviando mail de prueba...');
    
    const testEmail = 'sdewey@decampoacampo.com';
    
    try {
        // Primero probamos con el dominio verificado
        const result = await resend.emails.send({
            from: 'Santos Dewey <sdewey@decampoacampo.com>',
            to: testEmail,
            subject: '🧪 Test Resend — Módulo de Envío de Cierres',
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: #1f5f99; padding: 16px 24px; border-radius: 12px 12px 0 0; display: flex; align-items: center; gap: 12px;">
                        <div style="border: 2px solid white; border-radius: 6px; padding: 4px 8px; color: white; font-weight: 900; font-size: 14px; letter-spacing: -0.5px;">dCaC</div>
                        <span style="color: white; font-weight: 700; font-size: 18px;">deCampo aCampo</span>
                    </div>
                    <div style="background: white; padding: 32px 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                        <h2 style="color: #1a1a1f; margin: 0 0 16px 0;">¡Test exitoso! 🎉</h2>
                        <p style="color: #4a5568; line-height: 1.6; margin: 0 0 16px 0;">
                            Este es un mail de prueba del nuevo módulo de envío de cierres.
                        </p>
                        <p style="color: #4a5568; line-height: 1.6; margin: 0 0 16px 0;">
                            Si estás viendo esto, Resend funciona correctamente con el dominio <strong>decampoacampo.com</strong>.
                        </p>
                        <div style="background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-top: 24px;">
                            <p style="margin: 0; font-size: 13px; color: #718096;">
                                <strong>From:</strong> sdewey@decampoacampo.com<br>
                                <strong>To:</strong> ${testEmail}<br>
                                <strong>Timestamp:</strong> ${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}
                            </p>
                        </div>
                    </div>
                    <p style="text-align: center; font-size: 11px; color: #a0aec0; margin-top: 16px;">
                        Enviado desde el Motor de Cierres v4 — deCampo aCampo
                    </p>
                </div>
            `,
        });

        console.log('✅ Mail enviado exitosamente!');
        console.log('   ID:', JSON.stringify(result));
        console.log(`\n📬 Revisá tu bandeja de entrada: ${testEmail}`);
        
    } catch (e: any) {
        console.error('❌ Error enviando mail:', e.message);
        console.log('\nDetalle completo:', JSON.stringify(e, null, 2));
        
        // Si falla con el dominio propio, probar con onboarding@resend.dev
        console.log('\n🔄 Intentando con remitente de prueba de Resend...');
        try {
            const result2 = await resend.emails.send({
                from: 'Test DCAC <onboarding@resend.dev>',
                to: testEmail,
                subject: '🧪 Test Resend (desde resend.dev) — Módulo de Envío de Cierres',
                html: `<p>Este mail viene desde <code>onboarding@resend.dev</code> porque el dominio <code>decampoacampo.com</code> no está verificado en Resend.</p>
                       <p>Para verificarlo, hay que agregar registros DNS (MX, SPF, DKIM) en el proveedor del dominio.</p>`,
            });
            console.log('✅ Mail de fallback enviado:', JSON.stringify(result2));
            console.log('\n⚠️  El dominio decampoacampo.com NO está verificado en Resend.');
            console.log('   Para verificarlo necesitás agregar registros DNS.');
        } catch (e2: any) {
            console.error('❌ También falló el fallback:', e2.message);
        }
    }
}

main().catch(console.error);
