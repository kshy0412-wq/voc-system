import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { resend, resendSender } from "@/lib/resend";
import { supabaseAdmin } from "@/lib/supabase-admin";

const companies = ["Ramos", "CTST"] as const;
const categories = ["고충", "제안", "안전", "소통", "시스템문의", "기타"] as const;

type Company = (typeof companies)[number];
type Category = (typeof categories)[number];

type VocRequestBody = {
  company?: unknown;
  category?: unknown;
  writerName?: unknown;
  department?: unknown;
  phone?: unknown;
  email?: unknown;
  title?: unknown;
  content?: unknown;
  lookupPassword?: unknown;
  privacyAgreed?: unknown;
};

const storageBucket = "voc-files";

const isCompany = (value: string): value is Company => {
  return companies.includes(value as Company);
};

const isCategory = (value: string): value is Category => {
  return categories.includes(value as Category);
};

const toText = (value: unknown) => {
  return typeof value === "string" ? value.trim() : "";
};

const toSafeFileName = (fileName: string) => {
  return fileName.replaceAll(/[^a-zA-Z0-9._-]/g, "_");
};

const getClientIp = (request: NextRequest) => {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  return request.headers.get("x-real-ip");
};

export async function POST(request: NextRequest) {
  let body: VocRequestBody;
  let files: File[] = [];

  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      body = {
        company: formData.get("company"),
        category: formData.get("category"),
        writerName: formData.get("writerName"),
        department: formData.get("department"),
        phone: formData.get("phone"),
        email: formData.get("email"),
        title: formData.get("title"),
        content: formData.get("content"),
        lookupPassword: formData.get("lookupPassword"),
        privacyAgreed: formData.get("privacyAgreed") === "true",
      };
      files = formData
        .getAll("files")
        .filter((file): file is File => file instanceof File && file.size > 0);
    } else {
      body = await request.json();
    }
  } catch {
    return NextResponse.json(
      { message: "요청 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const company = toText(body.company);
  const category = toText(body.category);
  const writerName = toText(body.writerName);
  const department = toText(body.department);
  const phone = toText(body.phone);
  const email = toText(body.email);
  const title = toText(body.title);
  const content = toText(body.content);
  const lookupPassword = toText(body.lookupPassword);
  const privacyAgreed = body.privacyAgreed === true;

  const errors: Record<string, string> = {};

  if (!isCompany(company)) {
    errors.company = "회사를 선택해주세요.";
  }

  if (!isCategory(category)) {
    errors.category = "유형을 선택해주세요.";
  }

  if (!writerName) {
    errors.writerName = "작성자 이름을 입력해주세요.";
  }

  if (!email) {
    errors.email = "이메일을 입력해주세요.";
  }

  if (!title) {
    errors.title = "제목을 입력해주세요.";
  }

  if (!content) {
    errors.content = "내용을 입력해주세요.";
  }

  if (lookupPassword.length < 6) {
    errors.lookupPassword = "조회용 비밀번호는 6자 이상 입력해주세요.";
  }

  if (!privacyAgreed) {
    errors.privacyAgreed = "개인정보 수집 및 처리에 동의해주세요.";
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      { message: "입력값을 확인해주세요.", errors },
      { status: 400 },
    );
  }

  const { data: assignmentRule, error: assignmentRuleError } =
    await supabaseAdmin
      .from("assignment_rules")
      .select("staff_id")
      .eq("company", company)
      .eq("category", category)
      .single();

  if (assignmentRuleError || !assignmentRule) {
    return NextResponse.json(
      { message: "해당 회사와 유형에 배정된 담당자가 없습니다." },
      { status: 400 },
    );
  }

  const { data: assignedStaff, error: assignedStaffError } =
    await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", assignmentRule.staff_id)
      .single();

  if (assignedStaffError || !assignedStaff?.email) {
    return NextResponse.json(
      { message: "배정된 담당자 이메일을 찾지 못했습니다." },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(lookupPassword, 10);

  const { data: voc, error: insertError } = await supabaseAdmin
    .from("vocs")
    .insert({
      company,
      category,
      writer_name: writerName,
      department: department || null,
      phone: phone || null,
      email,
      title,
      content,
      password_hash: passwordHash,
      privacy_agreed: privacyAgreed,
      status: "접수",
      assigned_staff_id: assignmentRule.staff_id,
      ip_address: getClientIp(request),
      user_agent: request.headers.get("user-agent"),
    })
    .select("id")
    .single();

  if (insertError || !voc) {
    return NextResponse.json(
      { message: "VOC 저장 중 문제가 발생했습니다." },
      { status: 500 },
    );
  }

  if (files.length > 0) {
    const attachments = [];

    for (const file of files) {
      const safeFileName = toSafeFileName(file.name);
      const filePath = `${voc.id}/${crypto.randomUUID()}-${safeFileName}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from(storageBucket)
        .upload(filePath, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        console.error("VOC attachment upload failed:", uploadError);
        return NextResponse.json(
          { message: "첨부파일 업로드 중 문제가 발생했습니다." },
          { status: 500 },
        );
      }

      attachments.push({
        voc_id: voc.id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
      });
    }

    const { error: attachmentInsertError } = await supabaseAdmin
      .from("voc_attachments")
      .insert(attachments);

    if (attachmentInsertError) {
      console.error("VOC attachment insert failed:", attachmentInsertError);
      return NextResponse.json(
        { message: "첨부파일 정보 저장 중 문제가 발생했습니다." },
        { status: 500 },
      );
    }
  }

  const { error: emailError } = await resend.emails.send({
    from: resendSender,
    to: [assignedStaff.email],
    subject: `[VOC 접수] ${company} / ${category} - ${title}`,
    text: [
      "새 VOC가 접수되었습니다.",
      "",
      `회사: ${company}`,
      `유형: ${category}`,
      `제목: ${title}`,
      `작성자: ${writerName}`,
      `접수 ID: ${voc.id}`,
    ].join("\n"),
  });

  if (emailError) {
    console.error("Failed to send VOC notification email:", emailError);
  }

  return NextResponse.json(
    {
      message: "VOC가 접수되었습니다.",
      vocId: voc.id,
    },
    { status: 201 },
  );
}
