# VOC 시스템 현재 구현 구조

현재 VOC 시스템은 **회사 + 유형 기준 1담당자 체계**로 구현되어 있습니다.

즉, 하나의 `company + category` 조합은 `assignment_rules.staff_id`를 통해 담당자 1명과 연결되고, VOC가 접수되면 `vocs.assigned_staff_id`에 그 담당자 ID가 저장됩니다.

---

## 1. 사용자 역할 구조

| 역할 | 할 수 있는 일 | 접근 가능한 페이지 | 주요 API |
| --- | --- | --- | --- |
| 일반 사용자 | VOC 접수, 접수번호와 조회용 비밀번호로 본인 VOC 조회 | `/`, `/lookup` | `POST /api/vocs`, `POST /api/vocs/lookup` |
| 담당자 | 본인에게 배정된 VOC 목록/상세 조회, 상태 변경, 첨부파일 다운로드 | `/login`, `/admin/vocs`, `/admin/vocs/[id]` | `PATCH /api/vocs/[id]/status`, `GET /api/attachments/[id]/download` |
| 관리자 | 전체 VOC 조회, 상세 확인, 상태 변경, 첨부파일 다운로드 | `/login`, `/admin/vocs`, `/admin/vocs/[id]` | `PATCH /api/vocs/[id]/status`, `GET /api/attachments/[id]/download` |

---

## 2. VOC 접수 흐름

일반 사용자는 `/` 메인 접수 화면에서 VOC를 등록합니다.

흐름은 아래와 같습니다.

```text
일반 사용자
↓
/ 페이지에서 VOC 입력
↓
POST /api/vocs 호출
↓
입력값 검증
↓
assignment_rules에서 company + category 기준 담당자 조회
↓
조회용 비밀번호 bcrypt hash 처리
↓
vocs 테이블 저장
↓
첨부파일이 있으면 Storage 업로드
↓
voc_attachments 테이블 저장
↓
담당자에게 이메일 발송
```

### vocs 테이블에 저장되는 주요 값

| 분류 | 저장 값 |
| --- | --- |
| 기본 정보 | `company`, `category`, `writer_name`, `department`, `phone`, `email` |
| VOC 내용 | `title`, `content` |
| 조회 비밀번호 | `password_hash` |
| 상태 | `status = 접수` |
| 담당자 | `assigned_staff_id` |
| 개인정보 동의 | `privacy_agreed` |
| 접속 정보 | `ip_address`, `user_agent` |

### password_hash 저장 시점

`POST /api/vocs`에서 입력값 검증이 끝난 뒤, 아래 흐름으로 저장됩니다.

```text
lookupPassword 입력값
↓
bcrypt.hash(lookupPassword, 10)
↓
password_hash 컬럼에 hash 값 저장
```

조회용 비밀번호는 평문으로 저장하지 않습니다.

### 첨부파일 저장 위치

| 항목 | 저장 위치 |
| --- | --- |
| 실제 파일 | Supabase Storage의 `voc-files` 버킷 |
| 파일 정보 | `voc_attachments` 테이블 |
| 저장 정보 | `voc_id`, `file_name`, `file_path`, `file_size` |

---

## 3. 담당자 자동 배정 규칙

현재 담당자 배정은 `assignment_rules` 테이블 기준입니다.

| 확인 항목 | 현재 구조 |
| --- | --- |
| 담당자 조회 테이블 | `assignment_rules` |
| 회사 기준 | `company` |
| 유형 기준 | `category` |
| 담당자 연결 컬럼 | `staff_id` |
| VOC 저장 컬럼 | `vocs.assigned_staff_id` |
| 담당자를 못 찾는 경우 | `POST /api/vocs`에서 400 오류 반환 |
| 담당자가 여러 명인 경우 | 현재 구조에서는 지원하지 않음 |

현재 API는 `company + category` 조건으로 `assignment_rules`를 조회하고 `.single()`을 사용합니다.

따라서 한 조건에 담당자가 여러 명 있으면 정상 처리되지 않습니다.

현재는 아래 규칙을 유지합니다.

```text
회사 + 유형당 담당자 1명
```

---

## 4. 이메일 발송 흐름

| 케이스 | 발송 대상 | 이메일 주소 출처 | 발송 조건 | 메일 내용 요약 |
| --- | --- | --- | --- | --- |
| VOC 신규 접수 시 | 배정된 담당자 1명 | `assignment_rules.staff_id`로 `profiles.email` 조회 | VOC 저장 성공 후 | 회사, 유형, 제목, 작성자, 접수 ID |
| VOC 완료 처리 시 | 작성자 | `vocs.email` | 상태가 `완료`로 변경될 때 | 완료 안내, 회사, 유형, 제목, 접수 ID |
| VOC 반려 처리 시 | 작성자 | `vocs.email` | 상태가 `반려`로 변경될 때 | 반려 안내, 회사, 유형, 제목, 접수 ID |
| 검토중/처리중/접수 변경 시 | 발송 없음 | 해당 없음 | 메일 발송 조건 아님 | 없음 |

신규 접수 메일은 담당자에게 갑니다.

완료/반려 메일은 VOC 작성자가 입력한 이메일 주소로 갑니다.

---

## 5. 관리자 페이지 구조

관리자는 전체 VOC를 조회할 수 있습니다.

| 기능 | 현재 동작 | 권한 기준 |
| --- | --- | --- |
| 전체 VOC 목록 조회 | `/admin/vocs`에서 전체 VOC 조회 | `profiles.role === admin` |
| 필터/정렬 | 상태, 회사, 유형, 최신순/오래된순 적용 | 관리자 전체 데이터 기준 |
| 상세 조회 | `/admin/vocs/[id]`에서 특정 VOC 조회 | 관리자라면 담당자 제한 없음 |
| 상태 변경 | `PATCH /api/vocs/[id]/status` 호출 | 관리자라면 모든 VOC 변경 가능 |
| 첨부파일 다운로드 | `GET /api/attachments/[id]/download` 호출 | 관리자라면 모든 첨부파일 가능 |

---

## 6. 담당자 페이지 구조

담당자는 본인에게 배정된 VOC만 볼 수 있습니다.

| 기능 | 현재 동작 | 기준 컬럼 |
| --- | --- | --- |
| 목록 조회 | 본인에게 배정된 VOC만 조회 | `vocs.assigned_staff_id = 현재 user.id` |
| 상세 조회 | 상세 조회 시에도 담당자 조건 적용 | `assigned_staff_id = user.id` |
| 상태 변경 | 상태 변경 API에서 권한 확인 | `voc.assigned_staff_id === user.id` |
| 첨부파일 다운로드 | 첨부파일의 VOC를 찾은 뒤 권한 확인 | `voc.assigned_staff_id === user.id` |

담당자 권한의 핵심 기준은 아래입니다.

```text
vocs.assigned_staff_id
```

---

## 7. 일반 사용자 조회 구조

비로그인 사용자는 `/lookup` 화면에서 본인 VOC를 조회할 수 있습니다.

### 입력값

| 입력 항목 | 설명 |
| --- | --- |
| 접수번호 | VOC 접수 성공 시 안내된 ID |
| 조회용 비밀번호 | VOC 등록 시 사용자가 입력한 비밀번호 |

### API 흐름

```text
/lookup
↓
접수번호 + 조회용 비밀번호 입력
↓
POST /api/vocs/lookup
↓
receiptNo로 vocs.id 조회
↓
password_hash 확인
↓
bcrypt.compare(password, password_hash)
↓
성공 시 VOC 상세 정보 반환
```

### 조회 성공 시 보여주는 데이터

| 데이터 | 설명 |
| --- | --- |
| VOC 상세 | 회사, 유형, 제목, 내용, 상태, 접수일 등 |
| 첨부파일 목록 | `voc_attachments` 기준 |
| 활동 이력 | `voc_activities` 기준 |

### 실패 시 공통 오류 메시지를 쓰는 이유

VOC가 없는 경우, 비밀번호가 틀린 경우, `password_hash`가 없는 경우를 구분해서 알려주면 접수번호 존재 여부를 추측할 수 있습니다.

그래서 아래 메시지로 통일합니다.

```text
접수번호 또는 비밀번호가 올바르지 않습니다.
```

---

## 8. 주요 테이블 관계

| 테이블 | 역할 | 주요 관계 |
| --- | --- | --- |
| `vocs` | VOC 접수 본문, 상태, 작성자 연락처, 담당자, 비밀번호 hash 저장 | `assigned_staff_id → profiles.id` |
| `assignment_rules` | 회사 + 유형별 담당자 배정 규칙 | `staff_id → profiles.id` |
| `profiles` | 관리자/담당자 프로필과 role 저장 | Supabase Auth user id와 연결 |
| `voc_attachments` | 첨부파일 메타데이터 저장 | `voc_id → vocs.id`, `file_path → Storage 파일` |
| `voc_activities` | 상태 변경 이력과 메일 발송 결과 기록 | `voc_id → vocs.id` |

---

## 9. 현재 시스템의 핵심 규칙 요약

| 규칙 | 설명 |
| --- | --- |
| 회사 + 유형당 담당자 1명 | `assignment_rules.company + category` 기준 |
| 담당자 기준 | `vocs.assigned_staff_id` |
| 일반 사용자 조회 | 접수번호 + 조회용 비밀번호 |
| 관리자 조회 | 전체 VOC 조회 가능 |
| 담당자 조회 | 본인에게 배정된 VOC만 조회 가능 |
| 신규 접수 메일 | 담당자에게 발송 |
| 완료/반려 메일 | 작성자에게 발송 |
| 검토중/처리중/접수 변경 메일 | 발송하지 않음 |
| 조회용 비밀번호 저장 | 평문 저장 금지, bcrypt hash 저장 |

---

## 10. 전체 흐름도

### 일반 사용자 VOC 접수

```text
일반 사용자
↓
/ 접수 화면
↓
VOC 정보 입력
↓
조회용 비밀번호 입력
↓
첨부파일 선택
↓
POST /api/vocs
↓
담당자 자동 배정
↓
vocs 저장
↓
첨부파일 저장
↓
담당자 이메일 발송
↓
접수번호 안내
```

### 관리자/담당자 처리

```text
관리자/담당자
↓
/login 로그인
↓
profiles.role 확인
↓
/admin/vocs 목록 조회
↓
/admin/vocs/[id] 상세 조회
↓
상태 변경
↓
voc_activities 기록
↓
완료/반려이면 작성자 이메일 발송
```

### 일반 사용자 VOC 조회

```text
일반 사용자
↓
/lookup
↓
접수번호 입력
↓
조회용 비밀번호 입력
↓
POST /api/vocs/lookup
↓
vocs.id 조회
↓
bcrypt.compare로 비밀번호 확인
↓
VOC 상세/첨부파일/활동 이력 표시
```

---

## 결론

현재 시스템은 아래 구조로 이해하면 됩니다.

```text
일반 사용자
→ VOC 접수
→ 회사 + 유형 기준 담당자 1명 자동 배정
→ 담당자에게 접수 메일
→ 담당자 또는 관리자가 처리
→ 완료/반려 시 작성자에게 메일
→ 일반 사용자는 접수번호 + 비밀번호로 조회
```

