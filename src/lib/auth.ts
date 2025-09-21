import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";
import { username, admin, emailOTP, organization } from "better-auth/plugins"
import { sendEmail } from "./smtp";
import { isValidEmail, isValidOTP, sanitizeHtml } from "./security";

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  
  // Security: Require environment variables
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  
  // Basic auth configuration with security enhancements
  emailAndPassword: {    
    enabled: true,
    requireEmailVerification: false, // Can be enabled when email verification flow is ready
    autoSignIn: false, // Security: Don't auto sign-in after registration
    password: {
      hash: {
        // Security: Use strong password hashing (saltRounds supported)
        saltRounds: 12,
      },
      minLength: 8, // Security: Minimum password length
      maxLength: 128, // Security: Maximum password length to prevent DoS
    }
  },

  // Security: Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
  },

  // Security: Trust host configuration
  trustedOrigins: [
    process.env.BETTER_AUTH_URL!,
    // Add other trusted origins as needed
  ],

  plugins: [ 
    username({
      // Security: Username validation
      minLength: 3,
      maxLength: 20,
    }),
    
    admin({
      // Security: Admin configuration with default role
      defaultRole: "user",
    }),
    
    organization({
      // Security: Organization plugin configuration
      allowUserToCreateOrganization: true,
    }),
    
    emailOTP({ 
      // Security: Email OTP configuration
      expiresIn: 10 * 60, // 10 minutes expiry
      otpLength: 6,
      allowedAttempts: 3, // Maximum 3 attempts before invalidating OTP
      
      async sendVerificationOTP({ email, otp, type }) { 
        // Security: Input validation
        if (!email || !otp || !type) {
          throw new Error("Missing required parameters");
        }

        // Security: Validate email format
        if (!isValidEmail(email)) {
          throw new Error("Invalid email format");
        }

        // Security: Validate OTP format
        if (!isValidOTP(otp)) {
          throw new Error("Invalid OTP format");
        }

        // Security: Type validation
        const validTypes = ["sign-in", "email-verification", "forget-password"];
        if (!validTypes.includes(type)) {
          throw new Error("Invalid OTP type");
        }

        const subject = type === "sign-in" 
            ? "Code de connexion - ANTX"
            : type === "email-verification"
            ? "Vérifiez votre adresse email - ANTX"
            : "Réinitialisation de mot de passe - ANTX";

        // Security: Sanitize content to prevent XSS
        const safeSubject = sanitizeHtml(subject);
        const safeOtp = sanitizeHtml(otp);

        const html = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${safeSubject}</title>
            <style>
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                    line-height: 1.6; 
                    color: #333; 
                    max-width: 600px; 
                    margin: 0 auto; 
                    padding: 20px; 
                    background-color: #f5f5f5;
                }
                .container {
                    background: white;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }
                .header { 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 30px; 
                    text-align: center; 
                }
                .content { 
                    padding: 30px; 
                }
                .otp-code { 
                    background: #007bff; 
                    color: white; 
                    font-size: 32px; 
                    font-weight: bold; 
                    letter-spacing: 8px; 
                    padding: 20px; 
                    border-radius: 8px; 
                    text-align: center; 
                    margin: 20px 0; 
                    font-family: monospace;
                }
                .warning { 
                    background: #fff3cd; 
                    border: 1px solid #ffeaa7; 
                    padding: 15px; 
                    border-radius: 4px; 
                    margin: 20px 0; 
                    color: #856404; 
                }
                .footer { 
                    text-align: center; 
                    padding: 20px 30px; 
                    background: #f8f9fa; 
                    color: #666; 
                    font-size: 14px; 
                    border-top: 1px solid #eee;
                }
                .warning ul {
                    margin: 10px 0;
                    padding-left: 20px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 ${safeSubject}</h1>
                </div>
                <div class="content">
                    <p>Bonjour,</p>
                    <p>${type === "sign-in" 
                        ? "Voici votre code de connexion :"
                        : type === "email-verification"
                        ? "Voici votre code de vérification d'email :"
                        : "Voici votre code de réinitialisation de mot de passe :"
                    }</p>
                    <div class="otp-code">${safeOtp}</div>
                    <div class="warning">
                        <strong>⚠️ Important - Sécurité:</strong>
                        <ul>
                            <li>Ce code est valide pendant <strong>10 minutes uniquement</strong></li>
                            <li>Ne partagez <strong>jamais</strong> ce code avec qui que ce soit</li>
                            <li>Notre équipe ne vous demandera jamais ce code par téléphone ou email</li>
                            <li>En cas de doute, contactez notre support</li>
                        </ul>
                    </div>
                    <p>Si vous n'avez pas demandé ce code, vous pouvez ignorer cet email en toute sécurité. Aucune action n'est requise de votre part.</p>
                </div>
                <div class="footer">
                    <p><strong>ANTX - Système d'authentification sécurisé</strong></p>
                    <p>Ce message a été envoyé automatiquement, merci de ne pas y répondre.</p>
                </div>
            </div>
        </body>
        </html>`;

        const text = `
${subject}

Voici votre code : ${otp}

IMPORTANT - Sécurité:
- Ce code est valide pendant 10 minutes uniquement
- Ne partagez jamais ce code avec qui que ce soit
- Notre équipe ne vous demandera jamais ce code par téléphone ou email
- En cas de doute, contactez notre support

Si vous n'avez pas demandé ce code, vous pouvez ignorer cet email en toute sécurité.

ANTX - Système d'authentification sécurisé
Ce message a été envoyé automatiquement, merci de ne pas y répondre.`;

        try {
            // Security: Log the attempt (without sensitive data)
            console.log(`Sending OTP to ${email.replace(/(.{2}).*(@.*)/, '$1***$2')} for ${type}`);
            
            await sendEmail({
                to: email,
                subject,
                html,
                text
            });
            
            console.log(`OTP sent successfully for ${type}`);
        } catch (error) {
            // Security: Log error without exposing sensitive information
            console.error("Erreur envoi OTP:", error instanceof Error ? error.message : 'Unknown error');
            throw new Error("Impossible d'envoyer le code de vérification");
        }
      }, 
    }),
  ] 
});