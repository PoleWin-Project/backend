import nodemailer from "nodemailer";
import { env } from "./env";
import { logger } from "./logger";

// If SMTP_HOST is not configured, use a no-op transporter (logs instead of sending)
function createTransporter() {
    if (!env.smtp.host) {
        logger.warn("SMTP_HOST not configured — emails will be logged only");
        return nodemailer.createTransport({ jsonTransport: true });
    }

    return nodemailer.createTransport({
        host: env.smtp.host,
        port: env.smtp.port,
        secure: env.smtp.port === 465,
        auth: env.smtp.user && env.smtp.pass
            ? { user: env.smtp.user, pass: env.smtp.pass }
            : undefined,
    });
}

export const mailer = createTransporter();

export async function sendMail(opts: {
    to:      string;
    subject: string;
    html:    string;
    text?:   string;
}) {
    if (!env.smtp.host) {
        logger.info({ to: opts.to, subject: opts.subject }, "📧 [DEV] Email not sent (no SMTP)");
        return;
    }

    await mailer.sendMail({
        from:    env.smtp.from,
        to:      opts.to,
        subject: opts.subject,
        html:    opts.html,
        text:    opts.text,
    });
}
