// src/middleware/auth.ts
import { auth } from "@lib/auth";
import type { MiddlewareHandler } from "astro";

// Security: Define private routes that require authentication
const PRIVATE_PATHS = [
  "/dashboard",
  "/profil", 
  "/profile",
  "/account",
  "/admin",
  "/organisations",
  "/settings",
  "/api/admin", // Protect admin API routes
  "/api/user", // Protect user API routes
];

// Security: Define admin-only routes
const ADMIN_PATHS = [
  "/admin",
  "/api/admin",
];

// Security: Define public auth routes (should redirect if already authenticated)
const AUTH_PATHS = [
  "/connexion",
  "/inscription", 
  "/mot-de-passe-oublie",
];

export const onRequest: MiddlewareHandler = async ({ request, url, locals }, next) => {
  try {
    // Security: Récupère session + user depuis Better Auth
    const result = await auth.api.getSession({
      headers: request.headers,
    });

    // Security: Injection dans locals pour les pages Astro
    locals.user = result?.user ?? null;
    locals.session = result?.session ?? null;

    // Security: Add security headers for all responses
    const response = await (async () => {
      // Security: Redirect authenticated users away from auth pages
      if (AUTH_PATHS.includes(url.pathname) && locals.user) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: "/dashboard", // or wherever authenticated users should go
          },
        });
      }

      // Security: Check for admin-only routes
      if (ADMIN_PATHS.some((path) => url.pathname.startsWith(path))) {
        if (!locals.user) {
          return new Response(null, {
            status: 302,
            headers: {
              Location: "/connexion?redirect=" + encodeURIComponent(url.pathname),
            },
          });
        }
        
        // Security: Check if user has admin role
        if (locals.user.role !== "admin") {
          return new Response(null, {
            status: 403,
            headers: {
              "Content-Type": "text/html",
            },
          });
        }
      }

      // Security: Redirection automatique si page privée et pas connecté
      if (PRIVATE_PATHS.some((path) => url.pathname.startsWith(path)) && !locals.user) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: "/connexion?redirect=" + encodeURIComponent(url.pathname),
          },
        });
      }

      // Continue to the next middleware/page
      return next();
    })();

    // Security: Add security headers to all responses
    if (response instanceof Response) {
      // Security headers
      response.headers.set("X-Frame-Options", "DENY");
      response.headers.set("X-Content-Type-Options", "nosniff");
      response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
      response.headers.set("X-XSS-Protection", "1; mode=block");
      
      // Security: Content Security Policy (adjust as needed for your app)
      response.headers.set(
        "Content-Security-Policy",
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self'; " +
        "connect-src 'self'; " +
        "frame-ancestors 'none';"
      );

      // Security: HSTS in production
      if (process.env.NODE_ENV === "production") {
        response.headers.set(
          "Strict-Transport-Security", 
          "max-age=31536000; includeSubDomains; preload"
        );
      }
    }

    return response;

  } catch (error) {
    // Security: Log authentication errors but don't expose details
    console.error("Authentication middleware error:", error);
    
    // Security: Return a generic error response
    return new Response(null, {
      status: 500,
      headers: {
        "Content-Type": "text/html",
      },
    });
  }
};
