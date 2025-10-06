import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const envFiles = [".env.local", ".env"];
envFiles.forEach((file) => {
    const envPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath, override: false });
    }
});

dotenv.config();

const toInt = (value, fallback) => {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};

const config = {
    port: toInt(process.env.PORT, 3000),
    neisApiKey: process.env.NEIS_API_KEY?.trim(),
    educationOfficeCode: process.env.ATPT_OFCDC_SC_CODE?.trim(),
    schoolCode: process.env.SD_SCHUL_CODE?.trim(),
    schoolName: process.env.SCHOOL_NAME?.trim(),
    grade: process.env.GRADE?.trim(),
    classNum: process.env.CLASS_NUM?.trim(),
    timetableType: process.env.TIMETABLE_TYPE?.trim() || "hisTimetable",
    cacheTtlSeconds: toInt(process.env.CACHE_TTL_SECONDS, 600),
    neisBaseUrl:
        process.env.NEIS_BASE_URL?.trim() || "https://open.neis.go.kr/hub",
    kakaoSkillSecret: process.env.KAKAO_SKILL_SECRET?.trim() || "",
    defaultTimezone: process.env.DEFAULT_TIMEZONE?.trim() || "Asia/Seoul",
};

export default config;
