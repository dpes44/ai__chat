import {
  APPOINTMENTS_COLLECTION,
  DOCTORS_COLLECTION,
} from "@/lib/constants";
import { db } from "@/lib/firebase-admin";
import { JsonMap } from "./types";

function toIso(value: unknown): string {
  const date = (value as { toDate?: () => Date } | null)?.toDate?.();
  return date ? date.toISOString() : "";
}

function toMs(value: unknown): number {
  const date = (value as { toDate?: () => Date } | null)?.toDate?.();
  return date ? date.getTime() : 0;
}

export async function listAppointmentsData(): Promise<{
  doctors: Array<{
    id: string;
    name: string;
    specialization: string;
    bio: string;
    location: string;
    profileLink: string;
    photoUrl: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  appointments: Array<{
    id: string;
    userUid: string;
    userNickname: string;
    doctorId: string;
    doctorName: string;
    doctorSpecialization: string;
    preferredDate: string;
    issueSummary: string;
    preferredLocation: string;
    onlineMeetingLink: string;
    note: string;
    status: string;
    adminNote: string;
    createdAt: string;
    updatedAt: string;
  }>;
}> {
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

  return { doctors, appointments };
}
