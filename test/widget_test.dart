import 'package:ai_chat/main.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('shows language selection on launch', (tester) async {
    await tester.pumpWidget(const SerenityWhisperApp());
    expect(find.text('Choose your language'), findsOneWidget);
    expect(find.text('English'), findsOneWidget);
    expect(find.text('नेपाली'), findsOneWidget);
  });
}
