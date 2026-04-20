import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:ai_chat/src/core/constants/app_colors.dart';
import 'package:ai_chat/src/core/constants/app_strings.dart';
import 'package:ai_chat/src/core/widgets/language_option_tile.dart';
import 'package:ai_chat/src/models/emergency_contact.dart';
import 'package:ai_chat/src/services/auth_service.dart';
import 'package:ai_chat/src/services/emergency_contacts_repository.dart';
import 'package:ai_chat/src/features/legal/privacy_policy_screen.dart';
import 'package:ai_chat/src/features/legal/terms_screen.dart';

class MoreScreen extends StatelessWidget {
  final String nickname;
  final bool isGuest;

  const MoreScreen({
    super.key,
    required this.nickname,
    required this.isGuest,
  });

  Future<void> _call(BuildContext context, String number) async {
    final uri = Uri(scheme: 'tel', path: number.replaceAll(' ', ''));
    try {
      if (!await launchUrl(uri) && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not call $number')),
        );
      }
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not call $number')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.of(context).padding.top;
    final initial = nickname.isNotEmpty ? nickname.characters.first.toUpperCase() : '?';

    return CustomScrollView(
      slivers: [
        // ── Header ──────────────────────────────────────────────────────
        SliverToBoxAdapter(
          child: Container(
            color: AppColors.surface,
            padding: EdgeInsets.fromLTRB(20, top + 14, 20, 20),
            child: Row(
              children: [
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppColors.primary, AppColors.accent],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    initial,
                    style: GoogleFonts.inter(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        nickname,
                        style: GoogleFonts.inter(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                          letterSpacing: -0.3,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        isGuest ? 'Guest session' : 'Signed in',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: AppColors.textTertiary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: Container(height: 0.5, color: AppColors.divider),
        ),

        SliverPadding(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 100),
          sliver: SliverList(
            delegate: SliverChildListDelegate([

              // ── Emergency contacts ─────────────────────────────────────
              _SectionHeader(
                icon: Icons.sos_rounded,
                label: 'Emergency',
                color: AppColors.error,
              ),
              const SizedBox(height: 10),
              FutureBuilder<List<EmergencyContact>>(
                future: EmergencyContactsRepository().loadContacts(),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Padding(
                      padding: EdgeInsets.symmetric(vertical: 16),
                      child: Center(child: CircularProgressIndicator()),
                    );
                  }
                  final contacts = snapshot.data ?? [];
                  if (contacts.isEmpty) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Text(
                        'Contacts unavailable.',
                        style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary),
                      ),
                    );
                  }
                  return Column(
                    children: contacts.map((c) => _ContactRow(
                      contact: c,
                      onTap: () => _call(context, c.number),
                    )).toList(),
                  );
                },
              ),
              const SizedBox(height: 24),

              // ── Language ───────────────────────────────────────────────
              _SectionHeader(
                icon: Icons.translate_rounded,
                label: context.strings.languagePrompt,
                color: AppColors.textTertiary,
              ),
              const SizedBox(height: 10),
              _MenuCard(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(14),
                    child: Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: [
                        LanguageOptionTile(
                          label: context.strings.englishLabel,
                          flag: '🇬🇧',
                          selected: context.appLanguage == AppLanguage.english,
                          onTap: () => context.setAppLanguage(AppLanguage.english),
                        ),
                        LanguageOptionTile(
                          label: context.strings.nepaliLabel,
                          flag: '🇳🇵',
                          selected: context.appLanguage == AppLanguage.nepali,
                          onTap: () => context.setAppLanguage(AppLanguage.nepali),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // ── Legal ──────────────────────────────────────────────────
              _SectionHeader(
                icon: Icons.description_outlined,
                label: 'Legal',
                color: AppColors.textTertiary,
              ),
              const SizedBox(height: 10),
              _MenuCard(
                children: [
                  _MenuRow(
                    icon: Icons.article_outlined,
                    label: 'Terms & Conditions',
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const TermsScreen()),
                    ),
                  ),
                  _MenuRow(
                    icon: Icons.privacy_tip_outlined,
                    label: 'Privacy Policy',
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const PrivacyPolicyScreen()),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // ── Account ────────────────────────────────────────────────
              _SectionHeader(
                icon: Icons.manage_accounts_outlined,
                label: 'Account',
                color: AppColors.textTertiary,
              ),
              const SizedBox(height: 10),
              _MenuCard(
                children: [
                  _MenuRow(
                    icon: Icons.logout_rounded,
                    label: isGuest ? 'End guest session' : 'Sign out',
                    color: AppColors.error,
                    onTap: () => AuthService().signOut(),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              Center(
                child: Text(
                  'Version 1.0.0',
                  style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary),
                ),
              ),
            ]),
          ),
        ),
      ],
    );
  }
}

// ── Section header ────────────────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _SectionHeader({required this.icon, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 13, color: color),
        const SizedBox(width: 6),
        Text(
          label.toUpperCase(),
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: color,
            letterSpacing: 0.6,
          ),
        ),
      ],
    );
  }
}

// ── Menu card ─────────────────────────────────────────────────────────────────

class _MenuCard extends StatelessWidget {
  final List<Widget> children;

  const _MenuCard({required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderFaint, width: 0.8),
      ),
      child: Column(
        children: List.generate(children.length, (i) {
          return Column(
            children: [
              children[i],
              if (i < children.length - 1)
                Container(height: 0.5, color: AppColors.divider),
            ],
          );
        }),
      ),
    );
  }
}

// ── Menu row ──────────────────────────────────────────────────────────────────

class _MenuRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  final Color? color;

  const _MenuRow({
    required this.icon,
    required this.label,
    this.onTap,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final c = color ?? AppColors.textPrimary;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: [
              Icon(icon, size: 17, color: color ?? AppColors.textTertiary),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: c,
                  ),
                ),
              ),
              if (onTap != null)
                const Icon(Icons.chevron_right_rounded, size: 16, color: AppColors.textTertiary),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Emergency contact row ─────────────────────────────────────────────────────

class _ContactRow extends StatelessWidget {
  final EmergencyContact contact;
  final VoidCallback onTap;

  const _ContactRow({required this.contact, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final accent = contact.accentColor;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderFaint, width: 0.8),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: accent.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(11),
                  ),
                  child: Icon(iconFromName(contact.icon), color: accent, size: 18),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        contact.name,
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        contact.number,
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: accent,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: accent.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(11),
                  ),
                  child: Icon(Icons.call_rounded, color: accent, size: 16),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
