import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:ai_chat/src/features/auth/domain/user_profile.dart';
import 'package:ai_chat/src/core/generated/firestore_contract.dart';

class UserProfileRepository {
  UserProfileRepository({FirebaseFirestore? db})
    : _db = db ?? FirebaseFirestore.instance;

  final FirebaseFirestore _db;

  Future<UserProfile?> fetchProfile(String uid) async {
    final doc = await _db.collection(FirestoreCollections.users).doc(uid).get();
    if (!doc.exists) {
      return null;
    }
    return UserProfile.fromDoc(doc);
  }

  Future<bool> claimNickname({
    required String uid,
    required String nickname,
    required bool isGuest,
  }) async {
    final cleanNickname = nickname.trim();
    if (cleanNickname.isEmpty) return false;
    final nicknameKey = normalizeNickname(cleanNickname);
    if (nicknameKey.isEmpty) return false;

    final userRef = _db.collection(FirestoreCollections.users).doc(uid);
    final claimRef = _db
        .collection(FirestoreCollections.nicknameClaims)
        .doc(nicknameKey);

    return _db.runTransaction((tx) async {
      final userSnap = await tx.get(userRef);
      final claimSnap = await tx.get(claimRef);

      if (claimSnap.exists) {
        final claimData = claimSnap.data() ?? {};
        final ownerUid = (claimData['uid'] ?? '').toString();
        if (ownerUid.isNotEmpty && ownerUid != uid) {
          return false;
        }
      }

      if (userSnap.exists) {
        final userData = userSnap.data() ?? {};
        final oldNicknameKey = (userData['nicknameKey'] ?? '').toString();
        if (oldNicknameKey.isNotEmpty && oldNicknameKey != nicknameKey) {
          final oldClaimRef = _db
              .collection(FirestoreCollections.nicknameClaims)
              .doc(oldNicknameKey);
          final oldClaimSnap = await tx.get(oldClaimRef);
          if (oldClaimSnap.exists) {
            final oldClaimData = oldClaimSnap.data() ?? {};
            if ((oldClaimData['uid'] ?? '').toString() == uid) {
              tx.delete(oldClaimRef);
            }
          }
        }
      }

      final now = FieldValue.serverTimestamp();
      tx.set(claimRef, {
        'uid': uid,
        'nickname': cleanNickname,
        'nicknameKey': nicknameKey,
        'updatedAt': now,
      }, SetOptions(merge: true));

      tx.set(userRef, {
        'uid': uid,
        'nickname': cleanNickname,
        'nicknameKey': nicknameKey,
        'isGuest': isGuest,
        'updatedAt': now,
        'createdAt': userSnap.exists
            ? (userSnap.data()?['createdAt'] ?? now)
            : now,
      }, SetOptions(merge: true));

      return true;
    });
  }
}

String normalizeNickname(String value) {
  return value.trim().toLowerCase().replaceAll(RegExp(r'\\s+'), ' ');
}
