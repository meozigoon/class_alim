const buildQuickReply = ({ label, action = "message", messageText }) => ({
    label,
    action,
    messageText: messageText ?? label,
});

export const buildSimpleTextResponse = (text, quickReplies = []) => ({
    version: "2.0",
    template: {
        outputs: [
            {
                simpleText: {
                    text,
                },
            },
        ],
        quickReplies: quickReplies.map(buildQuickReply),
    },
});

export const buildErrorResponse = (message) =>
    buildSimpleTextResponse(message, [
        { label: "도움말", messageText: "도움말" },
        { label: "오늘 급식", messageText: "오늘 급식 알려줘" },
    ]);
