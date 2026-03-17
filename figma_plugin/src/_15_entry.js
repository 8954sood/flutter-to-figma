
// ----------------------------
// clientStorage 헬퍼
// ----------------------------
var STORAGE_KEY = "savedJsonList";

function generateId() {
  var chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  var id = "";
  for (var i = 0; i < 12; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function extractJsonName(jsonStr) {
  try {
    var obj = JSON.parse(jsonStr);
    if (obj.widgetName) return obj.widgetName;
    if (obj.name) return obj.name;
    if (obj.children && obj.children.length > 0) {
      var first = obj.children[0];
      if (first.widgetName) return first.widgetName;
      if (first.name) return first.name;
    }
    if (obj.type) return obj.type;
  } catch (e) {
    // ignore
  }
  return "Untitled";
}

async function loadJsonList() {
  var list = (await figma.clientStorage.getAsync(STORAGE_KEY)) || [];
  return list;
}

async function saveJsonList(list) {
  await figma.clientStorage.setAsync(STORAGE_KEY, list);
}

async function sendJsonListToUI() {
  var list = await loadJsonList();
  var items = list.map(function (item) {
    return {
      id: item.id,
      name: item.name,
      savedAt: item.savedAt,
      preview: item.jsonStr.substring(0, 80),
    };
  });
  figma.ui.postMessage({ type: "json-list", items: items });
}

// ----------------------------
// UI 메시지 핸들러
// ----------------------------
figma.ui.onmessage = function (msg) {
  if (msg.type === "close") {
    figma.closePlugin();
    return;
  }

  if (msg.type === "load-json-list") {
    sendJsonListToUI();
    return;
  }

  if (msg.type === "save-json") {
    (async function () {
      var list = await loadJsonList();
      var entry = {
        id: generateId(),
        name: msg.name || extractJsonName(msg.json),
        savedAt: new Date().toISOString(),
        jsonStr: msg.json,
      };
      list.push(entry);
      await saveJsonList(list);
      await sendJsonListToUI();
      figma.notify("갤러리에 저장되었습니다.");
    })();
    return;
  }

  if (msg.type === "reorder-json") {
    (async function () {
      var list = await loadJsonList();
      var fromIdx = -1;
      var toIdx = -1;
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === msg.fromId) fromIdx = i;
        if (list[i].id === msg.toId) toIdx = i;
      }
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
      var item = list.splice(fromIdx, 1)[0];
      list.splice(toIdx, 0, item);
      await saveJsonList(list);
      await sendJsonListToUI();
    })();
    return;
  }

  if (msg.type === "load-json-item") {
    (async function () {
      var list = await loadJsonList();
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === msg.id) {
          figma.ui.postMessage({
            type: "json-item",
            id: list[i].id,
            name: list[i].name,
            json: list[i].jsonStr,
          });
          return;
        }
      }
    })();
    return;
  }

  if (msg.type === "update-json") {
    (async function () {
      var list = await loadJsonList();
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === msg.id) {
          list[i].name = msg.name;
          list[i].jsonStr = msg.json;
          break;
        }
      }
      await saveJsonList(list);
      await sendJsonListToUI();
      figma.notify("수정되었습니다.");
    })();
    return;
  }

  if (msg.type === "rename-json") {
    (async function () {
      var list = await loadJsonList();
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === msg.id) {
          list[i].name = msg.name;
          break;
        }
      }
      await saveJsonList(list);
    })();
    return;
  }

  if (msg.type === "delete-json") {
    (async function () {
      var list = await loadJsonList();
      list = list.filter(function (item) {
        return item.id !== msg.id;
      });
      await saveJsonList(list);
      await sendJsonListToUI();
      figma.notify("삭제되었습니다.");
    })();
    return;
  }

  if (msg.type === "render-gallery-item") {
    (async function () {
      var list = await loadJsonList();
      var item = null;
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === msg.id) {
          item = list[i];
          break;
        }
      }
      if (!item) {
        figma.notify("해당 항목을 찾을 수 없습니다.");
        return;
      }
      try {
        var root = JSON.parse(item.jsonStr);
        await renderWholeLayout(root);
        figma.notify("레이아웃 복원이 완료되었습니다.");
      } catch (e) {
        console.error("[FlutterPlugin] render-gallery-item error", e);
        figma.notify("렌더링에 실패했습니다.");
      }
    })();
    return;
  }

  if (msg.type === "render-all-layouts") {
    (async function () {
      var list = await loadJsonList();
      if (list.length === 0) {
        figma.notify("저장된 JSON이 없습니다.");
        return;
      }
      var offsetX = 0;
      var gap = 100;
      var rendered = 0;
      var total = list.length;

      function yieldToUI() {
        return new Promise(function (resolve) {
          setTimeout(resolve, 0);
        });
      }

      for (var i = 0; i < total; i++) {
        await yieldToUI();
        try {
          var root = JSON.parse(list[i].jsonStr);
          var frame = await renderWholeLayout(root);
          if (frame) {
            frame.x = offsetX;
            frame.y = 0;
            offsetX += frame.width + gap;
          }
          rendered++;
        } catch (e) {
          console.error(
            "[FlutterPlugin] render-all error for item",
            list[i].name,
            e
          );
        }
      }
      figma.notify(rendered + "개 화면 렌더링 완료");
    })();
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
