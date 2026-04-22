import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import 'package:ai_chat/src/core/constants/app_colors.dart';
import 'package:ai_chat/src/features/therapist/domain/therapist_appointment.dart';
import 'package:ai_chat/src/features/content/domain/therapist_subscription.dart';
import 'package:ai_chat/src/features/therapist/data/therapist_appointments_repository.dart';
import 'package:ai_chat/src/features/content/data/therapist_subscriptions_repository.dart';

class TherapistScreen extends StatefulWidget {
  final String nickname;

  const TherapistScreen({super.key, required this.nickname});

  @override
  State<TherapistScreen> createState() => _TherapistScreenState();
}

class _TherapistScreenState extends State<TherapistScreen> {
  final TherapistSubscriptionsRepository _subscriptionsRepository =
      TherapistSubscriptionsRepository();
  final TherapistAppointmentsRepository _appointmentsRepository =
      TherapistAppointmentsRepository();

  late final Future<List<TherapistSubscription>> _plansFuture =
      _subscriptionsRepository.loadPlans();
  late final Stream<List<TherapistDoctor>> _doctorsStream =
      _appointmentsRepository.doctorsStream();
  late final Stream<List<TherapistAppointment>> _appointmentsStream =
      _appointmentsRepository.myAppointmentsStream();

  Future<void> _openBookSheet(TherapistDoctor doctor) async {
    final hostMessenger = ScaffoldMessenger.of(context);
    final issuesController = TextEditingController();
    final locationController = TextEditingController(text: doctor.location);
    final linkController = TextEditingController(text: doctor.profileLink);
    final noteController = TextEditingController();
    DateTime selectedDate = DateTime.now().add(const Duration(days: 1));
    bool submitting = false;

    try {
      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        backgroundColor: AppColors.elevated,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        builder: (context) {
          return StatefulBuilder(
            builder: (context, setSheetState) {
              Future<void> pickDateTime() async {
                final pickedDate = await showDatePicker(
                  context: context,
                  firstDate: DateTime.now(),
                  lastDate: DateTime.now().add(const Duration(days: 365)),
                  initialDate: selectedDate,
                );
                if (pickedDate == null || !context.mounted) return;

                final pickedTime = await showTimePicker(
                  context: context,
                  initialTime: TimeOfDay.fromDateTime(selectedDate),
                );
                if (pickedTime == null) return;

                setSheetState(() {
                  selectedDate = DateTime(
                    pickedDate.year,
                    pickedDate.month,
                    pickedDate.day,
                    pickedTime.hour,
                    pickedTime.minute,
                  );
                });
              }

              return Padding(
                padding: EdgeInsets.only(
                  left: 20,
                  right: 20,
                  top: 20,
                  bottom: 20 + MediaQuery.of(context).viewInsets.bottom,
                ),
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Center(
                        child: Container(
                          width: 36,
                          height: 4,
                          margin: const EdgeInsets.only(bottom: 18),
                          decoration: BoxDecoration(
                            color: AppColors.divider,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      ),
                      Text(
                        'Book with ${doctor.name}',
                        style: GoogleFonts.inter(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        doctor.specialization,
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 14),
                      _FieldLabel(text: 'Preferred date & time'),
                      const SizedBox(height: 5),
                      InkWell(
                        onTap: pickDateTime,
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 12,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.highlight,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: AppColors.borderFaint,
                              width: 0.8,
                            ),
                          ),
                          child: Row(
                            children: [
                              const Icon(
                                Icons.event_note_rounded,
                                size: 18,
                                color: AppColors.primary,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                DateFormat(
                                  'EEE, MMM d • h:mm a',
                                ).format(selectedDate),
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  color: AppColors.textPrimary,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      _FieldLabel(text: 'Issues (required)'),
                      const SizedBox(height: 5),
                      _SheetTextField(
                        controller: issuesController,
                        maxLines: 3,
                        maxLength: 500,
                        hint: 'What would you like help with?',
                      ),
                      const SizedBox(height: 10),
                      _FieldLabel(text: 'Preferred location'),
                      const SizedBox(height: 5),
                      _SheetTextField(
                        controller: locationController,
                        maxLines: 1,
                        maxLength: 160,
                        hint: 'City / clinic / online',
                      ),
                      const SizedBox(height: 10),
                      _FieldLabel(text: 'Online meeting link'),
                      const SizedBox(height: 5),
                      _SheetTextField(
                        controller: linkController,
                        maxLines: 1,
                        maxLength: 300,
                        hint: 'https://...',
                      ),
                      const SizedBox(height: 10),
                      _FieldLabel(text: 'Additional note'),
                      const SizedBox(height: 5),
                      _SheetTextField(
                        controller: noteController,
                        maxLines: 3,
                        maxLength: 500,
                        hint: 'Anything else your therapist should know.',
                      ),
                      const SizedBox(height: 14),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: submitting
                              ? null
                              : () async {
                                  final issues = issuesController.text.trim();
                                  if (issues.isEmpty) {
                                    hostMessenger.showSnackBar(
                                      const SnackBar(
                                        content: Text(
                                          'Please enter the issues field.',
                                        ),
                                      ),
                                    );
                                    return;
                                  }

                                  setSheetState(() => submitting = true);
                                  try {
                                    await _appointmentsRepository
                                        .bookAppointment(
                                          doctor: doctor,
                                          preferredDate: selectedDate,
                                          issueSummary: issues,
                                          preferredLocation:
                                              locationController.text,
                                          onlineMeetingLink:
                                              linkController.text,
                                          note: noteController.text,
                                          userNickname: widget.nickname,
                                        );
                                    if (!context.mounted || !mounted) return;
                                    Navigator.of(context).pop();
                                    if (!mounted) return;
                                    hostMessenger.showSnackBar(
                                      const SnackBar(
                                        content: Text(
                                          'Appointment request submitted.',
                                        ),
                                      ),
                                    );
                                  } catch (error) {
                                    if (context.mounted) {
                                      setSheetState(() => submitting = false);
                                    }
                                    if (!mounted) return;
                                    hostMessenger.showSnackBar(
                                      SnackBar(
                                        content: Text(
                                          _appointmentErrorMessage(error),
                                        ),
                                      ),
                                    );
                                  }
                                },
                          child: submitting
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation<Color>(
                                      Colors.white,
                                    ),
                                  ),
                                )
                              : Text(
                                  'Submit Appointment',
                                  style: GoogleFonts.inter(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      );
    } finally {
      issuesController.dispose();
      locationController.dispose();
      linkController.dispose();
      noteController.dispose();
    }
  }

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.of(context).padding.top;

    return DefaultTabController(
      length: 2,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            color: AppColors.surface,
            padding: EdgeInsets.fromLTRB(20, top + 14, 20, 18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Therapist',
                  style: GoogleFonts.inter(
                    fontSize: 26,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                    letterSpacing: -0.6,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Subscriptions and appointment booking',
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    color: AppColors.textTertiary,
                  ),
                ),
              ],
            ),
          ),
          Container(height: 0.5, color: AppColors.divider),
          Container(
            color: AppColors.surface,
            child: TabBar(
              indicatorColor: AppColors.primary,
              labelColor: AppColors.primary,
              unselectedLabelColor: AppColors.textSecondary,
              labelStyle: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
              tabs: const [
                Tab(text: 'Subscriptions'),
                Tab(text: 'Book Appointment'),
              ],
            ),
          ),
          Expanded(
            child: TabBarView(
              children: [
                _SubscriptionsTab(plansFuture: _plansFuture),
                _AppointmentsTab(
                  doctorsStream: _doctorsStream,
                  appointmentsStream: _appointmentsStream,
                  onBook: _openBookSheet,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SubscriptionsTab extends StatelessWidget {
  final Future<List<TherapistSubscription>> plansFuture;

  const _SubscriptionsTab({required this.plansFuture});

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<TherapistSubscription>>(
      future: plansFuture,
      builder: (context, snapshot) {
        final plans = snapshot.data ?? const <TherapistSubscription>[];
        final loading = snapshot.connectionState == ConnectionState.waiting;

        if (loading) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError || plans.isEmpty) {
          return Center(
            child: Text(
              'Subscription plans unavailable.',
              style: GoogleFonts.inter(
                fontSize: 13,
                color: AppColors.textSecondary,
              ),
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 100),
          itemCount: plans.length,
          itemBuilder: (context, index) => _PlanCard(plan: plans[index]),
        );
      },
    );
  }
}

class _AppointmentsTab extends StatelessWidget {
  final Stream<List<TherapistDoctor>> doctorsStream;
  final Stream<List<TherapistAppointment>> appointmentsStream;
  final Future<void> Function(TherapistDoctor doctor) onBook;

  const _AppointmentsTab({
    required this.doctorsStream,
    required this.appointmentsStream,
    required this.onBook,
  });

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<TherapistAppointment>>(
      stream: appointmentsStream,
      builder: (context, appointmentsSnapshot) {
        final appointments =
            appointmentsSnapshot.data ?? const <TherapistAppointment>[];

        return StreamBuilder<List<TherapistDoctor>>(
          stream: doctorsStream,
          builder: (context, doctorsSnapshot) {
            final doctors = doctorsSnapshot.data ?? const <TherapistDoctor>[];
            final loading =
                appointmentsSnapshot.connectionState ==
                    ConnectionState.waiting ||
                doctorsSnapshot.connectionState == ConnectionState.waiting;

            if (loading) {
              return const Center(child: CircularProgressIndicator());
            }

            final loadError =
                appointmentsSnapshot.error ?? doctorsSnapshot.error;
            if (loadError != null) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Text(
                    _therapistDataErrorMessage(loadError),
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              );
            }

            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
              children: [
                _MyAppointmentsCard(appointments: appointments),
                const SizedBox(height: 14),
                _DoctorsCard(doctors: doctors, onBook: onBook),
              ],
            );
          },
        );
      },
    );
  }
}

class _MyAppointmentsCard extends StatelessWidget {
  final List<TherapistAppointment> appointments;

  const _MyAppointmentsCard({required this.appointments});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.borderFaint, width: 0.8),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 10),
            child: Row(
              children: [
                const Icon(
                  Icons.event_available_rounded,
                  size: 18,
                  color: AppColors.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  'My Appointments',
                  style: GoogleFonts.inter(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                    letterSpacing: -0.3,
                  ),
                ),
              ],
            ),
          ),
          Container(height: 0.5, color: AppColors.divider),
          if (appointments.isEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
              child: Text(
                'No appointments yet. Book one from the doctors list below.',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  color: AppColors.textSecondary,
                ),
              ),
            )
          else
            Column(
              children: appointments
                  .map((row) => _AppointmentTile(appointment: row))
                  .toList(),
            ),
        ],
      ),
    );
  }
}

class _AppointmentTile extends StatelessWidget {
  final TherapistAppointment appointment;

  const _AppointmentTile({required this.appointment});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      decoration: const BoxDecoration(
        border: Border(
          bottom: BorderSide(color: AppColors.divider, width: 0.5),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  appointment.doctorName,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              _StatusBadge(status: appointment.status),
            ],
          ),
          const SizedBox(height: 3),
          Text(
            appointment.doctorSpecialization,
            style: GoogleFonts.inter(
              fontSize: 12,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            DateFormat('EEE, MMM d • h:mm a').format(appointment.preferredDate),
            style: GoogleFonts.inter(
              fontSize: 12,
              color: AppColors.textPrimary,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Issue: ${appointment.issueSummary}',
            style: GoogleFonts.inter(
              fontSize: 12,
              color: AppColors.textSecondary,
            ),
          ),
          if (appointment.preferredLocation.trim().isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(
              'Location: ${appointment.preferredLocation}',
              style: GoogleFonts.inter(
                fontSize: 12,
                color: AppColors.textSecondary,
              ),
            ),
          ],
          if (appointment.onlineMeetingLink.trim().isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(
              'Link: ${appointment.onlineMeetingLink}',
              style: GoogleFonts.inter(
                fontSize: 12,
                color: AppColors.textSecondary,
              ),
            ),
          ],
          if (appointment.adminNote.trim().isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              'Admin note: ${appointment.adminNote}',
              style: GoogleFonts.inter(
                fontSize: 12,
                color: AppColors.accent,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;

  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    final normalized = status.trim().toLowerCase();
    Color bg;
    Color fg;
    String label;

    switch (normalized) {
      case 'confirmed':
        bg = const Color(0xFFDCFCE7);
        fg = const Color(0xFF166534);
        label = 'Confirmed';
        break;
      case 'completed':
        bg = const Color(0xFFD1FAE5);
        fg = const Color(0xFF065F46);
        label = 'Completed';
        break;
      case 'cancelled':
        bg = const Color(0xFFFEE2E2);
        fg = const Color(0xFF991B1B);
        label = 'Cancelled';
        break;
      default:
        bg = const Color(0xFFDBEAFE);
        fg = const Color(0xFF1D4ED8);
        label = 'Requested';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: GoogleFonts.inter(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: fg,
        ),
      ),
    );
  }
}

class _DoctorsCard extends StatelessWidget {
  final List<TherapistDoctor> doctors;
  final Future<void> Function(TherapistDoctor doctor) onBook;

  const _DoctorsCard({required this.doctors, required this.onBook});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.borderFaint, width: 0.8),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 10),
            child: Row(
              children: [
                const Icon(
                  Icons.medical_services_rounded,
                  size: 18,
                  color: AppColors.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  'Available Doctors',
                  style: GoogleFonts.inter(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                    letterSpacing: -0.3,
                  ),
                ),
              ],
            ),
          ),
          Container(height: 0.5, color: AppColors.divider),
          if (doctors.isEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
              child: Text(
                'No doctors available right now.',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  color: AppColors.textSecondary,
                ),
              ),
            )
          else
            Column(
              children: doctors
                  .map((doctor) => _DoctorTile(doctor: doctor, onBook: onBook))
                  .toList(),
            ),
        ],
      ),
    );
  }
}

class _DoctorTile extends StatelessWidget {
  final TherapistDoctor doctor;
  final Future<void> Function(TherapistDoctor doctor) onBook;

  const _DoctorTile({required this.doctor, required this.onBook});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      decoration: const BoxDecoration(
        border: Border(
          bottom: BorderSide(color: AppColors.divider, width: 0.5),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _DoctorAvatar(photoUrl: doctor.photoUrl, isActive: doctor.isActive),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      doctor.name,
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      doctor.specialization,
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    if (doctor.location.trim().isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Location: ${doctor.location}',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          if (doctor.bio.trim().isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              doctor.bio,
              style: GoogleFonts.inter(
                fontSize: 12,
                color: AppColors.textSecondary,
                height: 1.4,
              ),
            ),
          ],
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => onBook(doctor),
              child: Text(
                'Book Appointment',
                style: GoogleFonts.inter(fontWeight: FontWeight.w600),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DoctorAvatar extends StatelessWidget {
  final String photoUrl;
  final bool isActive;

  const _DoctorAvatar({required this.photoUrl, required this.isActive});

  @override
  Widget build(BuildContext context) {
    final trimmedUrl = photoUrl.trim();
    final avatar = trimmedUrl.isEmpty
        ? _avatarFallback()
        : ClipOval(
            child: Image.network(
              trimmedUrl,
              width: 52,
              height: 52,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) => _avatarFallback(),
            ),
          );

    return SizedBox(
      width: 52,
      height: 52,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          avatar,
          if (isActive)
            Positioned(
              right: -1,
              bottom: -1,
              child: Container(
                width: 14,
                height: 14,
                decoration: BoxDecoration(
                  color: AppColors.success,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.surface, width: 2),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _avatarFallback() {
    return Container(
      width: 52,
      height: 52,
      decoration: BoxDecoration(
        color: AppColors.primaryDim,
        shape: BoxShape.circle,
      ),
      alignment: Alignment.center,
      child: const Icon(
        Icons.person_rounded,
        size: 24,
        color: AppColors.primary,
      ),
    );
  }
}

class _PlanCard extends StatelessWidget {
  final TherapistSubscription plan;

  const _PlanCard({required this.plan});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: plan.featured ? AppColors.primaryDim : AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: plan.featured ? AppColors.primary : AppColors.borderFaint,
          width: plan.featured ? 1.5 : 0.8,
        ),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: plan.featured
                            ? AppColors.primary.withValues(alpha: 0.2)
                            : AppColors.elevated,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        plan.tag,
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: plan.featured
                              ? AppColors.accent
                              : AppColors.textTertiary,
                          letterSpacing: 0.2,
                        ),
                      ),
                    ),
                    const Spacer(),
                    RichText(
                      text: TextSpan(
                        children: [
                          TextSpan(
                            text: plan.price,
                            style: GoogleFonts.inter(
                              fontSize: 22,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                              letterSpacing: -0.5,
                            ),
                          ),
                          TextSpan(
                            text: plan.period,
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              color: AppColors.textTertiary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  plan.name,
                  style: GoogleFonts.inter(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  plan.blurb,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Icon(
                      Icons.calendar_today_outlined,
                      size: 13,
                      color: AppColors.textTertiary,
                    ),
                    const SizedBox(width: 5),
                    Text(
                      '${plan.sessions} sessions / month',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Container(height: 0.5, color: AppColors.divider),
          Padding(
            padding: const EdgeInsets.all(14),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {},
                style: plan.featured
                    ? null
                    : ElevatedButton.styleFrom(
                        backgroundColor: AppColors.elevated,
                        foregroundColor: AppColors.textPrimary,
                      ),
                child: Text(
                  plan.ctaLabel.trim().isEmpty ? 'Choose plan' : plan.ctaLabel,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  final String text;

  const _FieldLabel({required this.text});

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: GoogleFonts.inter(
        fontSize: 12,
        fontWeight: FontWeight.w700,
        color: AppColors.textPrimary,
      ),
    );
  }
}

class _SheetTextField extends StatelessWidget {
  final TextEditingController controller;
  final int maxLines;
  final int maxLength;
  final String hint;

  const _SheetTextField({
    required this.controller,
    required this.maxLines,
    required this.maxLength,
    required this.hint,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.highlight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderFaint, width: 0.8),
      ),
      child: TextField(
        controller: controller,
        maxLines: maxLines,
        maxLength: maxLength,
        style: GoogleFonts.inter(fontSize: 14, color: AppColors.textPrimary),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: GoogleFonts.inter(
            fontSize: 13,
            color: AppColors.textTertiary,
          ),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.all(12),
          counterText: '',
        ),
      ),
    );
  }
}

String _therapistDataErrorMessage(Object error) {
  if (error is FirebaseException) {
    final code = error.code.trim().toLowerCase();
    if (code == 'permission-denied') {
      return 'Could not load doctors. Deploy latest firestore.rules and ensure doctor records are active.';
    }
    if (code == 'unauthenticated' || code == 'user-not-signed-in') {
      return 'Please sign in again and retry.';
    }
    if (code == 'unavailable' || code == 'network-request-failed') {
      return 'Network unavailable. Please retry.';
    }
  }
  return 'Could not load therapist data right now.';
}

String _appointmentErrorMessage(Object error) {
  if (error is FirebaseException) {
    final code = error.code.trim().toLowerCase();
    if (code == 'permission-denied') {
      return 'Appointment request blocked by Firestore rules.';
    }
    if (code == 'unauthenticated' || code == 'user-not-signed-in') {
      return 'Please sign in again and retry.';
    }
    if (code == 'unavailable' || code == 'network-request-failed') {
      return 'Network unavailable. Please retry.';
    }
  }

  final text = error.toString().toLowerCase();
  if (text.contains('issues')) {
    return 'Please fill the issues field.';
  }
  return 'Could not book appointment right now.';
}
