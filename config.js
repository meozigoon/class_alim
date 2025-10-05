export const CONFIG = {
    NEIS_KEY: process.env.NEIS_KEY,
    ATPT_OFCDC_SC_CODE: process.env.ATPT_OFCDC_SC_CODE, // 교육청 코드
    SD_SCHUL_CODE: process.env.SD_SCHUL_CODE, // 표준학교코드
    DEFAULT_GRADE: process.env.DEFAULT_GRADE || "1",
    DEFAULT_CLASS_NM: process.env.DEFAULT_CLASS_NM || "1",
    // 구글 시트(웹에 게시 → CSV)의 공개 URL
    EXAM_CSV_URL: process.env.EXAM_CSV_URL, // 시험 일정
    ASSIGNMENT_CSV_URL: process.env.ASSIGNMENT_CSV_URL, // 수행평가 일정
};
