
// ----------------------------
// UI 메시지 핸들러
// ----------------------------
figma.ui.onmessage = function (msg) {
  if (msg.type === "close") {
    figma.closePlugin();
    return;
  }

  if (msg.type === "render-flutter-layout" || msg.type === "import-layout") {
    var jsonText = msg.json || msg.data;
    if (!jsonText) {
      figma.notify("JSON 내용이 비어 있습니다.");
      return;
    }

    var root;
    try {
      root = JSON.parse(jsonText);
    } catch (e) {
      console.error("[FlutterPlugin] JSON parse error", e);
      figma.notify("JSON 파싱에 실패했습니다.");
      return;
    }

    renderWholeLayout(root)
      .then(function () {
        figma.notify("레이아웃 복원이 완료되었습니다.");
      })
      .catch(function (e) {
        console.error("[FlutterPlugin] renderWholeLayout error", e);
        var msgText = "Import failed";
        if (e && e.message) msgText += ": " + e.message;
        figma.notify(msgText);
      });
  }
};
