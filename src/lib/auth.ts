import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";
import { username, admin, emailOTP, organization } from "better-auth/plugins"
import { sendEmail } from "./smtp";

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
    emailAndPassword: {    
    enabled: true
  },
    plugins: [ 
    username(),
    admin(),
    organization(),
    emailOTP({ 
    async sendVerificationOTP({ email, otp, type }) { 
        const subject = type === "sign-in" 
            ? "Code de connexion - Better Auth"
            : type === "email-verification"
            ? "Vérifiez votre adresse email - Better Auth"
            : "Réinitialisation de mot de passe - Better Auth";

        const html = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject}</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
                .otp-code { background: #007bff; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🔐 ${subject}</h1>
            </div>
            <div class="content">
                <p>Bonjour,</p>
                <p>${type === "sign-in" 
                    ? "Voici votre code de connexion :"
                    : type === "email-verification"
                    ? "Voici votre code de vérification d'email :"
                    : "Voici votre code de réinitialisation de mot de passe :"
                }</p>
                <div class="otp-code">${otp}</div>
                <p>Ce code est valide pendant 10 minutes.</p>
                <p>Si vous n'avez pas demandé ce code, vous pouvez ignorer cet email.</p>
                <div class="footer">
                    <p><strong>Better Auth CMS</strong></p>
                    <p>Système d'authentification sécurisé</p>
                </div>
            </div>
        </body>
        </html>`;

        const text = `
${subject}

Voici votre code : ${otp}

Ce code est valide pendant 10 minutes.
Si vous n'avez pas demandé ce code, vous pouvez ignorer cet email.

Better Auth CMS
Système d'authentification sécurisé`;

        try {
            await sendEmail({
                to: email,
                subject,
                html,
                text
            });
        } catch (error) {
            console.error("Erreur envoi OTP:", error);
            throw new Error("Impossible d'envoyer le code de vérification");
        }
    }, 
    }),
] 
});