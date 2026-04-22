import { UserRecord } from "firebase-admin/auth";

import { USERS_COLLECTION } from "@/lib/constants";
import { auth, db } from "@/lib/firebase-admin";
import { AdminUserRow, UsersListScope } from "./types";

type UserProfileSummary = {
  nickname: string;
  nicknameKey: string;
  isGuest: boolean | null;
};

function usersListLimit(): number {
  const raw = Number(process.env.ADMIN_USERS_LIST_LIMIT ?? 2000);
  if (!Number.isFinite(raw)) {
    return 2000;
  }
  return Math.max(1, Math.min(5000, Math.trunc(raw)));
}

function toIso(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toSortMillis(value: string): number {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

function uniqueProviderIds(record: UserRecord): string[] {
  return [...new Set(record.providerData.map((item) => item.providerId).filter(Boolean))];
}

function isGuestUser(record: UserRecord): boolean {
  const providers = uniqueProviderIds(record);
  if (providers.length === 0) {
    return true;
  }
  return providers.length === 1 && providers[0] === "anonymous";
}

async function listAllAuthUsers(limit: number): Promise<{ users: UserRecord[]; truncated: boolean }> {
  let nextPageToken: string | undefined;
  const users: UserRecord[] = [];

  while (users.length < limit) {
    const remaining = limit - users.length;
    const batchSize = Math.min(1000, remaining);
    const page = await auth.listUsers(batchSize, nextPageToken);
    users.push(...page.users);
    nextPageToken = page.pageToken;
    if (!nextPageToken) {
      return { users, truncated: false };
    }
  }

  return { users, truncated: true };
}

async function loadUserProfiles(uids: string[]): Promise<Map<string, UserProfileSummary>> {
  const result = new Map<string, UserProfileSummary>();
  if (uids.length === 0) {
    return result;
  }

  const chunkSize = 200;
  for (let i = 0; i < uids.length; i += chunkSize) {
    const chunk = uids.slice(i, i + chunkSize);
    const refs = chunk.map((uid) => db.collection(USERS_COLLECTION).doc(uid));
    const snapshots = await db.getAll(...refs);

    for (const snap of snapshots) {
      if (!snap.exists) {
        continue;
      }
      const data = snap.data() ?? {};
      result.set(snap.id, {
        nickname: (data.nickname ?? "").toString(),
        nicknameKey: (data.nicknameKey ?? "").toString(),
        isGuest: typeof data.isGuest === "boolean" ? data.isGuest : null,
      });
    }
  }

  return result;
}

export async function listAdminUsers(scope: UsersListScope): Promise<{
  users: AdminUserRow[];
  truncated: boolean;
  total: number;
}> {
  const { users: authUsers, truncated } = await listAllAuthUsers(usersListLimit());
  const profileMap = await loadUserProfiles(authUsers.map((item) => item.uid));

  const allRows: AdminUserRow[] = authUsers
    .map((record) => {
      const profile = profileMap.get(record.uid);
      const guest = isGuestUser(record);
      const userType: AdminUserRow["userType"] = guest ? "guest" : "registered";
      return {
        uid: record.uid,
        email: record.email ?? "",
        displayName: record.displayName ?? "",
        nickname: profile?.nickname ?? "",
        userType,
        isGuest: guest,
        isBanned: record.disabled === true,
        profileIsGuest: profile?.isGuest ?? null,
        profileExists: Boolean(profile),
        providers: uniqueProviderIds(record),
        createdAt: toIso(record.metadata.creationTime),
        lastSignInAt: toIso(record.metadata.lastSignInTime),
      };
    })
    .sort((a, b) => toSortMillis(b.createdAt) - toSortMillis(a.createdAt));

  const rows =
    scope === "withProfile"
      ? allRows.filter((row) => row.profileExists)
      : scope === "withoutProfile"
        ? allRows.filter((row) => !row.profileExists)
        : allRows;

  return {
    users: rows,
    truncated,
    total: rows.length,
  };
}
