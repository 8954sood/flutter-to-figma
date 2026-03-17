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
    testWidgets('has widgetName and ROW layout', (tester) async {
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
      expect(navBar!['layoutMode'], 'ROW');

      final cl = navBar['containerLayout'] as Map<String, dynamic>? ?? {};
      expect(cl['mainAxisAlignment'], contains('spaceBetween'));
      expect(cl['crossAxisAlignment'], contains('center'));
    });

    testWidgets('children have flexGrow', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Text('Body'),
          bottomNavigationBar: BottomNavigationBar(
            items: [
              BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
              BottomNavigationBarItem(
                  icon: Icon(Icons.search), label: 'Search'),
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
      expect(navBar, isNotNull);

      final children = (navBar!['children'] as List)
          .whereType<Map<String, dynamic>>()
          .toList();
      expect(children.length, greaterThanOrEqualTo(3));

      for (final child in children) {
        final childLay = child['childLayout'] as Map<String, dynamic>? ?? {};
        expect(childLay['flexGrow'], greaterThan(0),
            reason: 'Tab item should have flexGrow > 0');
      }
    });

    testWidgets('preserves label texts and icons', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Text('Body'),
          bottomNavigationBar: BottomNavigationBar(
            items: [
              BottomNavigationBarItem(
                  icon: Icon(Icons.home), label: 'Dashboard'),
              BottomNavigationBarItem(
                  icon: Icon(Icons.person), label: 'Profile'),
            ],
          ),
        ),
      ));

      final result = runCrawler();
      final navBar = findNode(
        result,
        (n) => n['widgetName'] == 'BottomNavigationBar',
      );
      expect(navBar, isNotNull);

      // Labels
      final labels = findAllNodes(navBar!, (n) {
        final vis = n['visual'] as Map<String, dynamic>? ?? {};
        return n['type'] == 'Text' && vis['content'] != null;
      });
      final labelTexts =
          labels.map((n) => (n['visual'] as Map)['content']).toList();
      expect(labelTexts, contains('Dashboard'));
      expect(labelTexts, contains('Profile'));

      // Icons
      final icons = findAllNodes(navBar, (n) {
        final vis = n['visual'] as Map<String, dynamic>? ?? {};
        return vis['isIconBox'] == true;
      });
      expect(icons.length, greaterThanOrEqualTo(2),
          reason: 'Should have at least 2 icon nodes');
    });

    testWidgets('has bottom padding (safe area)', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Text('Body'),
          bottomNavigationBar: BottomNavigationBar(
            items: [
              BottomNavigationBarItem(icon: Icon(Icons.home), label: 'A'),
              BottomNavigationBarItem(icon: Icon(Icons.star), label: 'B'),
            ],
          ),
        ),
      ));

      final result = runCrawler();
      final navBar = findNode(
        result,
        (n) => n['widgetName'] == 'BottomNavigationBar',
      );
      expect(navBar, isNotNull);

      final cl = navBar!['containerLayout'] as Map<String, dynamic>? ?? {};
      final padding = cl['padding'] as Map<String, dynamic>?;
      expect(padding, isNotNull, reason: 'Should have padding structure');
    });

    testWidgets('backgroundColor preserved', (tester) async {
      await tester.pumpWidget(MaterialApp(
        theme: ThemeData(
          bottomNavigationBarTheme: BottomNavigationBarThemeData(
            backgroundColor: Color(0xFF1A1A2E),
          ),
        ),
        home: Scaffold(
          body: Text('Body'),
          bottomNavigationBar: BottomNavigationBar(
            backgroundColor: Color(0xFF1A1A2E),
            selectedItemColor: Colors.white,
            unselectedItemColor: Colors.grey,
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
      expect(navBar, isNotNull);

      final vis = navBar!['visual'] as Map<String, dynamic>? ?? {};
      expect(vis['backgroundColor'], isNotNull,
          reason: 'Should preserve backgroundColor');
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

    testWidgets(
        'Custom search field (Container+Padding+Row) preserves inner dimensions',
        (tester) async {
      // Simulates MeetingFilterField: Padding(16) → Container(bg,border,radius,padding) → Row(icon,text)
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Column(
            children: [
              Padding(
                padding: EdgeInsets.all(16),
                child: Container(
                  decoration: BoxDecoration(
                    color: Color(0xFFF8F8F8),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Color(0xFFE0E0E0)),
                  ),
                  padding: EdgeInsets.symmetric(horizontal: 13, vertical: 9),
                  child: Row(
                    children: [
                      Icon(Icons.search, size: 20, color: Color(0xFF666666)),
                      SizedBox(width: 8),
                      Text('필터 검색',
                          style: TextStyle(
                              color: Color(0xFF999999), fontSize: 14)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ));

      final result = runCrawler();

      // Find the node with bg color #F8F8F8 (the filter container)
      final filterNode = findNode(result, (n) {
        final vis = n['visual'] as Map<String, dynamic>?;
        if (vis == null) return false;
        final bg = (vis['backgroundColor'] ?? '').toString().toLowerCase();
        return bg.contains('f8f8f8');
      });
      expect(filterNode, isNotNull,
          reason: 'Filter container with bg #F8F8F8 should exist');

      // The filter node rect should be the INNER size (not inflated by parent padding)
      final rect = filterNode!['rect'] as Map<String, dynamic>?;
      final w = (rect?['w'] as num?)?.toDouble() ?? 0;
      // Parent Column is full width (~800 in test), minus 32px (16*2) padding = ~768
      // Filter field should NOT be full parent width
      expect(w < 790, isTrue,
          reason:
              'Filter width ($w) should be inner size, not inflated by parent padding');

      // Verify "필터 검색" text exists inside
      final filterText = findNode(filterNode, (n) {
        final vis = n['visual'] as Map<String, dynamic>?;
        return n['type'] == 'Text' &&
            vis != null &&
            (vis['content'] ?? '').toString().contains('필터');
      });
      expect(filterText, isNotNull,
          reason: 'Filter text should exist inside filter container');
    });

    testWidgets('Padded Container preserves border and borderRadius',
        (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Padding(
            padding: EdgeInsets.all(20),
            child: Container(
              decoration: BoxDecoration(
                color: Color(0xFFEEEEEE),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Color(0xFFCCCCCC), width: 2),
              ),
              padding: EdgeInsets.all(16),
              child: Text('Content'),
            ),
          ),
        ),
      ));

      final result = runCrawler();

      final decoNode = findNode(result, (n) {
        final vis = n['visual'] as Map<String, dynamic>?;
        if (vis == null) return false;
        return vis['backgroundColor'] != null &&
            vis['backgroundColor'].toString().contains('eeeeee');
      });
      expect(decoNode, isNotNull);

      // Border should be preserved
      final vis = decoNode!['visual'] as Map<String, dynamic>;
      expect(vis['border'], isNotNull,
          reason: 'Border should be preserved after merge');
      expect(vis['borderRadius'], isNotNull,
          reason: 'BorderRadius should be preserved after merge');
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
  // Spacer 패턴: SizedBox + flexGrow 혼합 (weather row)
  // ============================================================

  group('Spacer: weather row pattern', () {
    testWidgets('SizedBox spacers in Row with flexGrow Spacer', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Row(
            children: [
              Text('Mon', style: TextStyle(color: Colors.white, fontSize: 15)),
              Icon(Icons.wb_sunny, size: 22),
              Spacer(),
              Text('24°',
                  style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold)),
              SizedBox(width: 8),
              Container(
                width: 80,
                height: 4,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(2),
                  gradient: LinearGradient(
                    colors: [Color(0xFF38EF7D), Color(0xFFFFD700)],
                  ),
                ),
              ),
              SizedBox(width: 8),
              Text('16°',
                  style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.5),
                      fontSize: 16)),
            ],
          ),
        ),
      ));

      final result = runCrawler();

      // Find the ROW with temperature texts
      final row = findNode(result, (n) {
        if (n['layoutMode'] != 'ROW') return false;
        final ch = (n['children'] as List?) ?? [];
        return ch.whereType<Map>().any((c) {
          final vis = c['visual'] as Map? ?? {};
          return (vis['content'] ?? '').toString().contains('24');
        });
      });
      expect(row, isNotNull, reason: 'Should find weather ROW');

      final children =
          (row!['children'] as List).whereType<Map<String, dynamic>>().toList();

      // SizedBox(w=8) spacers should appear in raw crawler output
      // (preprocessing will remove them and set itemSpacing from rect gaps)
      // Just verify the temperature texts and flexGrow Spacer exist
      final temps = children.where((c) {
        final vis = c['visual'] as Map? ?? {};
        final content = (vis['content'] ?? '').toString();
        return content.contains('24') || content.contains('16');
      }).toList();
      expect(temps.length, greaterThanOrEqualTo(2),
          reason: 'Both temperature texts must be present');

      // FlexGrow Spacer must be preserved
      final flexNode = children.where((c) {
        final childLay = c['childLayout'] as Map? ?? {};
        return (childLay['flexGrow'] ?? 0) > 0;
      }).toList();
      expect(flexNode.length, greaterThanOrEqualTo(1),
          reason: 'FlexGrow Spacer must be preserved in raw output');
    });
  });

  // ============================================================
  // Spacer 패턴: Container margin gap (finance column)
  // ============================================================

  group('Spacer: container margin gaps', () {
    testWidgets('Container(margin) creates rect gap without SizedBox',
        (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Section Title',
                  style: TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold)),
              SizedBox(height: 16),
              Container(
                margin: EdgeInsets.only(bottom: 12),
                padding: EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Color(0x14FFFFFF),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text('Card 1'),
              ),
              Container(
                margin: EdgeInsets.only(bottom: 12),
                padding: EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Color(0x14FFFFFF),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text('Card 2'),
              ),
              Container(
                padding: EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Color(0x14FFFFFF),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text('Card 3'),
              ),
            ],
          ),
        ),
      ));

      final result = runCrawler();

      // Find column with Section Title
      final col = findNode(result, (n) {
        final ch = (n['children'] as List?) ?? [];
        return ch.whereType<Map>().any((c) {
          final vis = c['visual'] as Map? ?? {};
          return (vis['content'] ?? '').toString().contains('Section Title');
        });
      });
      expect(col, isNotNull, reason: 'Should find section column');

      final children =
          (col!['children'] as List).whereType<Map<String, dynamic>>().toList();

      // Cards should exist (Container with bg color)
      final cards = children.where((c) {
        final vis = c['visual'] as Map? ?? {};
        return vis['backgroundColor'] != null;
      }).toList();
      expect(cards.length, greaterThanOrEqualTo(3),
          reason: 'All 3 cards should be present');

      // SizedBox(h=16) between title and first card should be in raw output
      // (it may be preserved as Frame or absorbed by preprocessing)
    });
  });

  // ============================================================
  // Spacer 패턴: uniform SizedBox spacers
  // ============================================================

  group('Spacer: uniform SizedBox', () {
    testWidgets('uniform SizedBox spacers between all items', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Row(
            children: const [
              Text('A'),
              SizedBox(width: 12),
              Text('B'),
              SizedBox(width: 12),
              Text('C'),
            ],
          ),
        ),
      ));

      final result = runCrawler();

      // Find the ROW with A,B,C
      final row = findNode(result, (n) {
        if (n['layoutMode'] != 'ROW') return false;
        final ch = (n['children'] as List?) ?? [];
        return ch.whereType<Map>().any((c) {
          final vis = c['visual'] as Map? ?? {};
          return vis['content'] == 'A';
        });
      });
      expect(row, isNotNull);

      final children =
          (row!['children'] as List).whereType<Map<String, dynamic>>().toList();

      // SizedBox spacers between all pairs → should have been removed
      // (crawl output has them, but preprocessing may convert to rect gap)
      final textCount =
          children.where((c) => c['type'] == 'Text').toList().length;
      expect(textCount, greaterThanOrEqualTo(3));
    });
  });

  // ============================================================
  // Spacer 패턴: SizedBox in Column
  // ============================================================

  group('Spacer: SizedBox in Column', () {
    testWidgets('SizedBox(height) spacers preserved in raw output',
        (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Column(
            children: [
              Text('Header'),
              SizedBox(height: 24),
              Container(
                  color: Color(0xFFFF0000),
                  width: 200,
                  height: 50,
                  child: Text('Block')),
            ],
          ),
        ),
      ));

      final result = runCrawler();

      // The SizedBox(h=24) should appear as a Frame child in raw crawler output
      final col = findNode(result, (n) {
        final ch = (n['children'] as List?) ?? [];
        return n['layoutMode'] == 'COLUMN' &&
            ch.whereType<Map>().any((c) {
              final vis = c['visual'] as Map? ?? {};
              return vis['content'] == 'Header';
            });
      });
      expect(col, isNotNull);

      // Verify the spacer Frame exists in children
      final children =
          (col!['children'] as List).whereType<Map<String, dynamic>>().toList();
      final spacerFrames = children.where((c) {
        if (c['type'] != 'Frame') return false;
        final rect = c['rect'] as Map?;
        final h = (rect?['h'] as num?)?.toDouble() ?? 0;
        final w = (rect?['w'] as num?)?.toDouble() ?? 999;
        return h > 0 && h <= 50 && w <= 1;
      }).toList();
      expect(spacerFrames.length, greaterThanOrEqualTo(1),
          reason: 'SizedBox(h=24) should appear as spacer Frame');
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

  // ============================================================
  // Visibility
  // ============================================================

  group('Visibility', () {
    testWidgets('visible: true → child rendered normally', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Column(
            children: const [
              Visibility(
                visible: true,
                maintainSize: true,
                maintainAnimation: true,
                maintainState: true,
                child: Text('Shown'),
              ),
            ],
          ),
        ),
      ));

      final result = runCrawler();
      final textNode = findNode(result, (n) {
        if (n['type'] != 'Text') return false;
        final vis = n['visual'] as Map<String, dynamic>? ?? {};
        final content = vis['content'] as String? ?? '';
        return content.contains('Shown');
      });
      expect(textNode, isNotNull, reason: 'visible=true should render child');

      // opacity should not be 0
      final vis = textNode!['visual'] as Map<String, dynamic>? ?? {};
      final opacity = vis['opacity'];
      expect(opacity != 0.0, isTrue,
          reason: 'visible=true should not have opacity 0');
    });

    testWidgets('visible: false + maintainSize: true → child with opacity 0',
        (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Column(
            children: const [
              Visibility(
                visible: false,
                maintainSize: true,
                maintainAnimation: true,
                maintainState: true,
                child: Text('Hidden'),
              ),
            ],
          ),
        ),
      ));

      final result = runCrawler();
      // Should find a node with opacity 0 that contains the hidden text
      final hiddenNode = findNode(result, (n) {
        final vis = n['visual'] as Map<String, dynamic>?;
        return vis != null && vis['opacity'] == 0.0;
      });
      expect(hiddenNode, isNotNull,
          reason:
              'visible=false + maintainSize=true should produce opacity=0 node');

      // Node should have non-zero size (layout space preserved)
      final rect = hiddenNode!['rect'] as Map<String, dynamic>? ?? {};
      final w = (rect['w'] as num?)?.toDouble() ?? 0;
      final h = (rect['h'] as num?)?.toDouble() ?? 0;
      expect(w, greaterThan(0), reason: 'Width should be preserved');
      expect(h, greaterThan(0), reason: 'Height should be preserved');
    });

    testWidgets(
        'visible: false + maintainSize: false (Offstage) → excluded entirely',
        (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Column(
            children: const [
              Text('Before'),
              Visibility(
                visible: false,
                // maintainSize defaults to false
                child: Text('Offstaged'),
              ),
              Text('After'),
            ],
          ),
        ),
      ));

      final result = runCrawler();
      // 'Offstaged' text should not appear anywhere in the tree
      final offstagedNode = findNode(result, (n) {
        if (n['type'] != 'Text') return false;
        final vis = n['visual'] as Map<String, dynamic>? ?? {};
        final content = vis['content'] as String? ?? '';
        return content.contains('Offstaged');
      });
      expect(offstagedNode, isNull,
          reason: 'visible=false + maintainSize=false should be excluded');

      // 'Before' and 'After' should still exist
      final beforeNode = findNode(result, (n) {
        if (n['type'] != 'Text') return false;
        final vis = n['visual'] as Map<String, dynamic>? ?? {};
        return (vis['content'] as String? ?? '').contains('Before');
      });
      final afterNode = findNode(result, (n) {
        if (n['type'] != 'Text') return false;
        final vis = n['visual'] as Map<String, dynamic>? ?? {};
        return (vis['content'] as String? ?? '').contains('After');
      });
      expect(beforeNode, isNotNull);
      expect(afterNode, isNotNull);
    });

    testWidgets(
        'visible: false + maintainSize: true preserves layout space in Column',
        (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Column(
            children: [
              const Text('Top'),
              Visibility(
                visible: false,
                maintainSize: true,
                maintainAnimation: true,
                maintainState: true,
                child: Container(
                  width: 200,
                  height: 80,
                  color: const Color(0xFFFF0000),
                ),
              ),
              const Text('Bottom'),
            ],
          ),
        ),
      ));

      final result = runCrawler();

      // The hidden container should exist with opacity 0 and correct size
      final hiddenNode = findNode(result, (n) {
        final vis = n['visual'] as Map<String, dynamic>?;
        if (vis == null || vis['opacity'] != 0.0) return false;
        final rect = n['rect'] as Map<String, dynamic>? ?? {};
        final w = (rect['w'] as num?)?.toDouble() ?? 0;
        final h = (rect['h'] as num?)?.toDouble() ?? 0;
        return w >= 200 && h >= 80;
      });
      expect(hiddenNode, isNotNull,
          reason: 'Hidden container should exist with opacity=0 and 200x80');

      // 'Bottom' text should be offset by the hidden container's height
      final topNode = findNode(result, (n) {
        if (n['type'] != 'Text') return false;
        final vis = n['visual'] as Map<String, dynamic>? ?? {};
        return (vis['content'] as String? ?? '').contains('Top');
      });
      final bottomNode = findNode(result, (n) {
        if (n['type'] != 'Text') return false;
        final vis = n['visual'] as Map<String, dynamic>? ?? {};
        return (vis['content'] as String? ?? '').contains('Bottom');
      });
      expect(topNode, isNotNull);
      expect(bottomNode, isNotNull);

      final topY = (topNode!['rect'] as Map)['y'] as num;
      final bottomY = (bottomNode!['rect'] as Map)['y'] as num;
      expect(bottomY - topY, greaterThanOrEqualTo(80),
          reason: 'Hidden node should push Bottom text down by at least 80px');
    });

    testWidgets('multiple Visibility in same parent', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Column(
            children: const [
              Visibility(
                visible: true,
                maintainSize: true,
                maintainAnimation: true,
                maintainState: true,
                child: Text('V1 Shown'),
              ),
              Visibility(
                visible: false,
                maintainSize: true,
                maintainAnimation: true,
                maintainState: true,
                child: Text('V2 Hidden'),
              ),
              Visibility(
                visible: true,
                maintainSize: true,
                maintainAnimation: true,
                maintainState: true,
                child: Text('V3 Shown'),
              ),
            ],
          ),
        ),
      ));

      final result = runCrawler();

      // V1 and V3 should be visible (no opacity 0)
      for (final label in ['V1 Shown', 'V3 Shown']) {
        final node = findNode(result, (n) {
          if (n['type'] != 'Text') return false;
          final vis = n['visual'] as Map<String, dynamic>? ?? {};
          return (vis['content'] as String? ?? '').contains(label);
        });
        expect(node, isNotNull, reason: '$label should exist');
        final vis = node!['visual'] as Map<String, dynamic>? ?? {};
        expect(vis['opacity'] != 0.0, isTrue,
            reason: '$label should not have opacity 0');
      }

      // V2 should have opacity 0
      final hiddenNodes = findAllNodes(result, (n) {
        final vis = n['visual'] as Map<String, dynamic>?;
        return vis != null && vis['opacity'] == 0.0;
      });
      expect(hiddenNodes, isNotEmpty,
          reason: 'V2 Hidden should produce opacity=0 node');
    });
  });
}
