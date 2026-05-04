"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  name: string;
  role: "admin" | "staff";
};

type Voc = {
  id: string;
  created_at: string;
  company: string;
  category: string;
  title: string;
  writer_name: string;
  status: string;
  assigned_staff_id: string | null;
};

const statuses = ["접수", "검토중", "처리중", "완료", "반려"];
const companies = ["Ramos", "CTST"];
const categories = ["고충", "제안", "안전", "소통", "시스템문의", "기타"];

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

export default function AdminVocsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [vocs, setVocs] = useState<Voc[]>([]);
  const [staffNames, setStaffNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [companyFilter, setCompanyFilter] = useState("전체");
  const [categoryFilter, setCategoryFilter] = useState("전체");
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest");

  useEffect(() => {
    const loadVocs = async () => {
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
        .select("id, name, role")
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
          "id, created_at, company, category, title, writer_name, status, assigned_staff_id",
        )
        .order("created_at", { ascending: sortOrder === "oldest" });

      if (currentProfile.role === "staff") {
        vocQuery = vocQuery.eq("assigned_staff_id", user.id);
      }

      if (statusFilter !== "전체") {
        vocQuery = vocQuery.eq("status", statusFilter);
      }

      if (companyFilter !== "전체") {
        vocQuery = vocQuery.eq("company", companyFilter);
      }

      if (categoryFilter !== "전체") {
        vocQuery = vocQuery.eq("category", categoryFilter);
      }

      const { data: vocData, error: vocError } = await vocQuery;

      if (vocError) {
        setErrorMessage("VOC 목록을 불러오지 못했습니다.");
        setIsLoading(false);
        return;
      }

      const vocRows = (vocData ?? []) as Voc[];
      setVocs(vocRows);

      if (currentProfile.role === "admin") {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, name");

        const nameMap = Object.fromEntries(
          (profilesData ?? []).map((staff) => [staff.id, staff.name]),
        );
        setStaffNames(nameMap);
      } else {
        setStaffNames({
          [currentProfile.id]: currentProfile.name,
        });
      }

      setIsLoading(false);
    };

    loadVocs();
  }, [categoryFilter, companyFilter, router, sortOrder, statusFilter]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40 px-4 py-8 text-slate-900">
      <section className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-600">VOC 관리</p>
            <h1 className="mt-2 text-3xl font-bold">VOC 목록</h1>
            <p className="mt-2 text-sm text-slate-600">
              {profile?.role === "admin"
                ? "관리자는 전체 VOC를 조회합니다."
                : "담당자는 본인에게 배정된 VOC만 조회합니다."}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <button
              className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
              onClick={handleLogout}
              type="button"
            >
              로그아웃
            </button>
            <div className="rounded-lg bg-white px-4 py-3 text-sm shadow-md ring-1 ring-slate-200/70">
              총 <span className="font-semibold">{vocs.length}</span>건
            </div>
          </div>
        </div>

        <div className="mb-4 grid gap-3 rounded-2xl bg-white p-4 shadow-md ring-1 ring-slate-200/70 sm:grid-cols-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">회사</span>
            <select
              className="h-11 rounded-xl border border-slate-300 px-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              value={companyFilter}
              onChange={(event) => setCompanyFilter(event.target.value)}
            >
              <option value="전체">전체</option>
              {companies.map((company) => (
                <option key={company} value={company}>
                  {company}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">유형</span>
            <select
              className="h-11 rounded-xl border border-slate-300 px-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="전체">전체</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">상태</span>
            <select
              className="h-11 rounded-xl border border-slate-300 px-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="전체">전체</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">정렬</span>
            <select
              className="h-11 rounded-xl border border-slate-300 px-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              value={sortOrder}
              onChange={(event) =>
                setSortOrder(event.target.value as "latest" | "oldest")
              }
            >
              <option value="latest">최신순</option>
              <option value="oldest">오래된순</option>
            </select>
          </label>
        </div>

        {isLoading && (
          <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-600 shadow-md ring-1 ring-slate-200/70">
            VOC 목록을 불러오는 중입니다.
          </div>
        )}

        {!isLoading && errorMessage && (
          <div className="rounded-2xl bg-red-50 p-8 text-sm text-red-700 shadow-md ring-1 ring-red-100">
            {errorMessage}
          </div>
        )}

        {!isLoading && !errorMessage && (
          <div className="overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-slate-200/70">
            <div className="hidden grid-cols-[150px_90px_110px_1fr_100px_100px_110px] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 md:grid">
              <div>등록일시</div>
              <div>회사</div>
              <div>유형</div>
              <div>제목</div>
              <div>작성자</div>
              <div>상태</div>
              <div>담당자</div>
            </div>

            {vocs.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-600">
                조회된 VOC가 없습니다.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {vocs.map((voc) => (
                  <article
                    className="grid gap-3 px-4 py-4 text-sm transition hover:bg-slate-50 md:grid-cols-[150px_90px_110px_1fr_100px_100px_110px] md:items-center md:gap-4"
                    key={voc.id}
                  >
                    <div className="text-slate-500">
                      {formatDateTime(voc.created_at)}
                    </div>
                    <div className="font-medium">{voc.company}</div>
                    <div>{voc.category}</div>
                    <div>
                      <Link
                        className="font-semibold text-blue-600 hover:underline"
                        href={`/admin/vocs/${voc.id}`}
                      >
                        {voc.title}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500 md:hidden">
                        {voc.id}
                      </p>
                    </div>
                    <div>{voc.writer_name}</div>
                    <div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getStatusBadgeClassName(
                          voc.status,
                        )}`}
                      >
                        {voc.status}
                      </span>
                    </div>
                    <div className="text-slate-600">
                      {voc.assigned_staff_id
                        ? staffNames[voc.assigned_staff_id] ?? "담당자"
                        : "미배정"}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
