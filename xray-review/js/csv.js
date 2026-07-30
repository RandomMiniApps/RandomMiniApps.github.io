(function (global) {
  "use strict";

  function parseCsv(text) {
    const rows = [];
    let i = 0;
    const len = text.length;
    let field = "";
    let row = [];
    let inQuotes = false;

    while (i < len) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          inQuotes = false;
          i += 1;
          continue;
        }
        field += c;
        i += 1;
        continue;
      }
      if (c === '"') {
        inQuotes = true;
        i += 1;
        continue;
      }
      if (c === ",") {
        row.push(field);
        field = "";
        i += 1;
        continue;
      }
      if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i += 1;
        row.push(field);
        field = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
        i += 1;
        continue;
      }
      field += c;
      i += 1;
    }
    if (field.length || row.length) {
      row.push(field);
      rows.push(row);
    }
    if (!rows.length) return { headers: [], records: [] };
    const headers = rows[0].map((h) => h.trim());
    const records = rows.slice(1).map((cells) => {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = cells[idx] != null ? cells[idx] : "";
      });
      return obj;
    });
    return { headers, records };
  }

  function escapeCsvField(value) {
    const s = value == null ? "" : String(value);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  function toCsv(headers, records) {
    const lines = [headers.map(escapeCsvField).join(",")];
    for (const rec of records) {
      lines.push(headers.map((h) => escapeCsvField(rec[h])).join(","));
    }
    return lines.join("\n") + "\n";
  }

  global.XrayReviewCsv = { parseCsv, toCsv, escapeCsvField };
})(typeof window !== "undefined" ? window : globalThis);
