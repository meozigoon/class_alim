export const buildQuickReplies = (items = []) =>
    items.filter(Boolean).map((item) => {
        const reply = {
            label: item.label,
            action: item.action ?? "message",
        };

        if (reply.action === "block" && item.blockId) {
            reply.blockId = item.blockId;
            reply.messageText = item.messageText ?? item.label;
        } else {
            reply.messageText = item.messageText ?? item.label;
        }

        if (item.extra) {
            reply.extra = item.extra;
        }

        return reply;
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
        quickReplies,
    },
});

export const buildErrorResponse = (message) =>
    buildSimpleTextResponse(
        `요청을 처리하는 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.\n(${message})`
    );
