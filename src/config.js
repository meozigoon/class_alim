import dotenv from "dotenv";

// Load .env only during local development; Vercel injects env vars automatically.
if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}

const getEnv = (key, options = {}) => {
    const value = process.env[key] ?? options.defaultValue;
    if (options.required && (value === undefined || value === "")) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
};

export const neisConfig = {
    apiKey: () => getEnv("NEIS_API_KEY", { required: true }),
    scheduleApiKey: () => getEnv("NEIS_SCHEDULE_API_KEY", { required: true }),
    timetableApiKey: () => getEnv("NEIS_TIMETABLE_API_KEY", { required: true }),
    eduOfficeCode: () => getEnv("NEIS_EDU_OFFICE_CODE", { required: true }),
    schoolCode: () => getEnv("NEIS_SCHOOL_CODE", { required: true }),
    classGrade: () => getEnv("NEIS_CLASS_GRADE", { required: true }),
    className: () => getEnv("NEIS_CLASS_NAME", { required: true }),
};
