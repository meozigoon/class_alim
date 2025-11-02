import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
    parseFlexibleDate,
    sortByDate,
    formatToIsoDate,
    formatToKoreanShortDate,
    getKstToday,
} from "../utils/date.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_PATH = join(__dirname, "../../data/performanceAssessments.json");

const buildDateInfo = (rawDate) => {
    if (!rawDate) {
        return null;
    }

    const value = String(rawDate).trim();

    if (!value) {
        return null;
    }

    if (value.includes("~")) {
        const [startRaw, endRaw] = value.split("~").map((part) => part.trim());
        const startDate = parseFlexibleDate(startRaw);
        const endDate = parseFlexibleDate(endRaw);

        if (!startDate || !endDate) {
            return null;
        }

        return {
            type: "range",
            startDate,
            endDate,
            display: `${formatToKoreanShortDate(
                startDate
            )} ~ ${formatToKoreanShortDate(endDate)} 사이`,
        };
    }

    const hasBeforeKeyword = value.includes("이전");
    const cleaned = value.replace(/이전/g, "").trim();
    const date = parseFlexibleDate(cleaned);

    if (!date) {
        return null;
    }

    return {
        type: hasBeforeKeyword ? "before" : "single",
        startDate: date,
        display: `${formatToKoreanShortDate(date)}${
            hasBeforeKeyword ? " 이전" : ""
        }`,
    };
};

const normalizeRecord = (record) => {
    const dateInfo = buildDateInfo(record.date);
    if (!dateInfo) {
        return null;
    }

    const title = String(record.title ?? record.subject ?? "수행평가").trim();
    const subject = record.subject ? String(record.subject).trim() : "";
    const description = record.description
        ? String(record.description).trim()
        : "";

    const base = {
        title,
        subject,
        date: formatToIsoDate(dateInfo.startDate),
        displayDate: dateInfo.display,
        description,
    };

    if (dateInfo.type === "range") {
        return {
            ...base,
            endDate: formatToIsoDate(dateInfo.endDate),
            dateType: "range",
        };
    }

    if (dateInfo.type === "before") {
        return {
            ...base,
            dateType: "before",
        };
    }

    return {
        ...base,
        dateType: "single",
    };
};

export const getPerformanceAssessments = async () => {
    const file = await readFile(DATA_PATH, "utf8");
    const items = JSON.parse(file);

    if (!Array.isArray(items)) {
        throw new Error("수행평가 데이터가 올바른 배열 형식이 아닙니다.");
    }

    const normalized = items.map(normalizeRecord).filter(Boolean);
    const today = formatToIsoDate(getKstToday());
    const filtered = normalized.filter((item) => {
        if (item.dateType === "range" && item.endDate) {
            return item.endDate >= today;
        }
        return item.date >= today;
    });

    return sortByDate(filtered, (item) => new Date(item.date));
};
