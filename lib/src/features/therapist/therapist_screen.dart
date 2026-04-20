import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:ai_chat/src/core/constants/app_colors.dart';
import 'package:ai_chat/src/models/therapist_subscription.dart';
import 'package:ai_chat/src/services/therapist_subscriptions_repository.dart';

class TherapistScreen extends StatefulWidget {
  const TherapistScreen({super.key});

  @override
  State<TherapistScreen> createState() => _TherapistScreenState();
}

class _TherapistScreenState extends State<TherapistScreen> {
  final TherapistSubscriptionsRepository _repo =
      TherapistSubscriptionsRepository();
  late final Future<List<TherapistSubscription>> _future = _repo.loadPlans();

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.of(context).padding.top;

    return FutureBuilder<List<TherapistSubscription>>(
      future: _future,
      builder: (context, snapshot) {
        final plans = snapshot.data ?? const <TherapistSubscription>[];
        final loading = snapshot.connectionState == ConnectionState.waiting;

        return CustomScrollView(
          slivers: [
            // ── Header ──────────────────────────────────────────────────────
            SliverToBoxAdapter(
              child: Container(
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
                      'Professional support plans',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: AppColors.textTertiary,
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
            else if (snapshot.hasError || plans.isEmpty)
              SliverFillRemaining(
                child: Center(
                  child: Text(
                    'Subscription plans unavailable.',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 20, 16, 100),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) => _PlanCard(plan: plans[index]),
                    childCount: plans.length,
                  ),
                ),
              ),
          ],
        );
      },
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
                // Tag + price row
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
