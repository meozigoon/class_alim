const BASE = "https://open.neis.go.kr/hub";

function qs(obj) {
    return Object.entries(obj)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");
}

async function hubFetch(path, params) {
    const url = `${BASE}/${path}?${qs(params)}`;
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
        throw new Error(`NEIS HTTP ${res.status}`);
    }
    const data = await res.json();
    // NEIS JSON은 [0]=head, [1]=row 구조가 일반적
    const body = data?.[path]?.[1]?.row || [];
    return body;
}

export async function getMeal({ key, atpt, schul, ymd, mealType }) {
    // mealType: 1(조),2(중),3(석) — 없으면 전체
    const rows = await hubFetch("mealServiceDietInfo", {
        KEY: key,
        Type: "json",
        pIndex: 1,
        pSize: 100,
        ATPT_OFCDC_SC_CODE: atpt,
        SD_SCHUL_CODE: schul,
        MLSV_YMD: ymd,
        MMEAL_SC_CODE: mealType,
    });
    return rows.map((r) => ({
        date: r.MLSV_YMD,
        mealName: r.MMEAL_SC_NM,
        dishes: (r.DDISH_NM || "").replace(/<br\/>/g, "\n"),
    }));
}

export async function getHisTimetable({
    key,
    atpt,
    schul,
    ymd,
    grade,
    classNm,
    ay,
    sem,
}) {
    const rows = await hubFetch("hisTimetable", {
        KEY: key,
        Type: "json",
        pIndex: 1,
        pSize: 100,
        ATPT_OFCDC_SC_CODE: atpt,
        SD_SCHUL_CODE: schul,
        ALL_TI_YMD: ymd,
        GRADE: grade,
        CLASS_NM: classNm,
        AY: ay,
        SEM: sem,
    });
    // PERIO(교시)로 정렬
    return rows
        .map((r) => ({ perio: Number(r.PERIO), subject: r.ITRT_CNTNT }))
        .sort((a, b) => a.perio - b.perio);
}

export async function getSchoolSchedule({ key, atpt, schul, fromYmd, toYmd }) {
    const rows = await hubFetch("SchoolSchedule", {
        KEY: key,
        Type: "json",
        pIndex: 1,
        pSize: 100,
        ATPT_OFCDC_SC_CODE: atpt,
        SD_SCHUL_CODE: schul,
        AA_FROM_YMD: fromYmd,
        AA_TO_YMD: toYmd,
    });
    return rows.map((r) => ({
        date: r.AA_YMD,
        name: r.EVENT_NM,
        desc: r.CONTENT,
    }));
}
