import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

import '../models/therapist_appointment.dart';

class TherapistAppointmentsRepository {
  TherapistAppointmentsRepository({FirebaseFirestore? db, FirebaseAuth? auth})
    : _db = db ?? FirebaseFirestore.instance,
      _auth = auth ?? FirebaseAuth.instance;

  final FirebaseFirestore _db;
  final FirebaseAuth _auth;

  CollectionReference<Map<String, dynamic>> get _doctors =>
      _db.collection('doctors');

  CollectionReference<Map<String, dynamic>> get _appointments =>
      _db.collection('appointments');

  Stream<List<TherapistDoctor>> doctorsStream() {
    return _doctors.where('isActive', isEqualTo: true).snapshots().map((snap) {
      final list = snap.docs.map(TherapistDoctor.fromDoc).toList();
      list.sort(
        (a, b) =>
            a.name.trim().toLowerCase().compareTo(b.name.trim().toLowerCase()),
      );
      return list;
    });
  }

  Stream<List<TherapistAppointment>> myAppointmentsStream() {
    final user = _auth.currentUser;
    if (user == null) {
      return const Stream<List<TherapistAppointment>>.empty();
    }

    return _appointments.where('userUid', isEqualTo: user.uid).snapshots().map((
      snap,
    ) {
      final rows = snap.docs.map(TherapistAppointment.fromDoc).toList();
      rows.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      return rows;
    });
  }

  Future<void> bookAppointment({
    required TherapistDoctor doctor,
    required DateTime preferredDate,
    required String issueSummary,
    required String preferredLocation,
    required String onlineMeetingLink,
    required String note,
    required String userNickname,
  }) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw FirebaseAuthException(
        code: 'user-not-signed-in',
        message: 'User must be signed in to book an appointment.',
      );
    }

    final trimmedIssue = issueSummary.trim();
    if (trimmedIssue.isEmpty) {
      throw ArgumentError('Issue summary is required.');
    }

    final payload = <String, dynamic>{
      'userUid': user.uid,
      'userNickname': userNickname.trim(),
      'doctorId': doctor.id,
      'doctorName': doctor.name.trim(),
      'doctorSpecialization': doctor.specialization.trim(),
      'preferredDate': Timestamp.fromDate(preferredDate),
      'issueSummary': trimmedIssue.length > 500
          ? trimmedIssue.substring(0, 500)
          : trimmedIssue,
      'preferredLocation': _trimTo(preferredLocation, 160),
      'onlineMeetingLink': _trimTo(onlineMeetingLink, 300),
      'note': _trimTo(note, 500),
      'status': 'requested',
      'adminNote': '',
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
      'requestSource': 'mobile-app',
    };

    try {
      await _appointments.add(payload);
    } on FirebaseException catch (error, stackTrace) {
      debugPrint(
        'TherapistAppointmentsRepository.bookAppointment FirebaseException: '
        'code=${error.code} message=${error.message}\n$stackTrace',
      );
      rethrow;
    } catch (error, stackTrace) {
      debugPrint(
        'TherapistAppointmentsRepository.bookAppointment failed: '
        '$error\n$stackTrace',
      );
      rethrow;
    }
  }
}

String _trimTo(String input, int maxLength) {
  final trimmed = input.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return trimmed.substring(0, maxLength);
}
