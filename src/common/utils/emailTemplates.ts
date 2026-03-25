import { env } from "../../config/env";

export function verifyEmailTemplate(token: string) {
    const url = `${env.appUrl}/verify-email?token=${token}`;
    return {
        subject: "Vérifiez votre adresse email — PoleWin",
        html: `
            <div style="font-family:sans-serif;max-width:520px;margin:auto">
                <h2 style="color:#e10600">🏁 PoleWin</h2>
                <p>Bienvenue ! Cliquez sur le bouton ci-dessous pour vérifier votre adresse email.</p>
                <a href="${url}" style="display:inline-block;padding:12px 24px;background:#e10600;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;margin:16px 0">
                    Vérifier mon email
                </a>
                <p style="color:#888;font-size:12px">Ce lien expire dans 24 heures. Si vous n'avez pas créé de compte, ignorez cet email.</p>
            </div>
        `,
        text: `Vérifiez votre email PoleWin : ${url}`,
    };
}

export function resetPasswordTemplate(token: string) {
    const url = `${env.appUrl}/reset-password?token=${token}`;
    return {
        subject: "Réinitialisation de mot de passe — PoleWin",
        html: `
            <div style="font-family:sans-serif;max-width:520px;margin:auto">
                <h2 style="color:#e10600">🏁 PoleWin</h2>
                <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
                <a href="${url}" style="display:inline-block;padding:12px 24px;background:#e10600;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;margin:16px 0">
                    Réinitialiser mon mot de passe
                </a>
                <p style="color:#888;font-size:12px">Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.</p>
            </div>
        `,
        text: `Réinitialisez votre mot de passe PoleWin : ${url}`,
    };
}
