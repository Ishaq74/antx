# STACK TECHNIQUE

- Astrojs -> with npm create astro@latest
- Astro Icon and circle-flags, mdi icons librairies -> with npm install astro-icon @iconify-json/mdi @iconify-json/circle-flags
- Astro Font -> with npm i astro-font
- Pgsql via Prisma -> with npm install prisma tsx --save-dev
npm install @prisma/client
- Better-Auth -> with npm install better-auth
- NodeMailer -> with npm install nodemailer npm install --save-dev @types/nodemailer

npx @better-auth/cli generate → met à jour le schéma
npx prisma migrate dev ou npx prisma db push → applique le schéma à ta base.

La doc Better-Auth se trouve dans docs/better-auth et comprend :

- basic-usage
- username
- email-otp
- admin
- organization