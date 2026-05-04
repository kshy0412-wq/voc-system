# VOC 접수 시스템

비로그인 사용자가 VOC를 접수하고, 관리자/담당자가 로그인 후 접수 내용을 조회하고 처리할 수 있는 웹 시스템입니다.

## 주요 기능

- 비로그인 VOC 등록
- 회사 + 유형 기준 담당자 자동 배정
- 담당자 이메일 알림
- 첨부파일 업로드
- 관리자/담당자 로그인
- 로그인 이메일 저장
- 로그아웃
- 관리자 VOC 전체 조회
- 담당자 본인 VOC만 조회
- VOC 목록 필터 및 정렬
- VOC 상세 조회
- 첨부파일 다운로드
- VOC 상태 변경
- 완료/반려 시 작성자 이메일 알림
- 상태 변경 활동 기록 저장
- 최근 업데이트 표시
- 상태별 badge 색상 표시

## 기술 스택

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- Supabase DB
- Supabase Auth
- Supabase Storage
- Resend

## 실행 방법

개발 서버 실행:

```bash
npm run dev
```

브라우저 접속:

```text
http://localhost:3000
```

주요 화면:

```text
/                  VOC 등록 화면
/login             관리자/담당자 로그인
/admin/vocs        VOC 목록 화면
/admin/vocs/[id]   VOC 상세 화면
```

## 환경 변수

`.env.local` 파일에 아래 값을 설정해야 합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

주의:

- `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용 키입니다.
- `RESEND_API_KEY`는 이메일 발송용 비밀키입니다.
- 위 두 값은 실제 값으로 문서나 브라우저 코드에 노출하면 안 됩니다.

## 시스템 구조

### 프론트엔드

사용자가 보는 화면입니다.

```text
src/app/page.tsx
src/app/login/page.tsx
src/app/admin/vocs/page.tsx
src/app/admin/vocs/[id]/page.tsx
```

역할:

- VOC 등록 폼
- 로그인 화면
- VOC 목록 화면
- VOC 상세 화면
- 상태 변경 UI
- 첨부파일 다운로드 UI

### API

Next.js Route Handler가 서버 처리를 담당합니다.

```text
POST /api/vocs
PATCH /api/vocs/[id]/status
GET /api/attachments/[id]/download
```

역할:

- VOC 등록
- 담당자 배정
- 첨부파일 업로드
- 담당자 이메일 알림
- 상태 변경
- 작성자 이메일 알림
- 활동 기록 저장
- private 첨부파일 signed URL 생성

### DB

Supabase DB 주요 테이블입니다.

```text
profiles
assignment_rules
vocs
voc_attachments
voc_activities
```

테이블 역할:

- `profiles`: 관리자/담당자 정보와 역할
- `assignment_rules`: 회사 + 유형별 담당자 배정 규칙
- `vocs`: VOC 접수 본문
- `voc_attachments`: 첨부파일 정보
- `voc_activities`: 상태 변경 활동 기록

### Storage

Supabase Storage 버킷:

```text
voc-files
```

설정:

```text
Public bucket: OFF
```

첨부파일은 private 버킷에 저장하고, 다운로드할 때 서버 API에서 signed URL을 발급합니다.

## 주요 흐름

### VOC 등록

```text
사용자 VOC 등록
↓
입력값 검증
↓
POST /api/vocs
↓
assignment_rules에서 담당자 조회
↓
vocs 저장
↓
첨부파일 Storage 업로드
↓
voc_attachments 저장
↓
담당자 이메일 알림
```

### 담당자 배정

```text
회사 + 유형 선택
↓
assignment_rules 조회
↓
assigned_staff_id 저장
```

예:

```text
Ramos + 고충 → A 담당자
CTST + 시스템문의 → B 담당자
```

### 상태 변경

```text
상세 화면에서 상태 변경
↓
PATCH /api/vocs/[id]/status
↓
권한 확인
↓
vocs.status 업데이트
↓
voc_activities 기록
↓
완료/반려이면 작성자 이메일 알림
```

상태값:

```text
접수
검토중
처리중
완료
반려
```

### 이메일 알림

접수 시:

```text
배정된 담당자의 profiles.email로 알림 발송
```

완료/반려 시:

```text
작성자가 입력한 vocs.email로 알림 발송
```

발신 주소:

```text
RESEND_FROM_EMAIL
```

## 폴더 구조

```text
src
├─ app
│  ├─ page.tsx
│  ├─ login
│  │  └─ page.tsx
│  ├─ admin
│  │  └─ vocs
│  │     ├─ page.tsx
│  │     └─ [id]
│  │        └─ page.tsx
│  └─ api
│     ├─ vocs
│     │  ├─ route.ts
│     │  └─ [id]
│     │     └─ status
│     │        └─ route.ts
│     └─ attachments
│        └─ [id]
│           └─ download
│              └─ route.ts
├─ components
│  └─ emails
│     └─ VocStatusEmail.tsx
└─ lib
   ├─ supabase.ts
   ├─ supabase-admin.ts
   └─ resend.ts
```

## 향후 확장 가능 기능

- 담당자 배정 관리 화면
- 관리자/담당자 계정 관리 화면
- VOC 검색 기능
- 페이지네이션
- 상태 변경 전체 이력 타임라인
- 처리 코멘트
- 완료/반려 사유 입력
- 첨부파일 삭제
- 관리자 대시보드
- Excel 다운로드
- 이메일 발송 실패 재시도
- 운영 배포 설정
- 테스트 코드 추가
