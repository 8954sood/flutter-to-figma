import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:test_crawler/crawler.dart';
import 'helpers.dart';

void main() {
  setUpAll(() {
    verifyCrawlerSourceSync();
  });

  // ============================================================
  // 기본 레이아웃
  // ============================================================

  group('Row', () {
    testWidgets('produces ROW with Text children', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Row(children: const [Text('A'), Text('B'), Text('C')]),
        ),
      ));

      final result = runCrawler();
      final rows = findAllNodes(result, (n) => n['layoutMode'] == 'ROW');
      expect(rows, isNotEmpty);

      final textNodes = <Map<String, dynamic>>[];
      for (final row in rows) {
        textNodes.addAll(findAllNodes(row, (n) => n['type'] == 'Text'));
      }
      expect(textNodes.length, greaterThanOrEqualTo(3));
    });

    testWidgets('Row with mainAxisAlignment.spaceBetween', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: const [Text('L'), Text('R')],
          ),
        ),
      ));

      final result = runCrawler();
      final row = findNode(result, (n) => n['layoutMode'] == 'ROW');
      expect(row, isNotNull);
      final cl = row!['containerLayout'] as Map<String, dynamic>? ?? {};
      expect(cl['mainAxisAlignment'], contains('spaceBetween'));
    });
  });

  group('Column', () {
    testWidgets('produces COLUMN layout', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Column(
            children: const [Text('Top'), Text('Mid'), Text('Bot')],
          ),
        ),
      ));

      final result = runCrawler();
      final cols = findAllNodes(result, (n) => n['layoutMode'] == 'COLUMN');
      expect(cols, isNotEmpty);

      final textNodes = <Map<String, dynamic>>[];
      for (final col in cols) {
        textNodes.addAll(findAllNodes(col, (n) => n['type'] == 'Text'));
      }
      expect(textNodes.length, greaterThanOrEqualTo(3));
    });

    testWidgets('Column + crossAxisAlignment.stretch', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: const [Text('Stretched')],
          ),
        ),
      ));

      final result = runCrawler();
      final col = findNode(
        result,
        (n) =>
            n['layoutMode'] == 'COLUMN' &&
            ((n['containerLayout'] as Map?)?['crossAxisAlignment']
                    ?.toString()
                    .contains('stretch') ??
                false),
      );
      expect(col, isNotNull, reason: 'Should find COLUMN with stretch');
    });
  });

  // ============================================================
  // Flex (Expanded / Flexible)
  // ============================================================

  group('Expanded', () {
    testWidgets('Expanded child has flexGrow and sizingH', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Row(children: [
            Expanded(child: Text('Fill')),
            Text('Fixed'),
          ]),
        ),
      ));

      final result = runCrawler();
      final flexNode = findNode(result, (n) {
        final cl = n['childLayout'] as Map<String, dynamic>?;
        return cl != null && (cl['flexGrow'] ?? 0) > 0;
      });
      expect(flexNode, isNotNull);
      final cl = flexNode!['childLayout'] as Map<String, dynamic>;
      expect(cl['flexGrow'], 1);
    });
  });

  group('Flexible', () {
    testWidgets('Flexible children with different flex ratios', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Row(children: [
            Flexible(
                flex: 2,
                child: Container(color: Color(0xFFFF0000), height: 50)),
            Flexible(
                flex: 1,
                child: Container(color: Color(0xFF00FF00), height: 50)),
          ]),
        ),
      ));

      final result = runCrawler();
      final flexNodes = findAllNodes(result, (n) {
        final cl = n['childLayout'] as Map<String, dynamic>?;
        return cl != null && (cl['flexGrow'] ?? 0) > 0;
      });
      expect(flexNodes.length, greaterThanOrEqualTo(2));

      final flexValues =
          flexNodes.map((n) => (n['childLayout'] as Map)['flexGrow']).toList();
      expect(flexValues, contains(2));
      expect(flexValues, contains(1));
    });
  });

  // ============================================================
  // Container / Decoration
  // ============================================================

  group('Container', () {
    testWidgets('color produces backgroundColor', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Container(color: Color(0xFFFF0000), child: Text('Red')),
        ),
      ));

      final result = runCrawler();
      final bgNode = findNode(result, (n) {
        final vis = n['visual'] as Map<String, dynamic>?;
        return vis != null &&
            vis['backgroundColor'] != null &&
            vis['backgroundColor'].toString().contains('ff0000');
      });
      expect(bgNode, isNotNull);
    });

    testWidgets('BoxDecoration border extracts color and width',
        (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Container(
            decoration: BoxDecoration(
              color: Color(0xFF00FF00),
              border: Border.all(color: Color(0xFF000000), width: 2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text('Decorated'),
          ),
        ),
      ));

      final result = runCrawler();

      final borderNode = findNode(result, (n) {
        final vis = n['visual'] as Map<String, dynamic>?;
        return vis != null && vis['border'] != null;
      });
      expect(borderNode, isNotNull);

      final border =
          (borderNode!['visual'] as Map<String, dynamic>)['border'] as Map;
      expect(border['width'], 2.0);

      final radiusNode = findNode(result, (n) {
        final vis = n['visual'] as Map<String, dynamic>?;
        return vis != null && vis['borderRadius'] != null;
      });
      expect(radiusNode, isNotNull);
    });

    testWidgets('per-side border', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Container(
            decoration: BoxDecoration(
              border: Border(
                top: BorderSide(color: Color(0xFF000000), width: 2),
                bottom: BorderSide(color: Color(0xFF000000), width: 4),
              ),
            ),
            child: Text('Per-side'),
          ),
        ),
      ));

      final result = runCrawler();
      final borderNode = findNode(result, (n) {
        final vis = n['visual'] as Map<String, dynamic>?;
        if (vis == null) return false;
        final b = vis['border'] as Map?;
        return b != null && b['topWidth'] != null;
      });
      expect(borderNode, isNotNull, reason: 'Should extract per-side border');
    });

    testWidgets('non-uniform borderRadius', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Container(
            decoration: BoxDecoration(
              color: Color(0xFFCCCCCC),
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(10),
                topRight: Radius.circular(20),
                bottomLeft: Radius.circular(5),
                bottomRight: Radius.circular(0),
              ),
            ),
            child: Text('Asymmetric'),
          ),
        ),
      ));

      final result = runCrawler();
      final radiusNode = findNode(result, (n) {
        final vis = n['visual'] as Map<String, dynamic>?;
        if (vis == null) return false;
        final br = vis['borderRadius'];
        return br is Map; // non-uniform → Map {tl, tr, bl, br}
      });
      expect(radiusNode, isNotNull,
          reason: 'Should extract non-uniform borderRadius as Map');
      final br = (radiusNode!['visual'] as Map<String, dynamic>)['borderRadius']
          as Map;
      expect(br['tl'], 10.0);
      expect(br['tr'], 20.0);
    });
  });

  // ============================================================
  // Padding
  // ============================================================

  group('Padding', () {
    testWidgets('symmetric padding extraction', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Padding(
            padding: EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            child: Text('Padded'),
          ),
        ),
      ));

      final result = runCrawler();
      final paddedNode = findNode(result, (n) {
        final cl = n['containerLayout'] as Map<String, dynamic>?;
        if (cl == null) return false;
        final p = cl['padding'] as Map<String, dynamic>?;
        return p != null && p['left'] == 24.0;
      });
      expect(paddedNode, isNotNull);
      final p = (paddedNode!['containerLayout'] as Map)['padding'] as Map;
      expect(p['top'], 12.0);
      expect(p['bottom'], 12.0);
      expect(p['left'], 24.0);
      expect(p['right'], 24.0);
    });
  });

  // ============================================================
  // Stack / Positioned
  // ============================================================

  group('Stack', () {
    testWidgets('produces STACK layout with positioned children',
        (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Stack(children: [
            Positioned(top: 10, left: 20, child: Text('A')),
            Positioned(bottom: 5, right: 15, child: Text('B')),
          ]),
        ),
      ));

      final result = runCrawler();
      final stackNode = findNode(result, (n) => n['layoutMode'] == 'STACK');
      expect(stackNode, isNotNull);

      // Children should have positioned childLayout
      final posNodes = findAllNodes(stackNode!, (n) {
        final cl = n['childLayout'] as Map<String, dynamic>?;
        return cl != null && cl['positioned'] != null;
      });
      expect(posNodes.length, greaterThanOrEqualTo(2));
    });

    testWidgets('Stack with non-positioned children', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Stack(children: [
            Container(color: Color(0xFFFF0000), width: 200, height: 200),
            Center(child: Text('Overlay')),
          ]),
        ),
      ));

      final result = runCrawler();
      final stackNode = findNode(result, (n) => n['layoutMode'] == 'STACK');
      expect(stackNode, isNotNull);
    });
  });

  // ============================================================
  // SizedBox spacer
  // ============================================================

  group('SizedBox spacer', () {
    testWidgets('SizedBox width=16 in Row produces 16px-wide spacer Frame',
        (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Row(
            children: const [Text('L'), SizedBox(width: 16), Text('R')],
          ),
        ),
      ));

      final result = runCrawler();
      final row = findNode(result, (n) {
        final children = n['children'] as List?;
        if (children == null || n['layoutMode'] != 'ROW') return false;
        return children.whereType<Map>().any((c) => c['type'] == 'Text');
      });
      expect(row, isNotNull);

      final children =
          (row!['children'] as List).whereType<Map<String, dynamic>>().toList();
      final textChildren = children.where((c) => c['type'] == 'Text').toList();
      expect(textChildren.length, greaterThanOrEqualTo(2));

      // SizedBox(width:16) → Frame with rect.w == 16
      final spacerFrame = children.where((c) {
        if (c['type'] != 'Frame') return false;
        final rect = c['rect'] as Map<String, dynamic>?;
        return rect != null && rect['w'] == 16.0;
      });
      expect(spacerFrame, isNotEmpty,
          reason: 'SizedBox(width:16) should produce a Frame with w=16');
    });
  });

  // ============================================================
  // Wrap
  // ============================================================

  group('Wrap', () {
    testWidgets('WRAP layout preserves spacing and runSpacing', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              Container(width: 50, height: 30, color: Color(0xFFFF0000)),
              Container(width: 50, height: 30, color: Color(0xFF00FF00)),
              Container(width: 50, height: 30, color: Color(0xFF0000FF)),
            ],
          ),
        ),
      ));

      final result = runCrawler();
      final wrapNode = findNode(result, (n) => n['layoutMode'] == 'WRAP');
      expect(wrapNode, isNotNull);

      final cl = wrapNode!['containerLayout'] as Map<String, dynamic>? ?? {};
      expect(cl['itemSpacing'], 8.0);
      expect(cl['runSpacing'], 4.0);
    });

    testWidgets('WRAP children have HUG sizing', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Wrap(
            spacing: 8,
            children: [
              Container(width: 60, height: 30, color: Color(0xFFFF0000)),
              Container(width: 70, height: 30, color: Color(0xFF00FF00)),
            ],
          ),
        ),
      ));

      final result = runCrawler();
      final wrapNode = findNode(result, (n) => n['layoutMode'] == 'WRAP');
      expect(wrapNode, isNotNull);

      final wrapChildren =
          (wrapNode!['children'] as List).whereType<Map<String, dynamic>>();
      for (final child in wrapChildren) {
        final cl = child['childLayout'] as Map<String, dynamic>? ?? {};
        if (cl['sizingH'] != null) {
          expect(cl['sizingH'], 'HUG');
        }
      }
    });
  });

  // ============================================================
  // AppBar / NavigationToolbar
  // ============================================================

  group('AppBar', () {
    testWidgets('left-aligned AppBar has NavigationToolbar with title',
        (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          appBar: AppBar(
            title: Text('My Title'),
            centerTitle: false,
            actions: [
              IconButton(icon: Icon(Icons.search), onPressed: () {}),
            ],
          ),
          body: Text('Body'),
        ),
      ));

      final result = runCrawler();

      final toolbar =
          findNode(result, (n) => n['widgetName'] == 'NavigationToolbar');
      expect(toolbar, isNotNull);

      // Should contain title text
      final titleText = findNode(toolbar!, (n) {
        final vis = n['visual'] as Map<String, dynamic>?;
        return n['type'] == 'Text' &&
            vis != null &&
            (vis['content'] ?? '').toString().contains('My Title');
      });
      expect(titleText, isNotNull, reason: 'Toolbar should contain title text');
    });

    testWidgets('centered AppBar has NavigationToolbar', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          appBar: AppBar(title: Text('Center'), centerTitle: true),
          body: Text('Body'),
        ),
      ));

      final result = runCrawler();

      final toolbar =
          findNode(result, (n) => n['widgetName'] == 'NavigationToolbar');
      expect(toolbar, isNotNull);

      final titleText = findNode(toolbar!, (n) {
        final vis = n['visual'] as Map<String, dynamic>?;
        return n['type'] == 'Text' &&
            vis != null &&
            (vis['content'] ?? '').toString().contains('Center');
      });
      expect(titleText, isNotNull);
    });

    testWidgets('AppBar with leading back button', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          appBar: AppBar(
            leading: BackButton(),
            title: Text('Back Test'),
          ),
          body: Text('Body'),
        ),
      ));

      final result = runCrawler();
      final toolbar =
          findNode(result, (n) => n['widgetName'] == 'NavigationToolbar');
      expect(toolbar, isNotNull);

      // Should find BackButton widgetName
      final backBtn =
          findNode(toolbar!, (n) => n['widgetName'] == 'BackButton');
      expect(backBtn, isNotNull, reason: 'Should detect BackButton widget');
    });
  });

  // ============================================================
  // RotatedBox
  // ============================================================

  group('RotatedBox', () {
    testWidgets('extracts rotation degrees', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: RotatedBox(quarterTurns: 1, child: Text('Rotated')),
        ),
      ));

      final result = runCrawler();
      final rotNode = findNode(result, (n) {
        final vis = n['visual'] as Map<String, dynamic>?;
        return vis != null && vis['rotation'] != null;
      });
      expect(rotNode, isNotNull);
      final rotation = (rotNode!['visual'] as Map<String, dynamic>)['rotation'];
      expect(rotation, 90.0);
    });

    testWidgets('quarterTurns=2 → 180°', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: RotatedBox(quarterTurns: 2, child: Text('Flipped')),
        ),
      ));

      final result = runCrawler();
      final rotNode = findNode(result, (n) {
        final vis = n['visual'] as Map<String, dynamic>?;
        return vis != null && vis['rotation'] == 180.0;
      });
      expect(rotNode, isNotNull);
    });
  });

  // ============================================================
  // Opacity
  // ============================================================

  group('Opacity', () {
    testWidgets('extracts opacity=0.5 on child node', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Opacity(
            opacity: 0.5,
            child: Container(color: Color(0xFFFF0000), width: 100, height: 100),
          ),
        ),
      ));

      final result = runCrawler();

      // Opacity 0.5 should appear on the container node's visual
      final opNode = findNode(result, (n) {
        final vis = n['visual'] as Map<String, dynamic>?;
        return vis != null && vis['opacity'] == 0.5;
      });
      expect(opNode, isNotNull, reason: 'Should find node with opacity=0.5');

      final vis = opNode!['visual'] as Map<String, dynamic>;
      expect(vis['backgroundColor'], contains('ff0000'));
    });
  });

  // ============================================================
  // ClipRRect
  // ============================================================

  group('ClipRRect', () {
    testWidgets('extracts borderRadius from clip', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: Container(color: Color(0xFF0000FF), width: 100, height: 100),
          ),
        ),
      ));

      final result = runCrawler();
      final clipNode = findNode(result, (n) {
        final vis = n['visual'] as Map<String, dynamic>?;
        return vis != null && vis['borderRadius'] == 20.0;
      });
      expect(clipNode, isNotNull,
          reason: 'ClipRRect should produce borderRadius=20');
    });
  });

  // ============================================================
  // Card
  // ============================================================

  group('Card', () {
    testWidgets('extracts elevation and borderRadius', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Card(
            elevation: 4,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('Card'),
            ),
          ),
        ),
      ));

      final result = runCrawler();

      // Card should produce a node with borderRadius=16 AND elevation=4
      final cardNode = findNode(result, (n) {
        final vis = n['visual'] as Map<String, dynamic>?;
        return vis != null && vis['borderRadius'] == 16.0;
      });
      expect(cardNode, isNotNull, reason: 'Card should extract borderRadius');

      final vis = cardNode!['visual'] as Map<String, dynamic>;
      final shadow = vis['shadow'] as Map<String, dynamic>?;
      expect(shadow, isNotNull, reason: 'Card should extract shadow/elevation');
      expect(shadow!['elevation'], 4.0);
    });
  });

  // ============================================================
  // ListView / ListTile
  // ============================================================

  group('ListView + ListTile', () {
    testWidgets('ListTile has widgetName and title text', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: ListView(children: [
            ListTile(
              leading: Icon(Icons.star),
              title: Text('Item Title'),
              subtitle: Text('Subtitle'),
            ),
          ]),
        ),
      ));

      final result = runCrawler();

      final listTile = findNode(result, (n) => n['widgetName'] == 'ListTile');
      expect(listTile, isNotNull, reason: 'Should detect ListTile widgetName');

      // Title text should exist inside
      final titleText = findNode(listTile!, (n) {
        final vis = n['visual'] as Map<String, dynamic>?;
        return n['type'] == 'Text' &&
            vis != null &&
            vis['content'] == 'Item Title';
      });
      expect(titleText, isNotNull);
    });

    testWidgets('multiple ListTiles in ListView', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: ListView(children: [
            ListTile(title: Text('A')),
            ListTile(title: Text('B')),
            ListTile(title: Text('C')),
          ]),
        ),
      ));

      final result = runCrawler();
      final tiles = findAllNodes(result, (n) => n['widgetName'] == 'ListTile');
      expect(tiles.length, greaterThanOrEqualTo(3));
    });
  });

  // ============================================================
  // Scaffold 중복 제거
  // ============================================================

  group('Multiple Scaffolds', () {
    testWidgets('keeps last Scaffold only', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Stack(children: [
            Scaffold(body: Text('Background')),
            Scaffold(body: Text('Foreground')),
          ]),
        ),
      ));

      final result = runCrawler();

      // Foreground should be present
      final fg = findNode(result, (n) {
        final vis = n['visual'] as Map<String, dynamic>?;
        return n['type'] == 'Text' &&
            vis != null &&
            vis['content'] == 'Foreground';
      });
      expect(fg, isNotNull, reason: 'Foreground Scaffold should be kept');

      // Background should be removed by _keepLastScaffold
      final bg = findNode(result, (n) {
        final vis = n['visual'] as Map<String, dynamic>?;
        return n['type'] == 'Text' &&
            vis != null &&
            vis['content'] == 'Background';
      });
      expect(bg, isNull, reason: 'Background Scaffold should be removed');
    });
  });

  // ============================================================
  // Gradient
  // ============================================================

  group('Gradient', () {
    testWidgets('LinearGradient extraction', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Container(
            width: 200,
            height: 100,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFFFF0000), Color(0xFF0000FF)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
          ),
        ),
      ));

      final result = runCrawler();
      final gradNode = findNode(result, (n) {
        final vis = n['visual'] as Map<String, dynamic>?;
        return vis != null && vis['gradient'] != null;
      });
      expect(gradNode, isNotNull);
      final grad =
          (gradNode!['visual'] as Map<String, dynamic>)['gradient'] as Map;
      expect(grad['type'], 'linear');
      expect((grad['colors'] as List).length, 2);
    });
  });

  // ============================================================
  // Align / Center
  // ============================================================

  group('Align / Center', () {
    testWidgets('Center wraps child with center alignment', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Center(child: Text('Centered')),
        ),
      ));

      final result = runCrawler();
      // Should find alignment info
      final centerNode = findNode(result, (n) {
        final cl = n['containerLayout'] as Map<String, dynamic>?;
        return cl != null &&
            cl['mainAxisAlignment']?.toString().contains('center') == true &&
            cl['crossAxisAlignment']?.toString().contains('center') == true;
      });
      expect(centerNode, isNotNull,
          reason: 'Center should produce center alignment');
    });
  });

  // ============================================================
  // SizedBox (고정 크기)
  // ============================================================

  group('SizedBox fixed size', () {
    testWidgets('SizedBox(width:100, height:50) produces fixedWidth/Height',
        (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: SizedBox(
            width: 100,
            height: 50,
            child: Container(color: Color(0xFFFF0000)),
          ),
        ),
      ));

      final result = runCrawler();
      final sizedNode = findNode(result, (n) {
        final cl = n['childLayout'] as Map<String, dynamic>?;
        return cl != null &&
            (cl['fixedWidth'] == true || cl['fixedSize'] == true);
      });
      expect(sizedNode, isNotNull,
          reason: 'SizedBox should produce fixedWidth/fixedSize');
    });
  });

  // ============================================================
  // Nested layouts
  // ============================================================

  group('Nested layouts', () {
    testWidgets('Row inside Column', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Column(children: [
            Row(children: const [Text('A'), Text('B')]),
            Text('Below'),
          ]),
        ),
      ));

      final result = runCrawler();
      // Should have both ROW and COLUMN
      final row = findNode(result, (n) => n['layoutMode'] == 'ROW');
      expect(row, isNotNull);
    });

    testWidgets('deeply nested structure', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Column(children: [
            Row(children: [
              Column(children: const [Text('Deep1'), Text('Deep2')]),
              Expanded(
                child: Column(children: const [Text('D3'), Text('D4')]),
              ),
            ]),
          ]),
        ),
      ));

      final result = runCrawler();
      final textNodes = findAllNodes(result, (n) => n['type'] == 'Text');
      // Should find all 4 text nodes
      expect(textNodes.length, greaterThanOrEqualTo(4));
    });
  });

  // ============================================================
  // BottomNavigationBar
  // ============================================================

  group('BottomNavigationBar', () {
    testWidgets('has widgetName BottomNavigationBar', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Text('Body'),
          bottomNavigationBar: BottomNavigationBar(
            items: [
              BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
              BottomNavigationBarItem(
                  icon: Icon(Icons.settings), label: 'Settings'),
            ],
          ),
        ),
      ));

      final result = runCrawler();
      final navBar = findNode(
        result,
        (n) => n['widgetName'] == 'BottomNavigationBar',
      );
      expect(navBar, isNotNull, reason: 'Should detect BottomNavigationBar');
    });
  });

  // ============================================================
  // TextField / InputDecorator
  // ============================================================

  group('TextField', () {
    testWidgets('TextField detected as isTextField', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: TextField(decoration: InputDecoration(labelText: 'Name')),
        ),
      ));

      final result = runCrawler();
      final tfNode = findNode(result, (n) {
        final vis = n['visual'] as Map<String, dynamic>?;
        return vis != null && vis['isTextField'] == true;
      });
      expect(tfNode, isNotNull,
          reason: 'TextField should produce isTextField=true');
    });
  });

  // ============================================================
  // FittedBox
  // ============================================================

  group('FittedBox', () {
    testWidgets('FittedBox child gets fixedSize', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: SizedBox(
            width: 200,
            height: 100,
            child: FittedBox(child: Text('Scaled')),
          ),
        ),
      ));

      final result = runCrawler();
      // FittedBox children should get fixedSize in childLayout
      final fittedChild = findNode(result, (n) {
        final cl = n['childLayout'] as Map<String, dynamic>?;
        return cl != null && cl['fixedSize'] == true;
      });
      expect(fittedChild, isNotNull,
          reason: 'FittedBox child should have fixedSize');
    });
  });

  // ============================================================
  // Shadow / Elevation
  // ============================================================

  group('Shadow', () {
    testWidgets('BoxShadow extraction', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              color: Color(0xFFFFFFFF),
              boxShadow: [
                BoxShadow(
                  color: Color(0x40000000),
                  blurRadius: 10,
                  offset: Offset(2, 4),
                ),
              ],
            ),
          ),
        ),
      ));

      final result = runCrawler();
      final shadowNode = findNode(result, (n) {
        final vis = n['visual'] as Map<String, dynamic>?;
        return vis != null && vis['shadow'] != null;
      });
      expect(shadowNode, isNotNull, reason: 'Should extract boxShadow');
    });
  });

  // ============================================================
  // Complex real-world layout: Login form
  // ============================================================

  group('Complex: Login form', () {
    testWidgets('login form structure snapshot', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          appBar: AppBar(title: Text('Login')),
          body: Padding(
            padding: EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(decoration: InputDecoration(labelText: 'Email')),
                SizedBox(height: 16),
                TextField(
                    decoration: InputDecoration(labelText: 'Password'),
                    obscureText: true),
                SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () {},
                  child: Text('Sign In'),
                ),
              ],
            ),
          ),
        ),
      ));

      final result = runCrawler();
      matchSnapshot('login_form', result);
    });
  });

  // ============================================================
  // Complex: Card list
  // ============================================================

  group('Complex: Card list', () {
    testWidgets('card list snapshot', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: ListView(
            padding: EdgeInsets.all(8),
            children: [
              Card(
                child: ListTile(
                  leading: CircleAvatar(child: Text('A')),
                  title: Text('Alice'),
                  subtitle: Text('Developer'),
                  trailing: Icon(Icons.chevron_right),
                ),
              ),
              Card(
                child: ListTile(
                  leading: CircleAvatar(child: Text('B')),
                  title: Text('Bob'),
                  subtitle: Text('Designer'),
                  trailing: Icon(Icons.chevron_right),
                ),
              ),
            ],
          ),
        ),
      ));

      final result = runCrawler();
      matchSnapshot('card_list', result);
    });
  });

  // ============================================================
  // Complex: Dashboard grid-like layout
  // ============================================================

  group('Complex: Dashboard', () {
    testWidgets('dashboard layout snapshot', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          appBar: AppBar(title: Text('Dashboard')),
          body: Column(children: [
            Padding(
              padding: EdgeInsets.all(16),
              child: Row(children: [
                Expanded(
                  child: Container(
                    height: 80,
                    decoration: BoxDecoration(
                      color: Color(0xFF2196F3),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Center(child: Text('Sales')),
                  ),
                ),
                SizedBox(width: 16),
                Expanded(
                  child: Container(
                    height: 80,
                    decoration: BoxDecoration(
                      color: Color(0xFF4CAF50),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Center(child: Text('Revenue')),
                  ),
                ),
              ]),
            ),
            Expanded(
              child: ListView(children: [
                ListTile(title: Text('Recent Activity 1')),
                ListTile(title: Text('Recent Activity 2')),
                ListTile(title: Text('Recent Activity 3')),
              ]),
            ),
          ]),
        ),
      ));

      final result = runCrawler();
      matchSnapshot('dashboard', result);
    });
  });

  // ============================================================
  // 기존 스냅샷 테스트 (유지)
  // ============================================================

  group('Snapshot: basic', () {
    testWidgets('simple column', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Column(
            children: const [Text('Hello'), SizedBox(height: 8), Text('World')],
          ),
        ),
      ));
      final result = runCrawler();
      matchSnapshot('simple_column', result);
    });

    testWidgets('decorated container', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Center(
            child: Container(
              width: 200,
              height: 100,
              decoration: BoxDecoration(
                color: Color(0xFF2196F3),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Center(child: Text('Box')),
            ),
          ),
        ),
      ));
      final result = runCrawler();
      matchSnapshot('decorated_container', result);
    });
  });
}
