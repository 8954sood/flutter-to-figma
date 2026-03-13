import 'package:flutter/material.dart';

class WidgetTestPage extends StatefulWidget {
  const WidgetTestPage({super.key});

  @override
  State<WidgetTestPage> createState() => _WidgetTestPageState();
}

class _WidgetTestPageState extends State<WidgetTestPage> {
  int _radioValue = 0;
  RangeValues _rangeValues = const RangeValues(20, 80);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 48),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Widget Test',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1A1A2E),
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Opacity · ClipOval · Card · FittedBox\nRadio · RangeSlider · AspectRatio · RotatedBox · AppBar',
                style: TextStyle(fontSize: 14, color: Color(0xFF888888)),
              ),
              const SizedBox(height: 32),
              _buildOpacitySection(),
              const SizedBox(height: 32),
              _buildClipOvalSection(),
              const SizedBox(height: 32),
              _buildCardSection(),
              const SizedBox(height: 32),
              _buildFittedBoxSection(),
              const SizedBox(height: 32),
              _buildRadioSection(),
              const SizedBox(height: 32),
              _buildRangeSliderSection(),
              const SizedBox(height: 32),
              _buildAspectRatioSection(),
              const SizedBox(height: 32),
              _buildRotatedBoxSection(),
              const SizedBox(height: 48),
            ],
          ),
        ),
      ),
    );
  }

  // ─── 1. Opacity ─────────────────────────────────────────

  Widget _buildOpacitySection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('Opacity'),
        const SizedBox(height: 12),
        Row(
          children: [
            // 100% opacity
            Opacity(
              opacity: 1.0,
              child: Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: const Color(0xFF6C63FF),
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: const Text(
                  '1.0',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            // 70% opacity
            Opacity(
              opacity: 0.7,
              child: Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: const Color(0xFF6C63FF),
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: const Text(
                  '0.7',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            // 40% opacity
            Opacity(
              opacity: 0.4,
              child: Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: const Color(0xFF6C63FF),
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: const Text(
                  '0.4',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            // 10% opacity
            Opacity(
              opacity: 0.1,
              child: Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: const Color(0xFF6C63FF),
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: const Text(
                  '0.1',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        // Opacity on complex child
        Opacity(
          opacity: 0.5,
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFFF6B6B), Color(0xFFFFE66D)],
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Text(
              'Opacity 0.5 on gradient container',
              style: TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
      ],
    );
  }

  // ─── 2. ClipOval ────────────────────────────────────────

  Widget _buildClipOvalSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('ClipOval'),
        const SizedBox(height: 12),
        Row(
          children: [
            // Basic ClipOval
            ClipOval(
              child: Container(
                width: 80,
                height: 80,
                color: const Color(0xFF00BFA6),
                alignment: Alignment.center,
                child: const Text(
                  'Clip',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 16),
            // CircleAvatar (uses ClipOval internally)
            const CircleAvatar(
              radius: 40,
              backgroundColor: Color(0xFFFF7043),
              child: Text(
                'CA',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(width: 16),
            // ClipOval with gradient
            ClipOval(
              child: Container(
                width: 80,
                height: 80,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFF667EEA), Color(0xFF764BA2)],
                  ),
                ),
                alignment: Alignment.center,
                child: const Icon(Icons.star, color: Colors.white, size: 36),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        // Rectangular ClipOval (ellipse)
        ClipOval(
          child: Container(
            width: 200,
            height: 80,
            color: const Color(0xFF26C6DA),
            alignment: Alignment.center,
            child: const Text(
              'Ellipse (200×80)',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
            ),
          ),
        ),
      ],
    );
  }

  // ─── 3. Card ────────────────────────────────────────────

  Widget _buildCardSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('Card'),
        const SizedBox(height: 12),
        // Default Card
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE8EAF6),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.inbox, color: Color(0xFF3F51B5)),
                ),
                const SizedBox(width: 16),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Default Card',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 16,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Default elevation and shape',
                        style: TextStyle(color: Color(0xFF888888), fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        // Card with custom shape
        Card(
          elevation: 6,
          color: const Color(0xFF1A1A2E),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          child: const Padding(
            padding: EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Custom Shape Card',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                  ),
                ),
                SizedBox(height: 8),
                Text(
                  'elevation: 6, borderRadius: 20',
                  style: TextStyle(color: Color(0xFF888888), fontSize: 13),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        // Card with clipBehavior
        Card(
          elevation: 4,
          clipBehavior: Clip.antiAlias,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            children: [
              Container(
                height: 80,
                width: double.infinity,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFFFC5C7D), Color(0xFF6A82FB)],
                  ),
                ),
                alignment: Alignment.center,
                child: const Text(
                  'Clipped Header',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ),
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text(
                  'Card with Clip.antiAlias — gradient header is clipped by rounded corners.',
                  style: TextStyle(fontSize: 13, color: Color(0xFF555555)),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ─── 4. FittedBox ───────────────────────────────────────

  Widget _buildFittedBoxSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('FittedBox'),
        const SizedBox(height: 12),
        // FittedBox contain
        Container(
          width: double.infinity,
          height: 60,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE0E0E0)),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: const FittedBox(
            fit: BoxFit.contain,
            child: Text(
              'FittedBox.contain — scales down to fit',
              style: TextStyle(
                fontSize: 40,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1A1A2E),
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        // FittedBox scaleDown
        Row(
          children: [
            Expanded(
              child: Container(
                height: 80,
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF3E0),
                  borderRadius: BorderRadius.circular(12),
                ),
                padding: const EdgeInsets.all(8),
                child: const FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(
                    'scaleDown',
                    style: TextStyle(
                      fontSize: 60,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFFE65100),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Container(
                height: 80,
                decoration: BoxDecoration(
                  color: const Color(0xFFE8F5E9),
                  borderRadius: BorderRadius.circular(12),
                ),
                padding: const EdgeInsets.all(8),
                child: const FittedBox(
                  fit: BoxFit.fill,
                  child: Text(
                    'fill',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF2E7D32),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        // FittedBox with icon
        Row(
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: const Color(0xFFEDE7F6),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const FittedBox(
                fit: BoxFit.contain,
                child: Padding(
                  padding: EdgeInsets.all(4),
                  child: Icon(
                    Icons.rocket_launch,
                    color: Color(0xFF7C4DFF),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Container(
              width: 100,
              height: 60,
              decoration: BoxDecoration(
                color: const Color(0xFFE3F2FD),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const FittedBox(
                fit: BoxFit.fitHeight,
                child: Padding(
                  padding: EdgeInsets.all(4),
                  child: Icon(
                    Icons.sailing,
                    color: Color(0xFF1565C0),
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // ─── 5. Radio ──────────────────────────────────────────

  Widget _buildRadioSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('Radio'),
        const SizedBox(height: 12),
        Row(
          children: [
            // ignore: deprecated_member_use
            Radio<int>(
              value: 0,
              groupValue: _radioValue,
              onChanged: (v) => setState(() => _radioValue = v!),
            ),
            const Text('Option A'),
            const SizedBox(width: 16),
            // ignore: deprecated_member_use
            Radio<int>(
              value: 1,
              groupValue: _radioValue,
              onChanged: (v) => setState(() => _radioValue = v!),
            ),
            const Text('Option B'),
            const SizedBox(width: 16),
            // ignore: deprecated_member_use
            Radio<int>(
              value: 2,
              groupValue: _radioValue,
              onChanged: (v) => setState(() => _radioValue = v!),
              activeColor: const Color(0xFFFF6B6B),
            ),
            const Text('Option C (custom color)'),
          ],
        ),
      ],
    );
  }

  // ─── 6. RangeSlider ───────────────────────────────────

  Widget _buildRangeSliderSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('RangeSlider'),
        const SizedBox(height: 12),
        RangeSlider(
          values: _rangeValues,
          min: 0,
          max: 100,
          divisions: 10,
          labels: RangeLabels(
            _rangeValues.start.round().toString(),
            _rangeValues.end.round().toString(),
          ),
          onChanged: (v) => setState(() => _rangeValues = v),
        ),
        const SizedBox(height: 8),
        Text(
          'Range: ${_rangeValues.start.round()} – ${_rangeValues.end.round()}',
          style: const TextStyle(fontSize: 13, color: Color(0xFF555555)),
        ),
      ],
    );
  }

  // ─── 7. AspectRatio ───────────────────────────────────

  Widget _buildAspectRatioSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('AspectRatio'),
        const SizedBox(height: 12),
        // 16:9
        AspectRatio(
          aspectRatio: 16 / 9,
          child: Container(
            decoration: BoxDecoration(
              color: const Color(0xFF26C6DA),
              borderRadius: BorderRadius.circular(12),
            ),
            alignment: Alignment.center,
            child: const Text(
              '16 : 9',
              style: TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        // 1:1 in a constrained width
        Row(
          children: [
            SizedBox(
              width: 120,
              child: AspectRatio(
                aspectRatio: 1,
                child: Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFFFF7043),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  alignment: Alignment.center,
                  child: const Text(
                    '1 : 1',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            SizedBox(
              width: 180,
              child: AspectRatio(
                aspectRatio: 3 / 1,
                child: Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFF7C4DFF),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  alignment: Alignment.center,
                  child: const Text(
                    '3 : 1',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // ─── 8. RotatedBox ────────────────────────────────────

  Widget _buildRotatedBoxSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('RotatedBox'),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            // 0 quarter turns (no rotation)
            Column(
              children: [
                RotatedBox(
                  quarterTurns: 0,
                  child: Container(
                    width: 60,
                    height: 40,
                    decoration: BoxDecoration(
                      color: const Color(0xFF6C63FF),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    alignment: Alignment.center,
                    child: const Text(
                      '0',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                const Text('0°', style: TextStyle(fontSize: 12)),
              ],
            ),
            // 1 quarter turn (90°)
            Column(
              children: [
                RotatedBox(
                  quarterTurns: 1,
                  child: Container(
                    width: 60,
                    height: 40,
                    decoration: BoxDecoration(
                      color: const Color(0xFFFF6B6B),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    alignment: Alignment.center,
                    child: const Text(
                      '1',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                const Text('90°', style: TextStyle(fontSize: 12)),
              ],
            ),
            // 2 quarter turns (180°)
            Column(
              children: [
                RotatedBox(
                  quarterTurns: 2,
                  child: Container(
                    width: 60,
                    height: 40,
                    decoration: BoxDecoration(
                      color: const Color(0xFF00BFA6),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    alignment: Alignment.center,
                    child: const Text(
                      '2',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                const Text('180°', style: TextStyle(fontSize: 12)),
              ],
            ),
            // 3 quarter turns (270°)
            Column(
              children: [
                RotatedBox(
                  quarterTurns: 3,
                  child: Container(
                    width: 60,
                    height: 40,
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFB74D),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    alignment: Alignment.center,
                    child: const Text(
                      '3',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                const Text('270°', style: TextStyle(fontSize: 12)),
              ],
            ),
          ],
        ),
        const SizedBox(height: 16),
        // RotatedBox with text
        Center(
          child: RotatedBox(
            quarterTurns: 1,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFFC5C7D), Color(0xFF6A82FB)],
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text(
                'Rotated Text Label',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  // ─── Helpers ────────────────────────────────────────────

  Widget _sectionTitle(String title) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFF1A1A2E),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        title,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
