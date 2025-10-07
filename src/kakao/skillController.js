import {
    getMealsByDate,
    getMonthlySchedule,
    getClassTimetableByDate,
} from "../services/neisService.js";
import { getPerformanceAssessments } from "../services/assessmentService.js";
import { getUpcomingExam } from "../services/examDdayService.js";
import { getUpcomingDday } from "../services/ddayService.js";
import { getAllergyListText } from "../services/allergyService.js";
import {
    formatToKoreanLongDate,
    formatToKoreanShortDate,
    formatToNeisDate,
    getKstDateByOffset,
    getKstToday,
    parseFlexibleDate,
} from "../utils/date.js";
import { buildSimpleTextResponse } from "./responseBuilder.js";

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
            const extras = [lesson.teacher || null].filter(Boolean).join(" · ");

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
            `학교 급식 알레르기 표시 번호 목록입니다.\n\n${allergyText}`
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
    return buildSimpleTextResponse(text);
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
    return buildSimpleTextResponse(text);
};

const handleSchedule = async () => {
    const today = getKstToday();
    const endDate = getKstDateByOffset(6);
    const startKey = formatToNeisDate(today);
    const endKey = formatToNeisDate(endDate);
    const schedules = await getMonthlySchedule(today, endDate);
    const upcomingSchedules = schedules
        .filter((schedule) => {
            if (!schedule.date) {
                return false;
            }
            return schedule.date >= startKey && schedule.date <= endKey;
        })
        .sort((a, b) => a.date.localeCompare(b.date));

    if (!upcomingSchedules.length) {
        return buildSimpleTextResponse(
            `${formatToKoreanShortDate(
                today
            )} 기준으로 향후 7일 학사 일정이 없습니다.`
        );
    }

    const lines = upcomingSchedules
        .map((schedule) => {
            const parsedDate = schedule.date
                ? parseFlexibleDate(schedule.date)
                : null;
            const displayDate = parsedDate
                ? formatToKoreanShortDate(parsedDate)
                : schedule.date;
            const grade = schedule.grade ? ` (${schedule.grade})` : "";
            const detail = schedule.description
                ? `\n  - ${schedule.description}`
                : "";
            return `${displayDate} : ${
                schedule.title || "학사 일정"
            }${grade}${detail}`;
        })
        .join("\n\n");

    return buildSimpleTextResponse(
        `오늘 포함 향후 7일 학사 일정입니다.\n\n${lines}`
    );
};

const handleAssessments = async () => {
    const assessments = await getPerformanceAssessments();

    if (!assessments.length) {
        return buildSimpleTextResponse("등록된 수행평가 일정이 없습니다.");
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

    return buildSimpleTextResponse(`수행평가 일정입니다.\n\n${lines}`);
};

const handleDday = async () => {
    const upcoming = getUpcomingDday();
    if (!upcoming) {
        return buildSimpleTextResponse("앞으로 남은 디데이가 없습니다.");
    }

    const description = upcoming.description ? `\n${upcoming.description}` : "";
    const text = `${upcoming.label} ${upcoming.title}\n${upcoming.displayDate}${description}`;
    return buildSimpleTextResponse(text);
};

const handleExamDday = () => {
    const upcoming = getUpcomingExam();
    if (!upcoming) {
        return buildSimpleTextResponse("앞으로 남은 시험 일정이 없습니다.");
    }
    return buildSimpleTextResponse(`${upcoming.title} D-${upcoming.daysLeft}`);
};

const DEFAULT_HANDLER = () =>
    buildSimpleTextResponse(
        "요청을 이해하지 못했어요. 메시지를 다시 확인해 주세요."
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
        case "exam":
        case "examdday":
        case "examintent":
            return handleExamDday();
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
            if (intentName.includes("exam")) {
                return handleExamDday();
            }
            return DEFAULT_HANDLER();
    }
};
