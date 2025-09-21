import nodemailer from 'nodemailer';

// Configuration SMTP - Production ready
const smtpConfig = {
  host: process.env.SMTP_HOST || import.meta.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || import.meta.env.SMTP_PORT || '587'),
  secure: (process.env.SMTP_SECURE || import.meta.env.SMTP_SECURE) === 'true',
  auth: {
    user: process.env.SMTP_USER || import.meta.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || import.meta.env.SMTP_PASSWORD || ''
  },
  // Options spécifiques pour la compatibilité
  tls: {
    rejectUnauthorized: false
  }
};

// Interface pour les résultats de test
export interface SmtpTestResult {
  success: boolean;
  message: string;
  detailedMessage?: string;
  errorCode?: string;
  config?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    hasAuth: boolean;
  };
  error?: any;
  timestamp: Date;
}

// Interface pour l'envoi d'email
export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

// Fonction pour analyser les erreurs SMTP et fournir des messages en français
function getDetailedErrorMessage(error: any): { message: string; detailedMessage: string; errorCode: string } {
  const errorMessage = error?.message || error?.toString() || 'Erreur inconnue';
  const errorCode = error?.code || error?.errno || 'UNKNOWN';
  
  // Messages d'erreur spécifiques en français
  const errorMappings: Record<string, { message: string; details: string }> = {
    'ENOTFOUND': {
      message: 'Serveur SMTP introuvable',
      details: 'Vérifiez l\'adresse du serveur SMTP dans la configuration. Le nom d\'hôte est incorrect ou le serveur n\'existe pas.'
    },
    'ECONNREFUSED': {
      message: 'Connexion refusée par le serveur SMTP',
      details: 'Le serveur SMTP refuse la connexion. Vérifiez le port (587 pour TLS, 465 pour SSL, 25 pour non-sécurisé) et que le serveur accepte les connexions.'
    },
    'ECONNRESET': {
      message: 'Connexion fermée par le serveur SMTP',
      details: 'La connexion a été fermée de manière inattendue. Cela peut être dû à une configuration TLS/SSL incorrecte ou à une limitation du serveur.'
    },
    'ETIMEDOUT': {
      message: 'Délai d\'attente dépassé',
      details: 'La connexion au serveur SMTP a expiré. Vérifiez votre connexion internet et les paramètres de pare-feu.'
    },
    'EAUTH': {
      message: 'Échec de l\'authentification SMTP',
      details: 'Les identifiants de connexion sont incorrects. Vérifiez le nom d\'utilisateur et le mot de passe. Pour Gmail, utilisez un mot de passe d\'application.'
    },
    'ESOCKET': {
      message: 'Erreur de socket réseau',
      details: 'Problème de connexion réseau. Vérifiez votre connexion internet et les paramètres de proxy/pare-feu.'
    },
    'EENVELOPE': {
      message: 'Erreur d\'enveloppe email',
      details: 'L\'adresse email expéditrice ou destinataire est invalide ou refusée par le serveur SMTP.'
    },
    'EMESSAGE': {
      message: 'Erreur de contenu du message',
      details: 'Le contenu du message est invalide ou contient des éléments refusés par le serveur SMTP.'
    },
    'EDNS': {
      message: 'Erreur de résolution DNS',
      details: 'Impossible de résoudre le nom du serveur SMTP. Vérifiez vos paramètres DNS et votre connexion internet.'
    }
  };

  // Vérification des erreurs spécifiques par contenu du message
  const messagePatterns: Record<string, { message: string; details: string }> = {
    'Invalid connexion': {
      message: 'Identifiants de connexion invalides',
      details: 'Le nom d\'utilisateur ou le mot de passe est incorrect. Pour Gmail, activez l\'authentification à deux facteurs et utilisez un mot de passe d\'application.'
    },
    'Username and Password not accepted': {
      message: 'Nom d\'utilisateur et mot de passe refusés',
      details: 'Les identifiants ne sont pas acceptés par le serveur. Vérifiez que le compte est autorisé à envoyer des emails via SMTP.'
    },
    'Must issue a STARTTLS command first': {
      message: 'TLS requis par le serveur',
      details: 'Le serveur exige une connexion sécurisée TLS. Vérifiez que le port et les paramètres de sécurité sont corrects.'
    },
    'self signed certificate': {
      message: 'Certificat SSL auto-signé',
      details: 'Le serveur utilise un certificat SSL auto-signé. Cela peut nécessiter une configuration spéciale pour accepter ce type de certificat.'
    },
    'certificate has expired': {
      message: 'Certificat SSL expiré',
      details: 'Le certificat SSL du serveur a expiré. Contactez l\'administrateur du serveur SMTP.'
    },
    'Network is unreachable': {
      message: 'Réseau inaccessible',
      details: 'Impossible d\'atteindre le serveur SMTP. Vérifiez votre connexion internet et les paramètres de pare-feu.'
    },
    'Relay access denied': {
      message: 'Accès de relais refusé',
      details: 'Le serveur refuse de transmettre l\'email. Vérifiez que votre adresse IP est autorisée ou que vous êtes authentifié.'
    },
    'Recipient address rejected': {
      message: 'Adresse destinataire refusée',
      details: 'L\'adresse email du destinataire est refusée par le serveur. Vérifiez que l\'adresse est valide et autorisée.'
    }
  };

  // Recherche par code d'erreur d'abord
  if (errorCode && errorMappings[errorCode]) {
    return {
      message: errorMappings[errorCode].message,
      detailedMessage: errorMappings[errorCode].details,
      errorCode
    };
  }

  // Recherche par contenu du message
  for (const [pattern, info] of Object.entries(messagePatterns)) {
    if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
      return {
        message: info.message,
        detailedMessage: info.details,
        errorCode: errorCode || 'MESSAGE_PATTERN'
      };
    }
  }

  // Message d'erreur générique avec le message original
  return {
    message: 'Erreur SMTP',
    detailedMessage: `Erreur technique: ${errorMessage}. Vérifiez la configuration SMTP et consultez les logs pour plus de détails.`,
    errorCode: errorCode || 'UNKNOWN'
  };
}

// Fonction pour valider la configuration SMTP
function validateSmtpConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!smtpConfig.host || smtpConfig.host.trim() === '') {
    errors.push('Le serveur SMTP (SMTP_HOST) n\'est pas configuré');
  }
  
  if (!smtpConfig.port || smtpConfig.port < 1 || smtpConfig.port > 65535) {
    errors.push('Le port SMTP (SMTP_PORT) doit être un nombre entre 1 et 65535');
  }
  
  if (!smtpConfig.auth.user || smtpConfig.auth.user.trim() === '') {
    errors.push('Le nom d\'utilisateur SMTP (SMTP_USER) n\'est pas configuré');
  }
  
  if (!smtpConfig.auth.pass || smtpConfig.auth.pass.trim() === '') {
    errors.push('Le mot de passe SMTP (SMTP_PASSWORD) n\'est pas configuré');
  }
  
  // Validation de l'email utilisateur
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (smtpConfig.auth.user && !emailRegex.test(smtpConfig.auth.user)) {
    errors.push('L\'adresse email SMTP (SMTP_USER) n\'est pas au format valide');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Fonction pour tester la connexion SMTP
export async function testSmtpConnection(): Promise<SmtpTestResult> {
  const timestamp = new Date();
  
  try {
    // Validation de la configuration
    const validation = validateSmtpConfig();
    if (!validation.isValid) {
      return {
        success: false,
        message: 'Configuration SMTP invalide',
        detailedMessage: `Erreurs de configuration:\n${validation.errors.join('\n')}`,
        errorCode: 'CONFIG_INVALID',
        timestamp
      };
    }

    const transporter = nodemailer.createTransport(smtpConfig);
    
    // Test de connexion avec timeout
    const connectionTest = await Promise.race([
      transporter.verify(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: La connexion au serveur SMTP a pris trop de temps')), 15000)
      )
    ]);
    
    console.log('✅ CONNEXION SMTP RÉUSSIE !');
    return {
      success: true,
      message: 'Connexion SMTP établie avec succès',
      detailedMessage: 'Le serveur SMTP est accessible et l\'authentification a réussi. Le système est prêt à envoyer des emails.',
      errorCode: 'SUCCESS',
      config: {
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        user: smtpConfig.auth.user,
        hasAuth: !!(smtpConfig.auth.user && smtpConfig.auth.pass)
      },
      timestamp
    };
  } catch (error: any) {
    console.log('❌ ERREUR SMTP DÉTAILLÉE:', error);
    console.log('❌ TYPE ERREUR:', error?.constructor?.name);
    console.log('❌ MESSAGE ERREUR:', error?.message);
    console.log('❌ CODE ERREUR:', error?.code);
    
    const errorInfo = getDetailedErrorMessage(error);
    
    return {
      success: false,
      message: errorInfo.message,
      detailedMessage: errorInfo.detailedMessage,
      errorCode: errorInfo.errorCode,
      error,
      timestamp
    };
  }
}

// Fonction pour créer un transporteur SMTP
export async function createSmtpTransporter() {
  const transporter = nodemailer.createTransport(smtpConfig);
  return transporter;
}

// Fonction pour valider une adresse email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email.trim());
}

// Fonction pour valider les options d'email
function validateEmailOptions(options: EmailOptions): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!options.to || options.to.trim() === '') {
    errors.push('L\'adresse email du destinataire est requise');
  } else if (!isValidEmail(options.to)) {
    errors.push('L\'adresse email du destinataire n\'est pas au format valide');
  }
  
  if (!options.subject || options.subject.trim() === '') {
    errors.push('Le sujet de l\'email est requis');
  } else if (options.subject.length > 200) {
    errors.push('Le sujet de l\'email ne peut pas dépasser 200 caractères');
  }
  
  if (!options.text && !options.html) {
    errors.push('Le contenu de l\'email (texte ou HTML) est requis');
  }
  
  if (options.text && options.text.length > 50000) {
    errors.push('Le contenu texte de l\'email ne peut pas dépasser 50 000 caractères');
  }
  
  if (options.html && options.html.length > 100000) {
    errors.push('Le contenu HTML de l\'email ne peut pas dépasser 100 000 caractères');
  }
  
  if (options.from && !isValidEmail(options.from)) {
    errors.push('L\'adresse email de l\'expéditeur n\'est pas au format valide');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Fonction pour envoyer un email
export async function sendEmail(options: EmailOptions): Promise<SmtpTestResult> {
  const timestamp = new Date();
  
  try {
    // Validation des options
    const validation = validateEmailOptions(options);
    if (!validation.isValid) {
      return {
        success: false,
        message: 'Données d\'email invalides',
        detailedMessage: `Erreurs de validation:\n${validation.errors.join('\n')}`,
        errorCode: 'VALIDATION_ERROR',
        timestamp
      };
    }
    
    // Validation de la configuration SMTP
    const configValidation = validateSmtpConfig();
    if (!configValidation.isValid) {
      return {
        success: false,
        message: 'Configuration SMTP invalide',
        detailedMessage: `Erreurs de configuration:\n${configValidation.errors.join('\n')}`,
        errorCode: 'CONFIG_INVALID',
        timestamp
      };
    }
    
    const transporter = await createSmtpTransporter();
    
    const mailOptions = {
      from: options.from || import.meta.env.SMTP_FROM || smtpConfig.auth.user,
      to: options.to.trim(),
      subject: options.subject.trim(),
      text: options.text?.trim(),
      html: options.html?.trim()
    };
    
    // Envoi avec timeout
    const sendResult = await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: L\'envoi de l\'email a pris trop de temps')), 30000)
      )
    ]) as any;
    
    return {
      success: true,
      message: `Email envoyé avec succès`,
      detailedMessage: `Email envoyé à ${options.to}. ID du message: ${sendResult.messageId || 'Non disponible'}. Le destinataire devrait recevoir l\'email sous peu.`,
      errorCode: 'SUCCESS',
      timestamp
    };
  } catch (error) {
    const errorInfo = getDetailedErrorMessage(error);
    
    return {
      success: false,
      message: `Échec de l'envoi: ${errorInfo.message}`,
      detailedMessage: errorInfo.detailedMessage,
      errorCode: errorInfo.errorCode,
      error,
      timestamp
    };
  }
}

// Fonction pour envoyer un email de test
export async function sendTestEmail(toEmail: string): Promise<SmtpTestResult> {
  const timestamp = new Date();
  
  try {
    // Validation de l'email destinataire
    if (!toEmail || !isValidEmail(toEmail)) {
      return {
        success: false,
        message: 'Adresse email destinataire invalide',
        detailedMessage: 'L\'adresse email fournie n\'est pas au format valide. Veuillez fournir une adresse email complète (ex: user@domain.com).',
        errorCode: 'INVALID_RECIPIENT',
        timestamp
      };
    }
    
    const testSubject = `🧪 Test SMTP Real CMS - ${new Date().toLocaleString('fr-FR')}`;
    const testContent = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Test SMTP</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .success-badge { background: #28a745; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin: 20px 0; }
          .config-table { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .config-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .config-label { font-weight: bold; color: #666; }
          .config-value { color: #333; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .emoji { font-size: 24px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1><span class="emoji">🎯</span> Test SMTP Réussi !</h1>
          <p>Real CMS Admin Dashboard</p>
        </div>
        
        <div class="content">
          <div class="success-badge">
            ✅ Configuration SMTP Fonctionnelle
          </div>
          
          <p><strong>Félicitations !</strong> Cet email de test a été envoyé avec succès depuis votre système CMS.</p>
          
          <div class="config-table">
            <h3><span class="emoji">⚙️</span> Configuration SMTP Utilisée</h3>
            <div class="config-row">
              <span class="config-label">Serveur SMTP:</span>
              <span class="config-value">${smtpConfig.host}</span>
            </div>
            <div class="config-row">
              <span class="config-label">Port:</span>
              <span class="config-value">${smtpConfig.port}</span>
            </div>
            <div class="config-row">
              <span class="config-label">Sécurisé (TLS/SSL):</span>
              <span class="config-value">${smtpConfig.secure ? 'Oui (SSL)' : 'Non (TLS/STARTTLS)'}</span>
            </div>
            <div class="config-row">
              <span class="config-label">Utilisateur:</span>
              <span class="config-value">${smtpConfig.auth.user}</span>
            </div>
            <div class="config-row">
              <span class="config-label">Authentification:</span>
              <span class="config-value">${smtpConfig.auth.user && smtpConfig.auth.pass ? 'Configurée' : 'Non configurée'}</span>
            </div>
          </div>
          
          <div class="config-table">
            <h3><span class="emoji">📧</span> Détails de l'Envoi</h3>
            <div class="config-row">
              <span class="config-label">Date/Heure d'envoi:</span>
              <span class="config-value">${timestamp.toLocaleString('fr-FR')}</span>
            </div>
            <div class="config-row">
              <span class="config-label">Destinataire:</span>
              <span class="config-value">${toEmail}</span>
            </div>
            <div class="config-row">
              <span class="config-label">Expéditeur:</span>
              <span class="config-value">${import.meta.env.SMTP_FROM || smtpConfig.auth.user}</span>
            </div>
          </div>
          
          <p><strong>📋 Que signifie ce test ?</strong></p>
          <ul>
            <li>✅ <strong>Connexion serveur:</strong> Votre CMS peut se connecter au serveur SMTP</li>
            <li>✅ <strong>Authentification:</strong> Les identifiants sont corrects</li>
            <li>✅ <strong>Envoi d'emails:</strong> Votre système peut envoyer des emails</li>
            <li>✅ <strong>Réception:</strong> Les emails arrivent bien à destination</li>
          </ul>
          
          <div class="footer">
            <p><strong>Real CMS Admin Dashboard</strong></p>
            <p>Système de gestion de contenu - Test automatique SMTP</p>
            <p><em>Cet email a été généré automatiquement pour valider votre configuration SMTP.</em></p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const textContent = `
🎯 TEST SMTP RÉUSSI - Real CMS Admin Dashboard

✅ Configuration SMTP Fonctionnelle

Félicitations ! Cet email de test a été envoyé avec succès depuis votre système CMS.

⚙️ CONFIGURATION SMTP UTILISÉE:
• Serveur SMTP: ${smtpConfig.host}
• Port: ${smtpConfig.port}
• Sécurisé: ${smtpConfig.secure ? 'Oui (SSL)' : 'Non (TLS/STARTTLS)'}
• Utilisateur: ${smtpConfig.auth.user}
• Authentification: ${smtpConfig.auth.user && smtpConfig.auth.pass ? 'Configurée' : 'Non configurée'}

📧 DÉTAILS DE L'ENVOI:
• Date/Heure: ${timestamp.toLocaleString('fr-FR')}
• Destinataire: ${toEmail}
• Expéditeur: ${import.meta.env.SMTP_FROM || smtpConfig.auth.user}

📋 QUE SIGNIFIE CE TEST ?
✅ Connexion serveur: Votre CMS peut se connecter au serveur SMTP
✅ Authentification: Les identifiants sont corrects
✅ Envoi d'emails: Votre système peut envoyer des emails
✅ Réception: Les emails arrivent bien à destination

---
Real CMS Admin Dashboard
Système de gestion de contenu - Test automatique SMTP
Cet email a été généré automatiquement pour valider votre configuration SMTP.
    `;
    
    const result = await sendEmail({
      to: toEmail,
      subject: testSubject,
      html: testContent,
      text: textContent
    });
    
    if (result.success) {
      return {
        success: true,
        message: 'Email de test envoyé avec succès',
        detailedMessage: `L'email de test a été envoyé à ${toEmail}. Il contient des informations détaillées sur votre configuration SMTP et confirme que votre système d'envoi d'emails fonctionne correctement.`,
        errorCode: 'SUCCESS',
        timestamp
      };
    } else {
      return result;
    }
  } catch (error) {
    const errorInfo = getDetailedErrorMessage(error);
    
    return {
      success: false,
      message: `Échec de l'envoi du test: ${errorInfo.message}`,
      detailedMessage: errorInfo.detailedMessage,
      errorCode: errorInfo.errorCode,
      error,
      timestamp
    };
  }
}

export { smtpConfig };
