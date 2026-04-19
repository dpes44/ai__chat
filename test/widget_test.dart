import 'package:ai_chat/src/features/auth/auth_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('shows auth screen on launch', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: AuthScreen()));
    expect(find.text('Sign in'), findsAtLeastNWidgets(1));
    expect(find.text('Continue as guest'), findsOneWidget);
  });
}
