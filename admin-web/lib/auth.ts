import { Timestamp } from "firebase-admin/firestore";
import { verify } from "@node-rs/argon2";

import { ADMIN_AUTH_DOC_PATH } from "./constants";
import { db } from "./firebase-admin";

function maxAttempts(): number {
  return Number(process.env.ADMIN_LOCKOUT_ATTEMPTS ?? 5);
}

function lockoutMinutes(): number {
  return Number(process.env.ADMIN_LOCKOUT_MINUTES ?? 15);
}

export interface AdminAuthDoc {
  username: string;
  passwordHashArgon2id: string;
  failedAttempts: number;
  lockUntil?: Timestamp;
  passwordUpdatedAt?: Timestamp;
}

export async function getAdminAuthDoc(): Promise<AdminAuthDoc | null> {
  const snap = await db.doc(ADMIN_AUTH_DOC_PATH).get();
  if (!snap.exists) {
    return null;
  }

  const data = snap.data() as Partial<AdminAuthDoc>;
  return {
    username: data.username ?? "",
    passwordHashArgon2id: data.passwordHashArgon2id ?? "",
    failedAttempts: Number(data.failedAttempts ?? 0),
    lockUntil: data.lockUntil,
    passwordUpdatedAt: data.passwordUpdatedAt,
  };
}

export async function verifyAdminCredentials(params: { username: string; password: string }): Promise<{
  ok: boolean;
  reason?: string;
}> {
  const doc = await getAdminAuthDoc();
  if (!doc) {
    return { ok: false, reason: "missing_admin_record" };
  }

  const now = Date.now();
  if (doc.lockUntil && doc.lockUntil.toMillis() > now) {
    return { ok: false, reason: "locked" };
  }

  const isUsernameMatch = doc.username === params.username;
  const isPasswordMatch = isUsernameMatch
    ? await verify(doc.passwordHashArgon2id, params.password)
    : false;

  const ref = db.doc(ADMIN_AUTH_DOC_PATH);

  if (!isPasswordMatch) {
    const attempts = (doc.failedAttempts ?? 0) + 1;
    const lock = attempts >= maxAttempts();
    await ref.set(
      {
        failedAttempts: lock ? 0 : attempts,
        lockUntil: lock ? Timestamp.fromMillis(now + lockoutMinutes() * 60 * 1000) : null,
      },
      { merge: true },
    );

    return { ok: false, reason: lock ? "locked" : "invalid_credentials" };
  }

  await ref.set(
    {
      failedAttempts: 0,
      lockUntil: null,
    },
    { merge: true },
  );

  return { ok: true };
}
