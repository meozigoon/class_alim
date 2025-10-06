import { neisConfig } from "../config.js";
import { formatToNeisDate } from "../utils/date.js";

const BASE_URL = "https://open.neis.go.kr/hub";

const buildQuery = (params) =>
    Object.entries(params)
        .filter(
            ([, value]) => value !== undefined && value !== null && value !== ""
        )
        .map(
            ([key, value]) =>
                `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
        )
        .join("&");

const requestNeis = async (endpoint, query) => {
    const url = `${BASE_URL}/${endpoint}?${buildQuery(query)}`;
    const response = await fetch(url, {
        headers: {
            "Content-Type": "application/json; charset=utf-8",
        },
        cache: "no-store",
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(
            `NEIS API request failed: ${response.status} ${message}`
        );
    }

    const payload = await response.json();

    const [meta, data] = Object.values(payload);
    const result = Array.isArray(meta?.head)
        ? meta.head.find((item) => item?.RESULT)?.RESULT
        : null;

    if (result?.CODE && result.CODE !== "INFO-000") {
        throw new Error(
            `NEIS API returned error ${result.CODE}: ${result.MESSAGE}`
        );
    }

    const rows = data?.row ?? [];
    return Array.isArray(rows) ? rows : [];
};

const parseDish = (raw) => {
    const cleaned = raw.replace(/\s+/g, " ").trim();
    if (!cleaned) {
        return null;
    }

    const match = cleaned.match(/^(?<name>.*?)(?:\((?<codes>[0-9.]+)\))?$/);
    if (!match) {
        return { name: cleaned, allergyCodes: [] };
    }

    const { name, codes } = match.groups;
    if (!codes || !/^\d+(\.\d+)*\.?$/.test(codes)) {
        return { name: name.trim(), allergyCodes: [] };
    }

    const allergyCodes = codes
        .replace(/\.$/, "")
        .split(".")
        .map((code) => Number.parseInt(code, 10))
        .filter(Number.isInteger);

    return {
        name: name.trim(),
        allergyCodes,
    };
};

const sanitizeMenu = (raw) =>
    String(raw ?? "")
        .replace(/<br\s*\/?>/gi, "\n")
        .split(/\n+/)
        .map((item) => parseDish(item))
        .filter(Boolean);

export const getMealsByDate = async (date) => {
    const rows = await requestNeis("mealServiceDietInfo", {
        KEY: neisConfig.apiKey(),
        Type: "json",
        pIndex: 1,
        pSize: 100,
        ATPT_OFCDC_SC_CODE: neisConfig.eduOfficeCode(),
        SD_SCHUL_CODE: neisConfig.schoolCode(),
        MLSV_FROM_YMD: formatToNeisDate(date),
        MLSV_TO_YMD: formatToNeisDate(date),
    });

    return rows.map((row) => ({
        mealCode: row.MMEAL_SC_CODE,
        mealName: row.MMEAL_SC_NM,
        date: row.MLSV_YMD,
        dishes: sanitizeMenu(row.DDISH_NM),
        origin: row.ORPLC_INFO || "",
        calorie: row.CAL_INFO || "",
        nutrition: row.NTR_INFO || "",
    }));
};

export const getMonthlySchedule = async (fromDate, toDate) => {
    const rows = await requestNeis("SchoolSchedule", {
        KEY: neisConfig.apiKey(),
        Type: "json",
        pIndex: 1,
        pSize: 200,
        ATPT_OFCDC_SC_CODE: neisConfig.eduOfficeCode(),
        SD_SCHUL_CODE: neisConfig.schoolCode(),
        AA_FROM_YMD: formatToNeisDate(fromDate),
        AA_TO_YMD: formatToNeisDate(toDate),
    });

    return rows.map((row) => ({
        title: row.EVENT_NM || row.AA_YMD || "일정",
        date: row.AA_YMD,
        grade: row.SBTR_DD_SC_NM || "",
        description: row.CONTENT || row.EVENT_CNTNT || "",
    }));
};
