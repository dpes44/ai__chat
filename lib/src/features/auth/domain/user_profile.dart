import 'package:cloud_firestore/cloud_firestore.dart';

class UserProfile {
  const UserProfile({
    required this.uid,
    required this.nickname,
    required this.nicknameKey,
    required this.isGuest,
    this.createdAt,
    this.updatedAt,
  });

  final String uid;
  final String nickname;
  final String nicknameKey;
  final bool isGuest;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  factory UserProfile.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data() ?? <String, dynamic>{};
    return UserProfile(
      uid: doc.id,
      nickname: (data['nickname'] ?? '').toString(),
      nicknameKey: (data['nicknameKey'] ?? '').toString(),
      isGuest: data['isGuest'] == true,
      createdAt: (data['createdAt'] as Timestamp?)?.toDate(),
      updatedAt: (data['updatedAt'] as Timestamp?)?.toDate(),
    );
  }
}
