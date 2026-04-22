import { FieldValue } from "firebase-admin/firestore";

import { logAudit } from "@/lib/audit";
import {
  FORUM_REPLIES_SUBCOLLECTION,
  FORUM_THREADS_COLLECTION,
} from "@/lib/constants";
import { db } from "@/lib/firebase-admin";

type JsonMap = Record<string, unknown>;

export class ForumModerationServiceError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ForumModerationServiceError";
    this.status = status;
  }
}

function toFiniteNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIsoTimestamp(value: unknown): string {
  const date = (value as { toDate?: () => Date } | null)?.toDate?.();
  if (!date) {
    return "";
  }
  return date.toISOString();
}

function toTimestampMs(value: unknown): number {
  const date = (value as { toDate?: () => Date } | null)?.toDate?.();
  return date ? date.getTime() : 0;
}

function trimText(value: unknown, max: number): string {
  const text = (value ?? "").toString().trim();
  if (text.length <= max) {
    return text;
  }
  return text.slice(0, max);
}

export async function listForumModerationData(): Promise<{
  threads: Array<{
    id: string;
    body: string;
    author: string;
    authorUid: string;
    createdAt: string;
    replyCount: number;
    edited: boolean;
    isFlagged: boolean;
    isHidden: boolean;
    moderationNote: string;
    moderatedBy: string;
    moderatedAt: string;
  }>;
  replies: Array<{
    id: string;
    threadId: string;
    body: string;
    author: string;
    authorUid: string;
    createdAt: string;
    edited: boolean;
    isFlagged: boolean;
    isHidden: boolean;
    moderationNote: string;
    moderatedBy: string;
    moderatedAt: string;
  }>;
}> {
  const threadDocs = await db.collection(FORUM_THREADS_COLLECTION).get();
  const threadRows = threadDocs.docs
    .map((doc) => {
      const data = (doc.data() ?? {}) as JsonMap;
      return {
        id: doc.id,
        ref: doc.ref,
        body: (data.body ?? "").toString(),
        author: (data.author ?? "").toString(),
        authorUid: (data.authorUid ?? "").toString(),
        createdAt: toIsoTimestamp(data.createdAt),
        createdAtMs: toTimestampMs(data.createdAt),
        replyCount: Math.max(0, Math.trunc(toFiniteNumber(data.replyCount))),
        edited: data.edited === true,
        isFlagged: data.isFlagged === true,
        isHidden: data.isHidden === true,
        moderationNote: (data.moderationNote ?? "").toString(),
        moderatedBy: (data.moderatedBy ?? "").toString(),
        moderatedAt: toIsoTimestamp(data.moderatedAt),
      };
    })
    .sort((a, b) => b.createdAtMs - a.createdAtMs)
    .slice(0, 200);

  const repliesByThread = await Promise.all(
    threadRows.map((thread) => thread.ref.collection(FORUM_REPLIES_SUBCOLLECTION).get()),
  );

  const replies = repliesByThread
    .flatMap((snap) =>
      snap.docs.map((doc) => {
        const data = (doc.data() ?? {}) as JsonMap;
        return {
          id: doc.id,
          threadId: (data.threadId ?? doc.ref.parent.parent?.id ?? "").toString(),
          body: (data.body ?? "").toString(),
          author: (data.author ?? "").toString(),
          authorUid: (data.authorUid ?? "").toString(),
          createdAt: toIsoTimestamp(data.createdAt),
          createdAtMs: toTimestampMs(data.createdAt),
          edited: data.edited === true,
          isFlagged: data.isFlagged === true,
          isHidden: data.isHidden === true,
          moderationNote: (data.moderationNote ?? "").toString(),
          moderatedBy: (data.moderatedBy ?? "").toString(),
          moderatedAt: toIsoTimestamp(data.moderatedAt),
        };
      }),
    )
    .sort((a, b) => b.createdAtMs - a.createdAtMs)
    .slice(0, 500)
    .map(({ createdAtMs, ...row }) => row);

  const threads = threadRows.map(({ ref, createdAtMs, ...row }) => row);
  return { threads, replies };
}

export async function moderateForumContent(params: {
  actor: string;
  kind: "thread" | "reply";
  threadId: string;
  replyId?: string;
  isFlagged: boolean;
  isHidden: boolean;
  moderationNote: string;
}): Promise<void> {
  if (params.kind === "reply" && !params.replyId) {
    throw new ForumModerationServiceError("Missing replyId for reply moderation.", 400);
  }

  const docRef =
    params.kind === "thread"
      ? db.collection(FORUM_THREADS_COLLECTION).doc(params.threadId)
      : db
          .collection(FORUM_THREADS_COLLECTION)
          .doc(params.threadId)
          .collection(FORUM_REPLIES_SUBCOLLECTION)
          .doc(params.replyId ?? "");

  const beforeSnap = await docRef.get();
  if (!beforeSnap.exists) {
    throw new ForumModerationServiceError("Content not found.", 404);
  }

  const before = beforeSnap.data() ?? {};
  const patch = {
    isFlagged: params.isFlagged,
    isHidden: params.isHidden,
    moderationNote: trimText(params.moderationNote, 500),
    moderatedBy: params.actor,
    moderatedAt: FieldValue.serverTimestamp(),
  };

  await docRef.set(patch, { merge: true });

  await logAudit({
    actor: params.actor,
    action: "FORUM_CONTENT_MODERATED",
    target: docRef.path,
    diffSummary: JSON.stringify({
      before: {
        isFlagged: (before as JsonMap).isFlagged ?? false,
        isHidden: (before as JsonMap).isHidden ?? false,
        moderationNote: (before as JsonMap).moderationNote ?? "",
      },
      after: {
        isFlagged: patch.isFlagged,
        isHidden: patch.isHidden,
        moderationNote: patch.moderationNote,
      },
    }).slice(0, 900),
  });
}
