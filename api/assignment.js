import { simpleText } from "../lib/kakao.js";
import { readCsv } from "../lib/sheets.js";
import { CONFIG, parseBody } from "./_common.js";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).end();
    }
    const body = parseBody(req.body || "{}");
    const grade = body?.action?.params?.grade;
    const classNm = body?.action?.params?.classNm;

    try {
        const rows = await readCsv(CONFIG.ASSIGNMENT_CSV_URL);
        const items = rows
            .map((r) => ({
                due: r.due,
                grade: String(r.grade || ""),
                classNm: String(r.class || ""),
                subject: r.subject,
                item: r.item,
                weight: r.weight,
                link: r.link,
            }))
            .filter(
                (r) =>
                    (!grade || r.grade === String(grade)) &&
                    (!classNm || r.classNm === String(classNm))
            )
            .sort((a, b) => (a.due || "").localeCompare(b.due))
            .slice(0, 10);

        const text = items.length
            ? items
                  .map(
                      (x) =>
                          `${x.due} [${x.grade}-${x.classNm}] ${x.subject} — ${
                              x.item
                          }${x.weight ? ` (${x.weight})` : ""}${
                              x.link ? `\n${x.link}` : ""
                          }`
                  )
                  .join("\n\n")
            : "등록된 수행평가 일정이 없습니다.";
        res.status(200).json(simpleText(text));
    } catch {
        res.status(200).json(
            simpleText("수행평가 조회 중 오류가 발생했습니다.")
        );
    }
}
