import 'dart:math';
import 'dart:ui';

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

class WidgetTestPage extends StatefulWidget {
  const WidgetTestPage({super.key});

  @override
  State<WidgetTestPage> createState() => _WidgetTestPageState();
}

class _WidgetTestPageState extends State<WidgetTestPage> {
  int _radioValue = 0;
  RangeValues _rangeValues = const RangeValues(20, 80);
  bool _checkboxValue = true;
  bool _switchValue = false;
  double _sliderValue = 0.5;
  final TextEditingController _textController = TextEditingController(
    text: 'Hello',
  );

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

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
                'Opacity · ClipOval · Card · FittedBox · Radio · RangeSlider · AspectRatio · RotatedBox\n'
                'Gradient (Linear/Radial/Sweep/Diagonal/Multi-stop/ShaderMask Text)\n'
                'ClipRRect · Transform · Stack · Expanded · Wrap · BoxShadow\n'
                'PhysicalModel · BackdropFilter · TextField · Checkbox · Switch · Slider\n'
                'Chips · Progress · Divider · ColoredBox · Border · RichText · ListTile · Icon',
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
              const SizedBox(height: 32),
              _buildGradientSection(),
              const SizedBox(height: 32),
              _buildClipRRectSection(),
              const SizedBox(height: 32),
              _buildTransformSection(),
              const SizedBox(height: 32),
              _buildStackSection(),
              const SizedBox(height: 32),
              _buildExpandedFlexibleSection(),
              const SizedBox(height: 32),
              _buildWrapSection(),
              const SizedBox(height: 32),
              _buildBoxShadowSection(),
              const SizedBox(height: 32),
              _buildPhysicalModelSection(),
              const SizedBox(height: 32),
              _buildBackdropFilterSection(),
              const SizedBox(height: 32),
              _buildTextFieldSection(),
              const SizedBox(height: 32),
              _buildCheckboxSwitchSection(),
              const SizedBox(height: 32),
              _buildSliderSection(),
              const SizedBox(height: 32),
              _buildChipsSection(),
              const SizedBox(height: 32),
              _buildProgressSection(),
              const SizedBox(height: 32),
              _buildDividerSection(),
              const SizedBox(height: 32),
              _buildColoredBoxSection(),
              const SizedBox(height: 32),
              _buildBorderVariantsSection(),
              const SizedBox(height: 32),
              _buildRichTextSection(),
              const SizedBox(height: 32),
              _buildListTileSection(),
              const SizedBox(height: 32),
              _buildIconSection(),
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
        ClipOval(
          child: Container(
            width: 200,
            height: 80,
            color: const Color(0xFF26C6DA),
            alignment: Alignment.center,
            child: const Text(
              'Ellipse (200×80)',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
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
                        style: TextStyle(
                          color: Color(0xFF888888),
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
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
                  child: Icon(Icons.rocket_launch, color: Color(0xFF7C4DFF)),
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
                  child: Icon(Icons.sailing, color: Color(0xFF1565C0)),
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
        Wrap(
          spacing: 16,
          runSpacing: 4,
          children: [
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Radio<int>(
                  value: 0,
                  groupValue: _radioValue,
                  onChanged: (v) => setState(() => _radioValue = v!),
                ),
                const Text('Option A'),
              ],
            ),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Radio<int>(
                  value: 1,
                  groupValue: _radioValue,
                  onChanged: (v) => setState(() => _radioValue = v!),
                ),
                const Text('Option B'),
              ],
            ),
            const SizedBox(width: 16),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
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

  // ─── 9. Gradient ──────────────────────────────────────

  Widget _buildGradientSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('Gradient'),
        const SizedBox(height: 12),
        // Row 1: Background gradients (Linear / Radial / Sweep)
        Row(
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                gradient: const LinearGradient(
                  colors: [Color(0xFFFF6B6B), Color(0xFF556270)],
                ),
              ),
              alignment: Alignment.center,
              child: const Text(
                'Linear',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                gradient: const RadialGradient(
                  colors: [Color(0xFFFFE66D), Color(0xFFFF6B6B)],
                ),
              ),
              alignment: Alignment.center,
              child: const Text(
                'Radial',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                gradient: const SweepGradient(
                  colors: [
                    Color(0xFF6C63FF),
                    Color(0xFF00BFA6),
                    Color(0xFFFF6B6B),
                    Color(0xFF6C63FF),
                  ],
                ),
              ),
              alignment: Alignment.center,
              child: const Text(
                'Sweep',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        // Row 2: Diagonal + multi-stop + vertical background gradients
        Row(
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF667EEA), Color(0xFF764BA2)],
                ),
              ),
              alignment: Alignment.center,
              child: const Text(
                'Diagonal',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                gradient: const LinearGradient(
                  colors: [
                    Color(0xFFFF6B6B),
                    Color(0xFFFFE66D),
                    Color(0xFF00BFA6),
                  ],
                  stops: [0.0, 0.4, 1.0],
                ),
              ),
              alignment: Alignment.center,
              child: const Text(
                '3-Stop',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                gradient: const LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color(0xFF1A1A2E),
                    Color(0xFF16213E),
                    Color(0xFF0F3460),
                  ],
                ),
              ),
              alignment: Alignment.center,
              child: const Text(
                'Vertical',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        // Row 3: Text gradients (ShaderMask)
        const Text(
          'Text Gradients',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: Color(0xFF666666),
          ),
        ),
        const SizedBox(height: 8),
        // Horizontal text gradient
        ShaderMask(
          shaderCallback: (bounds) => const LinearGradient(
            colors: [Color(0xFFFF6B6B), Color(0xFF556270)],
          ).createShader(bounds),
          child: const Text(
            'Horizontal Gradient',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        ),
        const SizedBox(height: 8),
        // Vertical text gradient
        ShaderMask(
          shaderCallback: (bounds) => const LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Colors.white, Color(0xFF38EF7D)],
          ).createShader(bounds),
          child: const Text(
            'Vertical Gradient',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        ),
        const SizedBox(height: 8),
        // Diagonal text gradient
        ShaderMask(
          shaderCallback: (bounds) => const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF667EEA), Color(0xFFFF6B6B)],
          ).createShader(bounds),
          child: const Text(
            'Diagonal Gradient',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        ),
        const SizedBox(height: 8),
        // Multi-color text gradient
        ShaderMask(
          shaderCallback: (bounds) => const LinearGradient(
            colors: [
              Color(0xFFFF6B6B),
              Color(0xFFFFE66D),
              Color(0xFF00BFA6),
              Color(0xFF6C63FF),
            ],
            stops: [0.0, 0.33, 0.66, 1.0],
          ).createShader(bounds),
          child: const Text(
            'Rainbow Text',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        ),
        const SizedBox(height: 8),
        // Radial text gradient
        ShaderMask(
          shaderCallback: (bounds) => const RadialGradient(
            colors: [Color(0xFFFFE66D), Color(0xFFFF6B6B)],
            center: Alignment.center,
            radius: 0.8,
          ).createShader(bounds),
          child: const Text(
            'Radial Text',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        ),
        const SizedBox(height: 8),
        // Sweep text gradient
        ShaderMask(
          shaderCallback: (bounds) => const SweepGradient(
            colors: [
              Color(0xFF6C63FF),
              Color(0xFF00BFA6),
              Color(0xFFFF6B6B),
              Color(0xFF6C63FF),
            ],
            center: Alignment.center,
          ).createShader(bounds),
          child: const Text(
            'Sweep Text',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        ),
        const SizedBox(height: 8),
        // Large radial text (bigger area for radial detection)
        ShaderMask(
          shaderCallback: (bounds) => const RadialGradient(
            colors: [Colors.white, Color(0xFF1A1A2E)],
            center: Alignment.center,
            radius: 1.0,
          ).createShader(bounds),
          child: const Text(
            'Big Radial',
            style: TextStyle(
              fontSize: 48,
              fontWeight: FontWeight.w900,
              color: Colors.white,
            ),
          ),
        ),
        const SizedBox(height: 8),
        // Reverse diagonal text gradient (TR → BL)
        ShaderMask(
          shaderCallback: (bounds) => const LinearGradient(
            begin: Alignment.topRight,
            end: Alignment.bottomLeft,
            colors: [Color(0xFFFFD700), Color(0xFFFF6B6B)],
          ).createShader(bounds),
          child: const Text(
            'Reverse Diagonal',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        ),
      ],
    );
  }

  // ─── 10. ClipRRect ─────────────────────────────────────

  Widget _buildClipRRectSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('ClipRRect'),
        const SizedBox(height: 12),
        Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: Container(
                width: 100,
                height: 100,
                color: const Color(0xFF6C63FF),
                alignment: Alignment.center,
                child: const Text(
                  'r: 20',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(40),
              child: Container(
                width: 100,
                height: 100,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFFFC5C7D), Color(0xFF6A82FB)],
                  ),
                ),
                alignment: Alignment.center,
                child: const Text(
                  'r: 40',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(50),
              child: Container(
                width: 100,
                height: 100,
                color: const Color(0xFF00BFA6),
                alignment: Alignment.center,
                child: const Text(
                  'r: 50',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // ─── 11. Transform ────────────────────────────────────

  Widget _buildTransformSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('Transform'),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            Transform.rotate(
              angle: pi / 6,
              child: Container(
                width: 70,
                height: 70,
                decoration: BoxDecoration(
                  color: const Color(0xFF6C63FF),
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: const Text(
                  'π/6',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            Transform.rotate(
              angle: -pi / 4,
              child: Container(
                width: 70,
                height: 70,
                decoration: BoxDecoration(
                  color: const Color(0xFFFF6B6B),
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: const Text(
                  '-π/4',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            Transform.rotate(
              angle: pi / 2,
              child: Container(
                width: 70,
                height: 70,
                decoration: BoxDecoration(
                  color: const Color(0xFF00BFA6),
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: const Text(
                  'π/2',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // ─── 12. Stack & Positioned ───────────────────────────

  Widget _buildStackSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('Stack & Positioned'),
        const SizedBox(height: 12),
        SizedBox(
          height: 120,
          child: Stack(
            children: [
              Positioned(
                left: 0,
                top: 0,
                child: Container(
                  width: 120,
                  height: 80,
                  decoration: BoxDecoration(
                    color: const Color(0xFF6C63FF),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  alignment: Alignment.center,
                  child: const Text(
                    'Back',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              Positioned(
                left: 60,
                top: 20,
                child: Container(
                  width: 120,
                  height: 80,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFF6B6B).withOpacity(0.9),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  alignment: Alignment.center,
                  child: const Text(
                    'Middle',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              Positioned(
                left: 120,
                top: 40,
                child: Container(
                  width: 120,
                  height: 80,
                  decoration: BoxDecoration(
                    color: const Color(0xFF00BFA6).withOpacity(0.9),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  alignment: Alignment.center,
                  child: const Text(
                    'Front',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ─── 13. Expanded & Flexible ──────────────────────────

  Widget _buildExpandedFlexibleSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('Expanded & Flexible'),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              flex: 2,
              child: Container(
                height: 60,
                decoration: BoxDecoration(
                  color: const Color(0xFF42A5F5),
                  borderRadius: BorderRadius.circular(8),
                ),
                alignment: Alignment.center,
                child: const Text(
                  'Expanded\nflex: 2',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Flexible(
              flex: 1,
              child: Container(
                height: 60,
                decoration: BoxDecoration(
                  color: const Color(0xFF66BB6A),
                  borderRadius: BorderRadius.circular(8),
                ),
                alignment: Alignment.center,
                child: const Text(
                  'Flexible\nflex: 1',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                color: const Color(0xFFFF7043),
                borderRadius: BorderRadius.circular(8),
              ),
              alignment: Alignment.center,
              child: const Text(
                'Fixed\n60',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // ─── 14. Wrap ─────────────────────────────────────────

  Widget _buildWrapSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('Wrap'),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: const [
            Chip(label: Text('Flutter')),
            Chip(label: Text('Dart')),
            Chip(label: Text('Figma')),
            Chip(label: Text('Design')),
            Chip(label: Text('Widget')),
            Chip(label: Text('Layout')),
            Chip(label: Text('Mobile')),
            Chip(label: Text('Web')),
          ],
        ),
      ],
    );
  }

  // ─── 15. BoxShadow ───────────────────────────────────

  Widget _buildBoxShadowSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('BoxShadow'),
        const SizedBox(height: 12),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF6C63FF).withOpacity(0.3),
                blurRadius: 12,
                offset: const Offset(0, 6),
              ),
              BoxShadow(
                color: const Color(0xFFFF6B6B).withOpacity(0.2),
                blurRadius: 20,
                offset: const Offset(4, 10),
              ),
            ],
          ),
          child: const Text(
            'Container with multiple BoxShadows',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }

  // ─── 16. PhysicalModel ───────────────────────────────

  Widget _buildPhysicalModelSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('PhysicalModel'),
        const SizedBox(height: 12),
        PhysicalModel(
          elevation: 8,
          color: const Color(0xFFE8EAF6),
          borderRadius: BorderRadius.circular(16),
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            child: const Text(
              'PhysicalModel elevation: 8',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
            ),
          ),
        ),
      ],
    );
  }

  // ─── 17. BackdropFilter ──────────────────────────────

  Widget _buildBackdropFilterSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('BackdropFilter'),
        const SizedBox(height: 12),
        SizedBox(
          height: 120,
          child: Stack(
            children: [
              Container(
                width: double.infinity,
                height: 120,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  gradient: const LinearGradient(
                    colors: [Color(0xFFFC5C7D), Color(0xFF6A82FB)],
                  ),
                ),
                alignment: Alignment.center,
                child: const Text(
                  'Background Gradient',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              Positioned(
                left: 20,
                top: 20,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
                    child: Container(
                      width: 160,
                      height: 80,
                      color: Colors.white.withOpacity(0.2),
                      alignment: Alignment.center,
                      child: const Text(
                        'Blurred',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ─── 18. TextField ───────────────────────────────────

  Widget _buildTextFieldSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('TextField'),
        const SizedBox(height: 12),
        TextField(
          controller: _textController,
          decoration: const InputDecoration(
            labelText: 'Label Text',
            border: UnderlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          decoration: InputDecoration(
            labelText: 'Outlined',
            hintText: 'Type here...',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
      ],
    );
  }

  // ─── 19. Checkbox & Switch ───────────────────────────

  Widget _buildCheckboxSwitchSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('Checkbox & Switch'),
        const SizedBox(height: 12),
        Wrap(
          spacing: 24,
          runSpacing: 4,
          children: [
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Checkbox(
                  value: _checkboxValue,
                  onChanged: (v) => setState(() => _checkboxValue = v!),
                ),
                const Text('Checkbox'),
              ],
            ),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Switch(
                  value: _switchValue,
                  onChanged: (v) => setState(() => _switchValue = v),
                ),
                const Text('Switch'),
              ],
            ),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                CupertinoSwitch(
                  value: _switchValue,
                  onChanged: (v) => setState(() => _switchValue = v),
                ),
                const Text(' Cupertino'),
              ],
            ),
          ],
        ),
      ],
    );
  }

  // ─── 20. Slider ──────────────────────────────────────

  Widget _buildSliderSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('Slider'),
        const SizedBox(height: 12),
        Slider(
          value: _sliderValue,
          onChanged: (v) => setState(() => _sliderValue = v),
          activeColor: const Color(0xFF6C63FF),
        ),
        Text(
          'Value: ${_sliderValue.toStringAsFixed(2)}',
          style: const TextStyle(fontSize: 13, color: Color(0xFF555555)),
        ),
      ],
    );
  }

  // ─── 21. Chips ───────────────────────────────────────

  Widget _buildChipsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('Chips'),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            ChoiceChip(
              label: const Text('Choice'),
              selected: true,
              selectedColor: const Color(0xFF6C63FF).withOpacity(0.2),
            ),
            FilterChip(
              label: const Text('Filter'),
              selected: true,
              onSelected: (_) {},
            ),
            InputChip(label: const Text('Input'), onDeleted: () {}),
            ActionChip(label: const Text('Action'), onPressed: () {}),
          ],
        ),
      ],
    );
  }

  // ─── 22. Progress Indicators ─────────────────────────

  Widget _buildProgressSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('Progress Indicators'),
        const SizedBox(height: 12),
        Row(
          children: [
            const SizedBox(
              width: 48,
              height: 48,
              child: CircularProgressIndicator(
                value: 0.7,
                strokeWidth: 5,
                color: Color(0xFF6C63FF),
              ),
            ),
            const SizedBox(width: 24),
            Expanded(
              child: LinearProgressIndicator(
                value: 0.5,
                minHeight: 8,
                color: const Color(0xFF00BFA6),
                backgroundColor: const Color(0xFFE0E0E0),
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // ─── 23. Divider ─────────────────────────────────────

  Widget _buildDividerSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('Divider'),
        const SizedBox(height: 12),
        const Divider(thickness: 2, color: Color(0xFF6C63FF)),
        const SizedBox(height: 12),
        SizedBox(
          height: 60,
          child: Row(
            children: [
              Expanded(
                child: Container(
                  color: const Color(0xFFE8EAF6),
                  alignment: Alignment.center,
                  child: const Text('Left'),
                ),
              ),
              const VerticalDivider(
                thickness: 2,
                color: Color(0xFFFF6B6B),
                width: 20,
              ),
              Expanded(
                child: Container(
                  color: const Color(0xFFFFF3E0),
                  alignment: Alignment.center,
                  child: const Text('Right'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ─── 24. ColoredBox ──────────────────────────────────

  Widget _buildColoredBoxSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('ColoredBox'),
        const SizedBox(height: 12),
        const ColoredBox(
          color: Color(0xFFE8F5E9),
          child: Padding(
            padding: EdgeInsets.all(16),
            child: Text(
              'ColoredBox with green background',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
            ),
          ),
        ),
      ],
    );
  }

  // ─── 25. Border Variants ─────────────────────────────

  Widget _buildBorderVariantsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('Border Variants'),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: Container(
                height: 60,
                decoration: BoxDecoration(
                  border: Border.all(color: const Color(0xFF6C63FF), width: 2),
                  borderRadius: BorderRadius.circular(8),
                ),
                alignment: Alignment.center,
                child: const Text('All sides', style: TextStyle(fontSize: 12)),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Container(
                height: 60,
                decoration: const BoxDecoration(
                  border: Border(
                    top: BorderSide(color: Color(0xFFFF6B6B), width: 3),
                    bottom: BorderSide(color: Color(0xFFFF6B6B), width: 3),
                  ),
                ),
                alignment: Alignment.center,
                child: const Text(
                  'Top & Bottom',
                  style: TextStyle(fontSize: 12),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Container(
                height: 60,
                decoration: const BoxDecoration(
                  border: Border(
                    left: BorderSide(color: Color(0xFF00BFA6), width: 4),
                  ),
                ),
                alignment: Alignment.center,
                child: const Text('Left only', style: TextStyle(fontSize: 12)),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // ─── 26. RichText ────────────────────────────────────

  Widget _buildRichTextSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('RichText'),
        const SizedBox(height: 12),
        RichText(
          text: const TextSpan(
            style: TextStyle(fontSize: 16, color: Color(0xFF1A1A2E)),
            children: [
              TextSpan(
                text: 'Bold ',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              TextSpan(text: 'normal '),
              TextSpan(
                text: 'italic ',
                style: TextStyle(fontStyle: FontStyle.italic),
              ),
              TextSpan(
                text: 'colored ',
                style: TextStyle(color: Color(0xFF6C63FF)),
              ),
              TextSpan(
                text: 'bold+colored',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Color(0xFFFF6B6B),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ─── 27. ListTile ────────────────────────────────────

  Widget _buildListTileSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('ListTile'),
        const SizedBox(height: 12),
        Card(
          child: Column(
            children: [
              const ListTile(
                leading: Icon(Icons.person, color: Color(0xFF6C63FF)),
                title: Text('ListTile'),
                subtitle: Text('With leading, title, subtitle, trailing'),
                trailing: Icon(Icons.chevron_right),
              ),
              CheckboxListTile(
                value: _checkboxValue,
                onChanged: (v) => setState(() => _checkboxValue = v!),
                title: const Text('CheckboxListTile'),
                subtitle: const Text('Integrated checkbox'),
              ),
              RadioListTile<int>(
                value: 0,
                groupValue: _radioValue,
                onChanged: (v) => setState(() => _radioValue = v!),
                title: const Text('RadioListTile'),
                subtitle: const Text('Integrated radio'),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ─── 28. Icon Sizes & Colors ─────────────────────────

  Widget _buildIconSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('Icon Sizes & Colors'),
        const SizedBox(height: 12),
        Row(
          children: const [
            Icon(Icons.star, size: 16, color: Color(0xFF6C63FF)),
            SizedBox(width: 12),
            Icon(Icons.star, size: 24, color: Color(0xFFFF6B6B)),
            SizedBox(width: 12),
            Icon(Icons.star, size: 36, color: Color(0xFF00BFA6)),
            SizedBox(width: 12),
            Icon(Icons.star, size: 48, color: Color(0xFFFFB74D)),
            SizedBox(width: 12),
            Icon(Icons.favorite, size: 32, color: Color(0xFFFF7043)),
            SizedBox(width: 12),
            Icon(Icons.bolt, size: 32, color: Color(0xFF7C4DFF)),
          ],
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
