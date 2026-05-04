"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

const savedEmailKey = "voc_saved_email";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return window.localStorage.getItem(savedEmailKey) ?? "";
  });
  const [password, setPassword] = useState("");
  const [rememberEmail, setRememberEmail] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return Boolean(window.localStorage.getItem(savedEmailKey));
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (!email.trim() || !password.trim()) {
      setErrorMessage("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage("이메일 또는 비밀번호가 올바르지 않습니다.");
      return;
    }

    if (rememberEmail) {
      window.localStorage.setItem(savedEmailKey, email.trim());
    } else {
      window.localStorage.removeItem(savedEmailKey);
    }

    router.push("/admin/vocs");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/40 px-4 py-10 text-slate-900">
      <section className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/70 ring-1 ring-slate-200/70 sm:p-8">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold text-blue-600">관리자 로그인</p>
          <h1 className="mt-2 text-3xl font-bold">VOC 관리 시스템</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            관리자와 담당자는 로그인 후 배정된 VOC를 확인할 수 있습니다.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">이메일</span>
            <input
              className="h-11 rounded-xl border border-slate-300 px-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@example.com"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">비밀번호</span>
            <input
              className="h-11 rounded-xl border border-slate-300 px-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="비밀번호를 입력하세요"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              checked={rememberEmail}
              onChange={(event) => setRememberEmail(event.target.checked)}
              type="checkbox"
            />
            <span>이메일 저장</span>
          </label>

          {errorMessage && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {errorMessage}
            </p>
          )}

          <button
            className="h-11 w-full rounded-xl bg-blue-600 px-4 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="mt-6 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          로그인 성공 시 VOC 목록 화면으로 이동합니다. VOC 목록 화면은 다음
          단계에서 만듭니다.
        </p>

        <div className="mt-6 text-center">
          <Link
            className="text-sm font-semibold text-blue-600 hover:underline"
            href="/"
          >
            VOC 접수 화면으로 돌아가기
          </Link>
        </div>
      </section>
    </main>
  );
}
