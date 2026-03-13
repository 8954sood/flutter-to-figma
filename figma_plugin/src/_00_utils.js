// ============================================================
// 유지하는 헬퍼 함수들
// ============================================================

// --- 색상 파싱 (Flutter ARGB → Figma RGBA) ---
function parseFlutterColor(hex) {
  if (!hex || typeof hex !== "string") {
    return { r: 0, g: 0, b: 0, a: 1 };
  }
  var value = hex.trim();
  if (value.charAt(0) === "#") value = value.slice(1);

  var a = 1, r = 0, g = 0, b = 0;

  if (value.length === 8) {
    a = parseInt(value.slice(0, 2), 16) / 255;
    r = parseInt(value.slice(2, 4), 16) / 255;
    g = parseInt(value.slice(4, 6), 16) / 255;
    b = parseInt(value.slice(6, 8), 16) / 255;
  } else if (value.length === 6) {
    r = parseInt(value.slice(0, 2), 16) / 255;
    g = parseInt(value.slice(2, 4), 16) / 255;
    b = parseInt(value.slice(4, 6), 16) / 255;
  }

  return { r: r, g: g, b: b, a: a };
}

// --- 폰트 이름 매핑 ---
function resolveFont(family, fontWeight) {
  var key = String(fontWeight).split(".").pop() || "w400";
  var candidates = {
    w100: ["Thin", "Hairline", "ExtraThin"],
    w200: ["ExtraLight", "UltraLight", "Extra Light", "Ultra Light"],
    w300: ["Light"],
    w400: ["Regular", "Normal"],
    w500: ["Medium"],
    w600: ["SemiBold", "Semi Bold", "DemiBold"],
    w700: ["Bold"],
    w800: ["ExtraBold", "UltraBold", "Extra Bold", "Ultra Bold"],
    w900: ["Black", "Heavy"],
  };
  var styles = candidates[key] || ["Regular"];
  var fam = family || "Inter";
  var firstStyle = styles[0];

  // preloadFonts에서 실제 로드된 스타일 확인
  var resolveKey = fam + "::" + firstStyle;
  var actualStyle = resolvedFonts[resolveKey];
  var actualFamily = resolvedFonts[resolveKey + "::family"] || fam;
  if (actualStyle) {
    return { family: actualFamily, style: actualStyle };
  }

  // preload 전 호출 (수집 단계) → 후보 리스트 포함
  return { family: fam, style: firstStyle, _candidates: styles };
}

// --- TextAlign 매핑 ---
function mapTextAlign(textAlign) {
  var key = String(textAlign).split(".").pop();
  if (key === "center") return "CENTER";
  if (key === "end" || key === "right") return "RIGHT";
  return "LEFT";
}

// --- Image fit 매핑 ---
function mapImageFit(fit) {
  var key = String(fit || "").toLowerCase();
  if (key === "contain" || key === "fitwidth" || key === "fitheight") return "FIT";
  if (key === "none" || key === "scaledown") return "FIT";
  return "FILL";
}

// --- BoxFit → Figma scaleMode 매핑 ---
function mapBoxFitToScaleMode(fit) {
  var key = String(fit || "").toLowerCase();
  if (key === "contain" || key === "fitwidth" || key === "fitheight" || key === "scaledown") return "FIT";
  if (key === "cover") return "FILL";
  if (key === "fill") return "FILL";
  if (key === "none") return "FIT";
  return "FILL";
}

// --- Alignment 매핑 ---
function mapMainAxisAlign(val) {
  var key = String(val || "").split(".").pop();
  if (key === "center") return "CENTER";
  if (key === "end") return "MAX";
  if (key === "spaceBetween") return "SPACE_BETWEEN";
  if (key === "spaceAround") return "SPACE_BETWEEN";
  if (key === "spaceEvenly") return "SPACE_BETWEEN";
  return "MIN";
}

function mapCrossAxisAlign(val) {
  var key = String(val || "").split(".").pop();
  if (key === "center") return "CENTER";
  if (key === "end") return "MAX";
  if (key === "stretch") return "MIN"; // Figma에서 stretch는 자식별 FILL로 처리
  return "MIN";
}

// --- Base64 → Uint8Array ---
function base64ToUint8Array(base64) {
  if (!base64 || typeof base64 !== "string") {
    return new Uint8Array(0);
  }

  var cleaned = base64.trim();
  var commaIndex = cleaned.indexOf(",");
  if (commaIndex !== -1 && cleaned.slice(0, 5).toLowerCase() === "data:") {
    cleaned = cleaned.slice(commaIndex + 1);
  }
  cleaned = cleaned.replace(/[^A-Za-z0-9+/=]/g, "");

  while (cleaned.length % 4 !== 0) {
    cleaned += "=";
  }

  var encTable =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var len = cleaned.length;

  var outputLen = (len / 4) * 3;
  if (cleaned.endsWith("==")) outputLen -= 2;
  else if (cleaned.endsWith("=")) outputLen -= 1;

  var bytes = new Uint8Array(outputLen);
  var p = 0;

  for (var i = 0; i < len; i += 4) {
    var c1 = encTable.indexOf(cleaned.charAt(i));
    var c2 = encTable.indexOf(cleaned.charAt(i + 1));
    var c3 = encTable.indexOf(cleaned.charAt(i + 2));
    var c4 = encTable.indexOf(cleaned.charAt(i + 3));

    var triple = (c1 << 18) | (c2 << 12) | ((c3 & 63) << 6) | (c4 & 63);

    bytes[p++] = (triple >> 16) & 0xff;
    if (cleaned.charAt(i + 2) !== "=") {
      if (p < outputLen) bytes[p++] = (triple >> 8) & 0xff;
    }
    if (cleaned.charAt(i + 3) !== "=") {
      if (p < outputLen) bytes[p++] = triple & 0xff;
    }
  }

  return bytes;
}
