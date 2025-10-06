import app from "./app.js";
import config from "./config.js";

const port = config.port;

if (!process.env.VERCEL) {
    app.listen(port, () => {
        console.log(`Kakao chatbot server is running on port ${port}`);
    });
}

export default app;
