import { z } from "zod";

const toolOptionSchema = z.object({
  labelEn: z.string().min(1).max(200),
  labelNp: z.string().max(200).default(""),
  score: z.number().min(-100).max(100),
});

const toolQuestionSchema = z.object({
  textEn: z.string().min(1).max(1000),
  textNp: z.string().max(1000).default(""),
  options: z.array(toolOptionSchema).min(1).max(20),
});

const toolResponseSchema = z.object({
  min: z.number().min(-1000).max(1000),
  max: z.number().min(-1000).max(1000),
  textEn: z.string().min(1).max(2000),
  textNp: z.string().max(2000).default(""),
});

const toolSchema = z.object({
  id: z.string().min(1).max(80),
  nameEn: z.string().min(1).max(200),
  nameNp: z.string().max(200).default(""),
  summary: z.string().max(500).default(""),
  descriptionEn: z.string().max(5000).default(""),
  descriptionNp: z.string().max(5000).default(""),
  questions: z.array(toolQuestionSchema).max(40),
  responses: z.array(toolResponseSchema).max(40),
});

const therapistSubscriptionSchema = z.object({
  name: z.string().min(1).max(80),
  sessions: z.number().int().min(1).max(100),
  price: z.string().min(1).max(40),
  period: z.string().max(30).default(""),
  blurb: z.string().max(500).default(""),
  tag: z.string().max(80).default(""),
  featured: z.boolean().default(false),
  ctaLabel: z.string().max(80).default("Choose plan"),
});

const legalContentSchema = z.object({
  termsTitle: z.string().max(160).default("Terms & Conditions"),
  termsBody: z.string().max(50000).default(""),
  privacyTitle: z.string().max(160).default("Privacy Policy"),
  privacyBody: z.string().max(50000).default(""),
});

const legalContentDefaults = {
  termsTitle: "Terms & Conditions",
  termsBody: "",
  privacyTitle: "Privacy Policy",
  privacyBody: "",
};

export const contentUpdateSchema = z.object({
  csrfToken: z.string().min(1),
  promptContext: z.object({
    suicideHelpline: z.string().max(120),
    policeEmergency: z.string().max(120),
    ambulanceNumber: z.string().max(120),
    childHelpline: z.string().max(120),
    womenGbvHelpline: z.string().max(120),
    psychosocialHelpline: z.string().max(120),
  }),
  tools: z.array(toolSchema).max(100),
  therapistSubscriptions: z.array(therapistSubscriptionSchema).max(40),
  legalContent: legalContentSchema.default(legalContentDefaults),
});

export type ContentUpdatePayload = z.infer<typeof contentUpdateSchema>;
