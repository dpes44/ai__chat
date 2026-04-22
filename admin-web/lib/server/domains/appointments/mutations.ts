import { FieldValue } from "firebase-admin/firestore";

import { logAudit } from "@/lib/audit";
import {
  APPOINTMENTS_COLLECTION,
  DOCTORS_COLLECTION,
} from "@/lib/constants";
import { db } from "@/lib/firebase-admin";
import { AppointmentsServiceError, JsonMap } from "./types";

export async function upsertDoctor(params: {
  actor: string;
  doctorId?: string;
  name: string;
  specialization: string;
  bio: string;
  location: string;
  profileLink: string;
  photoUrl: string;
  isActive: boolean;
}): Promise<{ doctorId: string }> {
  const doctorId = params.doctorId?.trim() ?? "";
  const docRef = doctorId
    ? db.collection(DOCTORS_COLLECTION).doc(doctorId)
    : db.collection(DOCTORS_COLLECTION).doc();
  const beforeSnap = await docRef.get();

  const payload = {
    name: params.name.trim(),
    specialization: params.specialization.trim(),
    bio: params.bio.trim(),
    location: params.location.trim(),
    profileLink: params.profileLink.trim(),
    photoUrl: params.photoUrl.trim(),
    isActive: params.isActive,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: params.actor,
    ...(beforeSnap.exists
      ? {}
      : {
          createdAt: FieldValue.serverTimestamp(),
        }),
  };

  await docRef.set(payload, { merge: true });

  await logAudit({
    actor: params.actor,
    action: "DOCTOR_UPSERTED",
    target: docRef.path,
    diffSummary: JSON.stringify(payload).slice(0, 900),
  });

  return { doctorId: docRef.id };
}

export async function updateAppointmentStatus(params: {
  actor: string;
  appointmentId: string;
  status: string;
  adminNote: string;
}): Promise<void> {
  const appointmentRef = db.collection(APPOINTMENTS_COLLECTION).doc(params.appointmentId);
  const beforeSnap = await appointmentRef.get();
  if (!beforeSnap.exists) {
    throw new AppointmentsServiceError("Appointment not found.", 404);
  }

  const before = beforeSnap.data() ?? {};
  const patch = {
    status: params.status,
    adminNote: params.adminNote.trim(),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: params.actor,
  };

  await appointmentRef.set(patch, { merge: true });

  await logAudit({
    actor: params.actor,
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
}
