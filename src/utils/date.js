import dayjs from "dayjs";
import "dayjs/locale/ko.js";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import weekday from "dayjs/plugin/weekday.js";

import config from "../config.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(weekday);
dayjs.locale("ko");

export const toZonedDayjs = (value) => {
    if (!value) {
        return dayjs().tz(config.defaultTimezone);
    }

    const candidate = dayjs(value);
    return candidate.isValid()
        ? candidate.tz(config.defaultTimezone)
        : dayjs().tz(config.defaultTimezone);
};

export const formatNeisDate = (value) => toZonedDayjs(value).format("YYYYMMDD");

export const formatDisplayDate = (value) =>
    toZonedDayjs(value).format("YYYY년 M월 D일 (ddd)");

export const formatDisplayRange = (start, end) => {
    const startDate = toZonedDayjs(start);
    const endDate = toZonedDayjs(end);

    if (!end || endDate.isSame(startDate, "day")) {
        return formatDisplayDate(startDate);
    }

    return `${startDate.format("YYYY년 M월 D일 (ddd)")} ~ ${endDate.format(
        "M월 D일 (ddd)"
    )}`;
};

export const getSemesterByMonth = (month) => {
    return month >= 3 && month <= 8 ? "1" : "2";
};

export default dayjs;
