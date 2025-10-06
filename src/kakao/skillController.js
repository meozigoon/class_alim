import {
    getMealsByDate,
    getMonthlySchedule,
    getClassTimetableByDate,
} from "../services/neisService.js";
import { getPerformanceAssessments } from "../services/assessmentService.js";
import { getUpcomingDday } from "../services/ddayService.js";
import { getAllergyListText } from "../services/allergyService.js";
import {
    formatToKoreanLongDate,
    formatToKoreanShortDate,
    getKstDateByOffset,
    getKstToday,
    parseFlexibleDate,
} from "../utils/date.js";
import {
    buildQuickReplies,
    buildSimpleTextResponse,
} from "./responseBuilder.js";

const QUICK_REPLY_ITEMS = [
    { label: "오늘 급식", messageText: "오늘 급식 알려줘" },
    { label: "내일 급식", messageText: "내일 급식 알려줘" },
    { label: "오늘 시간표", messageText: "오늘 시간표 알려줘" },
    { label: "내일 시간표", messageText: "내일 시간표 알려줘" },
    { label: "학사 일정", messageText: "학사 일정 알려줘" },
    { label: "수행평가", messageText: "수행평가 일정 알려줘" },
    { label: "디데이", messageText: "디데이 알려줘" },
];

const formatMealText = (mealTypeText, targetDate, meals) => {
    if (!meals.length) {
        return `${formatToKoreanLongDate(targetDate)} 급식 정보가 없습니다.`;
    }

    const sections = meals.map((meal) => {
        const dishes = meal.dishes
            .map((dish) => {
                const allergy = dish.allergyCodes.length
                    ? ` (알레르기: ${dish.allergyCodes.join(", ")})`
                    : "";
                return `• ${dish.name}${allergy}`;
            })
            .join("\n");

        const extras = [meal.calorie, meal.origin].filter(Boolean).join("\n");

        return [`【${meal.mealName}】`, dishes, extras ? `\n${extras}` : null]
            .filter(Boolean)
            .join("\n");
    });

    return [
        `${mealTypeText} (${formatToKoreanLongDate(targetDate)})`,
        ...sections,
    ].join("\n\n");
};

const formatTimetableText = (label, targetDate, lessons) => {
    if (!lessons.length) {
        return `${formatToKoreanLongDate(targetDate)} 시간표 정보가 없습니다.`;
    }

    const lines = lessons
        .map((lesson) => {
            const extras = [
                lesson.classroom ? `@${lesson.classroom}` : null,
                lesson.teacher || null,
            ]
                .filter(Boolean)
                .join(" · ");

            return `${lesson.period}교시 ${lesson.subject}${
                extras ? ` (${extras})` : ""
            }`;
        })
        .join("\n");

    return [`${label} (${formatToKoreanLongDate(targetDate)})`, lines].join(
        "\n\n"
    );
};

const handleMeal = async (mealType) => {
    if (mealType === "allergy") {
        const allergyText = getAllergyListText();
        return buildSimpleTextResponse(
            `학교 급식 알레르기 표시 번호 목록입니다.\n\n${allergyText}`,
            buildQuickReplies(QUICK_REPLY_ITEMS)
        );
    }

    const offset = mealType === "tomorrow" ? 1 : 0;
    const targetDate = getKstDateByOffset(offset);
    const meals = await getMealsByDate(targetDate);
    const text = formatMealText(
        offset === 0 ? "오늘 급식" : "내일 급식",
        targetDate,
        meals
    );
    return buildSimpleTextResponse(text, buildQuickReplies(QUICK_REPLY_ITEMS));
};

const handleTimetable = async (timetableType) => {
    const offset = timetableType === "tomorrow" ? 1 : 0;
    const targetDate = getKstDateByOffset(offset);
    const lessons = await getClassTimetableByDate(targetDate);
    const text = formatTimetableText(
        offset === 0 ? "오늘 시간표" : "내일 시간표",
        targetDate,
        lessons
    );
    return buildSimpleTextResponse(text, buildQuickReplies(QUICK_REPLY_ITEMS));
};

const handleSchedule = async () => {
    const today = getKstToday();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const schedules = await getMonthlySchedule(firstDay, lastDay);

    if (!schedules.length) {
        return buildSimpleTextResponse(
            `${formatToKoreanShortDate(
                today
            )} 기준으로 등록된 이번 달 학사 일정이 없습니다.`,
            buildQuickReplies(QUICK_REPLY_ITEMS)
        );
    }

    const lines = schedules
        .map((schedule) => {
            const parsedDate = schedule.date
                ? parseFlexibleDate(schedule.date)
                : null;
            const displayDate = formatToKoreanShortDate(parsedDate ?? today);
            const grade = schedule.grade ? ` (${schedule.grade})` : "";
            const detail = schedule.description
                ? `\n  - ${schedule.description}`
                : "";
            return {
                sortKey: parsedDate?.getTime() ?? Number.MAX_SAFE_INTEGER,
                text: `${displayDate} : ${
                    schedule.title || "학사 일정"
                }${grade}${detail}`,
            };
        })
        .sort((a, b) => a.sortKey - b.sortKey)
        .map((item) => item.text)
        .join("\n\n");

    return buildSimpleTextResponse(
        `이번 달 학사 일정입니다.\n\n${lines}`,
        buildQuickReplies(QUICK_REPLY_ITEMS)
    );
};

const handleAssessments = async () => {
    const assessments = await getPerformanceAssessments();

    if (!assessments.length) {
        return buildSimpleTextResponse(
            "등록된 수행평가 일정이 없습니다. data/performanceAssessments.json 파일을 확인해 주세요.",
            buildQuickReplies(QUICK_REPLY_ITEMS)
        );
    }

    const lines = assessments
        .map((item) => {
            const subject = item.subject ? ` [${item.subject}]` : "";
            const description = item.description
                ? `\n  - ${item.description}`
                : "";
            return `${item.displayDate}${subject} : ${item.title}${description}`;
        })
        .join("\n\n");

    return buildSimpleTextResponse(
        `수행평가 일정입니다.\n\n${lines}`,
        buildQuickReplies(QUICK_REPLY_ITEMS)
    );
};

const handleDday = async () => {
    const upcoming = getUpcomingDday();
    if (!upcoming) {
        return buildSimpleTextResponse(
            "앞으로 남은 디데이가 없어요. data/dday.json 파일을 확인해 주세요.",
            buildQuickReplies(QUICK_REPLY_ITEMS)
        );
    }

    const description = upcoming.description ? `\n${upcoming.description}` : "";
    const text = `${upcoming.label} ${upcoming.title}\n${upcoming.displayDate}${description}`;
    return buildSimpleTextResponse(text, buildQuickReplies(QUICK_REPLY_ITEMS));
};

const DEFAULT_HANDLER = () =>
    buildSimpleTextResponse(
        "요청을 이해하지 못했어요. 오늘/내일 급식, 오늘/내일 시간표, 학사 일정, 수행평가 일정, 디데이를 요청해 주세요.",
        buildQuickReplies(QUICK_REPLY_ITEMS)
    );

export const handleSkillRequest = async (body) => {
    const actionParams = body?.action?.params ?? {};
    const mealType = (
        actionParams.mealType ||
        actionParams["meal_type"] ||
        ""
    ).toLowerCase();
    const timetableType = (
        actionParams.timetableType ||
        actionParams["timetable_type"] ||
        ""
    ).toLowerCase();
    const intentName = (body?.intent?.name ?? "").toLowerCase();
    const skillType = (
        actionParams.skill ||
        actionParams["skill_type"] ||
        intentName
    ).toLowerCase();

    switch (skillType) {
        case "meal":
        case "mealintent":
            return handleMeal(
                ["today", "tomorrow", "allergy"].includes(mealType)
                    ? mealType
                    : "today"
            );
        case "timetable":
        case "timetableintent":
            return handleTimetable(
                ["today", "tomorrow"].includes(timetableType)
                    ? timetableType
                    : "today"
            );
        case "schedule":
        case "scheduleintent":
            return handleSchedule();
        case "assessment":
        case "assessmentintent":
            return handleAssessments();
        case "dday":
        case "ddayintent":
            return handleDday();
        default:
            if (["today", "tomorrow", "allergy"].includes(mealType)) {
                return handleMeal(mealType);
            }
            if (["today", "tomorrow"].includes(timetableType)) {
                return handleTimetable(timetableType);
            }
            if (intentName.includes("meal")) {
                return handleMeal(
                    ["today", "tomorrow", "allergy"].includes(mealType)
                        ? mealType
                        : "today"
                );
            }
            if (intentName.includes("timetable")) {
                return handleTimetable(
                    ["today", "tomorrow"].includes(timetableType)
                        ? timetableType
                        : "today"
                );
            }
            if (intentName.includes("schedule")) {
                return handleSchedule();
            }
            if (intentName.includes("assessment")) {
                return handleAssessments();
            }
            if (intentName.includes("dday")) {
                return handleDday();
            }
            return DEFAULT_HANDLER();
    }
};
