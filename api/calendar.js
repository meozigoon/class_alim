import { simpleText } from "../lib/kakao.js";
import { getSchoolSchedule } from "../lib/neis.js";
import { CONFIG, parseBody } from "./_common.js";

function ymd(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}${m}${d}`;
}

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).end();
    }
    const body = parseBody(req.body || "{}");
    const mode = body?.action?.params?.range || "week"; // week | month

    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    if (mode === "month") {
        start.setDate(1);
        end.setMonth(end.getMonth() + 1, 0);
    } else {
        const day = now.getDay();
        start.setDate(now.getDate() - ((day + 6) % 7)); // 월요일
        end.setDate(start.getDate() + 6);
    }

    try {
        const events = await getSchoolSchedule({
            key: CONFIG.NEIS_KEY,
            atpt: CONFIG.ATPT_OFCDC_SC_CODE,
            schul: CONFIG.SD_SCHUL_CODE,
            fromYmd: ymd(start),
            toYmd: ymd(end),
        });
        const text = events.length
            ? events
                  .map(
                      (e) =>
                          `${e.date} - ${e.name}${e.desc ? ` (${e.desc})` : ""}`
                  )
                  .join("\n")
            : "해당 기간에 학사일정이 없습니다.";
        res.status(200).json(simpleText(text));
    } catch {
        res.status(200).json(
            simpleText("학사일정 조회 중 오류가 발생했습니다.")
        );
    }
}
