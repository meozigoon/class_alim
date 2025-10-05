export function simpleText(text, quick = []) {
    return {
        version: "2.0",
        template: {
            outputs: [{ simpleText: { text } }],
            quickReplies: quick.map((q) => ({
                action: "message",
                label: q.label,
                messageText: q.messageText,
            })),
        },
    };
}
