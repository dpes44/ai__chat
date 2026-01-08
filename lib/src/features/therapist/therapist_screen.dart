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
    return Scaffold(
      appBar: AppBar(
        title: const Text('Therapist plans'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFE9F6F1), Color(0xFFF5FAF8)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: plans.length,
          itemBuilder: (context, index) {
            final plan = plans[index];
            return _PlanTile(plan: plan);
          },
        ),
      ),
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
    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.support_agent_outlined,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        plan.name,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textDark,
                        ),
                      ),
                      Text(
                        plan.blurb,
                        style: TextStyle(
                          color: AppColors.textLight,
                          height: 1.4,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${plan.sessions} sessions/month',
                  style: TextStyle(
                    color: AppColors.textDark,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  plan.price,
                  style: TextStyle(
                    color: AppColors.primary,
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {},
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text('Subscribe'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
