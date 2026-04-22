import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";

import { Timestamp, type CollectionReference } from "firebase-admin/firestore";

process.env.GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || "demo-ai-chat";
process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST =
  process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
process.env.ADMIN_KEYS_ENCRYPTION_SECRET =
  process.env.ADMIN_KEYS_ENCRYPTION_SECRET ||
  "integration-test-secret-0123456789abcdef";

type FirebaseAdminModule = typeof import("../../lib/firebase-admin");
type ForumServiceModule = typeof import("../../lib/server/domains/forum-moderation/service");
type UsersServiceModule = typeof import("../../lib/server/domains/users/service");
type ContentServiceModule = typeof import("../../lib/server/domains/content/service");
type AppContentServiceModule = typeof import("../../lib/server/domains/app-content/service");

type MobileThreadRow = {
  id: string;
  title: string;
  body: string;
  author: string;
  authorUid: string;
  createdAt: Date;
  replyCount: number;
  edited: boolean;
  isFlagged: boolean;
  isHidden: boolean;
};

type MobileReplyRow = {
  id: string;
  threadId: string;
  body: string;
  author: string;
  authorUid: string;
  createdAt: Date;
  edited: boolean;
  isFlagged: boolean;
  isHidden: boolean;
};

let firebaseAdmin: FirebaseAdminModule;
let forumService: ForumServiceModule;
let usersService: UsersServiceModule;
let contentService: ContentServiceModule;
let appContentService: AppContentServiceModule;

async function resetAuth() {
  let pageToken: string | undefined;
  while (true) {
    const page = await firebaseAdmin.auth.listUsers(1000, pageToken);
    await Promise.all(page.users.map((user) => firebaseAdmin.auth.deleteUser(user.uid)));
    pageToken = page.pageToken;
    if (!pageToken) {
      break;
    }
  }
}

async function deleteCollectionRecursive(collectionRef: CollectionReference) {
  while (true) {
    const snapshot = await collectionRef.limit(100).get();
    if (snapshot.empty) {
      return;
    }

    for (const doc of snapshot.docs) {
      const subCollections = await doc.ref.listCollections();
      for (const subCollection of subCollections) {
        await deleteCollectionRecursive(subCollection);
      }
      await doc.ref.delete();
    }
  }
}

async function resetFirestore() {
  const roots = await firebaseAdmin.db.listCollections();
  for (const rootCollection of roots) {
    await deleteCollectionRecursive(rootCollection);
  }
}

async function resetState() {
  await resetAuth();
  await resetFirestore();
}

function ensureDate(value: unknown): Date {
  if (value && typeof value === "object" && typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  throw new Error("Expected Firestore timestamp with toDate().");
}

function toStringField(record: Record<string, unknown>, key: string): string {
  return (record[key] ?? "").toString();
}

function toBoolField(record: Record<string, unknown>, key: string): boolean {
  return record[key] === true;
}

function toIntField(record: Record<string, unknown>, key: string): number {
  const parsed = Number(record[key]);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.trunc(parsed);
}

function parseMobileThreadDoc(
  doc: { id: string; data: () => Record<string, unknown> | undefined },
): MobileThreadRow {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    title: toStringField(data, "title"),
    body: toStringField(data, "body"),
    author: toStringField(data, "author"),
    authorUid: toStringField(data, "authorUid"),
    createdAt: ensureDate(data.createdAt),
    replyCount: toIntField(data, "replyCount"),
    edited: toBoolField(data, "edited"),
    isFlagged: toBoolField(data, "isFlagged"),
    isHidden: toBoolField(data, "isHidden"),
  };
}

function parseMobileReplyDoc(
  doc: { id: string; data: () => Record<string, unknown> | undefined },
): MobileReplyRow {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    threadId: toStringField(data, "threadId"),
    body: toStringField(data, "body"),
    author: toStringField(data, "author"),
    authorUid: toStringField(data, "authorUid"),
    createdAt: ensureDate(data.createdAt),
    edited: toBoolField(data, "edited"),
    isFlagged: toBoolField(data, "isFlagged"),
    isHidden: toBoolField(data, "isHidden"),
  };
}

before(async () => {
  firebaseAdmin = await import("../../lib/firebase-admin");
  forumService = await import("../../lib/server/domains/forum-moderation/service");
  usersService = await import("../../lib/server/domains/users/service");
  contentService = await import("../../lib/server/domains/content/service");
  appContentService = await import("../../lib/server/domains/app-content/service");
});

beforeEach(async () => {
  await resetState();
});

describe("cross-app contracts integration", () => {
  it("keeps forum thread/reply docs mobile-readable after admin moderation writes", async () => {
    const createdAt = Timestamp.fromDate(new Date("2026-04-22T10:20:00.000Z"));

    await firebaseAdmin.db.collection("threads").doc("thread-visible").set({
      title: "Visible",
      body: "visible body",
      author: "alice",
      authorUid: "user-alice",
      createdAt,
      replyCount: 2,
      edited: false,
      isFlagged: false,
      isHidden: false,
    });
    await firebaseAdmin.db.collection("threads").doc("thread-hidden").set({
      title: "Hidden",
      body: "hidden body",
      author: "bob",
      authorUid: "user-bob",
      createdAt,
      replyCount: 0,
      edited: false,
      isFlagged: false,
      isHidden: false,
    });

    await firebaseAdmin.db
      .collection("threads")
      .doc("thread-visible")
      .collection("replies")
      .doc("reply-visible")
      .set({
        threadId: "thread-visible",
        body: "reply visible",
        author: "cathy",
        authorUid: "user-cathy",
        createdAt,
        edited: false,
        isFlagged: false,
        isHidden: false,
      });
    await firebaseAdmin.db
      .collection("threads")
      .doc("thread-visible")
      .collection("replies")
      .doc("reply-hidden")
      .set({
        threadId: "thread-visible",
        body: "reply hidden",
        author: "dan",
        authorUid: "user-dan",
        createdAt,
        edited: false,
        isFlagged: false,
        isHidden: false,
      });

    await forumService.moderateForumContent({
      actor: "admin-cross-app",
      kind: "thread",
      threadId: "thread-hidden",
      isFlagged: true,
      isHidden: true,
      moderationNote: "hidden by moderation",
    });
    await forumService.moderateForumContent({
      actor: "admin-cross-app",
      kind: "reply",
      threadId: "thread-visible",
      replyId: "reply-hidden",
      isFlagged: true,
      isHidden: true,
      moderationNote: "hidden reply",
    });

    const threadSnap = await firebaseAdmin.db
      .collection("threads")
      .where("isHidden", "==", false)
      .get();
    const mobileThreads = threadSnap.docs.map(parseMobileThreadDoc);
    assert.equal(mobileThreads.length, 1);
    assert.equal(mobileThreads[0]?.id, "thread-visible");
    assert.equal(mobileThreads[0]?.authorUid, "user-alice");
    assert.equal(mobileThreads[0]?.isHidden, false);

    const repliesSnap = await firebaseAdmin.db
      .collection("threads")
      .doc("thread-visible")
      .collection("replies")
      .where("isHidden", "==", false)
      .get();
    const mobileReplies = repliesSnap.docs.map(parseMobileReplyDoc);
    assert.equal(mobileReplies.length, 1);
    assert.equal(mobileReplies[0]?.id, "reply-visible");
    assert.equal(mobileReplies[0]?.threadId, "thread-visible");
  });

  it("keeps content collections and public app-content payload mobile-readable after admin updates", async () => {
    await contentService.updateAdminContentSettings({
      actor: "admin-cross-app",
      nextConfig: {
        promptContext: {
          suicideHelpline: "1166",
          policeEmergency: "100",
          ambulanceNumber: "102",
          childHelpline: "1098",
          womenGbvHelpline: "1145",
          psychosocialHelpline: "1660-0102005",
        },
        tools: [
          {
            id: "grounding",
            nameEn: "Grounding",
            nameNp: "Grounding NP",
            summary: "A grounding exercise",
            descriptionEn: "Follow breathing prompts",
            descriptionNp: "NP breathing prompts",
            questions: [
              {
                textEn: "How stressed are you?",
                textNp: "NP stress question",
                options: [
                  {
                    labelEn: "Low",
                    labelNp: "Low NP",
                    score: 1,
                  },
                  {
                    labelEn: "High",
                    labelNp: "High NP",
                    score: 5,
                  },
                ],
              },
            ],
            responses: [
              {
                min: 0,
                max: 2.5,
                textEn: "You are doing okay.",
                textNp: "NP okay",
              },
              {
                min: 2.6,
                max: 5,
                textEn: "Try a short walk and breathing.",
                textNp: "NP breathing walk",
              },
            ],
          },
        ],
        therapistSubscriptions: [
          {
            name: "Starter Care",
            sessions: 2,
            price: "NPR 2,999",
            period: "month",
            blurb: "Intro plan",
            tag: "Popular",
            featured: true,
            ctaLabel: "Choose plan",
          },
        ],
        legalContent: {
          termsTitle: "Terms & Conditions",
          termsBody: "These are the terms.",
          privacyTitle: "Privacy Policy",
          privacyBody: "This is privacy content.",
        },
      },
    });

    const publicPayload = await appContentService.getPublicAppContent();
    assert.equal(typeof publicPayload.promptContext.suicideHelpline, "string");
    assert.equal(typeof publicPayload.promptContext.policeEmergency, "string");
    assert.equal(Array.isArray(publicPayload.tools), true);
    assert.equal(Array.isArray(publicPayload.therapistSubscriptions), true);
    assert.equal(typeof publicPayload.legalContent.termsTitle, "string");
    assert.equal(typeof publicPayload.legalContent.privacyBody, "string");

    assert.equal(publicPayload.tools.length, 1);
    assert.equal(publicPayload.tools[0]?.id, "grounding");
    assert.equal(publicPayload.tools[0]?.questions.length, 1);
    assert.equal(publicPayload.tools[0]?.responses.length, 2);

    assert.equal(publicPayload.therapistSubscriptions.length, 1);
    assert.equal(publicPayload.therapistSubscriptions[0]?.name, "Starter Care");

    const emergencyDocs = await firebaseAdmin.db
      .collection("content_emergency_numbers")
      .get();
    const toolsDocs = await firebaseAdmin.db.collection("content_tools").get();
    const planDocs = await firebaseAdmin.db
      .collection("content_therapist_subscriptions")
      .get();
    const termsDoc = await firebaseAdmin.db
      .collection("content_legal")
      .doc("terms")
      .get();
    const privacyDoc = await firebaseAdmin.db
      .collection("content_legal")
      .doc("privacy")
      .get();
    assert.equal(emergencyDocs.size, 6);
    assert.equal(toolsDocs.size, 1);
    assert.equal(planDocs.size, 1);
    assert.equal(termsDoc.exists, true);
    assert.equal(privacyDoc.exists, true);

    const legacyRouting = await firebaseAdmin.db.doc("app_config/ai_routing").get();
    const legacyData = legacyRouting.data() ?? {};
    assert.equal(Object.prototype.hasOwnProperty.call(legacyData, "tools"), false);
    assert.equal(
      Object.prototype.hasOwnProperty.call(legacyData, "therapistSubscriptions"),
      false,
    );
    assert.equal(Object.prototype.hasOwnProperty.call(legacyData, "legalContent"), false);
  });

  it("keeps user moderation state mobile-profile readable after ban/unban updates", async () => {
    const user = await firebaseAdmin.auth.createUser({
      uid: "user-contract",
      email: "contract@example.com",
      password: "Passw0rd!",
      displayName: "Contract User",
    });
    const createdAt = Timestamp.fromDate(new Date("2026-04-22T12:00:00.000Z"));
    await firebaseAdmin.db.collection("users").doc(user.uid).set({
      uid: user.uid,
      nickname: "contract-user",
      nicknameKey: "contract-user",
      isGuest: false,
      createdAt,
      updatedAt: createdAt,
    });

    await usersService.setUserBanStatus({
      actor: "admin-cross-app",
      uid: user.uid,
      banned: true,
      reason: "policy-test",
    });

    const userDocAfterBan = await firebaseAdmin.db.collection("users").doc(user.uid).get();
    const mobileProfileData = userDocAfterBan.data() ?? {};
    assert.equal(typeof (mobileProfileData.nickname ?? "").toString(), "string");
    assert.equal(typeof (mobileProfileData.nicknameKey ?? "").toString(), "string");
    assert.equal(mobileProfileData.isGuest === true || mobileProfileData.isGuest === false, true);
    assert.equal(mobileProfileData.moderation?.isBanned, true);
    assert.equal(mobileProfileData.moderation?.banReason, "policy-test");

    const authAfterBan = await firebaseAdmin.auth.getUser(user.uid);
    assert.equal(authAfterBan.disabled, true);

    await usersService.setUserBanStatus({
      actor: "admin-cross-app",
      uid: user.uid,
      banned: false,
      reason: "cleared",
    });

    const userDocAfterUnban = await firebaseAdmin.db.collection("users").doc(user.uid).get();
    assert.equal(userDocAfterUnban.data()?.moderation?.isBanned, false);

    const authAfterUnban = await firebaseAdmin.auth.getUser(user.uid);
    assert.equal(authAfterUnban.disabled, false);
  });
});
