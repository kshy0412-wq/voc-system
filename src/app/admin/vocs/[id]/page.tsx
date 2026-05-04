"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

const statuses = ["접수", "검토중", "처리중", "완료", "반려"];

type Profile = {
  id: string;
  role: "admin" | "staff";
};

type VocDetail = {
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
  privacy_agreed: boolean;
  status: string;
  assigned_staff_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
};

type Toast = {
  type: "success" | "error";
  message: string;
} | null;

type LatestActivity = {
  created_at: string;
  actor_name: string;
  to_status: string;
};

type Attachment = {
  id: string;
  file_name: string;
  file_size: number | null;
};

type StatusApiResponse = {
  message?: string;
  activity?: {
    createdAt: string;
    actorName: string;
    toStatus: string;
  } | null;
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

export default function VocDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [voc, setVoc] = useState<VocDetail | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [staffName, setStaffName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isStatusSaving, setIsStatusSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [toast, setToast] = useState<Toast>(null);
  const [latestActivity, setLatestActivity] = useState<LatestActivity | null>(
    null,
  );
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    const loadVoc = async () => {
      setIsLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .single();

      if (profileError || !profileData) {
        setErrorMessage("사용자 권한 정보를 불러오지 못했습니다.");
        setIsLoading(false);
        return;
      }

      const currentProfile = profileData as Profile;
      setProfile(currentProfile);

      let vocQuery = supabase
        .from("vocs")
        .select(
          "id, created_at, updated_at, company, category, writer_name, department, phone, email, title, content, privacy_agreed, status, assigned_staff_id, ip_address, user_agent",
        )
        .eq("id", params.id);

      if (currentProfile.role === "staff") {
        vocQuery = vocQuery.eq("assigned_staff_id", user.id);
      }

      const { data: vocData, error: vocError } = await vocQuery.single();

      if (vocError || !vocData) {
        setErrorMessage("VOC 상세 내용을 불러오지 못했습니다.");
        setIsLoading(false);
        return;
      }

      const vocDetail = vocData as VocDetail;
      setVoc(vocDetail);
      setSelectedStatus(vocDetail.status);

      const { data: activityData } = await supabase
        .from("voc_activities")
        .select("created_at, actor_name, to_status")
        .eq("voc_id", vocDetail.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setLatestActivity(
        activityData
          ? (activityData as LatestActivity)
          : {
              created_at: vocDetail.updated_at,
              actor_name: "시스템",
              to_status: vocDetail.status,
            },
      );

      const { data: attachmentData } = await supabase
        .from("voc_attachments")
        .select("id, file_name, file_size")
        .eq("voc_id", vocDetail.id)
        .order("created_at", { ascending: true });

      setAttachments((attachmentData ?? []) as Attachment[]);

      if (vocDetail.assigned_staff_id) {
        const { data: staffData } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", vocDetail.assigned_staff_id)
          .single();

        setStaffName(staffData?.name ?? "담당자");
      }

      setIsLoading(false);
    };

    loadVoc();
  }, [params.id, router]);

  const showToast = (nextToast: Toast) => {
    setToast(nextToast);

    if (nextToast) {
      window.setTimeout(() => {
        setToast(null);
      }, 3500);
    }
  };

  const handleStatusChange = async () => {
    const nextStatus = selectedStatus;

    if (!voc || nextStatus === voc.status) {
      return;
    }

    const previousStatus = voc.status;
    setStatusMessage("");
    setIsStatusSaving(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setIsStatusSaving(false);
      setSelectedStatus(previousStatus);
      showToast({
        type: "error",
        message: "로그인이 필요합니다.",
      });
      window.setTimeout(() => {
        router.push("/login");
      }, 800);
      return;
    }

    try {
      const response = await fetch(`/api/vocs/${voc.id}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      setIsStatusSaving(false);

      if (!response.ok) {
        const result = (await response
          .json()
          .catch(() => null)) as StatusApiResponse | null;
        setSelectedStatus(previousStatus);
        setStatusMessage(result?.message ?? "상태 변경에 실패했습니다.");
        showToast({
          type: "error",
          message: result?.message ?? "상태 변경에 실패했습니다.",
        });
        return;
      }

      const result = (await response.json().catch(() => null)) as
        | StatusApiResponse
        | null;

      setVoc({
        ...voc,
        status: nextStatus,
      });
      setLatestActivity({
        created_at: result?.activity?.createdAt ?? new Date().toISOString(),
        actor_name:
          result?.activity?.actorName ??
          (profile?.role === "admin" ? "관리자" : "담당자"),
        to_status: result?.activity?.toStatus ?? nextStatus,
      });
      setStatusMessage("상태가 변경되었습니다.");
      showToast({
        type: "success",
        message: "상태가 변경되었으며 알림 메일이 발송되었습니다.",
      });
    } catch {
      setIsStatusSaving(false);
      setSelectedStatus(previousStatus);
      setVoc({
        ...voc,
        status: previousStatus,
      });
      setStatusMessage("상태 변경 중 오류가 발생했습니다.");
      showToast({
        type: "error",
        message: "상태 변경 중 오류가 발생했습니다.",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleDownloadAttachment = async (attachmentId: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      showToast({
        type: "error",
        message: "로그인이 필요합니다.",
      });
      window.setTimeout(() => {
        router.push("/login");
      }, 800);
      return;
    }

    const response = await fetch(`/api/attachments/${attachmentId}/download`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const result = (await response.json().catch(() => null)) as {
      message?: string;
      signedUrl?: string;
    } | null;

    if (!response.ok || !result?.signedUrl) {
      showToast({
        type: "error",
        message: result?.message ?? "다운로드 링크 생성에 실패했습니다.",
      });
      return;
    }

    window.open(result.signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40 px-4 py-8 text-slate-900">
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 max-w-sm rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${
            toast.type === "success"
              ? "bg-green-50 text-green-800 ring-1 ring-green-200"
              : "bg-red-50 text-red-800 ring-1 ring-red-200"
          }`}
        >
          {toast.message}
        </div>
      )}

      <section className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              className="text-sm font-semibold text-blue-600"
              href="/admin/vocs"
            >
              ← VOC 목록으로 돌아가기
            </Link>
            <h1 className="mt-3 text-3xl font-bold">VOC 상세</h1>
            <p className="mt-2 text-sm text-slate-600">
              {profile?.role === "admin"
                ? "관리자는 전체 VOC 상세 내용을 조회합니다."
                : "담당자는 본인에게 배정된 VOC 상세 내용만 조회합니다."}
            </p>
          </div>

          <button
            className="h-10 w-fit rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
            onClick={handleLogout}
            type="button"
          >
            로그아웃
          </button>
        </div>

        {isLoading && (
          <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-600 shadow-md ring-1 ring-slate-200/70">
            VOC 상세 내용을 불러오는 중입니다.
          </div>
        )}

        {!isLoading && errorMessage && (
          <div className="rounded-2xl bg-red-50 p-8 text-sm text-red-700 shadow-md ring-1 ring-red-100">
            {errorMessage}
          </div>
        )}

        {!isLoading && !errorMessage && voc && (
          <div className="space-y-4">
            <section className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200/70">
              <div className="mb-4">
                <div>
                  <p className="text-sm font-semibold text-blue-600">
                    {voc.company} / {voc.category}
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">{voc.title}</h2>
                </div>
              </div>

              <div className="grid gap-4 border-t border-slate-200 pt-4 text-sm sm:grid-cols-2">
                <InfoItem label="접수 ID" value={voc.id} />
                <InfoItem label="등록일시" value={formatDateTime(voc.created_at)} />
                <InfoItem label="작성자" value={voc.writer_name} />
                <InfoItem label="부서" value={voc.department ?? "-"} />
                <InfoItem label="연락처" value={voc.phone ?? "-"} />
                <InfoItem label="이메일" value={voc.email} />
                <InfoItem
                  label="담당자"
                  value={voc.assigned_staff_id ? staffName || "담당자" : "미배정"}
                />
                <InfoItem
                  label="개인정보 동의"
                  value={voc.privacy_agreed ? "동의" : "미동의"}
                />
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200/70">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold">상태 변경</h3>
                  <span
                    className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getStatusBadgeClassName(
                      voc.status,
                    )}`}
                  >
                    현재 상태: {voc.status}
                  </span>
                </div>

                <div className="w-full sm:w-64">
                  <label className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-slate-500">
                      변경할 상태
                    </span>
                    <select
                      className="h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      disabled={isStatusSaving}
                      value={selectedStatus}
                      onChange={(event) => {
                        setSelectedStatus(event.target.value);
                        setStatusMessage("");
                      }}
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                    disabled={isStatusSaving || selectedStatus === voc.status}
                    onClick={handleStatusChange}
                    type="button"
                  >
                    {isStatusSaving && (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    )}
                    {isStatusSaving ? "처리 중..." : "상태 저장"}
                  </button>
                  {statusMessage && (
                    <p
                      className={`mt-2 text-xs ${
                        statusMessage.includes("실패")
                          ? "text-red-600"
                          : "text-green-700"
                      }`}
                    >
                      {statusMessage}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200/70">
              <h3 className="text-lg font-bold">내용</h3>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {voc.content}
              </p>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200/70">
              <h3 className="text-lg font-bold">첨부파일</h3>
              {attachments.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  첨부파일이 없습니다.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200">
                  {attachments.map((attachment) => (
                    <li
                      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                      key={attachment.id}
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {attachment.file_name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatFileSize(attachment.file_size)}
                        </p>
                      </div>
                      <button
                        className="h-10 w-fit rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                        onClick={() => handleDownloadAttachment(attachment.id)}
                        type="button"
                      >
                        다운로드
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200/70">
              <h3 className="text-lg font-bold">접속 정보</h3>
              <div className="mt-4 grid gap-4 text-sm">
                <InfoItem label="IP" value={voc.ip_address ?? "-"} />
                <InfoItem label="User-Agent" value={voc.user_agent ?? "-"} />
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200/70">
              <h3 className="text-lg font-bold">운영 기록</h3>
              <p className="mt-4 text-sm text-slate-700">
                최근 업데이트:{" "}
                {latestActivity
                  ? `${formatDateTime(latestActivity.created_at)} (${latestActivity.actor_name})`
                  : "-"}
              </p>
              {latestActivity && (
                <p className="mt-2 text-sm text-slate-500">
                  변경 상태: {latestActivity.to_status}
                </p>
              )}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

function formatFileSize(fileSize: number | null) {
  if (!fileSize) {
    return "크기 정보 없음";
  }

  if (fileSize < 1024 * 1024) {
    return `${Math.ceil(fileSize / 1024)}KB`;
  }

  return `${(fileSize / 1024 / 1024).toFixed(1)}MB`;
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 break-words text-slate-900">{value}</p>
    </div>
  );
}
