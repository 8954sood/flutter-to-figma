// ============================================================
// Phase 1 헬퍼
// ============================================================

function isTransparent(colorStr) {
  if (!colorStr || typeof colorStr !== "string") return true;
  var s = colorStr.replace("#", "").toLowerCase();
  if (s.length === 8 && s.substring(0, 2) === "00") return true;
  if (s === "00000000") return true;
  return false;
}

function generateNodeName(node) {
  if (node.name) return node.name;
  var props = node.properties || {};
  if (node.type === "Text") {
    var content = props.content || "";
    if (content.length > 20) content = content.substring(0, 20) + "…";
    return content || "Text";
  }
  if (props.isIconBox) return "Icon";
  if (props.layoutMode === "HORIZONTAL") return "Row";
  if (props.layoutMode === "VERTICAL") return "Column";
  return "Frame";
}

function parseBorderRadius(val) {
  if (typeof val === "number") return val;
  if (val == null) return 0;
  var s = String(val);
  if (s.indexOf("zero") !== -1) return 0;
  var v = parseFloat(s);
  return isNaN(v) ? 0 : v;
}
