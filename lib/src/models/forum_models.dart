import 'package:cloud_firestore/cloud_firestore.dart';

class ForumThread {
  final String id;
  final String title;
  final String body;
  final String author;
  final String authorUid;
  final DateTime createdAt;
  final int replyCount;
  final bool edited;
  final bool isFlagged;
  final bool isHidden;

  const ForumThread({
    required this.id,
    required this.title,
    required this.body,
    required this.author,
    required this.authorUid,
    required this.createdAt,
    required this.replyCount,
    required this.edited,
    required this.isFlagged,
    required this.isHidden,
  });

  factory ForumThread.fromDoc(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    return ForumThread(
      id: doc.id,
      title: (data['title'] ?? '').toString(),
      body: (data['body'] ?? '').toString(),
      author: (data['author'] ?? '').toString(),
      authorUid: (data['authorUid'] ?? '').toString(),
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      replyCount: (data['replyCount'] as int?) ?? 0,
      edited: (data['edited'] as bool?) ?? false,
      isFlagged: (data['isFlagged'] as bool?) ?? false,
      isHidden: (data['isHidden'] as bool?) ?? false,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'title': title,
      'body': body,
      'author': author,
      'authorUid': authorUid,
      'createdAt': Timestamp.fromDate(createdAt),
      'replyCount': replyCount,
      'edited': edited,
      'isFlagged': isFlagged,
      'isHidden': isHidden,
    };
  }
}

class ForumReply {
  final String id;
  final String threadId;
  final String body;
  final String author;
  final String authorUid;
  final DateTime createdAt;
  final bool edited;
  final bool isFlagged;
  final bool isHidden;

  const ForumReply({
    required this.id,
    required this.threadId,
    required this.body,
    required this.author,
    required this.authorUid,
    required this.createdAt,
    required this.edited,
    required this.isFlagged,
    required this.isHidden,
  });

  factory ForumReply.fromDoc(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    return ForumReply(
      id: doc.id,
      threadId: (data['threadId'] ?? '').toString(),
      body: (data['body'] ?? '').toString(),
      author: (data['author'] ?? '').toString(),
      authorUid: (data['authorUid'] ?? '').toString(),
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      edited: (data['edited'] as bool?) ?? false,
      isFlagged: (data['isFlagged'] as bool?) ?? false,
      isHidden: (data['isHidden'] as bool?) ?? false,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'threadId': threadId,
      'body': body,
      'author': author,
      'authorUid': authorUid,
      'createdAt': Timestamp.fromDate(createdAt),
      'edited': edited,
      'isFlagged': isFlagged,
      'isHidden': isHidden,
    };
  }
}
