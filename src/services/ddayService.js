import { createRequire } from "module";
import { differenceInCalendarDays } from "date-fns";
import {
    parseFlexibleDate,
    formatToIsoDate,
    formatToKoreanShortDate,
} from "../utils/date.js";

const require = createRequire(import.meta.url);
const ddayEvents = require("../../data/dday.json");

export const getUpcomingDday = (reference = new Date()) => {
    const today = new Date(reference);
    today.setHours(0, 0, 0, 0);

    const upcoming = ddayEvents
        .map((event) => {
            const parsed = parseFlexibleDate(event.date);
            if (!parsed) {
                return null;
            }
            parsed.setHours(0, 0, 0, 0);
            const gap = differenceInCalendarDays(parsed, today);
            return {
                ...event,
                date: formatToIsoDate(parsed),
                displayDate: formatToKoreanShortDate(parsed),
                daysLeft: gap,
            };
        })
        .filter((event) => event && event.daysLeft >= 0)
        .sort((a, b) => a.daysLeft - b.daysLeft);

    if (!upcoming.length) {
        return null;
    }

    const next = upcoming[0];
    const label = next.daysLeft === 0 ? "D-DAY" : `D-${next.daysLeft}`;
    return {
        ...next,
        label,
    };
};
