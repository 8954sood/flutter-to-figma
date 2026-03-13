import 'package:flutter/material.dart';
import 'pages/profile_dashboard_page.dart';
import 'pages/finance_cards_page.dart';
import 'pages/weather_landscape_page.dart';
import 'pages/settings_panel_page.dart';
import 'pages/widget_test_page.dart';

import 'figma_temp_crawler.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'View to Figma Test',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const MainShell(),
    );
  }
}

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _currentIndex = 0;

  Widget _buildPage() {
    switch (_currentIndex) {
      case 0:
        return const ProfileDashboardPage();
      case 1:
        return const FinanceCardsPage();
      case 2:
        return const WeatherLandscapePage();
      case 3:
        return const SettingsPanelPage();
      case 4:
        return const WidgetTestPage();
      default:
        return const ProfileDashboardPage();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _buildPage(),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (i) => setState(() => _currentIndex = i),
        type: BottomNavigationBarType.fixed,
        selectedItemColor: Colors.deepPurple,
        unselectedItemColor: Colors.grey,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
          BottomNavigationBarItem(
            icon: Icon(Icons.credit_card),
            label: 'Finance',
          ),
          BottomNavigationBarItem(icon: Icon(Icons.cloud), label: 'Weather'),
          BottomNavigationBarItem(
            icon: Icon(Icons.settings),
            label: 'Settings',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.widgets),
            label: 'Widget Test',
          ),
        ],
      ),
    );
  }
}
