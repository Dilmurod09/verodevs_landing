/** Подставляет partials/mascot-rects.inc в index.html вместо <!--MASCOT_PLACEHOLDER--> */
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
let html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const rects = fs.readFileSync(path.join(root, "partials", "mascot-rects.inc"), "utf8");
const marker = "<!--MASCOT_PLACEHOLDER-->";
if (!html.includes(marker)) {
  console.error("Marker not found in index.html");
  process.exit(1);
}
html = html.replace(marker, rects);
fs.writeFileSync(path.join(root, "index.html"), html);
console.log("Mascot stitched into index.html");
