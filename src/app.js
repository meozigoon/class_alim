import express from "express";

import { handleKakaoSkill } from "./kakao/skillController.js";
import { buildErrorResponse } from "./kakao/responseBuilder.js";

const app = express();

app.use(
    express.json({
        limit: "1mb",
        verify: (req, _res, buf) => {
            req.rawBody = buf.toString();
        },
    })
);

app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/kakao", handleKakaoSkill);

app.use((err, _req, res, _next) => {
    console.error("[Express] Unhandled error", err);
    res.status(500).json(buildErrorResponse("서버 오류가 발생했습니다."));
});

export default app;
