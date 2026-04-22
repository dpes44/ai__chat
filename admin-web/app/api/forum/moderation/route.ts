import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { assertCsrfToken } from "@/lib/csrf";
import {
  COLLECTION_META_DOC_ID,
  FORUM_REPLIES_SUBCOLLECTION,
  FORUM_THREADS_COLLECTION,
} from "@/lib/constants";
import { db } from "@/lib/firebase-admin";
import { getAdminSession } from "@/lib/session";

type JsonMap = Record<string, unknown>;

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

const updateSchema = z.object({
  csrfToken: z.string().min(1),
  kind: z.enum(["thread", "reply"]),
  threadId: z.string().min(1).max(160),
  replyId: z.string().max(160).optional(),
  isFlagged: z.boolean(),
  isHidden: z.boolean(),
  moderationNote: z.string().max(500).default(""),
});

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const threadDocs = await db.collection(FORUM_THREADS_COLLECTION).get();
  const threadRows = threadDocs.docs
    .filter((doc) => doc.id !== COLLECTION_META_DOC_ID)
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

  return NextResponse.json({
    data: {
      threads: threadRows.map(({ ref, createdAtMs, ...row }) => row),
      replies,
    },
  });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  if (!assertCsrfToken(parsed.data.csrfToken)) {
    return NextResponse.json({ error: "Invalid CSRF token." }, { status: 403 });
  }

  const moderationNote = trimText(parsed.data.moderationNote, 500);
  const docRef =
    parsed.data.kind === "thread"
      ? db.collection(FORUM_THREADS_COLLECTION).doc(parsed.data.threadId)
      : db
          .collection(FORUM_THREADS_COLLECTION)
          .doc(parsed.data.threadId)
          .collection(FORUM_REPLIES_SUBCOLLECTION)
          .doc(parsed.data.replyId ?? "");

  if (parsed.data.kind === "reply" && !parsed.data.replyId) {
    return NextResponse.json({ error: "Missing replyId for reply moderation." }, { status: 400 });
  }

  const beforeSnap = await docRef.get();
  if (!beforeSnap.exists) {
    return NextResponse.json({ error: "Content not found." }, { status: 404 });
  }

  const before = beforeSnap.data() ?? {};
  const patch = {
    isFlagged: parsed.data.isFlagged,
    isHidden: parsed.data.isHidden,
    moderationNote,
    moderatedBy: session.sub,
    moderatedAt: FieldValue.serverTimestamp(),
  };

  await docRef.set(patch, { merge: true });

  await logAudit({
    actor: session.sub,
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

  return NextResponse.json({ ok: true });
}
