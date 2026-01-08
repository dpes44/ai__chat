import 'package:cloud_firestore/cloud_firestore.dart';

class ForumThread {
  final String id;
  final String title;
  final String body;
  final String author;
  final DateTime createdAt;
  final int replyCount;
  final bool edited;

  const ForumThread({
    required this.id,
    required this.title,
    required this.body,
    required this.author,
    required this.createdAt,
    required this.replyCount,
    required this.edited,
  });

  factory ForumThread.fromDoc(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    return ForumThread(
      id: doc.id,
      title: (data['title'] ?? '').toString(),
      body: (data['body'] ?? '').toString(),
      author: (data['author'] ?? '').toString(),
      createdAt:
          (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      replyCount: (data['replyCount'] as int?) ?? 0,
      edited: (data['edited'] as bool?) ?? false,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'title': title,
      'body': body,
      'author': author,
      'createdAt': Timestamp.fromDate(createdAt),
      'replyCount': replyCount,
      'edited': edited,
    };
  }
}

class ForumReply {
  final String id;
  final String threadId;
  final String body;
  final String author;
  final DateTime createdAt;
  final bool edited;

  const ForumReply({
    required this.id,
    required this.threadId,
    required this.body,
    required this.author,
    required this.createdAt,
    required this.edited,
  });

  factory ForumReply.fromDoc(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    return ForumReply(
      id: doc.id,
      threadId: (data['threadId'] ?? '').toString(),
      body: (data['body'] ?? '').toString(),
      author: (data['author'] ?? '').toString(),
      createdAt:
          (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      edited: (data['edited'] as bool?) ?? false,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'threadId': threadId,
      'body': body,
      'author': author,
      'createdAt': Timestamp.fromDate(createdAt),
      'edited': edited,
    };
  }
}
