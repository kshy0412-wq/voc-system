"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

const lookupErrorMessage = "접수번호 또는 비밀번호가 올바르지 않습니다.";

type LookupVoc = {
  id: string;
  created_at: string;
  updated_at: string;
  company: string;
  category: string;
  writer_name: string;
  department: string | null;
  phone: string | null;
  email: string;
  title: string;
  content: string;
  status: string;
};

type LookupAttachment = {
  id: string;
  file_name: string;
  file_size: number | null;
  created_at: string;
};

type LookupActivity = {
  id: string;
  created_at: string;
  from_status: string | null;
  to_status: string;
  email_sent: boolean | null;
};

type LookupResult = {
  voc: LookupVoc;
  attachments: LookupAttachment[];
  activities: LookupActivity[];
};

const formatDateTime = (dateText: string) => {
  return new Date(dateText).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatFileSize = (fileSize: number | null) => {
  if (!fileSize) {
    return "크기 정보 없음";
  }

  return `${Math.ceil(fileSize / 1024).toLocaleString("ko-KR")}KB`;
};

const getStatusBadgeClassName = (status: string) => {
  switch (status) {
    case "접수":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    case "검토중":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "처리중":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "완료":
      return "bg-green-50 text-green-700 ring-green-200";
    case "반려":
      return "bg-red-50 text-red-700 ring-red-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
};

export default function LookupPage() {
  const [receiptNo, setReceiptNo] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setResult(null);

    if (!receiptNo.trim() || !password.trim()) {
      setErrorMessage(lookupErrorMessage);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/vocs/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          receiptNo: receiptNo.trim(),
          password,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | LookupResult
        | { message?: string }
        | null;

      if (!response.ok || !data || !("voc" in data)) {
        setErrorMessage(lookupErrorMessage);
        return;
      }

      setResult(data);
    } catch {
      setErrorMessage(lookupErrorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40 px-4 py-10 text-slate-900">
      <section className="mx-auto w-full max-w-5xl">
        <div className="mb-8 rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/70 ring-1 ring-slate-200/70 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-600">VOC 조회</p>
              <h1 className="mt-2 text-3xl font-bold">
                접수한 VOC를 확인하세요
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                접수번호와 등록 시 입력한 조회용 비밀번호로 처리 상태를 확인할
                수 있습니다.
              </p>
            </div>
            <Link
              className="text-sm font-semibold text-blue-600 hover:underline"
              href="/"
            >
              VOC 접수 화면으로 돌아가기
            </Link>
          </div>

          <form
            className="mt-8 grid gap-4 lg:grid-cols-[1fr_1fr_auto]"
            onSubmit={handleSubmit}
            noValidate
          >
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">
                접수번호
              </span>
              <input
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                onChange={(event) => setReceiptNo(event.target.value)}
                placeholder="접수번호를 입력하세요"
                value={receiptNo}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">
                조회용 비밀번호
              </span>
              <input
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="비밀번호를 입력하세요"
                type="password"
                value={password}
              />
            </label>

            <button
              className="h-11 rounded-xl bg-blue-600 px-6 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400 lg:mt-7"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? "조회 중..." : "조회"}
            </button>
          </form>

          {errorMessage && (
            <p className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {errorMessage}
            </p>
          )}
        </div>

        {result && (
          <div className="grid gap-6">
            <section className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/70 ring-1 ring-slate-200/70 sm:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    접수번호 {result.voc.id}
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">
                    {result.voc.title}
                  </h2>
                </div>
                <span
                  className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-semibold ring-1 ${getStatusBadgeClassName(
                    result.voc.status,
                  )}`}
                >
                  {result.voc.status}
                </span>
              </div>

              <dl className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-5 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-slate-500">회사</dt>
                  <dd className="mt-1 text-slate-900">{result.voc.company}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">유형</dt>
                  <dd className="mt-1 text-slate-900">{result.voc.category}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">작성자</dt>
                  <dd className="mt-1 text-slate-900">
                    {result.voc.writer_name}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">접수일</dt>
                  <dd className="mt-1 text-slate-900">
                    {formatDateTime(result.voc.created_at)}
                  </dd>
                </div>
              </dl>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-base font-semibold text-slate-900">내용</h3>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {result.voc.content}
                </p>
              </div>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/70 ring-1 ring-slate-200/70 sm:p-8">
              <h2 className="text-xl font-bold">첨부파일</h2>
              {result.attachments.length > 0 ? (
                <ul className="mt-4 divide-y divide-slate-200 rounded-2xl border border-slate-200">
                  {result.attachments.map((attachment) => (
                    <li
                      className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between"
                      key={attachment.id}
                    >
                      <span className="font-medium text-slate-900">
                        {attachment.file_name}
                      </span>
                      <span className="text-sm text-slate-500">
                        {formatFileSize(attachment.file_size)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
                  등록된 첨부파일이 없습니다.
                </p>
              )}
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/70 ring-1 ring-slate-200/70 sm:p-8">
              <h2 className="text-xl font-bold">활동 이력</h2>
              {result.activities.length > 0 ? (
                <ul className="mt-4 space-y-3">
                  {result.activities.map((activity) => (
                    <li
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm"
                      key={activity.id}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="font-semibold text-slate-900">
                          {activity.from_status
                            ? `${activity.from_status} → ${activity.to_status}`
                            : activity.to_status}
                        </span>
                        <span className="text-slate-500">
                          {formatDateTime(activity.created_at)}
                        </span>
                      </div>
                      <p className="mt-2 text-slate-600">
                        알림 메일{" "}
                        {activity.email_sent ? "발송 완료" : "발송 대상 아님"}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
                  아직 표시할 활동 이력이 없습니다.
                </p>
              )}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
