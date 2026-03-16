var fs = require("fs");
var path = require("path");
var assert = require("assert");
var helpers = require("../helpers");

var fixturesDir = path.join(__dirname, "fixtures");
var snapshotsDir = path.join(__dirname, "snapshots");

// Ensure snapshots directory exists
if (!fs.existsSync(snapshotsDir)) {
  fs.mkdirSync(snapshotsDir, { recursive: true });
}

var fixtureFiles = fs.readdirSync(fixturesDir).filter(function(f) {
  return f.endsWith(".json");
});

var tests = [];

fixtureFiles.forEach(function(filename) {
  var name = filename.replace(".json", "");
  var snapPath = path.join(snapshotsDir, name + ".snap.json");

  tests.push({
    name: "pipeline snapshot: " + name,
    fn: function(opts) {
      var input = JSON.parse(fs.readFileSync(path.join(fixturesDir, filename), "utf8"));
      var result = helpers.runPreprocess(input);

      if (opts && opts.updateSnapshots) {
        fs.writeFileSync(snapPath, JSON.stringify(result, null, 2) + "\n", "utf8");
        return; // pass on update
      }

      if (!fs.existsSync(snapPath)) {
        throw new Error("Snapshot not found. Run with --update to create: " + snapPath);
      }

      var expected = JSON.parse(fs.readFileSync(snapPath, "utf8"));
      var diff = helpers.deepEqual(result, expected);
      if (diff) {
        throw new Error("Snapshot mismatch:\n  " + diff);
      }
    }
  });
});

module.exports = tests;
