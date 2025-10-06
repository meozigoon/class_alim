import fs from "fs/promises";
import path from "path";

import config from "../config.js";
import {
    formatDisplayDate,
    formatDisplayRange,
    formatNeisDate,
    getSemesterByMonth,
    toZonedDayjs,
} from "../utils/date.js";
import { getMeals, getSchoolSchedule, getTimetable } from "./neisClient.js";

const customEventsPath = path.resolve(process.cwd(), "data/customEvents.json");

const loadCustomEvents = async () => {
    try {
        const raw = await fs.readFile(customEventsPath, "utf8");
        return JSON.parse(raw);
    } catch (error) {
        return { performanceAssessments: [], exams: [] };
    }
};

const cleanMealText = (text = "") =>
    text
        .replace(/<br\s*\/?\s*>/gi, "\n")
        .replace(/\([^)]+\)/g, (match) => match)
        .replace(/\./g, ".");

const computeAcademicContext = (date) => {
    const target = toZonedDayjs(date);
    const month = target.month() + 1;
    const academicYear = month < 3 ? target.year() - 1 : target.year();
    const semester = getSemesterByMonth(month);

    return {
        academicYear: `${academicYear}`,
        semester,
        target,
    };
};

const sortByPeriod = (rows) =>
    [...rows].sort((a, b) => Number(a.PERIO) - Number(b.PERIO));

const filterScheduleByKeyword = (rows, keywords) =>
    rows.filter((row) => {
        const name = row.EVENT_NM || "";
        return keywords.some((keyword) => name.includes(keyword));
    });

const uniqueByEventNameAndDate = (rows) => {
    const seen = new Map();

    rows.forEach((row) => {
        const key = `${row.EVENT_NM}-${row.AA_YMD}-${row.AA_TO_YMD}`;
        if (!seen.has(key)) {
            seen.set(key, row);
        }
    });

    return Array.from(seen.values());
};

export const buildMealMessage = async (date) => {
    const target = toZonedDayjs(date);
    const ymd = formatNeisDate(target);
    const rows = await getMeals(ymd, ymd);

    if (!rows.length) {
        return `${formatDisplayDate(target)} 급식 정보가 없습니다.`;
    }

    const meal = rows[0];
    const dishes = cleanMealText(meal.DDISH_NM);
    const calories = meal.CAL_INFO ? `\n칼로리: ${meal.CAL_INFO}` : "";

    return `${formatDisplayDate(target)} 급식\n${dishes}${calories}`;
};

export const buildTimetableMessage = async (date) => {
    const { academicYear, semester, target } = computeAcademicContext(date);
    const ymd = formatNeisDate(target);
    const rows = await getTimetable(ymd, academicYear, semester);

    if (!rows.length) {
        return `${formatDisplayDate(target)} 시간표 정보가 없습니다.`;
    }

    const ordered = sortByPeriod(rows);
    const lines = ordered.map((row) => `${row.PERIO}교시: ${row.ITRT_CNTNT}`);

    return `${formatDisplayDate(target)} 시간표 (${config.grade}학년 ${
        config.classNum
    }반)\n${lines.join("\n")}`;
};

export const buildScheduleMessage = async (startDate, endDate) => {
    const { academicYear, semester } = computeAcademicContext(startDate);
    const fromYmd = formatNeisDate(startDate);
    const toYmd = formatNeisDate(endDate || startDate);
    const rows = await getSchoolSchedule(
        fromYmd,
        toYmd,
        academicYear,
        semester
    );

    if (!rows.length) {
        return `${formatDisplayRange(
            startDate,
            endDate
        )} 학사 일정이 없습니다.`;
    }

    const items = rows.map((row) => {
        const range = formatDisplayRange(
            row.AA_YMD,
            row.AA_TO_YMD || row.AA_YMD
        );
        return `• ${row.EVENT_NM} (${range})`;
    });

    return `${formatDisplayRange(startDate, endDate)} 학사 일정\n${items.join(
        "\n"
    )}`;
};

export const buildExamMessage = async (startDate, endDate) => {
    const { academicYear, semester } = computeAcademicContext(startDate);
    const fromYmd = formatNeisDate(startDate);
    const toYmd = formatNeisDate(endDate || startDate);
    const scheduleRows = await getSchoolSchedule(
        fromYmd,
        toYmd,
        academicYear,
        semester
    );
    const examsFromSchedule = filterScheduleByKeyword(scheduleRows, [
        "시험",
        "고사",
    ]);

    const custom = await loadCustomEvents();
    const customExams = custom.exams || [];

    const items = [];

    uniqueByEventNameAndDate(examsFromSchedule).forEach((row) => {
        const range = formatDisplayRange(
            row.AA_YMD,
            row.AA_TO_YMD || row.AA_YMD
        );
        items.push(`• ${row.EVENT_NM} (${range})`);
    });

    customExams
        .filter((exam) => {
            const examStart = toZonedDayjs(exam.startDate);
            const examEnd = toZonedDayjs(exam.endDate || exam.startDate);
            const rangeStart = toZonedDayjs(startDate);
            const rangeEnd = toZonedDayjs(endDate || startDate);
            return (
                examStart.isBetween(rangeStart, rangeEnd, "day", "[]") ||
                examEnd.isBetween(rangeStart, rangeEnd, "day", "[]")
            );
        })
        .forEach((exam) => {
            const range = formatDisplayRange(
                exam.startDate,
                exam.endDate || exam.startDate
            );
            items.push(
                `• ${exam.title} (${range})${
                    exam.description ? ` - ${exam.description}` : ""
                }`
            );
        });

    if (!items.length) {
        return `${formatDisplayRange(
            startDate,
            endDate
        )} 시험 일정이 없습니다.`;
    }

    return `${formatDisplayRange(startDate, endDate)} 시험 일정\n${items.join(
        "\n"
    )}`;
};

export const buildAssessmentMessage = async (startDate, endDate) => {
    const { academicYear, semester } = computeAcademicContext(startDate);
    const fromYmd = formatNeisDate(startDate);
    const toYmd = formatNeisDate(endDate || startDate);
    const scheduleRows = await getSchoolSchedule(
        fromYmd,
        toYmd,
        academicYear,
        semester
    );
    const assessmentRows = filterScheduleByKeyword(scheduleRows, ["평가"]);

    const custom = await loadCustomEvents();
    const customAssessments = custom.performanceAssessments || [];

    const items = [];

    uniqueByEventNameAndDate(assessmentRows).forEach((row) => {
        const range = formatDisplayRange(
            row.AA_YMD,
            row.AA_TO_YMD || row.AA_YMD
        );
        items.push(`• ${row.EVENT_NM} (${range})`);
    });

    customAssessments
        .filter((assessment) => {
            const assessmentDate = toZonedDayjs(assessment.date);
            const rangeStart = toZonedDayjs(startDate);
            const rangeEnd = toZonedDayjs(endDate || startDate);
            return assessmentDate.isBetween(rangeStart, rangeEnd, "day", "[]");
        })
        .forEach((assessment) => {
            const range = formatDisplayDate(assessment.date);
            items.push(
                `• ${assessment.title} (${range})${
                    assessment.description ? ` - ${assessment.description}` : ""
                }`
            );
        });

    if (!items.length) {
        return `${formatDisplayRange(
            startDate,
            endDate
        )} 수행평가 일정이 없습니다.`;
    }

    return `${formatDisplayRange(
        startDate,
        endDate
    )} 수행평가 일정\n${items.join("\n")}`;
};

export const buildHelpMessage = () => {
    const features = [
        "오늘 급식 알려줘",
        "이번 주 학사일정 알려줘",
        "내일 시간표 알려줘",
        "다음 시험 일정 알려줘",
        "다가오는 수행평가 알려줘",
    ];

    return `카카오톡에서 사용할 수 있는 예시 질문입니다:\n${features
        .map((feature) => `• ${feature}`)
        .join(
            "\n"
        )}\n원하는 날짜가 있다면 "2025년 5월 3일 급식"처럼 말해보세요.`;
};
