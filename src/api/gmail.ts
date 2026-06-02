import { google } from 'googleapis';
import { config } from '../config/env';

// ══════════════════════════════════════════════════════════════════════════════
// ── Tipos para el envío de emails ──
// ══════════════════════════════════════════════════════════════════════════════

export interface EmailOptions {
    /** Email del remitente (debe ser @decampoacampo.com) */
    from: string;
    /** Nombre visible del remitente */
    fromName: string;
    /** Email del destinatario */
    to: string;
    /** Emails en copia (opcional) */
    cc?: string[];
    /** Asunto del email */
    subject: string;
    /** Cuerpo del email en HTML */
    htmlBody: string;
    /** Archivos adjuntos (opcional) */
    attachments?: { filename: string; content: Buffer; contentType: string }[];
}

export interface SendResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Utilidades internas para construir mensajes MIME ──
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Genera un boundary único para separar partes del mensaje MIME.
 */
function generateBoundary(): string {
    return `boundary_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Codifica un string a base64url (formato requerido por Gmail API).
 * Reemplaza caracteres no seguros para URLs: + → -, / → _, quita padding =.
 */
function toBase64Url(input: string | Buffer): string {
    const base64 = Buffer.isBuffer(input)
        ? input.toString('base64')
        : Buffer.from(input, 'utf-8').toString('base64');
    return base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

/**
 * Construye un mensaje MIME RFC 2822 completo.
 * - Sin adjuntos: mensaje simple text/html
 * - Con adjuntos: multipart/mixed con partes separadas por boundary
 */
function buildMimeMessage(options: EmailOptions): string {
    const { from, fromName, to, cc, subject, htmlBody, attachments } = options;

    // Encabezados comunes
    const headers: string[] = [
        `From: "${fromName}" <${from}>`,
        `To: ${to}`,
    ];

    if (cc && cc.length > 0) {
        headers.push(`Cc: ${cc.join(', ')}`);
    }

    headers.push(
        `Subject: =?UTF-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`,
        `MIME-Version: 1.0`,
    );

    // Sin adjuntos → mensaje simple HTML
    if (!attachments || attachments.length === 0) {
        headers.push(`Content-Type: text/html; charset=UTF-8`);
        headers.push(`Content-Transfer-Encoding: base64`);

        const encodedBody = Buffer.from(htmlBody, 'utf-8').toString('base64');
        return headers.join('\r\n') + '\r\n\r\n' + encodedBody;
    }

    // Con adjuntos → multipart/mixed
    const boundary = generateBoundary();
    headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);

    const parts: string[] = [];

    // Parte 1: Cuerpo HTML
    parts.push(
        `--${boundary}\r\n` +
        `Content-Type: text/html; charset=UTF-8\r\n` +
        `Content-Transfer-Encoding: base64\r\n\r\n` +
        Buffer.from(htmlBody, 'utf-8').toString('base64')
    );

    // Partes subsiguientes: adjuntos
    for (const attachment of attachments) {
        parts.push(
            `--${boundary}\r\n` +
            `Content-Type: ${attachment.contentType}; name="${attachment.filename}"\r\n` +
            `Content-Disposition: attachment; filename="${attachment.filename}"\r\n` +
            `Content-Transfer-Encoding: base64\r\n\r\n` +
            attachment.content.toString('base64')
        );
    }

    // Cierre del boundary
    parts.push(`--${boundary}--`);

    return headers.join('\r\n') + '\r\n\r\n' + parts.join('\r\n');
}

/**
 * Crea un cliente autenticado de Gmail API con delegación de dominio.
 * Usa el service account impersonando al usuario remitente (subject).
 */
function getGmailClient(senderEmail: string) {
    const auth = new google.auth.JWT({
        email: config.GOOGLE_MAIL,
        key: config.GOOGLE_KEY,
        scopes: ['https://www.googleapis.com/auth/gmail.send'],
        subject: senderEmail, // Impersonación vía delegación de dominio
    });
    return google.gmail({ version: 'v1', auth });
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Funciones públicas ──
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Envía un email usando la Gmail API con delegación de dominio.
 * 
 * Flujo:
 * 1. Construye mensaje MIME con cuerpo HTML y adjuntos opcionales
 * 2. Codifica en base64url como requiere la API
 * 3. Envía vía gmail.users.messages.send impersonando al remitente
 * 
 * @returns SendResult con success=true y messageId, o success=false con error descriptivo
 */
export async function sendEmail(options: EmailOptions): Promise<SendResult> {
    try {
        const gmail = getGmailClient(options.from);

        // Construir mensaje MIME y codificar en base64url
        const mimeMessage = buildMimeMessage(options);
        const encodedMessage = toBase64Url(mimeMessage);

        // Enviar usando userId 'me' (el usuario impersonado)
        const res = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedMessage,
            },
        });

        const messageId = res.data.id || undefined;
        console.log(`[gmail] ✅ Email enviado exitosamente a ${options.to}. ID: ${messageId}`);

        return {
            success: true,
            messageId,
        };
    } catch (error: unknown) {
        // Extraer mensaje de error de forma segura
        const errMsg = error instanceof Error ? error.message : String(error);

        // Detectar errores comunes de delegación de dominio
        if (errMsg.includes('unauthorized_client') || errMsg.includes('access_denied')) {
            const delegationError = `[gmail] Error de delegación de dominio: la cuenta de servicio ` +
                `(${config.GOOGLE_MAIL}) no tiene permisos de delegación para impersonar a '${options.from}'. ` +
                `Verifique la configuración en Google Workspace Admin Console → Seguridad → Controles API → ` +
                `Delegación en todo el dominio. Scope requerido: https://www.googleapis.com/auth/gmail.send`;
            console.error(delegationError);
            return { success: false, error: delegationError };
        }

        if (errMsg.includes('invalid_grant')) {
            const grantError = `[gmail] Error de autenticación: el token de la cuenta de servicio no es válido ` +
                `o el usuario '${options.from}' no existe en el dominio. Detalle: ${errMsg}`;
            console.error(grantError);
            return { success: false, error: grantError };
        }

        // Error genérico
        console.error(`[gmail] Error enviando email a ${options.to}:`, errMsg);
        return {
            success: false,
            error: `Error al enviar email: ${errMsg}`,
        };
    }
}

/**
 * Prueba la conexión de autenticación sin enviar un email.
 * Útil para verificar que la delegación de dominio está configurada correctamente.
 * 
 * Intenta obtener el perfil del usuario impersonado; si falla, reporta el error.
 */
export async function testConnection(senderEmail: string): Promise<{ ok: boolean; error?: string }> {
    try {
        const auth = new google.auth.JWT({
            email: config.GOOGLE_MAIL,
            key: config.GOOGLE_KEY,
            scopes: ['https://www.googleapis.com/auth/gmail.send'],
            subject: senderEmail,
        });

        // Forzar la obtención de un token de acceso para validar credenciales
        await auth.authorize();

        // Si llegamos acá, la autenticación fue exitosa
        const gmail = google.gmail({ version: 'v1', auth });
        const profile = await gmail.users.getProfile({ userId: 'me' });

        console.log(`[gmail] ✅ Conexión verificada para '${senderEmail}'. ` +
            `Email: ${profile.data.emailAddress}`);

        return { ok: true };
    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);

        // Mensajes claros según el tipo de error
        if (errMsg.includes('unauthorized_client') || errMsg.includes('access_denied')) {
            const msg = `Delegación de dominio no habilitada para '${senderEmail}'. ` +
                `Configure en Google Workspace Admin → Seguridad → Delegación en todo el dominio.`;
            console.error(`[gmail] ❌ ${msg}`);
            return { ok: false, error: msg };
        }

        if (errMsg.includes('invalid_grant')) {
            const msg = `Credenciales inválidas o usuario '${senderEmail}' no encontrado en el dominio.`;
            console.error(`[gmail] ❌ ${msg}`);
            return { ok: false, error: msg };
        }

        console.error(`[gmail] ❌ Error de conexión:`, errMsg);
        return { ok: false, error: `Error de conexión: ${errMsg}` };
    }
}
