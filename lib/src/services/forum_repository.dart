import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:ai_chat/src/models/forum_models.dart';

class ForumRepository {
  final FirebaseFirestore _db;
  ForumRepository({FirebaseFirestore? db})
    : _db = db ?? FirebaseFirestore.instance;

  Stream<List<ForumThread>> threadsStream({int limit = 30}) {
    return _db
        .collection('threads')
        .orderBy('createdAt', descending: true)
        .limit(limit)
        .snapshots()
        .map(
          (snap) => snap.docs
              .map(ForumThread.fromDoc)
              .where((row) => !row.isHidden)
              .toList(),
        );
  }

  Stream<List<ForumReply>> repliesStream(String threadId, {int limit = 100}) {
    return _db
        .collection('threads')
        .doc(threadId)
        .collection('replies')
        .orderBy('createdAt')
        .limit(limit)
        .snapshots()
        .map(
          (snap) => snap.docs
              .map(ForumReply.fromDoc)
              .where((row) => !row.isHidden)
              .toList(),
        );
  }

  Future<void> createThread({
    required String body,
    required String author,
    required String authorUid,
  }) async {
    final now = DateTime.now();
    await _db.collection('threads').add({
      'title': '',
      'body': body,
      'author': author,
      'authorUid': authorUid,
      'createdAt': Timestamp.fromDate(now),
      'replyCount': 0,
      'edited': false,
      'isFlagged': false,
      'isHidden': false,
    });
  }

  Future<void> updateThreadBody({
    required String threadId,
    required String body,
  }) async {
    await _db.collection('threads').doc(threadId).update({
      'body': body,
      'edited': true,
    });
  }

  Future<void> deleteThread(String threadId) async {
    // Optionally delete subcollection; for simplicity just delete thread.
    await _db.collection('threads').doc(threadId).delete();
  }

  Future<void> addReply({
    required String threadId,
    required String body,
    required String author,
    required String authorUid,
  }) async {
    final now = DateTime.now();
    final threadRef = _db.collection('threads').doc(threadId);
    final replyRef = threadRef.collection('replies').doc();
    await _db.runTransaction((tx) async {
      tx.set(replyRef, {
        'threadId': threadId,
        'body': body,
        'author': author,
        'authorUid': authorUid,
        'createdAt': Timestamp.fromDate(now),
        'edited': false,
        'isFlagged': false,
        'isHidden': false,
      });
      tx.update(threadRef, {'replyCount': FieldValue.increment(1)});
    });
  }

  Future<void> updateReply({
    required String threadId,
    required String replyId,
    required String body,
  }) async {
    await _db
        .collection('threads')
        .doc(threadId)
        .collection('replies')
        .doc(replyId)
        .update({'body': body, 'edited': true});
  }

  Future<void> deleteReply({
    required String threadId,
    required String replyId,
  }) async {
    final threadRef = _db.collection('threads').doc(threadId);
    final replyRef = threadRef.collection('replies').doc(replyId);
    await _db.runTransaction((tx) async {
      tx.delete(replyRef);
      tx.update(threadRef, {'replyCount': FieldValue.increment(-1)});
    });
  }
}
