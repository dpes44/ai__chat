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
type UsersServiceModule = typeof import("../../lib/server/domains/users/service");
type ForumServiceModule = typeof import("../../lib/server/domains/forum-moderation/service");
type RouterServiceModule = typeof import("../../lib/server/domains/router/service");
type PromptsServiceModule = typeof import("../../lib/server/domains/prompts/service");
type KeysServiceModule = typeof import("../../lib/server/domains/keys/service");
type ProviderKeysModule = typeof import("../../lib/provider-keys");

let firebaseAdmin: FirebaseAdminModule;
let usersService: UsersServiceModule;
let forumService: ForumServiceModule;
let routerService: RouterServiceModule;
let promptsService: PromptsServiceModule;
let keysService: KeysServiceModule;
let providerKeys: ProviderKeysModule;

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

async function deleteCollectionRecursive(
  collectionRef: CollectionReference,
) {
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

before(async () => {
  firebaseAdmin = await import("../../lib/firebase-admin");
  usersService = await import("../../lib/server/domains/users/service");
  forumService = await import("../../lib/server/domains/forum-moderation/service");
  routerService = await import("../../lib/server/domains/router/service");
  promptsService = await import("../../lib/server/domains/prompts/service");
  keysService = await import("../../lib/server/domains/keys/service");
  providerKeys = await import("../../lib/provider-keys");
});

beforeEach(async () => {
  await resetState();
});

describe("admin domain integration", () => {
  it("lists, bans, and deletes users with linked app data", async () => {
    const actor = "test-admin";

    const user = await firebaseAdmin.auth.createUser({
      uid: "user-target",
      email: "target@example.com",
      password: "Passw0rd!",
      displayName: "Target User",
    });
    const otherUser = await firebaseAdmin.auth.createUser({
      uid: "user-other",
      email: "other@example.com",
      password: "Passw0rd!",
      displayName: "Other User",
    });

    const now = Timestamp.fromDate(new Date("2026-04-22T10:00:00.000Z"));
    await firebaseAdmin.db.collection("users").doc(user.uid).set({
      uid: user.uid,
      nickname: "target",
      nicknameKey: "target",
      isGuest: false,
      createdAt: now,
      updatedAt: now,
    });
    await firebaseAdmin.db.collection("nickname_claims").doc("target").set({
      uid: user.uid,
      nickname: "target",
      nicknameKey: "target",
      updatedAt: now,
    });
    await firebaseAdmin.db.collection("appointments").doc("appt-1").set({
      userUid: user.uid,
      userNickname: "target",
      doctorId: "doc-1",
      doctorName: "Dr. One",
      doctorSpecialization: "Psychiatry",
      preferredDate: now,
      issueSummary: "Need support",
      preferredLocation: "",
      onlineMeetingLink: "",
      note: "",
      status: "requested",
      adminNote: "",
      requestSource: "mobile-app",
      createdAt: now,
      updatedAt: now,
    });
    await firebaseAdmin.db.collection("user_moods").doc(user.uid).set({
      uid: user.uid,
      createdAt: now,
      updatedAt: now,
    });
    await firebaseAdmin.db
      .collection("user_moods")
      .doc(user.uid)
      .collection("mood_logs")
      .doc("2026-04-22")
      .set({
        uid: user.uid,
        dateKey: "2026-04-22",
        date: now,
        moodId: "okay",
        moodScore: 3,
        note: "ok",
        noteLength: 2,
        source: "integration-test",
        createdAt: now,
        updatedAt: now,
      });
    await firebaseAdmin.db.collection("threads").doc("thread-owned").set({
      title: "",
      body: "owned by target",
      author: "target",
      authorUid: user.uid,
      createdAt: now,
      replyCount: 1,
      edited: false,
      isFlagged: false,
      isHidden: false,
    });
    await firebaseAdmin.db
      .collection("threads")
      .doc("thread-owned")
      .collection("replies")
      .doc("reply-other")
      .set({
        threadId: "thread-owned",
        body: "reply by other",
        author: "other",
        authorUid: otherUser.uid,
        createdAt: now,
        edited: false,
        isFlagged: false,
        isHidden: false,
      });
    await firebaseAdmin.db.collection("threads").doc("thread-other").set({
      title: "",
      body: "owned by other",
      author: "other",
      authorUid: otherUser.uid,
      createdAt: now,
      replyCount: 1,
      edited: false,
      isFlagged: false,
      isHidden: false,
    });
    await firebaseAdmin.db
      .collection("threads")
      .doc("thread-other")
      .collection("replies")
      .doc("reply-target")
      .set({
        threadId: "thread-other",
        body: "reply by target",
        author: "target",
        authorUid: user.uid,
        createdAt: now,
        edited: false,
        isFlagged: false,
        isHidden: false,
      });

    const listed = await usersService.listAdminUsers("withProfile");
    assert.equal(listed.total, 1);
    assert.equal(listed.users[0]?.uid, user.uid);
    assert.equal(listed.users[0]?.email, "target@example.com");
    assert.equal(listed.users[0]?.userType, "registered");

    const banResult = await usersService.setUserBanStatus({
      actor,
      uid: user.uid,
      banned: true,
      reason: "integration-test",
    });
    assert.equal(banResult.isBanned, true);

    const bannedUser = await firebaseAdmin.auth.getUser(user.uid);
    assert.equal(bannedUser.disabled, true);
    const profileAfterBan = await firebaseAdmin.db.collection("users").doc(user.uid).get();
    assert.equal(profileAfterBan.data()?.moderation?.isBanned, true);
    assert.equal(profileAfterBan.data()?.moderation?.banReason, "integration-test");

    const deleted = await usersService.deleteAdminUser({ actor, uid: user.uid });
    assert.equal(deleted.authUserDeleted, true);
    assert.equal(deleted.deletedThreads, 1);
    assert.equal(deleted.deletedReplies, 1);
    assert.equal(deleted.deletedAppointments, 1);
    assert.equal(deleted.deletedMoodLogs, 1);
    assert.equal(deleted.deletedProfile, true);
    assert.ok(deleted.deletedClaims >= 1);

    await assert.rejects(
      () => firebaseAdmin.auth.getUser(user.uid),
      (error: unknown) =>
        Boolean(error) &&
        (error as { code?: string }).code === "auth/user-not-found",
    );

    assert.equal((await firebaseAdmin.db.collection("users").doc(user.uid).get()).exists, false);
    assert.equal(
      (await firebaseAdmin.db.collection("appointments").where("userUid", "==", user.uid).get())
        .empty,
      true,
    );
    assert.equal(
      (await firebaseAdmin.db.collection("threads").doc("thread-owned").get()).exists,
      false,
    );
    assert.equal(
      (
        await firebaseAdmin.db
          .collection("threads")
          .doc("thread-other")
          .collection("replies")
          .doc("reply-target")
          .get()
      ).exists,
      false,
    );
    assert.equal(
      (
        await firebaseAdmin.db.collection("threads").doc("thread-other").get()
      ).data()?.replyCount,
      0,
    );
  });

  it("loads and moderates forum data", async () => {
    const actor = "test-moderator";
    const createdAt = Timestamp.fromDate(new Date("2026-04-22T11:00:00.000Z"));

    await firebaseAdmin.db.collection("threads").doc("thread-1").set({
      title: "",
      body: "hello forum",
      author: "alice",
      authorUid: "user-alice",
      createdAt,
      replyCount: 1,
      edited: false,
      isFlagged: false,
      isHidden: false,
      moderationNote: "",
      moderatedBy: "",
      moderatedAt: null,
    });
    await firebaseAdmin.db
      .collection("threads")
      .doc("thread-1")
      .collection("replies")
      .doc("reply-1")
      .set({
        threadId: "thread-1",
        body: "reply text",
        author: "bob",
        authorUid: "user-bob",
        createdAt,
        edited: false,
        isFlagged: false,
        isHidden: false,
        moderationNote: "",
        moderatedBy: "",
        moderatedAt: null,
      });

    const loaded = await forumService.listForumModerationData();
    assert.equal(loaded.threads.length, 1);
    assert.equal(loaded.replies.length, 1);
    assert.equal(loaded.threads[0]?.id, "thread-1");
    assert.equal(loaded.replies[0]?.id, "reply-1");

    await forumService.moderateForumContent({
      actor,
      kind: "thread",
      threadId: "thread-1",
      isFlagged: true,
      isHidden: true,
      moderationNote: "hidden for review",
    });
    await forumService.moderateForumContent({
      actor,
      kind: "reply",
      threadId: "thread-1",
      replyId: "reply-1",
      isFlagged: true,
      isHidden: false,
      moderationNote: "warned",
    });

    const threadAfter = await firebaseAdmin.db.collection("threads").doc("thread-1").get();
    assert.equal(threadAfter.data()?.isHidden, true);
    assert.equal(threadAfter.data()?.isFlagged, true);
    assert.equal(threadAfter.data()?.moderationNote, "hidden for review");

    const replyAfter = await firebaseAdmin.db
      .collection("threads")
      .doc("thread-1")
      .collection("replies")
      .doc("reply-1")
      .get();
    assert.equal(replyAfter.data()?.isHidden, false);
    assert.equal(replyAfter.data()?.isFlagged, true);
    assert.equal(replyAfter.data()?.moderationNote, "warned");
  });

  it("updates and reads router, prompts, and provider keys", async () => {
    const actor = "test-admin";

    await routerService.updateRouterConfig({
      actor,
      payload: {
        activeProvider: "openai",
        activeModel: "gpt-4o-mini",
        fallbackProvider: "anthropic",
        fallbackModel: "claude-3-5-haiku-latest",
        temperature: 0.3,
        maxTokens: 320,
        enabled: true,
      },
    });

    const router = await routerService.getRouterConfig();
    assert.equal(router.temperature, 0.3);
    assert.equal(router.maxTokens, 320);
    assert.equal(router.activeProvider, "openai");

    const usersRouterDoc = await firebaseAdmin.db.doc("usersrouter/current").get();
    const legacyRouterDoc = await firebaseAdmin.db.doc("app_config/ai_routing").get();
    assert.equal(usersRouterDoc.data()?.maxTokens, 320);
    assert.equal(legacyRouterDoc.data()?.maxTokens, 320);

    await promptsService.updateSystemPromptTemplate({
      actor,
      systemPromptTemplate: "You are concise and safe.",
    });
    const promptTemplate = await promptsService.getSystemPromptTemplate();
    assert.equal(promptTemplate, "You are concise and safe.");

    const promptsDoc = await firebaseAdmin.db.doc("prompts/current").get();
    assert.equal(promptsDoc.data()?.systemPromptTemplate, "You are concise and safe.");

    const firstRotation = await keysService.rotateProviderKey({
      actor,
      provider: "openai",
      newApiKey: "sk-test-key-1",
    });
    assert.equal(firstRotation.version, 1);

    const secondRotation = await keysService.rotateProviderKey({
      actor,
      provider: "openai",
      newApiKey: "sk-test-key-2",
    });
    assert.equal(secondRotation.version, 2);

    const statuses = await keysService.listProviderKeyStatuses();
    assert.equal(statuses.openai.configured, true);
    assert.equal(statuses.openai.version, 2);

    const decryptedKey = await providerKeys.getProviderApiKey("openai");
    assert.equal(decryptedKey, "sk-test-key-2");

    const keysDoc = await firebaseAdmin.db.doc("keys/providers").get();
    const legacyKeysDoc = await firebaseAdmin.db.doc("app_config/provider_keys").get();
    assert.equal(keysDoc.data()?.openaiVersion, 2);
    assert.equal(legacyKeysDoc.data()?.openaiVersion, 2);
  });
});
