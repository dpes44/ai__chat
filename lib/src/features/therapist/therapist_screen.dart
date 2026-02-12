import 'package:flutter/material.dart';
import 'package:ai_chat/src/core/constants/app_colors.dart';

class TherapistScreen extends StatelessWidget {
  TherapistScreen({super.key});

  final List<_Plan> plans = const [
    _Plan(
      name: 'Starter support',
      sessions: 4,
      price: '\$120/mo',
      blurb: 'Four 45-min sessions per month with a licensed therapist.',
    ),
    _Plan(
      name: 'Balanced care',
      sessions: 6,
      price: '\$165/mo',
      blurb: 'Six 45-min sessions per month plus chat check-ins.',
    ),
    _Plan(
      name: 'Intensive focus',
      sessions: 8,
      price: '\$210/mo',
      blurb: 'Eight 45-min sessions monthly for deeper work and follow-ups.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
      itemCount: plans.length,
      itemBuilder: (context, index) {
        final plan = plans[index];
        return _PlanTile(plan: plan);
      },
    );
  }
}

class _Plan {
  final String name;
  final int sessions;
  final String price;
  final String blurb;

  const _Plan({
    required this.name,
    required this.sessions,
    required this.price,
    required this.blurb,
  });
}

class _PlanTile extends StatelessWidget {
  final _Plan plan;

  const _PlanTile({required this.plan});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.divider, width: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.primarySurface,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(
                  Icons.support_agent_outlined,
                  color: AppColors.primary,
                  size: 22,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      plan.name,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      plan.blurb,
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        height: 1.4,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${plan.sessions} sessions/month',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w500,
                  fontSize: 14,
                ),
              ),
              Text(
                plan.price,
                style: TextStyle(
                  color: AppColors.primary,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {},
              child: const Text('Subscribe'),
            ),
          ),
        ],
      ),
    );
  }
}
