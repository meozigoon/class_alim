import crypto from "crypto";

import config from "../config.js";
import {
    buildAssessmentMessage,
    buildExamMessage,
    buildHelpMessage,
    buildMealMessage,
    buildScheduleMessage,
    buildTimetableMessage,
} from "../services/schoolInfoService.js";
import {
    buildErrorResponse,
    buildSimpleTextResponse,
} from "./responseBuilder.js";
import { toZonedDayjs } from "../utils/date.js";

const extractValue = (source, keys = []) => {
    for (const key of keys) {
        if (source?.[key]) {
            return source[key];
        }
    }
    return undefined;
};

const parseDateParam = (action) => {
    const direct = extractValue(action?.params, ["date", "day", "targetDate"]);
    if (direct) {
        return toZonedDayjs(direct);
    }

    const detailed = extractValue(action?.detailParams, [
        "date",
        "sys_date",
        "targetDate",
    ]);

    if (detailed?.value) {
        return toZonedDayjs(detailed.value);
    }

    if (detailed?.origin) {
        return toZonedDayjs(detailed.origin);
    }

    return null;
};

const parseRangeParams = (action) => {
    const startDetail = extractValue(action?.detailParams, ["startDate"]);
    const endDetail = extractValue(action?.detailParams, ["endDate"]);

    const start = extractValue(action?.params, ["startDate"]);
    const end = extractValue(action?.params, ["endDate"]);

    return {
        start: start
            ? toZonedDayjs(start)
            : startDetail?.value
            ? toZonedDayjs(startDetail.value)
            : null,
        end: end
            ? toZonedDayjs(end)
            : endDetail?.value
            ? toZonedDayjs(endDetail.value)
            : null,
    };
};

const detectPeriod = (action, utterance = "") => {
    const periodParam = extractValue(action?.params, ["period"]);
    const detailPeriod = extractValue(action?.detailParams, ["period"]);
    const periodValue = periodParam || detailPeriod?.value;

    if (periodValue) {
        return String(periodValue).toLowerCase();
    }

    if (utterance.includes("다음 주") || utterance.includes("다음주")) {
        return "nextweek";
    }

    if (utterance.includes("이번 주") || utterance.includes("이번주")) {
        return "week";
    }

    if (utterance.includes("다음 달") || utterance.includes("다음달")) {
        return "nextmonth";
    }

    if (utterance.includes("이번 달") || utterance.includes("이번달")) {
        return "month";
    }

    if (utterance.includes("내일")) {
        return "tomorrow";
    }

    if (utterance.includes("모레")) {
        return "day2";
    }

    return "day";
};

const toMonday = (date) => date.startOf("week").add(1, "day");

const resolveDateRange = (action, utterance = "") => {
    const base = parseDateParam(action) || toZonedDayjs();
    const { start, end } = parseRangeParams(action);

    if (start && end) {
        return { startDate: start, endDate: end };
    }

    if (start && !end) {
        return { startDate: start, endDate: start };
    }

    const period = detectPeriod(action, utterance);

    switch (period) {
        case "tomorrow":
            return {
                startDate: base.add(1, "day"),
                endDate: base.add(1, "day"),
            };
        case "day2":
            return {
                startDate: base.add(2, "day"),
                endDate: base.add(2, "day"),
            };
        case "nextweek": {
            const nextMonday = toMonday(base).add(7, "day");
            return { startDate: nextMonday, endDate: nextMonday.add(6, "day") };
        }
        case "week": {
            const monday = toMonday(base);
            return { startDate: monday, endDate: monday.add(6, "day") };
        }
        case "nextmonth": {
            const first = base.add(1, "month").startOf("month");
            return { startDate: first, endDate: first.endOf("month") };
        }
        case "month": {
            const first = base.startOf("month");
            return { startDate: first, endDate: first.endOf("month") };
        }
        default:
            return { startDate: base, endDate: base };
    }
};

const verifySignature = (req) => {
    if (!config.kakaoSkillSecret) {
        return true;
    }

    const signature = req.headers["x-kakao-signature"];
    if (!signature) {
        return false;
    }

    const rawBody = req.rawBody || "";
    const computed = crypto
        .createHmac("sha256", config.kakaoSkillSecret)
        .update(rawBody)
        .digest("base64");

    return signature === computed;
};

const buildQuickReplies = (actionName) => {
    const baseReplies = [
        { label: "도움말", messageText: "도움말" },
        { label: "오늘 급식", messageText: "오늘 급식 알려줘" },
        { label: "시간표", messageText: "오늘 시간표 알려줘" },
    ];

    switch (actionName) {
        case "meal":
            return [
                { label: "오늘 급식", messageText: "오늘 급식 알려줘" },
                { label: "내일 급식", messageText: "내일 급식 알려줘" },
                { label: "학사일정", messageText: "이번 주 학사일정 알려줘" },
            ];
        case "schedule":
            return [
                {
                    label: "이번 주 일정",
                    messageText: "이번 주 학사일정 알려줘",
                },
                {
                    label: "다음 주 일정",
                    messageText: "다음 주 학사일정 알려줘",
                },
                { label: "시험 일정", messageText: "다음 시험 일정 알려줘" },
            ];
        case "timetable":
            return [
                { label: "오늘 시간표", messageText: "오늘 시간표 알려줘" },
                { label: "내일 시간표", messageText: "내일 시간표 알려줘" },
                { label: "학사일정", messageText: "이번 주 학사일정 알려줘" },
            ];
        case "exam":
            return [
                { label: "시험 일정", messageText: "다음 시험 일정 알려줘" },
                { label: "수행평가", messageText: "다가오는 수행평가 알려줘" },
                { label: "시간표", messageText: "오늘 시간표 알려줘" },
            ];
        case "assessment":
            return [
                { label: "수행평가", messageText: "다가오는 수행평가 알려줘" },
                { label: "시험 일정", messageText: "다음 시험 일정 알려줘" },
                { label: "급식", messageText: "오늘 급식 알려줘" },
            ];
        default:
            return baseReplies;
    }
};

export const handleKakaoSkill = async (req, res) => {
    try {
        if (!verifySignature(req)) {
            return res
                .status(401)
                .json(buildErrorResponse("서명 검증에 실패했습니다."));
        }

        const actionNameRaw =
            req.body?.action?.name || req.body?.intent?.name || "help";
        const actionName = String(actionNameRaw).toLowerCase();
        const utterance = req.body?.userRequest?.utterance || "";

        const { startDate, endDate } = resolveDateRange(
            req.body?.action,
            utterance
        );

        let text;
        switch (actionName) {
            case "meal":
            case "meal_today":
                text = await buildMealMessage(startDate);
                break;
            case "timetable":
                text = await buildTimetableMessage(startDate);
                break;
            case "schedule":
                text = await buildScheduleMessage(startDate, endDate);
                break;
            case "exam":
                text = await buildExamMessage(startDate, endDate);
                break;
            case "assessment":
                text = await buildAssessmentMessage(startDate, endDate);
                break;
            default:
                text = buildHelpMessage();
                break;
        }

        const quickReplies = buildQuickReplies(actionName);
        return res.json(buildSimpleTextResponse(text, quickReplies));
    } catch (error) {
        console.error("[Kakao Skill] Error", error);
        return res.json(
            buildErrorResponse(
                "정보를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요."
            )
        );
    }
};
