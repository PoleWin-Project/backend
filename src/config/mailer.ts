import { Resend } from "resend";
import { env } from "./env";
import { logger } from "./logger";

const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null;

export async function sendMail(opts: {
    to:      string;
    subject: string;
    html:    string;
    text?:   string;
}) {
    if (!resend) {
        logger.info({ to: opts.to, subject: opts.subject }, "📧 [DEV] Email not sent (no RESEND_API_KEY)");
        return;
    }

    await resend.emails.send({
        from:    env.emailFrom,
        to:      opts.to,
        subject: opts.subject,
        html:    opts.html,
        text:    opts.text,
    });
}