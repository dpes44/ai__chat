import { FieldValue } from "firebase-admin/firestore";

import { logAudit } from "@/lib/audit";
import {
  FORUM_REPLIES_SUBCOLLECTION,
  FORUM_THREADS_COLLECTION,
} from "@/lib/constants";
import { db } from "@/lib/firebase-admin";
import { ForumModerationServiceError, JsonMap } from "./types";

function trimText(value: unknown, max: number): string {
  const text = (value ?? "").toString().trim();
  if (text.length <= max) {
    return text;
  }
  return text.slice(0, max);
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
