import 'dart:ui';
import 'package:flutter/material.dart';

class WeatherLandscapePage extends StatelessWidget {
  const WeatherLandscapePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          _buildBackground(),
          _buildDecoCircles(),
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                children: [
                  const SizedBox(height: 16),
                  _buildTopBar(),
                  const SizedBox(height: 40),
                  _buildMainTemp(),
                  const SizedBox(height: 40),
                  _buildGlassInfoPanel(),
                  const SizedBox(height: 24),
                  _buildWeeklyForecast(),
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBackground() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          stops: [0.0, 0.3, 0.7, 1.0],
          colors: [
            Color(0xFF1A0533),
            Color(0xFF2D1B69),
            Color(0xFF11998E),
            Color(0xFF38EF7D),
          ],
        ),
      ),
    );
  }

  Widget _buildDecoCircles() {
    return CustomPaint(size: Size.infinite, painter: _CirclePainter());
  }

  Widget _buildTopBar() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'San Francisco',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.9),
                fontSize: 22,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Sunday, March 9',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.5),
                fontSize: 14,
              ),
            ),
          ],
        ),
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(14),
          ),
          child: const Icon(Icons.search, color: Colors.white, size: 22),
        ),
      ],
    );
  }

  Widget _buildMainTemp() {
    return Column(
      children: [
        const Icon(Icons.wb_sunny, color: Color(0xFFFFD700), size: 64),
        const SizedBox(height: 12),
        ShaderMask(
          shaderCallback: (bounds) => const LinearGradient(
            colors: [Colors.white, Color(0xFF38EF7D)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ).createShader(bounds),
          child: const Text(
            '22°',
            style: TextStyle(
              fontSize: 120,
              fontWeight: FontWeight.w200,
              color: Colors.white,
              height: 1.0,
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Mostly Sunny',
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.7),
            fontSize: 20,
            fontWeight: FontWeight.w300,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Feels like 20°',
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.4),
            fontSize: 14,
          ),
        ),
      ],
    );
  }

  Widget _buildGlassInfoPanel() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _infoItem(Icons.water_drop, '62%', 'Humidity'),
              _divider(),
              _infoItem(Icons.air, '14 km/h', 'Wind'),
              _divider(),
              _infoItem(Icons.visibility, '10 km', 'Visibility'),
            ],
          ),
        ),
      ),
    );
  }

  Widget _infoItem(IconData icon, String value, String label) {
    return Column(
      children: [
        Icon(icon, color: Colors.white.withValues(alpha: 0.8), size: 24),
        const SizedBox(height: 8),
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.5),
            fontSize: 12,
          ),
        ),
      ],
    );
  }

  Widget _divider() {
    return Container(
      height: 50,
      width: 1,
      color: Colors.white.withValues(alpha: 0.2),
    );
  }

  Widget _buildWeeklyForecast() {
    final days = [
      ('Mon', Icons.wb_sunny, '24°', '16°'),
      ('Tue', Icons.cloud, '19°', '14°'),
      ('Wed', Icons.grain, '17°', '12°'),
      ('Thu', Icons.thunderstorm, '15°', '10°'),
      ('Fri', Icons.wb_cloudy, '18°', '11°'),
      ('Sat', Icons.wb_sunny, '23°', '15°'),
      ('Sun', Icons.wb_sunny, '25°', '17°'),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '7-Day Forecast',
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.9),
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        ...days.map(
          (d) => Container(
            margin: const EdgeInsets.only(bottom: 8),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 14,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.1),
                    ),
                  ),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 40,
                        child: Text(
                          d.$1,
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.7),
                            fontSize: 15,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      Icon(d.$2, color: const Color(0xFFFFD700), size: 22),
                      const Spacer(),
                      Text(
                        d.$3,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        width: 80,
                        height: 4,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(2),
                          gradient: const LinearGradient(
                            colors: [Color(0xFF38EF7D), Color(0xFFFFD700)],
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        d.$4,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.5),
                          fontSize: 16,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _CirclePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..style = PaintingStyle.fill;

    // Large translucent circle top-right
    paint.color = const Color(0xFF38EF7D).withValues(alpha: 0.08);
    canvas.drawCircle(
      Offset(size.width * 0.85, size.height * 0.12),
      120,
      paint,
    );

    // Medium circle bottom-left
    paint.color = const Color(0xFFFFD700).withValues(alpha: 0.06);
    canvas.drawCircle(Offset(size.width * 0.1, size.height * 0.75), 80, paint);

    // Small circle center-right
    paint.color = Colors.white.withValues(alpha: 0.05);
    canvas.drawCircle(Offset(size.width * 0.7, size.height * 0.5), 50, paint);

    // Ring
    paint
      ..color = Colors.white.withValues(alpha: 0.06)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    canvas.drawCircle(Offset(size.width * 0.3, size.height * 0.35), 100, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
