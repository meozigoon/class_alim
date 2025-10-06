import app from "../src/app.js";

export const config = {
    api: {
        bodyParser: false,
    },
};

export default (req, res) => {
    const queryStringIndex = req.url.indexOf("?");
    req.url =
        queryStringIndex >= 0
            ? `/health${req.url.slice(queryStringIndex)}`
            : "/health";
    return app(req, res);
};
