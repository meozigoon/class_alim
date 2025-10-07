import { createRequire } from "module";
import { differenceInCalendarDays } from "date-fns";
import {
    formatToIsoDate,
    formatToKoreanShortDate,
    parseFlexibleDate,
} from "../utils/date.js";

const require = createRequire(import.meta.url);
const examSchedules = require("../../data/examSchedules.json");

export const getUpcomingExam = (reference = new Date()) => {
    const today = new Date(reference);
    today.setHours(0, 0, 0, 0);

    const upcoming = examSchedules
        .map((exam) => {
            const parsed = parseFlexibleDate(exam.date);
            if (!parsed) {
                return null;
            }
            parsed.setHours(0, 0, 0, 0);
            const gap = differenceInCalendarDays(parsed, today);
            return {
                ...exam,
                date: formatToIsoDate(parsed),
                displayDate: formatToKoreanShortDate(parsed),
                daysLeft: gap,
            };
        })
        .filter((exam) => exam && exam.daysLeft >= 0)
        .sort((a, b) => a.daysLeft - b.daysLeft);

    if (!upcoming.length) {
        return null;
    }

    return upcoming[0];
};
