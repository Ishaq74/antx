import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";
import { username, admin, emailOTP, organization } from "better-auth/plugins"

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
        if (type === "sign-in") { 
            // Send the OTP for sign in
        } else if (type === "email-verification") { 
            // Send the OTP for email verification
        } else { 
            // Send the OTP for password reset
        } 
    }, 
    }),
] 
});