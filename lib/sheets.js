import { parse } from "csv-parse/sync";

export async function readCsv(url) {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Sheets HTTP ${res.status}`);
    }
    const text = await res.text();
    const records = parse(text, { columns: true, skip_empty_lines: true });
    return records;
}
