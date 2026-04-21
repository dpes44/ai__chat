import 'package:flutter/material.dart';

import '../constants/app_colors.dart';

class SimpleMarkdownView extends StatelessWidget {
  final String markdown;

  const SimpleMarkdownView({super.key, required this.markdown});

  @override
  Widget build(BuildContext context) {
    final lines = markdown.replaceAll('\r\n', '\n').split('\n');
    final blocks = lines
        .map((line) => _buildLineWidget(line))
        .whereType<Widget>()
        .toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: blocks,
    );
  }

  Widget? _buildLineWidget(String rawLine) {
    final line = rawLine.trimRight();
    if (line.trim().isEmpty) {
      return const SizedBox(height: 10);
    }

    final h1 = RegExp(r'^#\s+(.+)$').firstMatch(line);
    if (h1 != null) {
      return _line(
        _inline(h1.group(1)!,
            const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 22,
              fontWeight: FontWeight.w700,
              height: 1.35,
            )),
        margin: const EdgeInsets.only(bottom: 8, top: 2),
      );
    }

    final h2 = RegExp(r'^##\s+(.+)$').firstMatch(line);
    if (h2 != null) {
      return _line(
        _inline(h2.group(1)!,
            const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 19,
              fontWeight: FontWeight.w700,
              height: 1.35,
            )),
        margin: const EdgeInsets.only(bottom: 6, top: 2),
      );
    }

    final h3 = RegExp(r'^###\s+(.+)$').firstMatch(line);
    if (h3 != null) {
      return _line(
        _inline(h3.group(1)!,
            const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 16,
              fontWeight: FontWeight.w700,
              height: 1.35,
            )),
        margin: const EdgeInsets.only(bottom: 4, top: 1),
      );
    }

    final bullet = RegExp(r'^[-*]\s+(.+)$').firstMatch(line);
    if (bullet != null) {
      final textStyle = const TextStyle(
        color: AppColors.textSecondary,
        fontSize: 15,
        height: 1.6,
      );
      return Padding(
        padding: const EdgeInsets.only(bottom: 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.only(top: 2),
              child: Text('•  ', style: TextStyle(fontSize: 15)),
            ),
            Expanded(child: _inline(bullet.group(1)!, textStyle)),
          ],
        ),
      );
    }

    final numbered = RegExp(r'^(\d+)\.\s+(.+)$').firstMatch(line);
    if (numbered != null) {
      final textStyle = const TextStyle(
        color: AppColors.textSecondary,
        fontSize: 15,
        height: 1.6,
      );
      return Padding(
        padding: const EdgeInsets.only(bottom: 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text('${numbered.group(1)}.  ',
                  style: const TextStyle(fontSize: 15)),
            ),
            Expanded(child: _inline(numbered.group(2)!, textStyle)),
          ],
        ),
      );
    }

    return _line(
      _inline(
        line,
        const TextStyle(
          color: AppColors.textSecondary,
          fontSize: 15,
          height: 1.6,
        ),
      ),
      margin: const EdgeInsets.only(bottom: 4),
    );
  }

  Widget _line(Widget child, {EdgeInsetsGeometry? margin}) {
    return Container(margin: margin, child: child);
  }

  Widget _inline(String input, TextStyle baseStyle) {
    final pattern = RegExp(r'(\*\*[^*]+\*\*|\*[^*]+\*)');
    final spans = <TextSpan>[];
    var cursor = 0;

    for (final match in pattern.allMatches(input)) {
      if (match.start > cursor) {
        spans.add(TextSpan(
          text: input.substring(cursor, match.start),
          style: baseStyle,
        ));
      }

      final token = match.group(0) ?? '';
      if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
        spans.add(TextSpan(
          text: token.substring(2, token.length - 2),
          style: baseStyle.copyWith(fontWeight: FontWeight.w700),
        ));
      } else if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
        spans.add(TextSpan(
          text: token.substring(1, token.length - 1),
          style: baseStyle.copyWith(fontStyle: FontStyle.italic),
        ));
      } else {
        spans.add(TextSpan(text: token, style: baseStyle));
      }

      cursor = match.end;
    }

    if (cursor < input.length) {
      spans.add(TextSpan(text: input.substring(cursor), style: baseStyle));
    }

    return RichText(text: TextSpan(children: spans));
  }
}
