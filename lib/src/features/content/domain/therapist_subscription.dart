class TherapistSubscription {
  final String name;
  final int sessions;
  final String price;
  final String period;
  final String blurb;
  final String tag;
  final bool featured;
  final String ctaLabel;

  const TherapistSubscription({
    required this.name,
    required this.sessions,
    required this.price,
    required this.period,
    required this.blurb,
    required this.tag,
    required this.featured,
    required this.ctaLabel,
  });

  factory TherapistSubscription.fromJson(Map<String, dynamic> json) {
    return TherapistSubscription(
      name: (json['name'] ?? '').toString(),
      sessions:
          (json['sessions'] as num?)?.toInt() ??
          (json['sessionsPerMonth'] as num?)?.toInt() ??
          0,
      price: (json['price'] ?? '').toString(),
      period: (json['period'] ?? '').toString(),
      blurb: (json['blurb'] ?? '').toString(),
      tag: (json['tag'] ?? '').toString(),
      featured: json['featured'] == true,
      ctaLabel: (json['ctaLabel'] ?? json['cta_label'] ?? 'Choose plan')
          .toString(),
    );
  }
}
