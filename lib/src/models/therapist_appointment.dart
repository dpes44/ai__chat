import 'package:cloud_firestore/cloud_firestore.dart';

class TherapistDoctor {
  final String id;
  final String name;
  final String specialization;
  final String bio;
  final String location;
  final String profileLink;
  final String photoUrl;
  final bool isActive;

  const TherapistDoctor({
    required this.id,
    required this.name,
    required this.specialization,
    required this.bio,
    required this.location,
    required this.profileLink,
    required this.photoUrl,
    required this.isActive,
  });

  factory TherapistDoctor.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data() ?? const <String, dynamic>{};
    return TherapistDoctor(
      id: doc.id,
      name: (data['name'] ?? '').toString(),
      specialization: (data['specialization'] ?? '').toString(),
      bio: (data['bio'] ?? '').toString(),
      location: (data['location'] ?? '').toString(),
      profileLink: (data['profileLink'] ?? '').toString(),
      photoUrl: (data['photoUrl'] ?? '').toString(),
      isActive: data['isActive'] != false,
    );
  }
}

class TherapistAppointment {
  final String id;
  final String userUid;
  final String userNickname;
  final String doctorId;
  final String doctorName;
  final String doctorSpecialization;
  final DateTime preferredDate;
  final String issueSummary;
  final String preferredLocation;
  final String onlineMeetingLink;
  final String note;
  final String status;
  final String adminNote;
  final DateTime createdAt;
  final DateTime updatedAt;

  const TherapistAppointment({
    required this.id,
    required this.userUid,
    required this.userNickname,
    required this.doctorId,
    required this.doctorName,
    required this.doctorSpecialization,
    required this.preferredDate,
    required this.issueSummary,
    required this.preferredLocation,
    required this.onlineMeetingLink,
    required this.note,
    required this.status,
    required this.adminNote,
    required this.createdAt,
    required this.updatedAt,
  });

  factory TherapistAppointment.fromDoc(
    DocumentSnapshot<Map<String, dynamic>> doc,
  ) {
    final data = doc.data() ?? const <String, dynamic>{};
    final preferredDate =
        (data['preferredDate'] as Timestamp?)?.toDate() ?? DateTime.now();
    final createdAt =
        (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now();
    final updatedAt = (data['updatedAt'] as Timestamp?)?.toDate() ?? createdAt;

    return TherapistAppointment(
      id: doc.id,
      userUid: (data['userUid'] ?? '').toString(),
      userNickname: (data['userNickname'] ?? '').toString(),
      doctorId: (data['doctorId'] ?? '').toString(),
      doctorName: (data['doctorName'] ?? '').toString(),
      doctorSpecialization: (data['doctorSpecialization'] ?? '').toString(),
      preferredDate: preferredDate,
      issueSummary: (data['issueSummary'] ?? '').toString(),
      preferredLocation: (data['preferredLocation'] ?? '').toString(),
      onlineMeetingLink: (data['onlineMeetingLink'] ?? '').toString(),
      note: (data['note'] ?? '').toString(),
      status: (data['status'] ?? 'requested').toString(),
      adminNote: (data['adminNote'] ?? '').toString(),
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}
