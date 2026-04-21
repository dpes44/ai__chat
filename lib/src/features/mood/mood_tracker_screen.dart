import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:ai_chat/src/core/constants/app_colors.dart';
import 'package:ai_chat/src/services/mood_repository.dart';

class MoodTrackerScreen extends StatefulWidget {
  final String nickname;

  const MoodTrackerScreen({super.key, required this.nickname});

  @override
  State<MoodTrackerScreen> createState() => _MoodTrackerScreenState();
}

class _MoodTrackerScreenState extends State<MoodTrackerScreen> {
  final MoodRepository _repository = MoodRepository();
  final TextEditingController _noteController = TextEditingController();

  late Future<List<MoodEntry>> _entriesFuture;
  String? _selectedMoodId;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _entriesFuture = _repository.loadEntries();
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _saveMood() async {
    final moodId = _selectedMoodId;
    if (moodId == null || _saving) return;

    FocusScope.of(context).unfocus();
    setState(() => _saving = true);

    try {
      await _repository.saveToday(moodId: moodId, note: _noteController.text);

      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Mood saved for today.')));

      setState(() {
        _saving = false;
        _selectedMoodId = null;
        _noteController.clear();
        _entriesFuture = _repository.loadEntries();
      });
    } catch (error, stackTrace) {
      debugPrint('MoodTrackerScreen: save failed: $error\n$stackTrace');
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(_moodErrorMessage(error))));
    }
  }

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.of(context).padding.top;

    return FutureBuilder<List<MoodEntry>>(
      future: _entriesFuture,
      builder: (context, snapshot) {
        final loading = snapshot.connectionState == ConnectionState.waiting;
        final entries = snapshot.data ?? const <MoodEntry>[];
        final loadError = snapshot.hasError
            ? _moodErrorMessage(snapshot.error)
            : null;
        final loadErrorDebugDetails = snapshot.hasError
            ? _moodDebugDetails(snapshot.error)
            : null;
        final todayEntry = _entryForDate(entries, DateTime.now());
        final streak = _streakFromLatest(entries);

        return CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Container(
                color: AppColors.surface,
                padding: EdgeInsets.fromLTRB(20, top + 14, 20, 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'How are you feeling today?',
                      style: GoogleFonts.inter(
                        fontSize: 25,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                        letterSpacing: -0.6,
                        height: 1.15,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      todayEntry == null
                          ? 'Hi ${widget.nickname}, track your daily mood to understand patterns.'
                          : 'Today: ${_labelForMood(todayEntry.moodId)}',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Container(height: 0.5, color: AppColors.divider),
            ),
            if (loading)
              const SliverFillRemaining(
                child: Center(child: CircularProgressIndicator()),
              )
            else ...[
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 110),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    _MoodSelectionCard(
                      selectedMoodId: _selectedMoodId,
                      onSelectMood: (mood) =>
                          setState(() => _selectedMoodId = mood),
                    ),
                    if (_selectedMoodId != null) ...[
                      const SizedBox(height: 12),
                      _NoteComposer(
                        controller: _noteController,
                        saving: _saving,
                        onSave: _saveMood,
                      ),
                    ],
                    if (loadError != null) ...[
                      const SizedBox(height: 12),
                      _LoadErrorCard(
                        message: loadError,
                        debugDetails: loadErrorDebugDetails,
                      ),
                    ],
                    const SizedBox(height: 16),
                    _StreakCard(streakDays: streak),
                    const SizedBox(height: 16),
                    _RecentMoodsCard(entries: entries),
                  ]),
                ),
              ),
            ],
          ],
        );
      },
    );
  }
}

class _MoodSelectionCard extends StatelessWidget {
  final String? selectedMoodId;
  final ValueChanged<String> onSelectMood;

  const _MoodSelectionCard({
    required this.selectedMoodId,
    required this.onSelectMood,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.borderFaint, width: 0.8),
      ),
      child: Row(
        children: _moodOptions.map((option) {
          final selected = selectedMoodId == option.id;
          return Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 3),
              child: InkWell(
                onTap: () => onSelectMood(option.id),
                borderRadius: BorderRadius.circular(12),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(
                    color: selected ? AppColors.highlight : Colors.transparent,
                    borderRadius: BorderRadius.circular(12),
                    border: selected
                        ? Border.all(
                            color: AppColors.primary.withValues(alpha: 0.35),
                            width: 1,
                          )
                        : null,
                  ),
                  child: Column(
                    children: [
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: option.color,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(option.icon, size: 20, color: Colors.white),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        option.label,
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _LoadErrorCard extends StatelessWidget {
  final String message;
  final String? debugDetails;

  const _LoadErrorCard({required this.message, this.debugDetails});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF4F4),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFF4B8B8), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            message,
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: const Color(0xFF7A1212),
              height: 1.35,
            ),
          ),
          if (kDebugMode &&
              debugDetails != null &&
              debugDetails!.trim().isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              debugDetails!,
              style: GoogleFonts.inter(
                fontSize: 11,
                color: const Color(0xFF9B2A2A),
                height: 1.3,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _NoteComposer extends StatelessWidget {
  final TextEditingController controller;
  final bool saving;
  final VoidCallback onSave;

  const _NoteComposer({
    required this.controller,
    required this.saving,
    required this.onSave,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.borderFaint, width: 0.8),
      ),
      child: Column(
        children: [
          TextField(
            controller: controller,
            maxLength: 500,
            maxLines: 3,
            style: GoogleFonts.inter(
              fontSize: 14,
              color: AppColors.textPrimary,
              height: 1.4,
            ),
            decoration: InputDecoration(
              hintText: 'Add a note (optional)...',
              hintStyle: GoogleFonts.inter(
                fontSize: 14,
                color: AppColors.textTertiary,
              ),
              filled: true,
              fillColor: AppColors.elevated,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.borderFaint),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.borderFaint),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.primary),
              ),
              contentPadding: const EdgeInsets.all(12),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: saving ? null : onSave,
              child: saving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : Text(
                      'Save Mood',
                      style: GoogleFonts.inter(fontWeight: FontWeight.w600),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StreakCard extends StatelessWidget {
  final int streakDays;

  const _StreakCard({required this.streakDays});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.borderFaint, width: 0.8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.trending_up_rounded,
                color: AppColors.primary,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                'Your Mood Streak',
                style: GoogleFonts.inter(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                  letterSpacing: -0.3,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Center(
            child: Column(
              children: [
                const Text('🔥', style: TextStyle(fontSize: 34)),
                const SizedBox(height: 4),
                Text(
                  '$streakDays days',
                  style: GoogleFonts.inter(
                    fontSize: 29,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                    letterSpacing: -0.6,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  streakDays > 0
                      ? 'Keep it going!'
                      : 'Log your first mood today.',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _RecentMoodsCard extends StatelessWidget {
  final List<MoodEntry> entries;

  const _RecentMoodsCard({required this.entries});

  @override
  Widget build(BuildContext context) {
    final recent = entries.take(10).toList();

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.borderFaint, width: 0.8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.calendar_today_rounded,
                color: AppColors.primary,
                size: 17,
              ),
              const SizedBox(width: 8),
              Text(
                'Recent Moods',
                style: GoogleFonts.inter(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                  letterSpacing: -0.3,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (recent.isEmpty)
            Text(
              'No entries yet. Start by logging your mood today.',
              style: GoogleFonts.inter(
                fontSize: 13,
                color: AppColors.textSecondary,
                height: 1.45,
              ),
            )
          else
            Column(
              children: recent.map((entry) {
                final option = _optionForMood(entry.moodId);
                if (option == null) return const SizedBox.shrink();

                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.elevated,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppColors.borderFaint,
                      width: 0.6,
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: option.color,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(option.icon, color: Colors.white, size: 18),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              option.label,
                              style: GoogleFonts.inter(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            Text(
                              _formatDate(entry.date),
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                color: AppColors.textTertiary,
                              ),
                            ),
                            if (entry.note.trim().isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(top: 2),
                                child: Text(
                                  entry.note.trim(),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
        ],
      ),
    );
  }
}

MoodEntry? _entryForDate(List<MoodEntry> entries, DateTime target) {
  final dateOnly = DateTime(target.year, target.month, target.day);
  for (final entry in entries) {
    if (entry.date == dateOnly) return entry;
  }
  return null;
}

int _streakFromLatest(List<MoodEntry> entries) {
  if (entries.isEmpty) return 0;

  final dateKeys = entries
      .map(
        (entry) => DateTime(entry.date.year, entry.date.month, entry.date.day),
      )
      .toSet();

  var streak = 0;
  var pointer = DateTime(
    entries.first.date.year,
    entries.first.date.month,
    entries.first.date.day,
  );

  while (dateKeys.contains(pointer)) {
    streak += 1;
    pointer = pointer.subtract(const Duration(days: 1));
  }

  return streak;
}

String _labelForMood(String moodId) {
  return _optionForMood(moodId)?.label ?? 'Mood';
}

String _formatDate(DateTime date) {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  final m = months[date.month - 1];
  return '$m ${date.day}, ${date.year}';
}

_MoodOption? _optionForMood(String moodId) {
  for (final option in _moodOptions) {
    if (option.id == moodId) return option;
  }
  return null;
}

class _MoodOption {
  final String id;
  final String label;
  final IconData icon;
  final Color color;

  const _MoodOption({
    required this.id,
    required this.label,
    required this.icon,
    required this.color,
  });
}

const List<_MoodOption> _moodOptions = [
  _MoodOption(
    id: 'great',
    label: 'Great',
    icon: Icons.wb_sunny_rounded,
    color: Color(0xFFF59E0B),
  ),
  _MoodOption(
    id: 'good',
    label: 'Good',
    icon: Icons.sentiment_satisfied_alt_rounded,
    color: Color(0xFF22C55E),
  ),
  _MoodOption(
    id: 'okay',
    label: 'Okay',
    icon: Icons.sentiment_neutral_rounded,
    color: Color(0xFF3B82F6),
  ),
  _MoodOption(
    id: 'bad',
    label: 'Bad',
    icon: Icons.sentiment_dissatisfied_rounded,
    color: Color(0xFFF97316),
  ),
  _MoodOption(
    id: 'terrible',
    label: 'Terrible',
    icon: Icons.cloudy_snowing,
    color: Color(0xFFEF4444),
  ),
];

String _moodErrorMessage(Object? error) {
  if (error == null) {
    return 'Could not sync mood data right now.';
  }

  if (error is FirebaseException) {
    final code = error.code.trim().toLowerCase();
    if (code == 'permission-denied') {
      return 'Mood sync is blocked by Firestore rules. Deploy the latest firestore.rules and try again.';
    }
    if (code == 'unauthenticated' ||
        code == 'user-not-signed-in' ||
        code == 'requires-authentication') {
      return 'Please sign in again, then retry saving your mood.';
    }
    if (code == 'unavailable' ||
        code == 'network-request-failed' ||
        code == 'deadline-exceeded') {
      return 'No network connection to Firestore right now. Please retry.';
    }
    if (code == 'failed-precondition') {
      return 'Mood data query is blocked by Firestore preconditions/index. Deploy latest indexes/rules and retry.';
    }
  }

  final text = error.toString().toLowerCase();
  if (text.contains('permission-denied')) {
    return 'Mood sync is blocked by Firestore rules. Deploy the latest firestore.rules and try again.';
  }
  if (text.contains('unauthenticated') ||
      text.contains('requires authentication') ||
      text.contains('must be signed in') ||
      text.contains('not signed in')) {
    return 'Please sign in again, then retry saving your mood.';
  }
  if (text.contains('unavailable') ||
      text.contains('network') ||
      text.contains('timeout')) {
    return 'No network connection to Firestore right now. Please retry.';
  }
  if (text.contains('failed-precondition') ||
      text.contains('missing or insufficient permissions') ||
      text.contains('requires an index')) {
    return 'Mood sync is blocked by Firestore configuration. Deploy rules/indexes and retry.';
  }

  return 'Could not sync mood data right now.';
}

String? _moodDebugDetails(Object? error) {
  if (!kDebugMode || error == null) {
    return null;
  }

  if (error is FirebaseException) {
    final code = error.code.trim();
    final message = (error.message ?? '').trim();
    if (code.isEmpty && message.isEmpty) {
      return error.toString();
    }
    if (message.isEmpty) {
      return 'firebase:$code';
    }
    return 'firebase:$code - $message';
  }

  final text = error.toString().trim();
  if (text.isEmpty) {
    return null;
  }
  if (text.length <= 200) {
    return text;
  }
  return '${text.substring(0, 200)}...';
}
