import { execFile } from "node:child_process";
import { access, constants } from "node:fs/promises";
import path from "node:path";

export type SvgTheme = "dark" | "light";

/**
 * Path to the bundled dwg2svg binary.
 * Falls back to system PATH if the bundled binary is not found.
 */
const BUNDLED_BIN = path.resolve(__dirname, "..", "bin", "dwg2svg");

/**
 * Resolve the path to the dwg2svg binary.
 * Prefers the bundled version; falls back to system-installed.
 */
async function resolveBinary(): Promise<string> {
  try {
    await access(BUNDLED_BIN, constants.X_OK);
    return BUNDLED_BIN;
  } catch {
    return "dwg2SVG";
  }
}

/**
 * Convert a DWG file buffer to SVG string.
 *
 * Writes the buffer to a temp file, runs dwg2svg on it,
 * post-processes the SVG for proper rendering, and returns
 * the cleaned SVG output.
 *
 * @param buffer - DWG file contents
 * @param theme  - "dark" = dark background (original AutoCAD look),
 *                 "light" = white background with inverted colors (default)
 * @returns SVG markup string
 */
export async function dwgToSvg(
  buffer: Buffer,
  theme: SvgTheme = "light"
): Promise<string> {
  const { writeFile, mkdtemp, rm } = await import("node:fs/promises");
  const os = await import("node:os");

  const tmpDir = await mkdtemp(path.join(os.default.tmpdir(), "loom-dwg-"));
  const tmpFile = path.join(tmpDir, "input.dwg");

  try {
    await writeFile(tmpFile, buffer);

    const bin = await resolveBinary();

    const rawSvg = await new Promise<string>((resolve, reject) => {
      execFile(
        bin,
        [tmpFile],
        { maxBuffer: 50 * 1024 * 1024, timeout: 30_000 },
        (error, stdout, stderr) => {
          if (error) {
            reject(
              new Error(
                `dwg2svg failed: ${error.message}${stderr ? "\n" + stderr : ""}`
              )
            );
            return;
          }

          if (!stdout || !stdout.includes("<svg")) {
            reject(
              new Error(
                `dwg2svg produced no SVG output${stderr ? ": " + stderr : ""}`
              )
            );
            return;
          }

          resolve(stdout);
        }
      );
    });

    return postProcessSvg(rawSvg, theme);
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ─── SVG post-processing ─────────────────────────────────────────────

/**
 * AutoCAD color to light-theme replacement map.
 * Original DWG drawings use bright colors for a dark background.
 * We remap them for readability on white.
 */
const DARK_TO_LIGHT: Record<string, string> = {
  white: "#1a1a1a",
  yellow: "#b8860b",   // dark goldenrod
  cyan: "#007070",
  magenta: "#8b008b",
  red: "#cc0000",
  green: "#006600",
  blue: "#0000cc",
};

/**
 * Parse the viewBox to get the drawing dimensions for stroke scaling.
 */
function parseViewBox(svg: string): { w: number; h: number } | null {
  const m = svg.match(/viewBox="([^"]+)"/);
  if (!m) return null;
  const parts = m[1].split(/\s+/).map(Number);
  return { w: parts[2], h: parts[3] };
}

/**
 * Post-process LibreDWG SVG output for clean rendering:
 * 1. Fix zero-width strokes to a hairline relative to viewBox
 * 2. Scale oversized strokes down
 * 3. Remap colors for the chosen theme
 * 4. Add a background rect
 */
function postProcessSvg(svg: string, theme: SvgTheme): string {
  const vb = parseViewBox(svg);
  const diag = vb ? Math.sqrt(vb.w * vb.w + vb.h * vb.h) : 40;

  // Hairline = ~0.03% of the diagonal (crisp at any zoom)
  const hairline = +(diag * 0.0003).toFixed(6);
  // Thin line = ~0.08% of diagonal
  const thinLine = +(diag * 0.0008).toFixed(6);

  let out = svg;

  // 1. Fix stroke widths
  //    0.0px  -> hairline
  //    0.1px  -> thinLine (tuned for the viewBox scale)
  out = out.replace(/stroke-width:0\.0px/g, `stroke-width:${hairline}px`);
  out = out.replace(/stroke-width:0\.1px/g, `stroke-width:${thinLine}px`);

  if (theme === "light") {
    // 2. Remap stroke colors
    for (const [from, to] of Object.entries(DARK_TO_LIGHT)) {
      out = out.replace(
        new RegExp(`stroke:${from}`, "gi"),
        `stroke:${to}`
      );
      out = out.replace(
        new RegExp(`fill="${from}"`, "gi"),
        `fill="${to}"`
      );
    }

    // 3. Insert white background right after <svg ...>
    out = out.replace(
      /(<svg[^>]*>)/,
      `$1\n\t<rect width="100%" height="100%" fill="white" />`
    );
  } else {
    // Dark theme: keep original colors, add dark background
    out = out.replace(
      /(<svg[^>]*>)/,
      `$1\n\t<rect width="100%" height="100%" fill="#1e1e1e" />`
    );
  }

  return out;
}
