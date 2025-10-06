export const ALLERGY_ITEMS = [
    { code: 1, name: "난류(계란)" },
    { code: 2, name: "우유" },
    { code: 3, name: "메밀" },
    { code: 4, name: "땅콩" },
    { code: 5, name: "대두" },
    { code: 6, name: "밀" },
    { code: 7, name: "고등어" },
    { code: 8, name: "게" },
    { code: 9, name: "새우" },
    { code: 10, name: "돼지고기" },
    { code: 11, name: "복숭아" },
    { code: 12, name: "토마토" },
    { code: 13, name: "아황산류(10mg/kg 이상)" },
    { code: 14, name: "호두" },
    { code: 15, name: "닭고기" },
    { code: 16, name: "쇠고기" },
    { code: 17, name: "오징어" },
    { code: 18, name: "조개류(굴, 전복, 홍합 등)" },
    { code: 19, name: "잣" },
];

export const getAllergyListText = () =>
    ALLERGY_ITEMS.map((item) => `${item.code}. ${item.name}`).join("\n");
