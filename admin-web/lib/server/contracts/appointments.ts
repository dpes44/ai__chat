import { z } from "zod";

const statusSchema = z.enum([
  "requested",
  "confirmed",
  "completed",
  "cancelled",
]);

const upsertDoctorSchema = z.object({
  csrfToken: z.string().min(1),
  action: z.literal("upsertDoctor"),
  doctorId: z.string().max(160).optional(),
  name: z.string().min(1).max(120),
  specialization: z.string().min(1).max(120),
  bio: z.string().max(1000).default(""),
  location: z.string().max(160).default(""),
  profileLink: z.string().max(300).default(""),
  photoUrl: z.string().max(500).default(""),
  isActive: z.boolean().default(true),
});

const updateAppointmentSchema = z.object({
  csrfToken: z.string().min(1),
  action: z.literal("updateAppointmentStatus"),
  appointmentId: z.string().min(1).max(160),
  status: statusSchema,
  adminNote: z.string().max(500).default(""),
});

export const appointmentsPostSchema = z.union([
  upsertDoctorSchema,
  updateAppointmentSchema,
]);

export type AppointmentsPostPayload = z.infer<typeof appointmentsPostSchema>;
