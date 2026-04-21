import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { assertCsrfToken } from "@/lib/csrf";
import { APPOINTMENTS_COLLECTION, DOCTORS_COLLECTION } from "@/lib/constants";
import { db } from "@/lib/firebase-admin";
import { getAdminSession } from "@/lib/session";

type JsonMap = Record<string, unknown>;

function toIso(value: unknown): string {
  const date = (value as { toDate?: () => Date } | null)?.toDate?.();
  return date ? date.toISOString() : "";
}

function toMs(value: unknown): number {
  const date = (value as { toDate?: () => Date } | null)?.toDate?.();
  return date ? date.getTime() : 0;
}

function toFiniteNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

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

const postSchema = z.union([upsertDoctorSchema, updateAppointmentSchema]);

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [doctorSnap, appointmentsSnap] = await Promise.all([
    db.collection(DOCTORS_COLLECTION).get(),
    db.collection(APPOINTMENTS_COLLECTION).get(),
  ]);

  const doctors = doctorSnap.docs
    .map((doc) => {
      const data = (doc.data() ?? {}) as JsonMap;
      return {
        id: doc.id,
        name: (data.name ?? "").toString(),
        specialization: (data.specialization ?? "").toString(),
        bio: (data.bio ?? "").toString(),
        location: (data.location ?? "").toString(),
        profileLink: (data.profileLink ?? "").toString(),
        photoUrl: (data.photoUrl ?? "").toString(),
        isActive: data.isActive === true,
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const appointments = appointmentsSnap.docs
    .map((doc) => {
      const data = (doc.data() ?? {}) as JsonMap;
      return {
        id: doc.id,
        userUid: (data.userUid ?? "").toString(),
        userNickname: (data.userNickname ?? "").toString(),
        doctorId: (data.doctorId ?? "").toString(),
        doctorName: (data.doctorName ?? "").toString(),
        doctorSpecialization: (data.doctorSpecialization ?? "").toString(),
        preferredDate: toIso(data.preferredDate),
        issueSummary: (data.issueSummary ?? "").toString(),
        preferredLocation: (data.preferredLocation ?? "").toString(),
        onlineMeetingLink: (data.onlineMeetingLink ?? "").toString(),
        note: (data.note ?? "").toString(),
        status: (data.status ?? "requested").toString(),
        adminNote: (data.adminNote ?? "").toString(),
        createdAt: toIso(data.createdAt),
        createdAtMs: toMs(data.createdAt),
        updatedAt: toIso(data.updatedAt),
      };
    })
    .sort((a, b) => b.createdAtMs - a.createdAtMs)
    .map(({ createdAtMs, ...row }) => row);

  return NextResponse.json({ data: { doctors, appointments } });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const detail = issue?.message ?? "Invalid payload.";
    return NextResponse.json({ error: detail }, { status: 400 });
  }

  if (!assertCsrfToken(parsed.data.csrfToken)) {
    return NextResponse.json({ error: "Invalid CSRF token." }, { status: 403 });
  }

  if (parsed.data.action === "upsertDoctor") {
    const doctorId = parsed.data.doctorId?.trim() ?? "";
    const docRef = doctorId
      ? db.collection(DOCTORS_COLLECTION).doc(doctorId)
      : db.collection(DOCTORS_COLLECTION).doc();
    const beforeSnap = await docRef.get();

    const payload = {
      name: parsed.data.name.trim(),
      specialization: parsed.data.specialization.trim(),
      bio: parsed.data.bio.trim(),
      location: parsed.data.location.trim(),
      profileLink: parsed.data.profileLink.trim(),
      photoUrl: parsed.data.photoUrl.trim(),
      isActive: parsed.data.isActive,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: session.sub,
      ...(beforeSnap.exists
          ? {}
          : {
              createdAt: FieldValue.serverTimestamp(),
            }),
    };

    await docRef.set(payload, { merge: true });

    await logAudit({
      actor: session.sub,
      action: "DOCTOR_UPSERTED",
      target: docRef.path,
      diffSummary: JSON.stringify(payload).slice(0, 900),
    });

    return NextResponse.json({ ok: true, doctorId: docRef.id });
  }

  const appointmentRef = db
    .collection(APPOINTMENTS_COLLECTION)
    .doc(parsed.data.appointmentId);
  const beforeSnap = await appointmentRef.get();
  if (!beforeSnap.exists) {
    return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
  }

  const before = beforeSnap.data() ?? {};
  const patch = {
    status: parsed.data.status,
    adminNote: parsed.data.adminNote.trim(),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: session.sub,
  };

  await appointmentRef.set(patch, { merge: true });

  await logAudit({
    actor: session.sub,
    action: "APPOINTMENT_STATUS_UPDATED",
    target: appointmentRef.path,
    diffSummary: JSON.stringify({
      before: {
        status: (before as JsonMap).status ?? "",
        adminNote: (before as JsonMap).adminNote ?? "",
      },
      after: patch,
    }).slice(0, 900),
  });

  return NextResponse.json({ ok: true });
}
