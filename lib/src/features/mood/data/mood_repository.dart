import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:ai_chat/src/core/generated/firestore_contract.dart';

class MoodEntry {
  final DateTime date;
  final String moodId;
  final int moodScore;
  final String note;

  const MoodEntry({
    required this.date,
    required this.moodId,
    required this.moodScore,
    required this.note,
  });

  MoodEntry copyWith({
    DateTime? date,
    String? moodId,
    int? moodScore,
    String? note,
  }) {
    return MoodEntry(
      date: date ?? this.date,
      moodId: moodId ?? this.moodId,
      moodScore: moodScore ?? this.moodScore,
      note: note ?? this.note,
    );
  }

  factory MoodEntry.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data() ?? const <String, dynamic>{};
    final dateKey = (data['dateKey'] ?? doc.id).toString();
    final parsed = _parseDateKey(dateKey) ?? DateTime.now();
    return MoodEntry(
      date: DateTime(parsed.year, parsed.month, parsed.day),
      moodId: (data['moodId'] ?? '').toString(),
      moodScore:
          _safeInt(data['moodScore']) ??
          _scoreFromMoodId((data['moodId'] ?? '').toString()),
      note: (data['note'] ?? '').toString(),
    );
  }
}

class MoodRepository {
  MoodRepository({FirebaseFirestore? db, FirebaseAuth? auth})
    : _db = db ?? FirebaseFirestore.instance,
      _auth = auth ?? FirebaseAuth.instance;

  final FirebaseFirestore _db;
  final FirebaseAuth _auth;

  CollectionReference<Map<String, dynamic>> _moodLogsFor(String uid) {
    return _db
        .collection(FirestoreCollections.userMoods)
        .doc(uid)
        .collection(FirestoreSubcollections.moodLogs);
  }

  Future<User> _requireUser() async {
    var user = _auth.currentUser;
    if (user != null) {
      return user;
    }

    try {
      user = await _auth
          .authStateChanges()
          .where((u) => u != null)
          .cast<User>()
          .first
          .timeout(const Duration(seconds: 2));
    } catch (_) {
      // Fallback handled below.
    }

    if (user == null) {
      throw FirebaseAuthException(
        code: 'user-not-signed-in',
        message: 'User must be signed in to save mood entries.',
      );
    }

    return user;
  }

  Future<List<MoodEntry>> loadEntries({int limit = 90}) async {
    try {
      final user = _auth.currentUser;
      if (user == null) {
        return const <MoodEntry>[];
      }

      debugPrint('MoodRepository.loadEntries query=v3 uid=${user.uid}');
      final snap = await _moodLogsFor(user.uid).get();
      final docs = [...snap.docs];
      docs.sort((a, b) => b.id.compareTo(a.id));
      final limited = docs.take(limit);
      return limited.map(MoodEntry.fromDoc).toList();
    } on FirebaseException catch (error, stackTrace) {
      debugPrint(
        'MoodRepository.loadEntries FirebaseException: '
        'code=${error.code} message=${error.message}\n$stackTrace',
      );
      rethrow;
    } catch (error, stackTrace) {
      debugPrint('MoodRepository.loadEntries failed: $error\n$stackTrace');
      rethrow;
    }
  }

  Future<void> saveToday({required String moodId, String note = ''}) {
    return saveForDate(date: DateTime.now(), moodId: moodId, note: note);
  }

  Future<void> saveForDate({
    required DateTime date,
    required String moodId,
    String note = '',
  }) async {
    final user = await _requireUser();

    final normalizedDate = DateTime(date.year, date.month, date.day);
    final dateKey = _dateKey(normalizedDate);
    final normalizedMoodId = moodId.trim().toLowerCase();
    final score = _scoreFromMoodId(normalizedMoodId);
    final trimmedNote = note.trim();
    final safeNote = trimmedNote.length > 500
        ? trimmedNote.substring(0, 500)
        : trimmedNote;
    final docRef = _moodLogsFor(user.uid).doc(dateKey);

    try {
      await _db.runTransaction((tx) async {
        final existing = await tx.get(docRef);

        final payload = <String, dynamic>{
          'uid': user.uid,
          'dateKey': dateKey,
          'date': Timestamp.fromDate(
            DateTime.utc(
              normalizedDate.year,
              normalizedDate.month,
              normalizedDate.day,
            ),
          ),
          'moodId': normalizedMoodId,
          'moodScore': score,
          'note': safeNote,
          'noteLength': safeNote.length,
          'source': 'mobile-app',
          'updatedAt': FieldValue.serverTimestamp(),
        };

        if (!existing.exists) {
          payload['createdAt'] = FieldValue.serverTimestamp();
        }

        tx.set(docRef, payload, SetOptions(merge: true));
      });
    } on FirebaseException catch (error, stackTrace) {
      debugPrint(
        'MoodRepository.saveForDate FirebaseException: '
        'code=${error.code} message=${error.message}\n$stackTrace',
      );
      rethrow;
    } catch (error, stackTrace) {
      debugPrint('MoodRepository.saveForDate failed: $error\n$stackTrace');
      rethrow;
    }
  }
}

String _dateKey(DateTime date) {
  final y = date.year.toString().padLeft(4, '0');
  final m = date.month.toString().padLeft(2, '0');
  final d = date.day.toString().padLeft(2, '0');
  return '$y-$m-$d';
}

DateTime? _parseDateKey(String value) {
  final parts = value.split('-');
  if (parts.length != 3) return null;
  final y = int.tryParse(parts[0]);
  final m = int.tryParse(parts[1]);
  final d = int.tryParse(parts[2]);
  if (y == null || m == null || d == null) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return DateTime(y, m, d);
}

int _scoreFromMoodId(String moodId) {
  switch (moodId.trim().toLowerCase()) {
    case 'great':
      return 5;
    case 'good':
      return 4;
    case 'okay':
      return 3;
    case 'bad':
      return 2;
    case 'terrible':
      return 1;
    default:
      return 3;
  }
}

int? _safeInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value);
  return null;
}
