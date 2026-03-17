// ============================================================
// Phase 2: 폰트 로딩
// ============================================================

async function preloadFonts(rootNode) {
  var fontSet = {};

  function addFont(font) {
    var key = font.family + "::" + font.style;
    if (!fontSet[key]) fontSet[key] = font;
  }

  function visit(node) {
    if (!node || typeof node !== "object") return;
    if (node.type === "Text") {
      var props = node.properties || {};
      var fam = props.fontFamily || null;
      var weight = props.fontWeight || "w400";
      addFont(resolveFont(fam, weight));
      // RichText: 개별 span 폰트도 수집
      if (props.textSpans && Array.isArray(props.textSpans)) {
        for (var si = 0; si < props.textSpans.length; si++) {
          var span = props.textSpans[si];
          if (span.fontWeight || span.fontFamily) {
            addFont(resolveFont(span.fontFamily || fam, span.fontWeight || weight));
          }
        }
      }
    }
    var children = node.children || [];
    for (var i = 0; i < children.length; i++) {
      visit(children[i]);
    }
  }

  visit(rootNode);

  // 항상 Inter 로드
  addFont({ family: "Inter", style: "Regular" });
  addFont({ family: "Inter", style: "Bold" });

  var keys = Object.keys(fontSet);

  // 후보 스타일 순회하며 로딩 시도
  async function tryLoadFont(font) {
    var candidates = font._candidates || [font.style];
    var family = font.family;

    for (var ci = 0; ci < candidates.length; ci++) {
      var style = candidates[ci];
      var key = family + "::" + style;
      if (loadedFonts[key]) {
        // 이미 로드된 스타일이 있으면 resolvedFonts에 매핑
        resolvedFonts[family + "::" + font.style] = style;
        return;
      }
      try {
        await figma.loadFontAsync({ family: family, style: style });
        loadedFonts[key] = true;
        resolvedFonts[family + "::" + font.style] = style;
        console.log("[FlutterPlugin] loaded font:", family, style);
        return;
      } catch (e) {
        // 이 스타일은 없음, 다음 후보 시도
      }
    }

    // 모든 후보 실패 → Inter fallback
    console.warn("[FlutterPlugin] all candidates failed for", family, font.style, "→ Inter fallback");
    for (var ci = 0; ci < candidates.length; ci++) {
      var style = candidates[ci];
      var fbKey = "Inter::" + style;
      if (loadedFonts[fbKey]) {
        resolvedFonts[family + "::" + font.style] = style;
        resolvedFonts[family + "::" + font.style + "::family"] = "Inter";
        return;
      }
      try {
        await figma.loadFontAsync({ family: "Inter", style: style });
        loadedFonts[fbKey] = true;
        resolvedFonts[family + "::" + font.style] = style;
        resolvedFonts[family + "::" + font.style + "::family"] = "Inter";
        return;
      } catch (e) {}
    }
    // 최종 fallback
    try {
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      loadedFonts["Inter::Regular"] = true;
    } catch (e) {}
    resolvedFonts[family + "::" + font.style] = "Regular";
    resolvedFonts[family + "::" + font.style + "::family"] = "Inter";
  }

  var promises = [];
  for (var i = 0; i < keys.length; i++) {
    promises.push(tryLoadFont(fontSet[keys[i]]));
  }
  await Promise.all(promises);
}
