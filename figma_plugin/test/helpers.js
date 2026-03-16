var fs = require("fs");
var path = require("path");

// Load all preprocessing pipeline functions into a single scope
function loadPipeline() {
  var srcDir = path.join(__dirname, "..", "src");
  // Files that contain preprocessing functions (pure JS, no Figma API)
  var files = [
    "_00_utils.js",
    "_02_schema.js",
    "_03_flatten_merge.js",
    "_04_named_widgets.js",
    "_05_layout_inference.js",
    "_06_spacers_cleanup.js",
    "_07_sizing.js",
    "_08_helpers.js",
  ];

  var combined = "";
  // Provide stubs for globals that preprocessing doesn't use
  combined += "var loadedFonts = {};\n";
  combined += "var resolvedFonts = {};\n";

  for (var i = 0; i < files.length; i++) {
    var filePath = path.join(srcDir, files[i]);
    combined += fs.readFileSync(filePath, "utf8") + "\n";
  }

  // Return all functions via a closure
  combined += "return {\n";
  combined += "  // _00_utils\n";
  combined += "  parseFlutterColor: parseFlutterColor,\n";
  combined += "  resolveFont: resolveFont,\n";
  combined += "  mapTextAlign: mapTextAlign,\n";
  combined += "  mapImageFit: mapImageFit,\n";
  combined += "  mapBoxFitToScaleMode: mapBoxFitToScaleMode,\n";
  combined += "  mapMainAxisAlign: mapMainAxisAlign,\n";
  combined += "  mapCrossAxisAlign: mapCrossAxisAlign,\n";
  combined += "  // _02_schema\n";
  combined += "  normalizeSchemaV2: normalizeSchemaV2,\n";
  combined += "  // _03_flatten_merge\n";
  combined += "  isEmptyProps: isEmptyProps,\n";
  combined += "  flattenEmptyWrappers: flattenEmptyWrappers,\n";
  combined += "  mergeWrapperChains: mergeWrapperChains,\n";
  combined += "  mergePropsInto: mergePropsInto,\n";
  combined += "  shouldStopChain: shouldStopChain,\n";
  combined += "  calculateImplicitPadding: calculateImplicitPadding,\n";
  combined += "  mergeChainIntoInnermost: mergeChainIntoInnermost,\n";
  combined += "  // _04_named_widgets\n";
  combined += "  preprocessNamedWidgets: preprocessNamedWidgets,\n";
  combined += "  handleListTile: handleListTile,\n";
  combined += "  handleChip: handleChip,\n";
  combined += "  handleNavigationToolbar: handleNavigationToolbar,\n";
  combined += "  handleBottomNavigationBar: handleBottomNavigationBar,\n";
  combined += "  classifyToolbarChildren: classifyToolbarChildren,\n";
  combined += "  normalizeBackButton: normalizeBackButton,\n";
  combined += "  detectCenterTitle: detectCenterTitle,\n";
  combined += "  markTitleTruncation: markTitleTruncation,\n";
  combined += "  markTitleCenter: markTitleCenter,\n";
  combined += "  getTitleFontMetrics: getTitleFontMetrics,\n";
  combined += "  groupChildrenByXRange: groupChildrenByXRange,\n";
  combined += "  buildGroupColumns: buildGroupColumns,\n";
  combined += "  assignFlexGrowToWidest: assignFlexGrowToWidest,\n";
  combined += "  findDecoNode: findDecoNode,\n";
  combined += "  findNoneFrame: findNoneFrame,\n";
  combined += "  filterChipChildren: filterChipChildren,\n";
  combined += "  calculateBoundingPadding: calculateBoundingPadding,\n";
  combined += "  applyAlignByLayoutDir: applyAlignByLayoutDir,\n";
  combined += "  buildCenteredToolbar: buildCenteredToolbar,\n";
  combined += "  buildLeftAlignedToolbar: buildLeftAlignedToolbar,\n";
  combined += "  // _05_layout_inference\n";
  combined += "  sortChildrenByAxis: sortChildrenByAxis,\n";
  combined += "  isMonotonicallyIncreasing: isMonotonicallyIncreasing,\n";
  combined += "  inferMissingLayout: inferMissingLayout,\n";
  combined += "  // _06_spacers_cleanup\n";
  combined += "  isSpacer: isSpacer,\n";
  combined += "  mostCommonValue: mostCommonValue,\n";
  combined += "  convertSpacersToItemSpacing: convertSpacersToItemSpacing,\n";
  combined += "  isEmptyLeaf: isEmptyLeaf,\n";
  combined += "  removeEmptyLeaves: removeEmptyLeaves,\n";
  combined += "  recalcItemSpacing: recalcItemSpacing,\n";
  combined += "  convertEdgeEmptyFramesToPadding: convertEdgeEmptyFramesToPadding,\n";
  combined += "  capPaddingToRect: capPaddingToRect,\n";
  combined += "  // _07_sizing\n";
  combined += "  assignSizingHints: assignSizingHints,\n";
  combined += "  assignImageSizing: assignImageSizing,\n";
  combined += "  assignTextSizing: assignTextSizing,\n";
  combined += "  assignFrameSizing: assignFrameSizing,\n";
  combined += "  applySizedBoxOverrides: applySizedBoxOverrides,\n";
  combined += "  propagateWrapFlags: propagateWrapFlags,\n";
  combined += "  // _08_helpers\n";
  combined += "  isTransparent: isTransparent,\n";
  combined += "  generateNodeName: generateNodeName,\n";
  combined += "  parseBorderRadius: parseBorderRadius,\n";
  combined += "};\n";

  return new Function(combined)();
}

// Run the full preprocessing pipeline on input JSON
function runPreprocess(input) {
  var P = loadPipeline();
  var data = JSON.parse(JSON.stringify(input)); // deep copy
  P.normalizeSchemaV2(data);
  data = P.flattenEmptyWrappers(data);
  data = P.mergeWrapperChains(data);
  P.preprocessNamedWidgets(data);
  P.inferMissingLayout(data);
  P.convertSpacersToItemSpacing(data);
  P.removeEmptyLeaves(data);
  P.recalcItemSpacing(data);
  P.assignSizingHints(data, null);
  return data;
}

// Deep equality comparison, returns null if equal or path string of first difference
function deepEqual(a, b, path) {
  path = path || "$";
  if (a === b) return null;
  if (a == null || b == null) return path + ": " + JSON.stringify(a) + " !== " + JSON.stringify(b);
  if (typeof a !== typeof b) return path + ": type " + typeof a + " !== " + typeof b;
  if (typeof a !== "object") return path + ": " + JSON.stringify(a) + " !== " + JSON.stringify(b);

  if (Array.isArray(a) !== Array.isArray(b)) {
    return path + ": array mismatch";
  }

  if (Array.isArray(a)) {
    if (a.length !== b.length) return path + ".length: " + a.length + " !== " + b.length;
    for (var i = 0; i < a.length; i++) {
      var diff = deepEqual(a[i], b[i], path + "[" + i + "]");
      if (diff) return diff;
    }
    return null;
  }

  var keysA = Object.keys(a).sort();
  var keysB = Object.keys(b).sort();
  if (keysA.length !== keysB.length) {
    var extra = keysA.filter(function(k) { return keysB.indexOf(k) === -1; });
    var missing = keysB.filter(function(k) { return keysA.indexOf(k) === -1; });
    var msg = path + ": keys differ";
    if (extra.length) msg += " extra=[" + extra.join(",") + "]";
    if (missing.length) msg += " missing=[" + missing.join(",") + "]";
    return msg;
  }

  for (var i = 0; i < keysA.length; i++) {
    if (keysA[i] !== keysB[i]) return path + ": key " + keysA[i] + " !== " + keysB[i];
    var diff = deepEqual(a[keysA[i]], b[keysB[i]], path + "." + keysA[i]);
    if (diff) return diff;
  }
  return null;
}

// DFS find node matching predicate
function findNode(tree, predicate) {
  if (!tree || typeof tree !== "object") return null;
  if (predicate(tree)) return tree;
  var children = tree.children || [];
  for (var i = 0; i < children.length; i++) {
    var found = findNode(children[i], predicate);
    if (found) return found;
  }
  return null;
}

module.exports = {
  loadPipeline: loadPipeline,
  runPreprocess: runPreprocess,
  deepEqual: deepEqual,
  findNode: findNode,
};
