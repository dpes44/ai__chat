class ToolItem {
  final String id;
  final String nameEn;
  final String nameNp;
  final String summary;
  final String descriptionEn;
  final String descriptionNp;
  final List<ToolQuestion> questions;
  final List<ToolResponse> responses;

  const ToolItem({
    required this.id,
    required this.nameEn,
    required this.nameNp,
    required this.summary,
    required this.descriptionEn,
    required this.descriptionNp,
    required this.responses,
    required this.questions,
  });

  factory ToolItem.fromJson(Map<String, dynamic> json) {
    final questionsField = json['questions'];
    final List<dynamic> questionsJson = questionsField is List
        ? questionsField
        : const [];
    final dynamic responsesField =
        json['responses'] ?? json['feedback']; // support either key
    List<ToolResponse> responseList = [];
    if (responsesField is List) {
      responseList = responsesField
          .map((r) => ToolResponse.fromJson(r as Map<String, dynamic>))
          .toList();
    } else if (responsesField is Map) {
      responseList = (responsesField as Map).entries.map<ToolResponse>((entry) {
        final key = entry.key.toString();
        final parts = key.split('-');
        final double min = parts.isNotEmpty
            ? (double.tryParse(parts[0]) ?? 0)
            : 0;
        final double max = parts.length > 1
            ? (double.tryParse(parts[1]) ?? double.maxFinite)
            : min;
        final val = entry.value as Map<String, dynamic>? ?? {};
        return ToolResponse(
          min: min,
          max: max,
          textEn: (val['en'] ?? '').toString(),
          textNp: (val['np'] ?? '').toString(),
        );
      }).toList();
    }

    return ToolItem(
      id: (json['id'] ?? '').toString(),
      nameEn: (json['name_en'] ?? '').toString(),
      nameNp: (json['name_np'] ?? '').toString(),
      summary: (json['summary'] ?? '').toString(),
      descriptionEn: (json['description_en'] ?? '').toString(),
      descriptionNp: (json['description_np'] ?? '').toString(),
      responses: responseList,
      questions: questionsJson
          .map((q) => ToolQuestion.fromJson(q as Map<String, dynamic>))
          .toList(),
    );
  }
}

class ToolQuestion {
  final String textEn;
  final String textNp;
  final List<ToolOption> options;

  const ToolQuestion({
    required this.textEn,
    required this.textNp,
    required this.options,
  });

  factory ToolQuestion.fromJson(Map<String, dynamic> json) {
    final opts = (json['options'] as List<dynamic>?) ?? [];
    return ToolQuestion(
      textEn: (json['text_en'] ?? '').toString(),
      textNp: (json['text_np'] ?? '').toString(),
      options: opts
          .map((o) => ToolOption.fromJson(o as Map<String, dynamic>))
          .toList(),
    );
  }
}

class ToolOption {
  final String labelEn;
  final String labelNp;
  final double score;

  const ToolOption({
    required this.labelEn,
    required this.labelNp,
    required this.score,
  });

  factory ToolOption.fromJson(Map<String, dynamic> json) {
    return ToolOption(
      labelEn: (json['label_en'] ?? '').toString(),
      labelNp: (json['label_np'] ?? '').toString(),
      score: (json['score'] as num?)?.toDouble() ?? 0,
    );
  }
}

class ToolResponse {
  final double min;
  final double max;
  final String textEn;
  final String textNp;

  const ToolResponse({
    required this.min,
    required this.max,
    required this.textEn,
    required this.textNp,
  });

  factory ToolResponse.fromJson(Map<String, dynamic> json) {
    return ToolResponse(
      min: (json['min'] as num?)?.toDouble() ?? 0,
      max: (json['max'] as num?)?.toDouble() ?? 0,
      textEn: (json['text_en'] ?? '').toString(),
      textNp: (json['text_np'] ?? '').toString(),
    );
  }
}
