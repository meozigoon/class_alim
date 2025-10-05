import { simpleText } from "../lib/kakao.js";
import { getMeal } from "../lib/neis.js";
import { CONFIG, todayYMD, parseBody } from "./_common.js";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).end();
    }
    const body = parseBody(req.body || "{}");

    // 오픈빌더 액션 파라미터(블록에서 바인딩) 또는 기본값
    const ymd = body?.action?.params?.dateYMD || todayYMD(true);
    const mealType = body?.action?.params?.mealType; // 1/2/3
    try {
        const rows = await getMeal({
            key: CONFIG.NEIS_KEY,
            atpt: CONFIG.ATPT_OFCDC_SC_CODE,
            schul: CONFIG.SD_SCHUL_CODE,
            ymd,
            mealType,
        });
        const text = rows.length
            ? rows
                  .map((r) => `【${r.mealName || "급식"}】\n${r.dishes}`)
                  .join("\n\n")
            : "해당 날짜에 급식 정보가 없습니다.";
        const reply = simpleText(text, [
            { label: "내일 급식", messageText: "내일 급식" },
            { label: "시간표", messageText: "시간표" },
        ]);
        res.status(200).json(reply);
    } catch (e) {
        res.status(200).json(simpleText("급식 조회 중 오류가 발생했습니다."));
    }
}
