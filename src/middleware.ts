// src/middleware/auth.ts
import { auth } from "@lib/auth";
import type { MiddlewareHandler } from "astro";

const PRIVATE_PATHS = [
  "/dashboard",
  "/profil",
  "/profile",
  "/account",
  "/admin",
  "/organisations",
  // ajoute ici toutes les routes privées
];

export const onRequest: MiddlewareHandler = async ({ request, url, locals }, next) => {
  // Récupère session + user depuis Better Auth
  const result = await auth.api.getSession({
    headers: request.headers,
  });

  // Injection dans locals pour les pages Astro
  locals.user = result?.user ?? null;
  locals.session = result?.session ?? null;

  // Redirection automatique si page privée et pas connecté
  if (PRIVATE_PATHS.some((path) => url.pathname.startsWith(path)) && !locals.user) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/connexion", // page de connexion
      },
    });
  }

  return next();
};
