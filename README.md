# KakaoTalk School Assistant Chatbot

카카오톡 챗봇을 통해 학교 일정, 급식, 시간표, 수행평가, 시험 일정을 조회하는 서버입니다. Kakao i 오픈빌더에서 스킬 서버로 연결하여 사용할 수 있습니다.

## 1. 준비 사항

-   Node.js 18 이상
-   Kakao Developers 계정 및 Kakao i 오픈빌더 챗봇 생성 권한
-   NEIS(교육부) OpenAPI KEY (이미 `.env.local`에 설정되어 있다면 그대로 사용)
-   챗봇에서 사용할 학교 기본 정보 (시·도 교육청 코드, 학교 코드, 학년, 반 등)

## 2. 로컬 개발 환경 구성

1. 의존성 설치

    ```bash
    npm install
    ```

2. 환경 변수 설정 (`.env.local` 파일)

    | 변수                 | 설명                                                                                         |
    | -------------------- | -------------------------------------------------------------------------------------------- |
    | `PORT`               | 서버 실행 포트 (기본값 3000)                                                                 |
    | `NEIS_API_KEY`       | NEIS OpenAPI 서비스 키                                                                       |
    | `ATPT_OFCDC_SC_CODE` | 시·도 교육청 코드 (예: 서울=B10)                                                             |
    | `SD_SCHUL_CODE`      | 학교 코드                                                                                    |
    | `SCHOOL_NAME`        | 영문 학교명 (선택)                                                                           |
    | `GRADE`              | 학년 (숫자)                                                                                  |
    | `CLASS_NUM`          | 반 (숫자 또는 문자열)                                                                        |
    | `TIMETABLE_TYPE`     | 시간표 API 종류 (고등학교: `hisTimetable`, 중학교: `misTimetable`, 초등학교: `elsTimetable`) |
    | `CACHE_TTL_SECONDS`  | NEIS 응답 캐시 시간 (초, 기본 600)                                                           |
    | `NEIS_BASE_URL`      | NEIS API 기본 URL (기본 `https://open.neis.go.kr/hub`)                                       |
    | `KAKAO_SKILL_SECRET` | Kakao 오픈빌더 스킬서버 시크릿 (오픈빌더에서 발급 후 입력)                                   |
    | `DEFAULT_TIMEZONE`   | 기본 타임존 (기본 `Asia/Seoul`)                                                              |

3. 로컬 서버 실행

    ```bash
    npm run dev
    ```

    또는 배포 모드로 실행하려면:

    ```bash
    npm start
    ```

4. 헬스 체크

    브라우저 또는 HTTP 클라이언트에서 `http://localhost:3000/health` 확인

## 3. Kakao i 오픈빌더 설정 단계

1. **챗봇 생성**

    - [Kakao i 오픈빌더](https://i.kakao.com/openbuilder) 접속 → 새 챗봇 만들기 → 카카오톡 채널과 연결

2. **스킬 서버 등록**

    - 챗봇 빌더 좌측 메뉴 → **스킬** → **스킬 관리** → **스킬 추가**
    - REST API 선택 후 다음 값 입력
        - **스킬 이름**: 예) `class-alim`
        - **스킬 URL**: 로컬 테스트 시 ngrok 등으로 생성한 HTTPS 주소 + `/kakao`
        - **요청 방식**: `POST`
        - **타임아웃**: 기본값(1000ms 이상 권장 → 3000ms)
    - 스킬 추가 후 발급되는 **시크릿 키**를 `.env.local`의 `KAKAO_SKILL_SECRET`에 입력

3. **블록 구성**

    - 기본 인사 블록을 편집하여 `간단 응답` 대신 `스킬` 사용을 선택하고, 위에서 등록한 스킬을 연결
    - 아래와 같이 기능별 블록을 만들고 각각 스킬 연동

        | 블록 이름     | 액션 이름    | 전달 파라미터 예                               |
        | ------------- | ------------ | ---------------------------------------------- |
        | `급식 안내`   | `meal`       | `date` (sys.date)                              |
        | `시간표 안내` | `timetable`  | `date` (sys.date)                              |
        | `학사 일정`   | `schedule`   | `period` (Values: `week`, `nextWeek`, `month`) |
        | `시험 일정`   | `exam`       | `startDate`, `endDate` (sys.date)              |
        | `수행평가`    | `assessment` | `startDate`, `endDate` (sys.date)              |
        | `도움말`      | `help`       | 파라미터 없음                                  |

4. **시나리오 연결**

    - 사용자 발화 예시를 각 블록에 학습시켜 정확도 향상
    - 예: "오늘 급식 알려줘" → `급식 안내` 블록
    - "다음 시험 일정 알려줘" → `시험 일정` 블록

5. **테스트**

    - 오픈빌더의 테스트 콘솔에서 직접 질문을 입력하여 응답 확인
    - 로컬에서 테스트하는 경우 ngrok 등으로 HTTPS 터널링 필수

6. **검수 및 사용 설정**

    - 실제 서비스 전환 시 카카오 채널과 연결 상태 확인
    - 학사 일정, 급식 데이터가 최신인지 확인하고, 커스텀 수행평가/시험 정보(`data/customEvents.json`)를 갱신

## 4. 데이터 관리 가이드

-   `data/customEvents.json` 파일에서 학교 내부 일정(수행평가, 자체 시험 등)을 관리할 수 있습니다.
-   형식은 아래 예시를 따르면 됩니다.

    ```json
    {
        "performanceAssessments": [
            {
                "title": "수학 수행평가 1차",
                "date": "2025-04-15",
                "description": "미적분 단원 발표"
            }
        ],
        "exams": [
            {
                "title": "1학기 중간고사",
                "startDate": "2025-05-02",
                "endDate": "2025-05-08",
                "description": "전 과목"
            }
        ]
    }
    ```

## 5. Kakao 스킬 응답 구조

서버는 Kakao i 오픈빌더에서 요구하는 2.0 버전 템플릿을 사용하여 아래 형태의 응답을 제공합니다.

```json
{
    "version": "2.0",
    "template": {
        "outputs": [
            {
                "simpleText": {
                    "text": "응답 내용"
                }
            }
        ],
        "quickReplies": [
            {
                "label": "오늘 급식",
                "action": "message",
                "messageText": "오늘 급식 알려줘"
            }
        ]
    }
}
```

## 6. Vercel 배포 가이드

1. **Vercel CLI 설치 및 로그인**

    ```bash
    npm install -g vercel
    vercel login
    ```

2. **프로젝트 연결**

    ```bash
    vercel link
    ```

    - 새 프로젝트를 만들거나 기존 프로젝트에 연결합니다.

3. **환경 변수 등록**

    필수 키는 `.env.local`과 동일합니다. 환경마다 아래 명령을 실행하여 값을 입력합니다.

    ```bash
    vercel env add NEIS_API_KEY
    vercel env add ATPT_OFCDC_SC_CODE
    vercel env add SD_SCHUL_CODE
    vercel env add SCHOOL_NAME
    vercel env add GRADE
    vercel env add CLASS_NUM
    vercel env add TIMETABLE_TYPE
    vercel env add CACHE_TTL_SECONDS
    vercel env add NEIS_BASE_URL
    vercel env add KAKAO_SKILL_SECRET
    vercel env add DEFAULT_TIMEZONE
    ```

    필요하면 `vercel env add PORT`로 포트를 지정할 수 있지만, Vercel에서는 무시됩니다.

4. **배포 실행**

    ```bash
    vercel        # 프리뷰 배포
    vercel --prod # 실서비스 배포
    ```

    - 배포가 완료되면 기본 도메인이 `https://<project>.vercel.app` 형태로 생성됩니다.
    - `vercel.json` 설정 덕분에 `/kakao`와 `/health` 경로가 그대로 동작합니다.

5. **스킬 URL 교체**

    - Kakao i 오픈빌더 스킬 URL을 `https://<project>.vercel.app/kakao`로 변경합니다.
    - 헬스 체크는 `https://<project>.vercel.app/health`에서 확인할 수 있습니다.

6. **로그 확인**

    ```bash
    vercel logs --since=1h
    ```

    - 배포 후 오류가 발생하면 이 명령으로 서버리스 함수 로그를 확인하세요.

## 7. 배포 팁

-   학교 내부 서버 또는 다른 클라우드(예: Render, Railway, AWS, Heroku 등)에도 동일한 앱을 배포할 수 있습니다.
-   HTTPS 필수 (오픈빌더는 HTTPS만 허용)
-   배포 후에도 `.env` 값과 `data/customEvents.json`을 주기적으로 업데이트

## 8. 트러블슈팅

| 증상                      | 확인 사항                                                      |
| ------------------------- | -------------------------------------------------------------- |
| 급식/시간표가 나오지 않음 | NEIS API 키, 학교 코드, 학년/반, 시간표 API 유형을 확인        |
| 401 Unauthorized          | 오픈빌더 스킬 시크릿(`KAKAO_SKILL_SECRET`)이 일치하는지 확인   |
| 응답 지연                 | NEIS API 호출 속도 → 캐시 TTL 조정, 서버 사양 확인             |
| 커스텀 일정 미표시        | `data/customEvents.json` 형식 확인, 날짜 형식(YYYY-MM-DD) 확인 |

---

필요에 따라 의도를 추가하거나, Kakao i 오픈빌더의 `슬롯`을 사용하여 사용자 입력을 세분화할 수 있습니다. 더 고도화된 기능(알림 전송, 사용자별 데이터 저장 등)을 원하면 카카오톡 채널 관리자 센터와 DB 연동을 추가로 구현하세요.
