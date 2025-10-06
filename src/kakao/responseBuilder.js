export const buildQuickReplies = (items = []) =>
    items.filter(Boolean).map((item) => {
        const action = item.action ?? "message";
        const reply = {
            label: item.label,
            action,
        };

        if (action === "block" && item.blockId) {
            reply.blockId = item.blockId;
        }

        if (item.messageText) {
            reply.messageText = item.messageText;
        } else if (action === "message") {
            reply.messageText = item.label;
        }

        if (item.extra) {
            reply.extra = item.extra;
        }

        return reply;
    });

export const buildSimpleTextResponse = (text, quickReplies = []) => {
    const template = {
        outputs: [
            {
                simpleText: {
                    text,
                },
            },
        ],
    };

    if (quickReplies.length > 0) {
        template.quickReplies = quickReplies;
    }

    return {
        version: "2.0",
        template,
    };
};

export const buildErrorResponse = (message) =>
    buildSimpleTextResponse(
        `요청을 처리하는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.\n(${message})`
    );
