import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { parse, isAfter, compareAsc, addDays } from "date-fns";
import { ko } from "date-fns/locale";

export const KST_TIMEZONE = "Asia/Seoul";

export const formatToNeisDate = (date) =>
    formatInTimeZone(date, KST_TIMEZONE, "yyyyMMdd");
export const formatToKoreanLongDate = (date) =>
    formatInTimeZone(date, KST_TIMEZONE, "M월 d일 (EEE)", { locale: ko });
export const formatToKoreanShortDate = (date) =>
    formatInTimeZone(date, KST_TIMEZONE, "M월 d일", { locale: ko });
export const formatToIsoDate = (date) =>
    formatInTimeZone(date, KST_TIMEZONE, "yyyy-MM-dd");

export const getKstToday = () => {
    const now = toZonedTime(new Date(), KST_TIMEZONE);
    now.setHours(0, 0, 0, 0);
    return now;
};

export const getKstDateByOffset = (offsetDays = 0) =>
    addDays(getKstToday(), offsetDays);

const DATE_FORMAT_CANDIDATES = [
    "yyyyMMdd",
    "yyyy-MM-dd",
    "yyyy.M.d",
    "yyyy.MM.dd",
    "yyyy/M/d",
    "yyyy/M/dd",
    "yyyy년 M월 d일",
];

export const parseFlexibleDate = (value) => {
    if (!value) {
        return null;
    }
    for (const fmt of DATE_FORMAT_CANDIDATES) {
        const parsed = parse(String(value).trim(), fmt, new Date());
        if (!Number.isNaN(parsed?.getTime())) {
            return parsed;
        }
    }
    const fallback = new Date(value);
    if (!Number.isNaN(fallback?.getTime())) {
        return fallback;
    }
    return null;
};

export const sortByDate = (items, selector) =>
    [...items].sort((a, b) => compareAsc(selector(a), selector(b)));

export const isFutureOrToday = (date, reference = new Date()) => {
    const ref = new Date(reference);
    ref.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    return !isAfter(ref, target);
};
