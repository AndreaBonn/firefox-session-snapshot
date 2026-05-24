const fs = require("fs");
const path = require("path");

/**
 * Load a WebExtension script into the global scope.
 * Uses indirect eval so the code has access to jsdom globals (document, window)
 * and browser mock. Transforms const/let to var so declarations become
 * properties of the global object, accessible in tests.
 */
function loadScript(relativePath) {
  const fullPath = path.resolve(__dirname, "..", relativePath);
  let code = fs.readFileSync(fullPath, "utf-8");
  // Transform top-level const/let to var for global scope access
  code = code.replace(/^(const|let) /gm, "var ");
  // Indirect eval: runs in global scope with access to document, window, browser
  (0, eval)(code);
}

module.exports = { loadScript };
