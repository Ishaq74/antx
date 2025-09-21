/**
 * Centralized error message mapping for Better Auth
 * Maps English Better Auth error messages to French translations
 * Ensures no sensitive information is exposed and maintains security
 */

export interface AuthError {
  message?: string;
  code?: string;
}

/**
 * Maps Better Auth error messages to French translations
 * @param error - The error object from Better Auth
 * @returns French error message
 */
export function mapErrorMessage(error: AuthError | string | null | undefined): string {
  const message = typeof error === 'string' ? error : error?.message;
  
  if (!message) return "Une erreur inconnue est survenue.";

  // Authentication errors
  if (message === "Invalid email or password" || message === "Invalid credentials") {
    return "Email ou mot de passe incorrect.";
  }
  if (message === "Email not verified") {
    return "Veuillez vérifier votre adresse email avant de vous connecter.";
  }
  if (message === "Account banned") {
    return "Ce compte est banni.";
  }
  if (message === "User not found") {
    return "Utilisateur introuvable.";
  }

  // Registration errors
  if (message === "Email already exists" || message === "Sign-up attempt for existing email") {
    return "Cet email est déjà utilisé. Connectez-vous ou vérifiez vos emails.";
  }
  if (message === "Username already exists") {
    return "Ce nom d'utilisateur est déjà pris. Choisissez-en un autre.";
  }
  if (message === "Password too short") {
    return "Mot de passe trop court (minimum 8 caractères).";
  }
  if (message === "Invalid email") {
    return "Adresse email invalide.";
  }
  if (message === "Missing required field") {
    return "Un champ requis est manquant.";
  }

  // OTP/Verification errors
  if (message === "Invalid OTP" || message === "Invalid verification code") {
    return "Code de vérification invalide.";
  }
  if (message === "OTP expired" || message === "Verification code expired") {
    return "Code de vérification expiré. Demandez un nouveau code.";
  }
  if (message === "Too many OTP attempts") {
    return "Trop de tentatives. Veuillez patienter avant de réessayer.";
  }
  if (message === "You can only send a verification email to an unverified email") {
    return "Impossible de renvoyer l'email : cette adresse est déjà vérifiée ou n'existe pas.";
  }

  // Password reset errors
  if (message === "Password reset token expired") {
    return "Le lien de réinitialisation a expiré. Demandez un nouveau lien.";
  }
  if (message === "Invalid password reset token") {
    return "Lien de réinitialisation invalide.";
  }

  // Rate limiting errors
  if (message.includes("rate limit") || message.includes("too many requests")) {
    return "Trop de tentatives. Veuillez patienter quelques minutes.";
  }

  // Network/Server errors
  if (message.includes("network") || message.includes("fetch")) {
    return "Erreur de connexion. Vérifiez votre connexion internet.";
  }
  if (message.includes("server") || message.includes("500")) {
    return "Erreur serveur temporaire. Veuillez réessayer dans quelques instants.";
  }

  // Organization errors
  if (message === "Organization not found") {
    return "Organisation introuvable.";
  }
  if (message === "Organization already exists") {
    return "Cette organisation existe déjà.";
  }
  if (message === "Invalid invitation") {
    return "Invitation invalide ou expirée.";
  }
  if (message === "User already in organization") {
    return "Vous êtes déjà membre de cette organisation.";
  }

  // Generic fallback - don't expose internal error details
  console.warn('Unmapped error message:', message);
  return "Une erreur est survenue. Veuillez réessayer.";
}

/**
 * Maps success messages to French
 * @param type - The type of success message
 * @param context - Additional context for the message
 * @returns French success message
 */
export function getSuccessMessage(type: string, context?: string): string {
  switch (type) {
    case 'signup':
      return "Compte créé avec succès !";
    case 'signup-verify':
      return "Compte créé ! Un email de vérification a été envoyé.";
    case 'signin':
      return "Connexion réussie !";
    case 'otp-sent':
      return "Code de vérification envoyé par email.";
    case 'password-reset':
      return "Mot de passe réinitialisé avec succès !";
    case 'email-verified':
      return "Adresse email vérifiée avec succès !";
    case 'organization-created':
      return "Organisation créée avec succès !";
    case 'invitation-sent':
      return "Invitation envoyée avec succès !";
    case 'profile-updated':
      return "Profil mis à jour avec succès !";
    default:
      return "Opération réussie !";
  }
}

/**
 * Maps loading messages to French
 * @param type - The type of loading action
 * @returns French loading message
 */
export function getLoadingMessage(type: string): string {
  switch (type) {
    case 'signin':
      return "Connexion...";
    case 'signup':
      return "Création du compte...";
    case 'otp-sending':
      return "Envoi du code...";
    case 'otp-verifying':
      return "Vérification...";
    case 'password-resetting':
      return "Réinitialisation...";
    case 'saving':
      return "Enregistrement...";
    case 'sending':
      return "Envoi...";
    case 'loading':
      return "Chargement...";
    default:
      return "Traitement...";
  }
}