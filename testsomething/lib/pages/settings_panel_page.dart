import 'package:flutter/material.dart';

class SettingsPanelPage extends StatefulWidget {
  const SettingsPanelPage({super.key});

  @override
  State<SettingsPanelPage> createState() => _SettingsPanelPageState();
}

class _SettingsPanelPageState extends State<SettingsPanelPage> {
  bool _darkMode = true;
  bool _notifications = true;
  bool _biometric = false;
  bool _autoUpdate = true;
  double _fontSize = 16;
  double _brightness = 0.7;
  int _selectedLanguage = 0;
  final Set<String> _selectedTags = {'Design', 'Flutter', 'Mobile'};

  final _allTags = [
    'Design', 'Flutter', 'Mobile', 'Web', 'Backend',
    'AI/ML', 'DevOps', 'Security', 'Testing', 'UI/UX',
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5FA),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Settings',
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1A1A2E),
                ),
              ),
              const SizedBox(height: 24),
              _buildProfileSection(),
              const SizedBox(height: 24),
              _buildToggleGroup(),
              const SizedBox(height: 24),
              _buildSliderGroup(),
              const SizedBox(height: 24),
              _buildLanguageChips(),
              const SizedBox(height: 24),
              _buildTagSelection(),
              const SizedBox(height: 24),
              _buildProgressSection(),
              const SizedBox(height: 24),
              _buildStorageSection(),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProfileSection() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF6A11CB).withValues(alpha: 0.08),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: const LinearGradient(
                colors: [Color(0xFF6A11CB), Color(0xFF2575FC)],
              ),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF6A11CB).withValues(alpha: 0.3),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: const CircleAvatar(
              radius: 32,
              backgroundColor: Colors.transparent,
              child: Icon(Icons.person, color: Colors.white, size: 32),
            ),
          ),
          const SizedBox(width: 16),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Alex Johnson',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1A1A2E),
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'alex.johnson@email.com',
                  style: TextStyle(
                    fontSize: 14,
                    color: Color(0xFF7B7B8E),
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFF4CAF50).withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Text(
              'PRO',
              style: TextStyle(
                color: Color(0xFF4CAF50),
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildToggleGroup() {
    return _settingsCard(
      'Preferences',
      [
        _toggleRow(Icons.dark_mode, 'Dark Mode', 'Use dark theme', _darkMode,
            (v) => setState(() => _darkMode = v), const Color(0xFF6A11CB)),
        const Divider(height: 1),
        _toggleRow(Icons.notifications, 'Notifications', 'Push notifications', _notifications,
            (v) => setState(() => _notifications = v), const Color(0xFF2575FC)),
        const Divider(height: 1),
        _toggleRow(Icons.fingerprint, 'Biometric Login', 'Face ID / Fingerprint', _biometric,
            (v) => setState(() => _biometric = v), const Color(0xFFFF6B6B)),
        const Divider(height: 1),
        _toggleRow(Icons.system_update, 'Auto Update', 'Automatic updates', _autoUpdate,
            (v) => setState(() => _autoUpdate = v), const Color(0xFF4CAF50)),
      ],
    );
  }

  Widget _toggleRow(IconData icon, String title, String subtitle, bool value,
      ValueChanged<bool> onChanged, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1A1A2E),
                  ),
                ),
                Text(
                  subtitle,
                  style: const TextStyle(fontSize: 12, color: Color(0xFFAAAAAA)),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeTrackColor: const Color(0xFF6A11CB),
          ),
        ],
      ),
    );
  }

  Widget _buildSliderGroup() {
    return _settingsCard(
      'Display',
      [
        _sliderRow(Icons.text_fields, 'Font Size', _fontSize, 10, 28,
            (v) => setState(() => _fontSize = v), '${_fontSize.round()}pt'),
        const Divider(height: 1),
        _sliderRow(Icons.brightness_6, 'Brightness', _brightness, 0, 1,
            (v) => setState(() => _brightness = v), '${(_brightness * 100).round()}%'),
      ],
    );
  }

  Widget _sliderRow(IconData icon, String title, double value, double min, double max,
      ValueChanged<double> onChanged, String display) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF2575FC).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: const Color(0xFF2575FC), size: 20),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1A1A2E),
                  ),
                ),
              ),
              Text(
                display,
                style: const TextStyle(
                  fontSize: 14,
                  color: Color(0xFF6A11CB),
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          SliderTheme(
            data: SliderThemeData(
              activeTrackColor: const Color(0xFF6A11CB),
              inactiveTrackColor: const Color(0xFF6A11CB).withValues(alpha: 0.15),
              thumbColor: const Color(0xFF6A11CB),
              overlayColor: const Color(0xFF6A11CB).withValues(alpha: 0.1),
              trackHeight: 4,
            ),
            child: Slider(
              value: value,
              min: min,
              max: max,
              onChanged: onChanged,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLanguageChips() {
    final languages = ['English', 'Korean', 'Japanese', 'Chinese'];
    return _settingsCard(
      'Language',
      [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Wrap(
            spacing: 10,
            runSpacing: 10,
            children: languages.asMap().entries.map((e) {
              final selected = _selectedLanguage == e.key;
              return ChoiceChip(
                label: Text(e.value),
                selected: selected,
                onSelected: (_) => setState(() => _selectedLanguage = e.key),
                selectedColor: const Color(0xFF6A11CB),
                backgroundColor: const Color(0xFFF0F0F5),
                labelStyle: TextStyle(
                  color: selected ? Colors.white : const Color(0xFF1A1A2E),
                  fontWeight: FontWeight.w600,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                side: BorderSide.none,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildTagSelection() {
    return _settingsCard(
      'Interests',
      [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _allTags.map((tag) {
              final selected = _selectedTags.contains(tag);
              return FilterChip(
                label: Text(tag),
                selected: selected,
                onSelected: (v) => setState(() {
                  if (v) {
                    _selectedTags.add(tag);
                  } else {
                    _selectedTags.remove(tag);
                  }
                }),
                selectedColor: const Color(0xFF2575FC).withValues(alpha: 0.15),
                checkmarkColor: const Color(0xFF2575FC),
                backgroundColor: const Color(0xFFF0F0F5),
                labelStyle: TextStyle(
                  color: selected ? const Color(0xFF2575FC) : const Color(0xFF7B7B8E),
                  fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
                  fontSize: 13,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                side: selected
                    ? const BorderSide(color: Color(0xFF2575FC), width: 1.5)
                    : BorderSide.none,
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildProgressSection() {
    return _settingsCard(
      'Storage',
      [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  RichText(
                    text: const TextSpan(
                      children: [
                        TextSpan(
                          text: '42.5 GB ',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1A1A2E),
                          ),
                        ),
                        TextSpan(
                          text: '/ 64 GB',
                          style: TextStyle(
                            fontSize: 16,
                            color: Color(0xFF7B7B8E),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(
                    width: 36,
                    height: 36,
                    child: CircularProgressIndicator(
                      value: 0.66,
                      strokeWidth: 4,
                      backgroundColor: Color(0xFFE0E0E0),
                      valueColor: AlwaysStoppedAnimation(Color(0xFF6A11CB)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: const LinearProgressIndicator(
                  value: 0.66,
                  minHeight: 10,
                  backgroundColor: Color(0xFFE0E0E0),
                  valueColor: AlwaysStoppedAnimation(
                    Color(0xFF6A11CB),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              _storageRow('Photos', '18.2 GB', 0.43, const Color(0xFF2575FC)),
              const SizedBox(height: 8),
              _storageRow('Apps', '12.8 GB', 0.30, const Color(0xFFFF6B6B)),
              const SizedBox(height: 8),
              _storageRow('Documents', '8.1 GB', 0.19, const Color(0xFFFFB347)),
              const SizedBox(height: 8),
              _storageRow('Other', '3.4 GB', 0.08, const Color(0xFF4CAF50)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _storageRow(String label, String size, double fraction, Color color) {
    return Row(
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(3),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 14,
              color: Color(0xFF1A1A2E),
            ),
          ),
        ),
        Text(
          size,
          style: const TextStyle(
            fontSize: 14,
            color: Color(0xFF7B7B8E),
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildStorageSection() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF6A11CB), Color(0xFF2575FC)],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF6A11CB).withValues(alpha: 0.3),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(Icons.cloud_upload, color: Colors.white, size: 28),
          ),
          const SizedBox(width: 16),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Upgrade to Cloud',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'Get unlimited storage',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Text(
              'Upgrade',
              style: TextStyle(
                color: Color(0xFF6A11CB),
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _settingsCard(String title, List<Widget> children) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1A1A2E),
            ),
          ),
          const SizedBox(height: 12),
          ...children,
        ],
      ),
    );
  }
}
