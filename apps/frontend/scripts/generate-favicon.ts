import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import opentype from "opentype.js";

const projectRoot = process.cwd();
const fontPath = join(
  projectRoot,
  "node_modules",
  "@fontsource",
  "cormorant-garamond",
  "files",
  "cormorant-garamond-latin-600-italic.woff",
);

const outputPath = join(projectRoot, "public", "favicon.svg");

// Output dimensions and layout
const viewBoxSize = 128;
const margin = 16;
const targetSize = viewBoxSize - margin * 2;

const text = "S.";
const fontSize = 96; // Scaled regardless

const fontBuffer = readFileSync(fontPath);
const fontArrayBuffer = fontBuffer.buffer.slice(
  fontBuffer.byteOffset,
  fontBuffer.byteOffset + fontBuffer.byteLength,
);
const font = opentype.parse(fontArrayBuffer);
const textPath = font.getPath(text, 0, 0, fontSize);
const bbox = textPath.getBoundingBox();

const width = bbox.x2 - bbox.x1;
const height = bbox.y2 - bbox.y1;
const scale = Math.min(targetSize / width, targetSize / height);

const cx = (bbox.x1 + bbox.x2) / 2;
const cy = (bbox.y1 + bbox.y2) / 2;
const transform = `translate(${(viewBoxSize / 2).toFixed(0)} ${(viewBoxSize / 2).toFixed(
  0,
)}) scale(${scale.toFixed(6)}) translate(${(-cx).toFixed(6)} ${(-cy).toFixed(6)})`;

const d = textPath.toPathData(2);

const svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}">`,
  "  <style>",
  "    path { fill: #000; }",
  "    @media (prefers-color-scheme: dark) {",
  "      path { fill: #fff; }",
  "    }",
  "  </style>",
  `  <path d="${d}" transform="${transform}" />`,
  "</svg>",
  "",
].join("\n");

writeFileSync(outputPath, svg, "utf8");

console.log(`Generated ${outputPath}`);
