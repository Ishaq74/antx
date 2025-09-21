import { describe, it, expect, vi } from 'vitest';
import { mapErrorMessage, getSuccessMessage, getLoadingMessage, AuthError } from './error-messages';

describe('Error Messages', () => {
  describe('mapErrorMessage', () => {
    it('should handle null and undefined errors', () => {
      expect(mapErrorMessage(null)).toBe("Une erreur inconnue est survenue.");
      expect(mapErrorMessage(undefined)).toBe("Une erreur inconnue est survenue.");
      expect(mapErrorMessage({ message: undefined })).toBe("Une erreur inconnue est survenue.");
    });

    describe('Authentication errors', () => {
      it('should map invalid credentials errors', () => {
        expect(mapErrorMessage("Invalid email or password")).toBe("Email ou mot de passe incorrect.");
        expect(mapErrorMessage("Invalid credentials")).toBe("Email ou mot de passe incorrect.");
        expect(mapErrorMessage({ message: "Invalid email or password" })).toBe("Email ou mot de passe incorrect.");
      });

      it('should map email verification errors', () => {
        expect(mapErrorMessage("Email not verified")).toBe("Veuillez vérifier votre adresse email avant de vous connecter.");
      });

      it('should map account status errors', () => {
        expect(mapErrorMessage("Account banned")).toBe("Ce compte est banni.");
        expect(mapErrorMessage("User not found")).toBe("Utilisateur introuvable.");
      });
    });

    describe('Registration errors', () => {
      it('should map email already exists errors', () => {
        expect(mapErrorMessage("Email already exists")).toBe("Cet email est déjà utilisé. Connectez-vous ou vérifiez vos emails.");
        expect(mapErrorMessage("Sign-up attempt for existing email")).toBe("Cet email est déjà utilisé. Connectez-vous ou vérifiez vos emails.");
      });

      it('should map username already exists errors', () => {
        expect(mapErrorMessage("Username already exists")).toBe("Ce nom d'utilisateur est déjà pris. Choisissez-en un autre.");
      });

      it('should map validation errors', () => {
        expect(mapErrorMessage("Password too short")).toBe("Mot de passe trop court (minimum 8 caractères).");
        expect(mapErrorMessage("Invalid email")).toBe("Adresse email invalide.");
        expect(mapErrorMessage("Missing required field")).toBe("Un champ requis est manquant.");
      });
    });

    describe('OTP/Verification errors', () => {
      it('should map invalid OTP errors', () => {
        expect(mapErrorMessage("Invalid OTP")).toBe("Code de vérification invalide.");
        expect(mapErrorMessage("Invalid verification code")).toBe("Code de vérification invalide.");
      });

      it('should map expired OTP errors', () => {
        expect(mapErrorMessage("OTP expired")).toBe("Code de vérification expiré. Demandez un nouveau code.");
        expect(mapErrorMessage("Verification code expired")).toBe("Code de vérification expiré. Demandez un nouveau code.");
      });

      it('should map rate limiting errors', () => {
        expect(mapErrorMessage("Too many OTP attempts")).toBe("Trop de tentatives. Veuillez patienter avant de réessayer.");
      });

      it('should map email verification restrictions', () => {
        expect(mapErrorMessage("You can only send a verification email to an unverified email")).toBe("Impossible de renvoyer l'email : cette adresse est déjà vérifiée ou n'existe pas.");
      });
    });

    describe('Password reset errors', () => {
      it('should map password reset token errors', () => {
        expect(mapErrorMessage("Password reset token expired")).toBe("Le lien de réinitialisation a expiré. Demandez un nouveau lien.");
        expect(mapErrorMessage("Invalid password reset token")).toBe("Lien de réinitialisation invalide.");
      });
    });

    describe('Rate limiting errors', () => {
      it('should map rate limit messages', () => {
        expect(mapErrorMessage("rate limit exceeded")).toBe("Trop de tentatives. Veuillez patienter quelques minutes.");
        expect(mapErrorMessage("too many requests from this IP")).toBe("Trop de tentatives. Veuillez patienter quelques minutes.");
      });
    });

    describe('Network/Server errors', () => {
      it('should map network errors', () => {
        expect(mapErrorMessage("network error occurred")).toBe("Erreur de connexion. Vérifiez votre connexion internet.");
        expect(mapErrorMessage("fetch request failed")).toBe("Erreur de connexion. Vérifiez votre connexion internet.");
      });

      it('should map server errors', () => {
        expect(mapErrorMessage("internal server error")).toBe("Erreur serveur temporaire. Veuillez réessayer dans quelques instants.");
        expect(mapErrorMessage("500 Internal Server Error")).toBe("Erreur serveur temporaire. Veuillez réessayer dans quelques instants.");
      });
    });

    describe('Organization errors', () => {
      it('should map organization-related errors', () => {
        expect(mapErrorMessage("Organization not found")).toBe("Organisation introuvable.");
        expect(mapErrorMessage("Organization already exists")).toBe("Cette organisation existe déjà.");
        expect(mapErrorMessage("Invalid invitation")).toBe("Invitation invalide ou expirée.");
        expect(mapErrorMessage("User already in organization")).toBe("Vous êtes déjà membre de cette organisation.");
      });
    });

    describe('Unknown errors', () => {
      it('should log warning and return generic message for unmapped errors', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        
        const unknownError = "Some unknown error message";
        const result = mapErrorMessage(unknownError);
        
        expect(result).toBe("Une erreur est survenue. Veuillez réessayer.");
        expect(consoleSpy).toHaveBeenCalledWith('Unmapped error message:', unknownError);
        
        consoleSpy.mockRestore();
      });

      it('should handle complex error objects', () => {
        const complexError: AuthError = {
          message: "Unknown complex error",
          code: "ERR_UNKNOWN"
        };
        
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = mapErrorMessage(complexError);
        
        expect(result).toBe("Une erreur est survenue. Veuillez réessayer.");
        expect(consoleSpy).toHaveBeenCalledWith('Unmapped error message:', "Unknown complex error");
        
        consoleSpy.mockRestore();
      });
    });
  });

  describe('getSuccessMessage', () => {
    it('should return correct success messages for known types', () => {
      expect(getSuccessMessage('signup')).toBe("Compte créé avec succès !");
      expect(getSuccessMessage('signup-verify')).toBe("Compte créé ! Un email de vérification a été envoyé.");
      expect(getSuccessMessage('signin')).toBe("Connexion réussie !");
      expect(getSuccessMessage('otp-sent')).toBe("Code de vérification envoyé par email.");
      expect(getSuccessMessage('password-reset')).toBe("Mot de passe réinitialisé avec succès !");
      expect(getSuccessMessage('email-verified')).toBe("Adresse email vérifiée avec succès !");
      expect(getSuccessMessage('organization-created')).toBe("Organisation créée avec succès !");
      expect(getSuccessMessage('invitation-sent')).toBe("Invitation envoyée avec succès !");
      expect(getSuccessMessage('profile-updated')).toBe("Profil mis à jour avec succès !");
    });

    it('should return generic success message for unknown types', () => {
      expect(getSuccessMessage('unknown-type')).toBe("Opération réussie !");
      expect(getSuccessMessage('')).toBe("Opération réussie !");
    });

    it('should handle context parameter (currently unused)', () => {
      expect(getSuccessMessage('signup', 'extra-context')).toBe("Compte créé avec succès !");
    });
  });

  describe('getLoadingMessage', () => {
    it('should return correct loading messages for known types', () => {
      expect(getLoadingMessage('signin')).toBe("Connexion...");
      expect(getLoadingMessage('signup')).toBe("Création du compte...");
      expect(getLoadingMessage('otp-sending')).toBe("Envoi du code...");
      expect(getLoadingMessage('otp-verifying')).toBe("Vérification...");
      expect(getLoadingMessage('password-resetting')).toBe("Réinitialisation...");
      expect(getLoadingMessage('saving')).toBe("Enregistrement...");
      expect(getLoadingMessage('sending')).toBe("Envoi...");
      expect(getLoadingMessage('loading')).toBe("Chargement...");
    });

    it('should return generic loading message for unknown types', () => {
      expect(getLoadingMessage('unknown-type')).toBe("Traitement...");
      expect(getLoadingMessage('')).toBe("Traitement...");
    });
  });
});