각 레포 특성에 맞게 작성해드릴게요.

---

## pbm-agent-ai-frontend README

# 🦞 PBM Agent AI — Frontend

> PBM Agent AI 자동 결제 시스템의 프론트엔드 레포지토리

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev)
[![Zustand](https://img.shields.io/badge/Zustand-latest-000000?style=flat)](https://zustand-demo.pmnd.rs)
[![Recharts](https://img.shields.io/badge/Recharts-latest-22B5BF?style=flat)](https://recharts.org)

---

## 📌 프로젝트 소개

본 레포지토리는 **PBM Agent AI 자동 결제 시스템**의 프론트엔드 및 Chrome Extension 코드를 포함합니다.

사용자는 React 대시보드에서 자연어로 쇼핑 조건을 설정하고, 유튜버 리뷰 기반 추천 상품을 확인하며, 이미지로 상품을 검색할 수 있습니다. Chrome Extension은 로컬 에이전트로서 실제 쇼핑몰 페이지를 탐색하고 결제를 실행합니다.

🔗 **Backend 레포**: [pbm-agent-ai-backend](https://github.com/pbm-agent-ai/pbm-agent-ai-backend)

---

## ✨ 주요 화면

| 화면 | 설명 |
|------|------|
| 🏠 대시보드 | 자연어 명령 입력, 실시간 모니터링 현황 |
| 📋 조건 관리 | 등록된 모니터링 조건 조회·수정·삭제 |
| 📊 가격 히스토리 | 가격 추이 차트, AI 구매 추천 |
| 🎬 추천 | 유튜버 리뷰 기반 카테고리별 상품 추천 |
| 🖼️ 이미지 검색 | 상품 이미지 업로드 → AI 상품 인식 |
| 💳 결제 내역 | TX Hash 포함 결제 이력 조회 |
| 🔔 알림 설정 | 텔레그램·이메일 채널 및 결제 모드 설정 |

---

## 🏗️ 프로젝트 구조

```
pbm-agent-ai-frontend/
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/        # 공통 UI 컴포넌트
│       │   ├── layout/        # 사이드바, 탑바
│       │   ├── dashboard/     # 대시보드 컴포넌트
│       │   ├── charts/        # Recharts 차트
│       │   └── common/        # 버튼, 카드, 뱃지 등
│       ├── pages/             # 페이지 컴포넌트
│       │   ├── Dashboard.jsx
│       │   ├── Conditions.jsx
│       │   ├── PriceHistory.jsx
│       │   ├── Recommendation.jsx
│       │   ├── ImageSearch.jsx
│       │   ├── Payments.jsx
│       │   └── Settings.jsx
│       ├── hooks/             # 커스텀 훅
│       │   ├── useWebSocket.js
│       │   └── useMonitoring.js
│       ├── store/             # Zustand 상태 관리
│       │   ├── authStore.js
│       │   └── monitoringStore.js
│       ├── api/               # API 호출 함수
│       └── App.jsx
│
└── chrome-extension/          # Chrome Extension (MV3)
    ├── manifest.json
    ├── background.js
    ├── content.js
    └── popup/
```

---

## 🛠️ 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | React 18, Vite |
| 상태 관리 | Zustand |
| 차트 | Recharts |
| 실시간 통신 | WebSocket (STOMP) |
| UI 컴포넌트 | shadcn/ui |
| HTTP 클라이언트 | Axios |
| 로컬 에이전트 | Chrome Extension Manifest V3 |

---

## 🚀 시작하기

### 사전 요구사항

```bash
Node.js 18+
npm 또는 yarn
```

### 환경 변수 설정

```bash
cp .env.example .env
```

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080/ws
```

### 개발 서버 실행

```bash
cd frontend
npm install
npm run dev
```

### Chrome Extension 설치

```
1. Chrome 브라우저 → chrome://extensions 접속
2. 우측 상단 "개발자 모드" 활성화
3. "압축 해제된 확장 프로그램 로드" 클릭
4. chrome-extension/ 폴더 선택
```

---

## 🌿 브랜치 전략

```
main      → 배포 브랜치
develop   → 개발 통합 브랜치
feature/* → 기능 개발
fix/*     → 버그 수정
```

---

## 📋 커밋 컨벤션

```
feat:     새로운 기능 추가
fix:      버그 수정
style:    UI 스타일 변경
refactor: 코드 리팩토링
docs:     문서 수정
chore:    빌드/설정 변경
```

---

## 👥 팀원

| 이름 | 역할 | GitHub |
|------|------|--------|
| 팀원 1 | Frontend / Chrome Extension | @username |
| 팀원 2 | Frontend 보조 | @username |
```
