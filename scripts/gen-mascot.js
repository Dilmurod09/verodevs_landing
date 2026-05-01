/** Генерация пиксельного «робот-лис» (20×15) — результат в partials/mascot-rects.inc */
const fs = require("fs");
const path = require("path");
const rows = [
  "00000001100011000000",
  "00000011110111100000",
  "00000011110111100000",
  "00000111111111110000",
  "00001111222111111000",
  "00011111111111111100",
  "00011211111111211000",
  "00011122222222111000",
  "00011111111111111000",
  "00001111111111110000",
  "00000111111111100000",
  "00000111222111100000",
  "00000111111111100000",
  "00000011111111000000",
  "00000001122110000000",
];
let rects = "";
for (let y = 0; y < rows.length; y++) {
  const r = rows[y];
  for (let x = 0; x < r.length; x++) {
    const c = r[x];
    if (c === "0") continue;
    const cls = c === "1" ? "mascot-p1" : "mascot-p2";
    rects += `<rect class="${cls}" x="${x}" y="${y}" width="1" height="1"/>`;
  }
}
const out = path.join(__dirname, "..", "partials", "mascot-rects.inc");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, rects, "utf8");
process.stdout.write("Wrote " + out + "\n");
