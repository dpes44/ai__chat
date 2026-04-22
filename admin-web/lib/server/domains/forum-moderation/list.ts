import {
  FORUM_REPLIES_SUBCOLLECTION,
  FORUM_THREADS_COLLECTION,
} from "@/lib/constants";
import { db } from "@/lib/firebase-admin";
import { JsonMap } from "./types";

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
