import 'package:flutter/material.dart';

class AppBarTestPage extends StatelessWidget {
  const AppBarTestPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1) 기본 AppBar: leading + title + actions
            AppBar(
              leading: const BackButton(),
              title: const Text('Full AppBar'),
              actions: [
                IconButton(icon: const Icon(Icons.search), onPressed: () {}),
                IconButton(icon: const Icon(Icons.more_vert), onPressed: () {}),
              ],
            ),
            const SizedBox(height: 16),

            // 2) Title only (no leading, no actions)
            AppBar(
              automaticallyImplyLeading: false,
              title: const Text('Title Only'),
            ),
            const SizedBox(height: 16),

            // 3) Leading + title (no actions)
            AppBar(
              leading: const BackButton(),
              title: const Text('With Leading'),
            ),
            const SizedBox(height: 16),

            // 4) Title + single action
            AppBar(
              automaticallyImplyLeading: false,
              title: const Text('With Action'),
              actions: [
                IconButton(icon: const Icon(Icons.settings), onPressed: () {}),
              ],
            ),
            const SizedBox(height: 16),

            // 5) Long title text
            AppBar(
              leading: const BackButton(),
              title: const Text(
                'Very Long Title That Might Overflow',
                overflow: TextOverflow.ellipsis,
              ),
              actions: [
                IconButton(icon: const Icon(Icons.share), onPressed: () {}),
              ],
            ),
            const SizedBox(height: 16),

            // 6) centerTitle: false
            AppBar(
              leading: const BackButton(),
              centerTitle: false,
              title: const Text('Left Aligned'),
              actions: [
                IconButton(icon: const Icon(Icons.favorite), onPressed: () {}),
              ],
            ),
            const SizedBox(height: 16),

            // 7) Multiple actions
            AppBar(
              leading: IconButton(
                icon: const Icon(Icons.menu),
                onPressed: () {},
              ),
              title: const Text('Multi Actions'),
              actions: [
                IconButton(icon: const Icon(Icons.search), onPressed: () {}),
                IconButton(
                  icon: const Icon(Icons.notifications),
                  onPressed: () {},
                ),
                IconButton(
                  icon: const Icon(Icons.account_circle),
                  onPressed: () {},
                ),
              ],
            ),
            const SizedBox(height: 16),

            // 8) Custom colors
            AppBar(
              backgroundColor: const Color(0xFF1A1A2E),
              foregroundColor: Colors.white,
              leading: const BackButton(),
              title: const Text('Dark AppBar'),
              actions: [
                IconButton(icon: const Icon(Icons.edit), onPressed: () {}),
              ],
            ),
            const SizedBox(height: 32),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 20),
              child: Text(
                'centerTitle: true',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1A1A2E),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // 9) centerTitle: Full AppBar
            AppBar(
              centerTitle: true,
              leading: const BackButton(),
              title: const Text('Full AppBar'),
              actions: [
                IconButton(icon: const Icon(Icons.search), onPressed: () {}),
                IconButton(icon: const Icon(Icons.more_vert), onPressed: () {}),
              ],
            ),
            const SizedBox(height: 16),

            // 10) centerTitle: Title only
            AppBar(
              centerTitle: true,
              automaticallyImplyLeading: false,
              title: const Text('Title Only'),
            ),
            const SizedBox(height: 16),

            // 11) centerTitle: Leading + title
            AppBar(
              centerTitle: true,
              leading: const BackButton(),
              title: const Text('With Leading'),
            ),
            const SizedBox(height: 16),

            // 12) centerTitle: Title + single action
            AppBar(
              centerTitle: true,
              automaticallyImplyLeading: false,
              title: const Text('With Action'),
              actions: [
                IconButton(icon: const Icon(Icons.settings), onPressed: () {}),
              ],
            ),
            const SizedBox(height: 16),

            // 13) centerTitle: Long title
            AppBar(
              centerTitle: true,
              leading: const BackButton(),
              title: const Text(
                'Very Long Title That Might Overflow',
                overflow: TextOverflow.ellipsis,
              ),
              actions: [
                IconButton(icon: const Icon(Icons.share), onPressed: () {}),
              ],
            ),
            const SizedBox(height: 16),

            // 14) centerTitle: Multiple actions
            AppBar(
              centerTitle: true,
              leading: IconButton(
                icon: const Icon(Icons.menu),
                onPressed: () {},
              ),
              title: const Text('Multi Actions'),
              actions: [
                IconButton(icon: const Icon(Icons.search), onPressed: () {}),
                IconButton(
                  icon: const Icon(Icons.notifications),
                  onPressed: () {},
                ),
                IconButton(
                  icon: const Icon(Icons.account_circle),
                  onPressed: () {},
                ),
              ],
            ),
            const SizedBox(height: 16),

            // 15) centerTitle: Dark AppBar
            AppBar(
              centerTitle: true,
              backgroundColor: const Color(0xFF1A1A2E),
              foregroundColor: Colors.white,
              leading: const BackButton(),
              title: const Text('Dark AppBar'),
              actions: [
                IconButton(icon: const Icon(Icons.edit), onPressed: () {}),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
