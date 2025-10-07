export const buildSimpleTextResponse = (text) => ({
    version: "2.0",
    template: {
        outputs: [
            {
                simpleText: {
                    text,
                },
            },
        ],
    },
});

export const buildSimpleTextsResponse = (texts) => ({
    version: "2.0",
    template: {
        outputs: texts.map((text) => ({
            simpleText: {
                text,
            },
        })),
    },
});

export const buildBasicCardCarouselResponse = (items) => ({
    version: "2.0",
    template: {
        outputs: [
            {
                carousel: {
                    type: "basicCard",
                    items,
                },
            },
        ],
    },
});

export const buildTextCardResponse = (cards) => ({
    version: "2.0",
    template: {
        outputs: cards.map((card) => ({
            textCard: {
                title: card.title || "",
                description: card.description || "",
                buttons: card.buttons || [],
            },
        })),
    },
});

export const buildErrorResponse = (message) =>
    buildSimpleTextResponse(
        `요청을 처리하는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.\n(${message})`
    );
