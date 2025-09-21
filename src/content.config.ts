// Auto-generated content layer config from Prisma schema
import { defineCollection, z } from "astro:content";

export const collections = {
  user: defineCollection({
    type: "data",
    schema: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      emailVerified: z.boolean().optional(),
      image: z.string().optional(),
      createdAt: z.string(),
      updatedAt: z.string(),
      username: z.string().optional(),
      displayUsername: z.string().optional(),
      role: z.string().optional(),
      banned: z.boolean().optional(),
      banReason: z.string().optional(),
      banExpires: z.string().optional(),
    })
  }),
  organization: defineCollection({
    type: "data",
    schema: z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string().optional(),
      logo: z.string().optional(),
      createdAt: z.string(),
      metadata: z.string().optional(),
    })
  }),
  member: defineCollection({
    type: "data",
    schema: z.object({
      id: z.string(),
      organizationId: z.string(),
      userId: z.string(),
      role: z.string(),
      createdAt: z.string(),
    })
  }),
  invitation: defineCollection({
    type: "data",
    schema: z.object({
      id: z.string(),
      organizationId: z.string(),
      email: z.string(),
      role: z.string().optional(),
      status: z.string(),
      expiresAt: z.string(),
      inviterId: z.string(),
    })
  })
};