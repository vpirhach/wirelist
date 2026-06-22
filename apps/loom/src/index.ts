import "dotenv/config";
import path from "path";
import express from "express";
import multer from "multer";
import { dwgToSvg, SvgTheme } from "./dwg-converter";
import { extractWireList } from "./extract-wirelist";
import { createSessionAndRun } from "./session-runner";
import {
  isValidSessionId,
  listSessions,
  readSession,
} from "./session-store";

const app = express();
const port = parseInt(process.env.PORT || "3050", 10);

const LOOM_ROOT = process.env.LOOM_APP_ROOT
  ? path.resolve(process.env.LOOM_APP_ROOT)
  : path.resolve(process.cwd());
const publicDir = path.join(LOOM_ROOT, "public");

// Multer: store uploaded files in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      "application/msword",
      "application/doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/docx",
      "application/octet-stream",
    ];
    const allowedExts = [".doc", ".docx"];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf("."));

    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Unsupported file type: ${file.mimetype} (${file.originalname}). Use .doc or .docx files.`
        )
      );
    }
  },
});

const uploadMany = upload.array("files", 100);

/**
 * GET /meta — service metadata (JSON). Static UI is served at GET /.
 */
app.get("/meta", (_req, res) => {
  res.json({
    service: "loom",
    version: "1.0.0",
    description:
      "Wire list document extractor with automatic column detection",
    ui: "/",
    endpoints: {
      "POST /extract":
        "Upload a .doc or .docx file to extract wire list table data with auto-detected columns",
      "POST /sessions": "Multipart field `files`: multiple .doc/.docx; returns { sessionId }",
      "GET /sessions": "List upload sessions",
      "GET /sessions/:id": "Session detail and per-file status",
      "GET /sessions/:id/output": "Combined JSON for DB import",
      "POST /dwg2svg":
        "Upload a .dwg file and get back the SVG conversion",
      "GET /health": "Health check",
      "GET /meta": "This JSON",
    },
    usage: {
      extract: `curl -X POST -F "file=@wirelist.docx" http://localhost:${port}/extract`,
      dwg2svg: `curl -X POST -F "file=@drawing.dwg" http://localhost:${port}/dwg2svg -o output.svg`,
    },
  });
});

/**
 * POST /extract
 * Upload a .doc or .docx file and extract wire list table data
 * with automatic column detection.
 *
 * Form data: file (file field)
 */
app.post("/extract", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({
        error: "No file uploaded. Send a .doc or .docx with field name 'file'.",
      });
      return;
    }

    const { buffer, mimetype, originalname, size } = req.file;

    console.log(
      `[extract] Processing ${originalname} (${(size / 1024).toFixed(1)}KB, ${mimetype})`
    );

    const result = await extractWireList(buffer, mimetype, originalname);

    if (result.tables.length === 0) {
      console.log(`[extract] No tables in ${originalname}`);
    } else {
      const totalRows = result.tables.reduce((sum, t) => sum + t.rows.length, 0);
      console.log(
        `[extract] Done in ${result.processingTimeMs}ms | ${result.tables.length} table(s) | ${totalRows} total row(s)`
      );
    }

    res.json(result);
  } catch (err) {
    const processingTimeMs = 0;
    console.error(`[extract] Error:`, err);
    res.status(500).json({
      error: "Extraction failed",
      message: (err as Error).message,
      processingTimeMs,
    });
  }
});

/**
 * POST /sessions — multi-file upload session (async processing + disk JSON)
 */
app.post(
  "/sessions",
  (req, res, next) => {
    uploadMany(req, res, (err) => {
      if (err) {
        res.status(400).json({
          error: "Upload failed",
          message: (err as Error).message,
        });
        return;
      }
      next();
    });
  },
  async (req, res) => {
    const files = req.files as Express.Multer.File[] | undefined;
    const list = files ?? [];
    if (list.length === 0) {
      res.status(400).json({
        error: "No files uploaded. Send one or more .doc/.docx with field name 'files'.",
      });
      return;
    }

    try {
      const { sessionId } = await createSessionAndRun(list);
      res.status(201).json({ sessionId });
    } catch (e) {
      console.error("[sessions] create error:", e);
      res.status(500).json({
        error: "Failed to create session",
        message: (e as Error).message,
      });
    }
  }
);

app.get("/sessions", async (_req, res) => {
  try {
    const sessions = await listSessions();
    res.json({ sessions });
  } catch (e) {
    res.status(500).json({ error: "Failed to list sessions", message: (e as Error).message });
  }
});

app.get("/sessions/:id", async (req, res) => {
  const id = req.params.id;
  if (!isValidSessionId(id)) {
    res.status(400).json({ error: "Invalid session id" });
    return;
  }
  const doc = await readSession(id);
  if (!doc) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(doc);
});

app.get("/sessions/:id/output", async (req, res) => {
  const id = req.params.id;
  if (!isValidSessionId(id)) {
    res.status(400).json({ error: "Invalid session id" });
    return;
  }
  const doc = await readSession(id);
  if (!doc) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(doc.output);
});

// Multer config for DWG uploads
const dwgUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname
      .toLowerCase()
      .slice(file.originalname.lastIndexOf("."));
    if (
      ext === ".dwg" ||
      file.mimetype === "application/octet-stream" ||
      file.mimetype === "application/acad" ||
      file.mimetype === "image/vnd.dwg"
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Unsupported file type: ${file.mimetype} (${file.originalname}). Use .dwg files.`
        )
      );
    }
  },
});

/**
 * POST /dwg2svg
 */
app.post("/dwg2svg", dwgUpload.single("file"), async (req, res) => {
  const startTime = Date.now();

  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded. Send a .dwg with field name 'file'." });
      return;
    }

    const { buffer, originalname, size } = req.file;
    const theme: SvgTheme =
      (req.query.theme as string) === "dark" ? "dark" : "light";

    console.log(
      `[dwg2svg] Converting ${originalname} (${(size / 1024).toFixed(1)}KB, theme=${theme})`
    );

    const svg = await dwgToSvg(buffer, theme);
    const processingTimeMs = Date.now() - startTime;

    console.log(
      `[dwg2svg] Done in ${processingTimeMs}ms | SVG size: ${(svg.length / 1024).toFixed(1)}KB`
    );

    res.set("Content-Type", "image/svg+xml");
    res.set("X-Processing-Time-Ms", String(processingTimeMs));
    res.send(svg);
  } catch (err) {
    const processingTimeMs = Date.now() - startTime;
    console.error(`[dwg2svg] Error after ${processingTimeMs}ms:`, err);
    res.status(500).json({
      error: "DWG conversion failed",
      message: (err as Error).message,
      processingTimeMs,
    });
  }
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "loom",
    uptime: process.uptime(),
  });
});

/** Static UI last so API paths like GET /sessions are not shadowed */
app.use(express.static(publicDir));

app.listen(port, () => {
  console.log(`\n  Loom API + UI: http://localhost:${port}`);
  console.log(`  Metadata JSON: http://localhost:${port}/meta`);
  console.log(`  Try: curl -X POST -F "file=@wirelist.docx" http://localhost:${port}/extract\n`);
});
