#!/usr/bin/env node
/**
 * parse-tasklist.ts
 *
 * Reads docs/TaskList.csv (SharePoint export, UTF-8 BOM) and outputs
 * a clean JSON file at scripts/output/parsed-tasks.json.
 *
 * Usage:
 *   npx tsx scripts/parse-tasklist.ts
 *   # or with Node >= 22:
 *   node --experimental-strip-types scripts/parse-tasklist.ts
 */

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const ROOT = path.resolve(__dirname, "..");
const CSV_PATH = path.join(ROOT, "docs", "TaskList.csv");
const OUT_DIR = path.join(ROOT, "scripts", "output");
const OUT_PATH = path.join(OUT_DIR, "parsed-tasks.json");

// ---------------------------------------------------------------------------
// Column definitions (in CSV order)
// ---------------------------------------------------------------------------
const COLUMNS = [
  "タスク名",
  "ファンクション",
  "タスクの種類",
  "詳細タスク・アクション項目",
  "Status",
  "Owner",
  "DueDate",
  "優先度",
  "顧客名",
  "工数レベル",
  "Note",
  "関連ファイル",
  "更新日時",
];

// ---------------------------------------------------------------------------
// CSV parser — handles quoted fields with embedded newlines, commas, and
// escaped quotes ("").
// ---------------------------------------------------------------------------
function parseCSV(text) {
  const records = [];
  let i = 0;
  const len = text.length;

  while (i < len) {
    const row = [];
    while (i < len) {
      // skip leading whitespace that isn't a newline
      // (don't skip — CSV fields may have meaningful spaces)

      if (i < len && text[i] === '"') {
        // Quoted field
        i++; // skip opening quote
        let value = "";
        while (i < len) {
          if (text[i] === '"') {
            if (i + 1 < len && text[i + 1] === '"') {
              // Escaped quote
              value += '"';
              i += 2;
            } else {
              // End of quoted field
              i++; // skip closing quote
              break;
            }
          } else {
            value += text[i];
            i++;
          }
        }
        row.push(value);
      } else {
        // Unquoted field — read until comma or newline
        let value = "";
        while (i < len && text[i] !== "," && text[i] !== "\n" && text[i] !== "\r") {
          value += text[i];
          i++;
        }
        row.push(value);
      }

      // After a field: comma means more fields, newline means end of row
      if (i < len && text[i] === ",") {
        i++; // skip comma, continue to next field
      } else {
        // End of row (newline or EOF)
        break;
      }
    }

    // Skip row-ending newline(s)
    while (i < len && (text[i] === "\r" || text[i] === "\n")) {
      i++;
    }

    // Only push non-empty rows
    if (row.length > 1 || (row.length === 1 && row[0].trim() !== "")) {
      records.push(row);
    }
  }

  return records;
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------
function mapStatus(raw) {
  const s = (raw || "").trim();
  if (!s) return "waiting";
  const lower = s.toLowerCase();
  if (lower === "completed" || lower === "done") return "done";
  if (lower === "inprogress" || lower === "in progress") return "in_progress";
  if (lower === "notstarted" || lower === "not started") return "todo";
  if (lower === "dropped") return "rejected";
  return s; // pass through if unknown
}

function mapPriority(raw) {
  const s = (raw || "").trim();
  if (!s) return null;
  if (s === "高" || s.toLowerCase() === "high") return "high";
  if (s === "中" || s.toLowerCase() === "medium") return "medium";
  if (s === "低" || s.toLowerCase() === "low") return "low";
  return s;
}

function mapEffort(raw) {
  const s = (raw || "").trim();
  if (!s) return null;
  if (s === "大") return 16;
  if (s === "中") return 8;
  if (s === "小") return 4;
  // Try to parse a number if already numeric
  const n = Number(s);
  return isNaN(n) ? s : n;
}

function parseOwners(raw) {
  const s = (raw || "").trim();
  if (!s) return [];
  return s
    .split(";")
    .map((o) => o.trim())
    .filter(Boolean);
}

function parseDueDate(raw) {
  const s = (raw || "").trim();
  if (!s) return null;
  // ISO 8601 string — validate
  const d = new Date(s);
  if (isNaN(d.getTime())) return s; // return raw if not parseable
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  // Read file, strip BOM
  let raw = fs.readFileSync(CSV_PATH, "utf-8");
  if (raw.charCodeAt(0) === 0xfeff) {
    raw = raw.slice(1);
  }

  const rows = parseCSV(raw);

  if (rows.length < 2) {
    console.error("CSV has fewer than 2 rows — nothing to parse.");
    process.exit(1);
  }

  // Line 1: SharePoint schema JSON — skip
  // Line 2: Header row — verify or skip
  const headerRow = rows[1];
  const headerCheck = headerRow[0] && headerRow[0].trim();
  let dataStart = 2;

  // If line 1 is NOT the SharePoint schema (e.g. it already looks like a header),
  // adjust accordingly.
  if (rows[0][0] && rows[0][0].trim() === "タスク名") {
    // No schema line — header is row 0
    dataStart = 1;
  }

  console.log(
    `Parsed ${rows.length} raw rows. Data rows start at index ${dataStart}.`
  );

  const tasks = [];

  for (let r = dataStart; r < rows.length; r++) {
    const row = rows[r];
    // Pad row to expected column count
    while (row.length < COLUMNS.length) {
      row.push("");
    }

    const taskName = (row[0] || "").trim();
    // Skip rows with no task name
    if (!taskName) continue;

    const task = {
      taskName,
      function: (row[1] || "").trim() || null,
      taskType: (row[2] || "").trim() || null,
      details: (row[3] || "").trim() || null,
      status: mapStatus(row[4]),
      owners: parseOwners(row[5]),
      dueDate: parseDueDate(row[6]),
      priority: mapPriority(row[7]),
      clientName: (row[8] || "").trim() || null,
      effortLevel: mapEffort(row[9]),
      note: (row[10] || "").trim() || null,
      relatedFiles: (row[11] || "").trim() || null,
      updatedAt: parseDueDate(row[12]),
    };

    tasks.push(task);
  }

  // Ensure output directory exists
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(tasks, null, 2), "utf-8");
  console.log(`Wrote ${tasks.length} tasks to ${OUT_PATH}`);
}

main();
