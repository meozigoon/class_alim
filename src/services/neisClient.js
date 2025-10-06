import axios from "axios";
import NodeCache from "node-cache";

import config from "../config.js";

const cache = new NodeCache({
    stdTTL: config.cacheTtlSeconds,
    checkperiod: Math.max(60, Math.floor(config.cacheTtlSeconds / 2)),
});

const http = axios.create({
    baseURL: config.neisBaseUrl,
    timeout: 10000,
});

const buildCacheKey = (endpoint, params) => {
    const sortedKeys = Object.keys(params).sort();
    const normalized = sortedKeys.reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
    }, {});
    return `${endpoint}:${JSON.stringify(normalized)}`;
};

const parseDataset = (dataset) => {
    if (!Array.isArray(dataset)) {
        return {
            rows: [],
            resultCode: "INFO-200",
            resultMessage: "데이터가 없습니다.",
        };
    }

    let rows = [];
    let resultCode = "INFO-000";
    let resultMessage = "정상 처리되었습니다.";

    dataset.forEach((item) => {
        if (item?.head) {
            const result = item.head.find(
                (headItem) => headItem.RESULT
            )?.RESULT;
            if (result) {
                resultCode = result.CODE;
                resultMessage = result.MESSAGE;
            }
        }

        if (item?.row) {
            rows = item.row;
        }
    });

    return { rows, resultCode, resultMessage };
};

const fetchNeis = async (endpoint, params = {}) => {
    if (!config.neisApiKey) {
        throw new Error("NEIS API Key가 설정되어 있지 않습니다.");
    }

    const finalParams = {
        KEY: config.neisApiKey,
        Type: "json",
        pIndex: "1",
        pSize: "100",
        ...params,
    };

    const cacheKey = buildCacheKey(endpoint, finalParams);
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }

    const { data } = await http.get(`/${endpoint}`, {
        params: finalParams,
    });

    const dataset = data?.[endpoint];
    const parsed = parseDataset(dataset);

    if (
        parsed.resultCode &&
        !["INFO-000", "INFO-200"].includes(parsed.resultCode)
    ) {
        const message = parsed.resultMessage || "NEIS API 오류가 발생했습니다.";
        throw new Error(
            `${endpoint} 호출 실패: ${parsed.resultCode} ${message}`
        );
    }

    cache.set(cacheKey, parsed);
    return parsed;
};

export const getMeals = async (fromYmd, toYmd) => {
    const { rows } = await fetchNeis("mealServiceDietInfo", {
        ATPT_OFCDC_SC_CODE: config.educationOfficeCode,
        SD_SCHUL_CODE: config.schoolCode,
        MLSV_FROM_YMD: fromYmd,
        MLSV_TO_YMD: toYmd,
    });

    return rows;
};

export const getSchoolSchedule = async (fromYmd, toYmd, ay, semester) => {
    const { rows } = await fetchNeis("SchoolSchedule", {
        ATPT_OFCDC_SC_CODE: config.educationOfficeCode,
        SD_SCHUL_CODE: config.schoolCode,
        AY: ay,
        SEM: semester,
        AA_FROM_YMD: fromYmd,
        AA_TO_YMD: toYmd,
    });

    return rows;
};

export const getTimetable = async (dateYmd, ay, semester) => {
    const { rows } = await fetchNeis(config.timetableType, {
        ATPT_OFCDC_SC_CODE: config.educationOfficeCode,
        SD_SCHUL_CODE: config.schoolCode,
        AY: ay,
        SEM: semester,
        GRADE: config.grade,
        CLASS_NM: config.classNum,
        ALL_TI_YMD: dateYmd,
    });

    return rows;
};

export default {
    getMeals,
    getSchoolSchedule,
    getTimetable,
};
