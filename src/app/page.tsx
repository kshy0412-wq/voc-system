"use client";

import Link from "next/link";
import { type DragEvent, type FormEvent, useState } from "react";

const companies = ["Ramos", "CTST"];
const categories = ["고충", "제안", "안전", "소통", "시스템문의", "기타"];

type VocForm = {
  company: string;
  category: string;
  writerName: string;
  department: string;
  phone: string;
  email: string;
  title: string;
  content: string;
  lookupPassword: string;
  lookupPasswordConfirm: string;
  privacyAgreed: boolean;
};

type FormErrors = Partial<Record<keyof VocForm, string>>;

type SubmitMessage = {
  type: "success" | "error";
  text: string;
} | null;

type VocApiResponse = {
  message?: string;
  errors?: FormErrors;
  vocId?: string;
};

const initialForm: VocForm = {
  company: "Ramos",
  category: "고충",
  writerName: "",
  department: "",
  phone: "",
  email: "",
  title: "",
  content: "",
  lookupPassword: "",
  lookupPasswordConfirm: "",
  privacyAgreed: false,
};

export default function Home() {
  const [form, setForm] = useState<VocForm>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<SubmitMessage>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [successReceiptNo, setSuccessReceiptNo] = useState("");
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const updateField = <K extends keyof VocForm>(
    field: K,
    value: VocForm[K],
  ) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
    setSubmitMessage(null);
  };

  const validateForm = () => {
    const nextErrors: FormErrors = {};

    if (!form.company.trim()) {
      nextErrors.company = "회사를 선택해주세요.";
    }

    if (!form.category.trim()) {
      nextErrors.category = "유형을 선택해주세요.";
    }

    if (!form.writerName.trim()) {
      nextErrors.writerName = "작성자 이름을 입력해주세요.";
    }

    if (!form.email.trim()) {
      nextErrors.email = "이메일을 입력해주세요.";
    }

    if (!form.title.trim()) {
      nextErrors.title = "제목을 입력해주세요.";
    }

    if (!form.content.trim()) {
      nextErrors.content = "내용을 입력해주세요.";
    }

    if (form.lookupPassword.length < 6) {
      nextErrors.lookupPassword = "조회용 비밀번호는 6자 이상 입력해주세요.";
    }

    if (form.lookupPassword !== form.lookupPasswordConfirm) {
      nextErrors.lookupPasswordConfirm = "비밀번호 확인이 일치하지 않습니다.";
    }

    if (!form.privacyAgreed) {
      nextErrors.privacyAgreed = "개인정보 수집 및 처리에 동의해주세요.";
    }

    return nextErrors;
  };

  const appendSelectedFiles = (files: File[]) => {
    setSelectedFiles((currentFiles) => [...currentFiles, ...files]);
  };

  const handleFileDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDraggingFile(false);

    const droppedFiles = Array.from(event.dataTransfer.files);

    if (droppedFiles.length > 0) {
      appendSelectedFiles(droppedFiles);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateForm();
    setErrors(nextErrors);
    setSubmitMessage(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const requestBody = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        if (key !== "lookupPasswordConfirm") {
          requestBody.append(key, String(value));
        }
      });

      selectedFiles.forEach((file) => {
        requestBody.append("files", file);
      });

      const response = await fetch("/api/vocs", {
        method: "POST",
        body: requestBody,
      });
      const result = (await response.json().catch(() => ({}))) as VocApiResponse;

      if (!response.ok) {
        setErrors(result.errors ?? {});
        setSubmitMessage({
          type: "error",
          text: result.message ?? "VOC 저장 중 문제가 발생했습니다.",
        });
        return;
      }

      setForm(initialForm);
      setSelectedFiles([]);
      setFileInputKey((currentKey) => currentKey + 1);
      setErrors({});
      setSubmitMessage({
        type: "success",
        text: `VOC가 접수되었습니다. 접수 ID: ${result.vocId}`,
      });
      setSuccessReceiptNo(result.vocId ?? "");
    } catch {
      setSubmitMessage({
        type: "error",
        text: "서버와 통신하지 못했습니다. 잠시 후 다시 시도해주세요.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40 px-4 py-10 text-slate-900">
      <section className="mx-auto max-w-4xl rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/70 ring-1 ring-slate-200/70 sm:p-8">
        <div className="mb-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-blue-600">VOC 접수</p>
            <div className="flex flex-wrap gap-3 text-sm font-semibold">
              <Link className="text-blue-600 hover:underline" href="/lookup">
                접수한 VOC 조회
              </Link>
              <Link className="text-slate-600 hover:text-blue-600" href="/login">
                관리자/담당자 로그인
              </Link>
            </div>
          </div>
          <h1 className="mt-2 text-3xl font-bold">VOC 등록</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            고충, 제안, 안전, 소통, 시스템 문의 사항을 남겨주세요. 입력한
            내용은 담당자에게 전달되어 확인 후 처리됩니다.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
            <h2 className="text-base font-semibold text-slate-900">기본 정보</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">회사</span>
                <select
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  value={form.company}
                  onChange={(event) => updateField("company", event.target.value)}
                >
                  {companies.map((company) => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
                </select>
                {errors.company && (
                  <p className="text-sm text-red-600">{errors.company}</p>
                )}
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">유형</span>
                <select
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  value={form.category}
                  onChange={(event) =>
                    updateField("category", event.target.value)
                  }
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="text-sm text-red-600">{errors.category}</p>
                )}
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
            <h2 className="text-base font-semibold text-slate-900">
              연락처 정보
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">이름</span>
                <input
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  value={form.writerName}
                  onChange={(event) =>
                    updateField("writerName", event.target.value)
                  }
                  placeholder="이름을 입력하세요"
                />
                {errors.writerName && (
                  <p className="text-sm text-red-600">{errors.writerName}</p>
                )}
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">부서</span>
                <input
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  value={form.department}
                  onChange={(event) =>
                    updateField("department", event.target.value)
                  }
                  placeholder="부서를 입력하세요"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">연락처</span>
                <input
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  placeholder="010-0000-0000"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">이메일</span>
                <input
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="name@example.com"
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email}</p>
                )}
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
            <h2 className="text-base font-semibold text-slate-900">VOC 내용</h2>
            <div className="mt-4 space-y-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">제목</span>
                <input
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  value={form.title}
                  onChange={(event) => updateField("title", event.target.value)}
                  placeholder="제목을 입력하세요"
                />
                {errors.title && (
                  <p className="text-sm text-red-600">{errors.title}</p>
                )}
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">내용</span>
                <textarea
                  className="min-h-40 rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  value={form.content}
                  onChange={(event) => updateField("content", event.target.value)}
                  placeholder="내용을 자세히 입력하세요"
                />
                {errors.content && (
                  <p className="text-sm text-red-600">{errors.content}</p>
                )}
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
            <h2 className="text-base font-semibold text-slate-900">
              조회용 비밀번호
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              접수 후 작성자가 VOC 처리 상태를 확인할 때 사용합니다.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">
                  비밀번호
                </span>
                <input
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  minLength={6}
                  onChange={(event) =>
                    updateField("lookupPassword", event.target.value)
                  }
                  placeholder="6자 이상 입력"
                  type="password"
                  value={form.lookupPassword}
                />
                {errors.lookupPassword && (
                  <p className="text-sm text-red-600">
                    {errors.lookupPassword}
                  </p>
                )}
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">
                  비밀번호 확인
                </span>
                <input
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  minLength={6}
                  onChange={(event) =>
                    updateField("lookupPasswordConfirm", event.target.value)
                  }
                  placeholder="비밀번호를 한 번 더 입력"
                  type="password"
                  value={form.lookupPasswordConfirm}
                />
                {errors.lookupPasswordConfirm && (
                  <p className="text-sm text-red-600">
                    {errors.lookupPasswordConfirm}
                  </p>
                )}
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
            <h2 className="text-base font-semibold text-slate-900">첨부파일</h2>
            <label
              className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-6 text-center transition ${
                isDraggingFile
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                  : "border-slate-300 bg-white hover:border-blue-300 hover:bg-blue-50"
              }`}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDraggingFile(true);
              }}
              onDragLeave={() => setIsDraggingFile(false)}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDraggingFile(true);
              }}
              onDrop={handleFileDrop}
            >
              <span className="text-sm font-semibold text-slate-700">
                파일 선택 또는 드래그 앤 드롭
              </span>
              <span className="mt-1 text-xs text-slate-500">
                여러 파일을 선택하거나 이 영역에 끌어다 놓을 수 있습니다.
              </span>
              <input
                className="sr-only"
                key={fileInputKey}
                multiple
                onChange={(event) =>
                  appendSelectedFiles(Array.from(event.target.files ?? []))
                }
                type="file"
              />
            </label>
            {selectedFiles.length > 0 && (
              <ul className="mt-3 space-y-1 rounded-xl bg-white p-3 text-sm text-slate-700 ring-1 ring-slate-200">
                {selectedFiles.map((file) => (
                  <li key={`${file.name}-${file.size}`}>
                    {file.name} ({Math.ceil(file.size / 1024)}KB)
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
            <h2 className="text-base font-semibold text-slate-900">
              개인정보 동의
            </h2>
            <label className="mt-4 flex items-start gap-3 rounded-xl bg-white p-4 text-sm text-slate-700 ring-1 ring-slate-200">
              <input
                className="mt-1"
                type="checkbox"
                checked={form.privacyAgreed}
                onChange={(event) =>
                  updateField("privacyAgreed", event.target.checked)
                }
              />
              <span>
                VOC 접수를 위해 개인정보를 수집하고 처리하는 것에 동의합니다.
              </span>
            </label>
            {errors.privacyAgreed && (
              <p className="mt-2 text-sm text-red-600">
                {errors.privacyAgreed}
              </p>
            )}
          </section>

          <button
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "저장 중..." : "VOC 등록"}
          </button>

          {submitMessage && (
            <p
              className={`rounded-lg p-4 text-sm ${
                submitMessage.type === "success"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {submitMessage.text}
            </p>
          )}
        </form>
      </section>

      {successReceiptNo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl shadow-slate-900/20 ring-1 ring-slate-200 sm:p-8">
            <p className="text-sm font-semibold text-blue-600">VOC 접수 완료</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              접수되었습니다
            </h2>
            <div className="mt-5 rounded-2xl bg-blue-50 p-4">
              <p className="text-sm font-medium text-blue-700">접수번호</p>
              <p className="mt-1 break-all text-lg font-bold text-blue-900">
                {successReceiptNo}
              </p>
            </div>
            <div className="mt-5 space-y-2 text-sm leading-6 text-slate-600">
              <p>
                추후 조회 시 접수번호와 조회용 비밀번호가 필요합니다.
              </p>
              <p>
                접수번호 또는 비밀번호를 잊어버리면 조회할 수 없습니다.
              </p>
            </div>
            <button
              className="mt-6 h-11 w-full rounded-xl bg-blue-600 px-4 font-semibold text-white transition hover:bg-blue-700"
              onClick={() => setSuccessReceiptNo("")}
              type="button"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
