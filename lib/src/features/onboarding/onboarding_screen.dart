import 'package:flutter/material.dart';
import 'package:ai_chat/src/core/constants/app_colors.dart';
import 'package:ai_chat/src/core/constants/app_strings.dart';
import 'package:ai_chat/src/core/widgets/onboarding_page.dart';
import 'package:ai_chat/src/features/onboarding/nickname_screen.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final strings = context.strings;
    final onboardingData = [
      {
        "title": strings.welcomeTitle,
        "subtitle": strings.welcomeSubtitle,
        "image": "🌿",
      },
      {
        "title": strings.alwaysHereTitle,
        "subtitle": strings.alwaysHereSubtitle,
        "image": "🤝",
      },
      {
        "title": strings.mentalHealthTitle,
        "subtitle": strings.mentalHealthSubtitle,
        "image": "🧠",
      },
      {
        "title": strings.privateSecureTitle,
        "subtitle": strings.privateSecureSubtitle,
        "image": "🔒",
      },
      {
        "title": strings.readyBeginTitle,
        "subtitle": strings.readyBeginSubtitle,
        "image": "✨",
      },
    ];

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                itemCount: onboardingData.length,
                onPageChanged: (value) {
                  setState(() => _currentPage = value);
                },
                itemBuilder: (context, index) {
                  return OnboardingPage(data: onboardingData[index]);
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(32, 16, 32, 32),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(
                      onboardingData.length,
                      (index) => AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        height: 6,
                        width: _currentPage == index ? 28 : 6,
                        decoration: BoxDecoration(
                          color: _currentPage == index
                              ? AppColors.primary
                              : AppColors.divider,
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 40),
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      onPressed: () {
                        if (_currentPage == onboardingData.length - 1) {
                          Navigator.pushReplacement(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const NicknameScreen(),
                            ),
                          );
                        } else {
                          _pageController.nextPage(
                            duration: const Duration(milliseconds: 400),
                            curve: Curves.easeInOut,
                          );
                        }
                      },
                      child: Text(
                        _currentPage == onboardingData.length - 1
                            ? strings.startChatting
                            : strings.next,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                  if (_currentPage < onboardingData.length - 1)
                    TextButton(
                      onPressed: () {
                        Navigator.pushReplacement(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const NicknameScreen(),
                          ),
                        );
                      },
                      child: Text(
                        strings.skip,
                        style: TextStyle(color: AppColors.textTertiary),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
