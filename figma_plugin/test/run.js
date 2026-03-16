#!/usr/bin/env node
var fs = require("fs");
var path = require("path");

var args = process.argv.slice(2);
var updateSnapshots = args.indexOf("--update") !== -1;
var filterIdx = args.indexOf("--filter");
var filterPattern = filterIdx !== -1 ? args[filterIdx + 1] : null;

// Collect test files
function collectTestFiles(dir) {
  var results = [];
  var entries = fs.readdirSync(dir, { withFileTypes: true });
  for (var i = 0; i < entries.length; i++) {
    var full = path.join(dir, entries[i].name);
    if (entries[i].isDirectory()) {
      results = results.concat(collectTestFiles(full));
    } else if (entries[i].name.endsWith(".test.js")) {
      results.push(full);
    }
  }
  return results;
}

var testDir = __dirname;
var testFiles = collectTestFiles(testDir);

var passed = 0;
var failed = 0;
var skipped = 0;
var errors = [];

for (var fi = 0; fi < testFiles.length; fi++) {
  var relPath = path.relative(testDir, testFiles[fi]);
  var tests = require(testFiles[fi]);

  if (!Array.isArray(tests)) {
    console.log("  SKIP " + relPath + " (not an array)");
    skipped++;
    continue;
  }

  console.log("\n" + relPath);

  for (var ti = 0; ti < tests.length; ti++) {
    var test = tests[ti];
    var name = test.name || "unnamed";

    if (filterPattern && name.indexOf(filterPattern) === -1) {
      skipped++;
      continue;
    }

    try {
      test.fn({ updateSnapshots: updateSnapshots });
      passed++;
      console.log("  PASS " + name);
    } catch (e) {
      failed++;
      var msg = e.message || String(e);
      console.log("  FAIL " + name);
      console.log("       " + msg);
      errors.push({ file: relPath, name: name, error: msg });
    }
  }
}

console.log("\n---");
console.log("Passed: " + passed + "  Failed: " + failed + "  Skipped: " + skipped);

if (errors.length > 0) {
  console.log("\nFailures:");
  for (var i = 0; i < errors.length; i++) {
    console.log("  " + errors[i].file + " > " + errors[i].name);
    console.log("    " + errors[i].error);
  }
}

process.exit(failed > 0 ? 1 : 0);
