import { simpleText } from "../lib/kakao.js";
import { getHisTimetable } from "../lib/neis.js";
import { CONFIG, todayYMD, parseBody } from "./_common.js";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).end();
    }
    const body = parseBody(req.body || "{}");
    const ymd = body?.action?.params?.dateYMD || todayYMD(true);
    const grade = body?.action?.params?.grade || CONFIG.DEFAULT_GRADE;
    const classNm = body?.action?.params?.classNm || CONFIG.DEFAULT_CLASS_NM;
    const ay = String(new Date().getFullYear());
    const sem =
        body?.action?.params?.sem ||
        (new Date().getMonth() + 1 <= 2 ? "1" : "2"); // 단순 예시

    try {
        const rows = await getHisTimetable({
            key: CONFIG.NEIS_KEY,
            atpt: CONFIG.ATPT_OFCDC_SC_CODE,
            schul: CONFIG.SD_SCHUL_CODE,
            ymd,
            grade,
            classNm,
            ay,
            sem,
        });
        const text = rows.length
            ? rows.map((r) => `${r.perio}교시: ${r.subject}`).join("\n")
            : "해당 날짜에 시간표 정보가 없습니다.";
        res.status(200).json(
            simpleText(`${grade}학년 ${classNm}반 ${ymd} 시간표\n${text}`)
        );
    } catch (e) {
        res.status(200).json(simpleText("시간표 조회 중 오류가 발생했습니다."));
    }
}
