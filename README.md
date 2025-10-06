# Kakao Class 알림 API

카카오 챗봇 스킬에서 사용할 급식, 학사 일정, 수행평가, 디데이 정보를 제공하는 서버리스 API입니다. Vercel에 배포하여 카카오 i 오픈빌더와 연동하도록 구성했습니다.

## 기술 스택

-   Node.js 20 (ES Module)
-   Vercel Serverless Functions (`api/kakao.js`)
-   NEIS Open API (급식 · 학사 일정)
-   JSON 설정(`data/dday.json`, `data/performanceAssessments.json`) 기반 일정 관리

## 프로젝트 구조

```
api/
  kakao.js                    # 카카오 스킬 웹훅 엔드포인트
src/
  config.js                   # 환경변수 로더
  kakao/
    responseBuilder.js        # 카카오 응답 템플릿 헬퍼
    skillController.js        # 스킬 분기 및 포맷팅 로직
  services/
    allergyService.js         # 알레르기 코드 목록
    assessmentService.js      # 수행평가 JSON 로더
    ddayService.js            # D-Day 계산
    neisService.js            # NEIS API 연동
  utils/
    date.js                   # KST 날짜 유틸리티
data/
  dday.json                   # 디데이 데이터(사용자 수정)
  performanceAssessments.json # 수행평가 데이터(사용자 수정)
.env.example                  # 필수 환경변수 샘플
vercel.json                   # Vercel 설정 (region 등)
```

## 준비 사항

1. **Node.js 20+**, **npm** 설치
2. [`NEIS Open API`](https://open.neis.go.kr/) 발급 키
3. 교육청 코드(`ATPT_OFCDC_SC_CODE`), 학교 코드(`SD_SCHUL_CODE`)
4. 챗봇에서 사용할 **디데이 목록**과 **수행평가 일정**을 `data/*.json` 파일에 입력

### NEIS 코드 확인

1. [NEIS 오픈 API 포털](https://open.neis.go.kr/) → 공통서비스 → 학교기본정보 조회 API 활용
2. `ATPT_OFCDC_SC_CODE` (교육청), `SD_SCHUL_CODE` (학교) 값을 확인
3. 급식/학사 일정 API는 동일한 코드 조합을 사용합니다.

### 수행평가 JSON 편집 (`data/performanceAssessments.json`)

```json
[
    {
        "title": "영어 발표 평가",
        "subject": "영어",
        "date": "2025-06-15",
        "description": "News article presentation"
    }
]
```

-   `date`는 `YYYY-MM-DD` 형식 권장 (유연한 파싱 지원)
-   `subject`는 선택 사항이며, 응답에 `[과목]` 형태로 표기됩니다.
-   `description`은 선택 사항으로 세부 내용을 한 줄 더 보여줍니다.

### D-Day JSON 편집 (`data/dday.json`)

```json
[
    {
        "title": "기말고사",
        "date": "2025-06-10",
        "description": "2학기 기말고사 시작"
    }
]
```

-   오늘 이후 가장 가까운 일정만 `D-?` 형태로 응답합니다.

## 설치 및 로컬 테스트

```bash
npm install
cp .env.example .env # 로컬 테스트 시
# .env에 환경변수 값 채우기
```

### 환경변수

| Key                    | 설명                               |
| ---------------------- | ---------------------------------- |
| `NEIS_API_KEY`         | NEIS 오픈 API 인증키               |
| `NEIS_EDU_OFFICE_CODE` | 교육청 코드 (`ATPT_OFCDC_SC_CODE`) |
| `NEIS_SCHOOL_CODE`     | 학교 코드 (`SD_SCHUL_CODE`)        |

### 로컬 실행

Vercel CLI가 있다면:

```bash
npm install -g vercel
vercel dev
```

-   기본 URL: `http://localhost:3000/api/kakao`
-   Postman / curl 로 테스트할 때는 카카오 오픈빌더 요청 형식을 그대로 사용하세요.

#### 요청 예시

```bash
curl -X POST http://localhost:3000/api/kakao \
  -H "Content-Type: application/json" \
  -d '{
        "intent": { "name": "MealIntent" },
        "action": { "params": { "skill": "meal", "mealType": "today" } }
      }'
```

## 배포 (Vercel)

1. `vercel login`
2. 프로젝트 폴더에서 `vercel` 또는 `vercel --prod`
3. Vercel 대시보드 → `Settings → Environment Variables` 에 아래 값 등록
    - `NEIS_API_KEY`
    - `NEIS_EDU_OFFICE_CODE`
    - `NEIS_SCHOOL_CODE`
4. `vercel env pull` 로컬 동기화(선택)
5. 배포 후 API URL: `https://{project}.vercel.app/api/kakao`

## 카카오 i 오픈빌더 연동 안내

1. [카카오 i 오픈빌더](https://i.kakao.com/)에서 챗봇 프로젝트 생성
2. **스킬** → **스킬 추가** → `스킬 서버` 선택
3. 요청 설정
    - URL: `https://{project}.vercel.app/api/kakao`
    - Method: `POST`
    - Header: `Content-Type: application/json; charset=utf-8`
4. 블록 / 인텐트 구성 시 `스킬 응답`에서 `action.params`를 다음과 같이 지정
    - 급식: `{ "skill": "meal", "mealType": "today" }`
    - 내일 급식: `{ "skill": "meal", "mealType": "tomorrow" }`
    - 알레르기 목록: `{ "skill": "meal", "mealType": "allergy" }`
    - 학사 일정: `{ "skill": "schedule" }`
    - 수행평가 일정: `{ "skill": "assessment" }`
    - 디데이: `{ "skill": "dday" }`
5. 블록의 발화(사용자 입력)에 따라 위 파라미터를 매핑하거나, 커스텀 슬롯을 만들어 연결합니다.
6. 챗봇 테스트 후 배포 → 카카오톡 채널 연결

### 응답 형태 예시

```json
{
    "version": "2.0",
    "template": {
        "outputs": [
            {
                "simpleText": {
                    "text": "오늘 급식 (10월 6일 (월))\n\n【중식】\n• 백미밥\n• 돈육김치찌개 (알레르기: 2, 5, 10)"
                }
            }
        ],
        "quickReplies": [
            {
                "label": "내일 급식",
                "action": "message",
                "messageText": "내일 급식 알려줘"
            }
        ]
    }
}
```

## 참고 및 커스터마이징

-   `src/services/allergyService.js`의 목록은 식품의약품안전처 발표(19개 품목)를 기준으로 했습니다. 학교에서 추가로 사용하는 알레르기 번호가 있다면 직접 확장하세요.
-   수행평가/디데이 JSON 파일은 필요할 때마다 수정 후 재배포(또는 Vercel KV/Edge Config 등)로 확장할 수 있습니다.
-   일정/급식 API 실패 시 에러 메시지를 내려줍니다. 카카오 오픈빌더에서 **재시도** 유도 멘트를 추가하면 좋습니다.
-   Vercel `regions` 를 `icn1`로 설정하여 서울 리전을 기본 사용하도록 구성했습니다.

## 유지보수 Tips

-   학기별 디데이 업데이트: `data/dday.json`
-   수행평가 일정 변경: `data/performanceAssessments.json`
-   NEIS API 호출 제한이 있으므로 다중 호출 시 캐싱을 추가하고 싶다면 `src/services/neisService.js`에 캐시 레이어를 얹어주세요.

행복한 챗봇 개발 되세요!
