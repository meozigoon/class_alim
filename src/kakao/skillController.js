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
import {
    buildSimpleTextResponse,
    buildTextCardCarouselResponse,
} from "./responseBuilder.js";

const toSnakeCase = (key) =>
    key.replace(/([A-Z])/g, (match) => `_${match.toLowerCase()}`);

const getParamValue = (params, key) => {
    if (!params) {
        return undefined;
    }
    const snakeKey = toSnakeCase(key);
    return params[key] ?? params[snakeKey];
};

const parseDateParam = (params, candidates = []) => {
    for (const key of candidates) {
        const value = getParamValue(params, key);
        if (!value) {
            continue;
        }
        const parsed = parseFlexibleDate(value);
        if (parsed && !Number.isNaN(parsed.getTime())) {
            parsed.setHours(0, 0, 0, 0);
            return parsed;
        }
    }
    return null;
};

const MEAL_SECTION_ORDER = [
    { code: "1", label: "아침", synonyms: ["조식", "아침"] },
    { code: "2", label: "점심", synonyms: ["중식", "점심"] },
    { code: "3", label: "석식", synonyms: ["석식", "저녁"] },
];

const buildMealSectionContent = (meal) => {
    if (!meal) {
        return "등록된 메뉴가 없습니다.";
    }

    const dishes = (meal.dishes ?? [])
        .map((dish) => `• ${dish.name}`)
        .join("\n");

    const dishesOrFallback = dishes || "• 등록된 메뉴가 없습니다.";
    const extras = [meal.calorie].filter(Boolean).join("\n");

    return [dishesOrFallback, extras].filter(Boolean).join("\n\n");
};

const buildMealTextCards = (meals) => {
    const remainingMeals = [...meals];
    const cards = [];

    for (let i = 0; i < MEAL_SECTION_ORDER.length; i += 1) {
        const section = MEAL_SECTION_ORDER[i];
        const index = remainingMeals.findIndex((meal) => {
            const mealCode = meal.mealCode ? String(meal.mealCode) : null;
            const mealName = (meal.mealName || "").trim();
            return (
                (mealCode && mealCode === section.code) ||
                (mealName && section.synonyms.includes(mealName))
            );
        });

        const matchedMeal =
            index === -1 ? null : remainingMeals.splice(index, 1)[0];
        const title = `${section.label} 급식`;
        const description = buildMealSectionContent(matchedMeal);

        cards.push({
            title,
            description,
        });
    }

    if (remainingMeals.length) {
        const extras = remainingMeals
            .map((meal) => {
                const title = meal.mealName || `기타(${meal.mealCode ?? "?"})`;
                return [`${title}`, buildMealSectionContent(meal)]
                    .filter(Boolean)
                    .join("\n\n");
            })
            .join("\n\n");

        const lastIndex = cards.length - 1;
        if (lastIndex >= 0) {
            cards[lastIndex] = {
                ...cards[lastIndex],
                description: [cards[lastIndex].description, "추가 메뉴", extras]
                    .filter(Boolean)
                    .join("\n\n"),
            };
        } else {
            const extrasDescription = extras || "등록된 메뉴가 없습니다.";
            cards.push({
                title: "추가 메뉴",
                description: extrasDescription,
            });
        }
    }

    return cards;
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

const handleMeal = async (mealType, params) => {
    if (mealType === "allergy") {
        const allergyText = getAllergyListText();
        return buildSimpleTextResponse(
            `학교 급식 알레르기 표시 번호 목록입니다.\n\n${allergyText}`
        );
    }

    const explicitDate = parseDateParam(params, [
        "mealDate",
        "targetDate",
        "date",
    ]);
    let targetDate;

    if (explicitDate) {
        targetDate = explicitDate;
    } else {
        const offset = mealType === "tomorrow" ? 1 : 0;
        targetDate = getKstDateByOffset(offset);
    }

    const meals = await getMealsByDate(targetDate);
    const cards = buildMealTextCards(meals);

    return buildTextCardCarouselResponse(
        cards.length
            ? cards
            : [
                  {
                      title: "급식 정보",
                      description: "등록된 메뉴가 없습니다.",
                  },
              ]
    );
};

const handleTimetable = async (timetableType, params) => {
    const explicitDate = parseDateParam(params, [
        "timetableDate",
        "targetDate",
        "date",
    ]);
    let targetDate;
    let label;

    if (explicitDate) {
        targetDate = explicitDate;
        label = "시간표";
    } else {
        const offset = timetableType === "tomorrow" ? 1 : 0;
        targetDate = getKstDateByOffset(offset);
        label = offset === 0 ? "오늘 시간표" : "내일 시간표";
    }

    const lessons = await getClassTimetableByDate(targetDate);
    const text = formatTimetableText(label, targetDate, lessons);
    return buildSimpleTextResponse(text);
};

const handleSchedule = async (params) => {
    const explicitDate = parseDateParam(params, [
        "scheduleDate",
        "targetDate",
        "date",
    ]);
    if (explicitDate) {
        const schedules = await getMonthlySchedule(explicitDate, explicitDate);
        const targetKey = formatToNeisDate(explicitDate);
        const sameDay = schedules.filter(
            (schedule) => schedule.date === targetKey
        );

        if (!sameDay.length) {
            return buildSimpleTextResponse(
                `${formatToKoreanShortDate(explicitDate)} 학사 일정이 없습니다.`
            );
        }

        const formatScheduleSummary = (schedule) => {
            const title = schedule.title || "학사 일정";
            const detail = schedule.description
                ? ` - ${schedule.description}`
                : "";
            return `${title}${detail}`;
        };

        const summary = sameDay.map(formatScheduleSummary).join(", ");

        return buildSimpleTextResponse(
            `${formatToKoreanShortDate(
                explicitDate
            )} 학사 일정입니다.\n\n${summary}`
        );
    }

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

    const groupedByDate = upcomingSchedules.reduce((acc, schedule) => {
        if (!schedule.date) {
            return acc;
        }
        if (!acc.has(schedule.date)) {
            acc.set(schedule.date, []);
        }
        acc.get(schedule.date).push(schedule);
        return acc;
    }, new Map());

    const lines = Array.from(groupedByDate.entries())
        .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
        .map(([dateKey, items]) => {
            const parsedDate = parseFlexibleDate(dateKey);
            const displayDate = parsedDate
                ? formatToKoreanShortDate(parsedDate)
                : dateKey;
            const summaries = items
                .map((schedule) => {
                    const title = schedule.title || "학사 일정";
                    const detail = schedule.description
                        ? ` - ${schedule.description}`
                        : "";
                    return `${title}${detail}`;
                })
                .join(", ");
            return `${displayDate} : ${summaries}`;
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
        "요청을 이해하지 못했습니다. 메시지를 다시 확인해 주세요."
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
                    : "today",
                actionParams
            );
        case "timetable":
        case "timetableintent":
            return handleTimetable(
                ["today", "tomorrow"].includes(timetableType)
                    ? timetableType
                    : "today",
                actionParams
            );
        case "schedule":
        case "scheduleintent":
            return handleSchedule(actionParams);
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
                return handleMeal(mealType, actionParams);
            }
            if (["today", "tomorrow"].includes(timetableType)) {
                return handleTimetable(timetableType, actionParams);
            }
            if (intentName.includes("meal")) {
                return handleMeal(
                    ["today", "tomorrow", "allergy"].includes(mealType)
                        ? mealType
                        : "today",
                    actionParams
                );
            }
            if (intentName.includes("timetable")) {
                return handleTimetable(
                    ["today", "tomorrow"].includes(timetableType)
                        ? timetableType
                        : "today",
                    actionParams
                );
            }
            if (intentName.includes("schedule")) {
                return handleSchedule(actionParams);
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
