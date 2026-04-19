import 'package:flutter/widgets.dart';

enum AppLanguage { english, nepali }

class AppStringSet {
  final String appTitle;
  final String welcomeTitle;
  final String welcomeSubtitle;
  final String alwaysHereTitle;
  final String alwaysHereSubtitle;
  final String mentalHealthTitle;
  final String mentalHealthSubtitle;
  final String privateSecureTitle;
  final String privateSecureSubtitle;
  final String readyBeginTitle;
  final String readyBeginSubtitle;
  final String startChatting;
  final String next;
  final String skip;
  final String chatTitle;
  final String helloMessage;
  final String promptMessage;
  final String typeMessage;
  final String aiTyping;
  final String fallbackReply;
  final String errorMessage;
  final String languagePrompt;
  final String englishLabel;
  final String nepaliLabel;
  final String continueLabel;
  final String urgentHelpTitle;
  final String urgentHelpSubtitle;
  final String callNow;
  final String emergencyServices;
  final String mentalHealthLine;
  final String medicalAdviceLine;

  const AppStringSet({
    required this.appTitle,
    required this.welcomeTitle,
    required this.welcomeSubtitle,
    required this.alwaysHereTitle,
    required this.alwaysHereSubtitle,
    required this.mentalHealthTitle,
    required this.mentalHealthSubtitle,
    required this.privateSecureTitle,
    required this.privateSecureSubtitle,
    required this.readyBeginTitle,
    required this.readyBeginSubtitle,
    required this.startChatting,
    required this.next,
    required this.skip,
    required this.chatTitle,
    required this.helloMessage,
    required this.promptMessage,
    required this.typeMessage,
    required this.aiTyping,
    required this.fallbackReply,
    required this.errorMessage,
    required this.languagePrompt,
    required this.englishLabel,
    required this.nepaliLabel,
    required this.continueLabel,
    required this.urgentHelpTitle,
    required this.urgentHelpSubtitle,
    required this.callNow,
    required this.emergencyServices,
    required this.mentalHealthLine,
    required this.medicalAdviceLine,
  });
}

const AppStringSet englishStrings = AppStringSet(
  appTitle: 'Man Ko Sathi',
  welcomeTitle: 'Welcome to Man Ko Sathi',
  welcomeSubtitle: 'Your safe, anonymous space to talk about your feelings.',
  alwaysHereTitle: 'Always Here for You',
  alwaysHereSubtitle: 'Chat anytime. No judgment. No records. Just support.',
  mentalHealthTitle: 'Mental Health Matters',
  mentalHealthSubtitle:
      'You\'re not alone. Small steps today make a big difference.',
  privateSecureTitle: 'Private & Secure',
  privateSecureSubtitle:
      'No login. No history saved. Your privacy is our priority.',
  readyBeginTitle: 'Ready to Begin?',
  readyBeginSubtitle: 'Take a deep breath. We\'re here when you need us.',
  startChatting: 'Start Chatting',
  next: 'Next',
  skip: 'Skip',
  chatTitle: 'Chat with Man Ko Sathi',
  helloMessage: 'Hello, I\'m here to listen.',
  promptMessage: 'Tell me how you\'re feeling today, or what\'s on your mind.',
  typeMessage: 'Type your message...',
  aiTyping: 'Man Ko Sathi is thinking...',
  fallbackReply: 'Thank you for sharing. I\'m here with you.',
  errorMessage: 'Sorry, I had trouble replying. Please try again.',
  languagePrompt: 'Choose your language',
  englishLabel: 'English',
  nepaliLabel: 'नेपाली',
  continueLabel: 'Continue',
  urgentHelpTitle: 'Need help right now?',
  urgentHelpSubtitle:
      'Call trusted support lines directly. If you or someone else is unsafe, use these numbers immediately.',
  callNow: 'Call now',
  emergencyServices: 'Emergency services',
  mentalHealthLine: 'Mental health line',
  medicalAdviceLine: 'Medical advice',
);

const AppStringSet nepaliStrings = AppStringSet(
  appTitle: 'Man Ko Sathi',
  welcomeTitle: 'Man Ko Sathi मा स्वागत छ',
  welcomeSubtitle: 'भावनाहरू व्यक्त गर्न सुरक्षित र गोप्य स्थान।',
  alwaysHereTitle: 'सधैं तपाईंका लागि यहाँ',
  alwaysHereSubtitle:
      'जहिले पनि कुरा गर्न सक्नुहुन्छ। कुनै निर्णय छैन, कुनै रेकर्ड छैन।',
  mentalHealthTitle: 'मानसिक स्वास्थ्य महत्त्वपूर्ण छ',
  mentalHealthSubtitle: 'तपाईं एक्लो हुनुहुन्न। साना कदमहरूले ठूलो फरक पार्छ।',
  privateSecureTitle: 'निजी र सुरक्षित',
  privateSecureSubtitle:
      'लगइन आवश्यक छैन। इतिहास सुरक्षित हुँदैन। तपाईंको गोपनीयता हाम्रो प्राथमिकता।',
  readyBeginTitle: 'सुरु गर्न तयार?',
  readyBeginSubtitle: 'गहिरो सास लिनुहोस्। हामी तपाईंका लागि छौं।',
  startChatting: 'च्याट सुरु गर्नुहोस्',
  next: 'अर्को',
  skip: 'छोड्नुहोस्',
  chatTitle: 'Man Ko Sathi सँग च्याट',
  helloMessage: 'नमस्ते, म तपाईंलाई सुन्न यहाँ छु।',
  promptMessage:
      'आज तपाईं कस्तो महसुस गर्नुहुन्छ वा के सोच्दै हुनुहुन्छ, बताउनुहोस्।',
  typeMessage: 'यहाँ टाइप गर्नुहोस्...',
  aiTyping: 'Man Ko Sathi सोच्दैछ...',
  fallbackReply: 'सुनेर धन्यवाद। म तपाईं सँगै छु।',
  errorMessage: 'म जवाफ दिन असफल भएँ। कृपया पुन: प्रयास गर्नुहोस्।',
  languagePrompt: 'तपाईंको भाषा छान्नुहोस्',
  englishLabel: 'English',
  nepaliLabel: 'नेपाली',
  continueLabel: '�?o�??�??�?? �??�??�?-�??�??�??�??�?<�??�??',
  urgentHelpTitle: 'Need help right now?',
  urgentHelpSubtitle:
      'Call trusted support lines directly. If you or someone else is unsafe, use these numbers immediately.',
  callNow: 'Call now',
  emergencyServices: 'Emergency services',
  mentalHealthLine: 'Mental health line',
  medicalAdviceLine: 'Medical advice',
);

AppStringSet stringsForLanguage(AppLanguage language) {
  return language == AppLanguage.nepali ? nepaliStrings : englishStrings;
}

class AppStringsScope extends InheritedWidget {
  final AppLanguage language;
  final AppStringSet strings;
  final ValueChanged<AppLanguage> onLanguageChanged;

  const AppStringsScope({
    super.key,
    required this.language,
    required this.strings,
    required this.onLanguageChanged,
    required super.child,
  });

  static AppStringsScope of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AppStringsScope>();
    assert(scope != null, 'No AppStringsScope found in context');
    return scope!;
  }

  @override
  bool updateShouldNotify(AppStringsScope oldWidget) {
    return language != oldWidget.language || strings != oldWidget.strings;
  }
}

extension AppStringsX on BuildContext {
  AppStringsScope get stringsScope => AppStringsScope.of(this);
  AppStringSet get strings => AppStringsScope.of(this).strings;
  AppLanguage get appLanguage => AppStringsScope.of(this).language;
  void setAppLanguage(AppLanguage language) =>
      AppStringsScope.of(this).onLanguageChanged(language);
}
