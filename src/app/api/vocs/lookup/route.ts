import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { supabaseAdmin } from "@/lib/supabase-admin";

const lookupErrorMessage = "접수번호 또는 비밀번호가 올바르지 않습니다.";

type LookupRequestBody = {
  receiptNo?: unknown;
  password?: unknown;
};

const toText = (value: unknown) => {
  return typeof value === "string" ? value.trim() : "";
};

export async function POST(request: Request) {
  let body: LookupRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "요청 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const receiptNo = toText(body.receiptNo);
  const password = toText(body.password);
  const errors: Record<string, string> = {};

  if (!receiptNo) {
    errors.receiptNo = "접수번호를 입력해주세요.";
  }

  if (!password) {
    errors.password = "조회용 비밀번호를 입력해주세요.";
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      { message: "입력값을 확인해주세요.", errors },
      { status: 400 },
    );
  }

  const { data: voc, error: vocError } = await supabaseAdmin
    .from("vocs")
    .select(
      "id, created_at, updated_at, company, category, writer_name, department, phone, email, title, content, status, password_hash",
    )
    .eq("id", receiptNo)
    .maybeSingle();

  if (vocError || !voc || !voc.password_hash) {
    return NextResponse.json(
      { message: lookupErrorMessage },
      { status: 401 },
    );
  }

  const isPasswordValid = await bcrypt.compare(password, voc.password_hash);

  if (!isPasswordValid) {
    return NextResponse.json(
      { message: lookupErrorMessage },
      { status: 401 },
    );
  }

  const safeVoc = {
    id: voc.id,
    created_at: voc.created_at,
    updated_at: voc.updated_at,
    company: voc.company,
    category: voc.category,
    writer_name: voc.writer_name,
    department: voc.department,
    phone: voc.phone,
    email: voc.email,
    title: voc.title,
    content: voc.content,
    status: voc.status,
  };

  const [{ data: attachments }, { data: activities }] = await Promise.all([
    supabaseAdmin
      .from("voc_attachments")
      .select("id, file_name, file_size, created_at")
      .eq("voc_id", safeVoc.id)
      .order("created_at", { ascending: true }),
    supabaseAdmin
      .from("voc_activities")
      .select("id, created_at, from_status, to_status, email_sent")
      .eq("voc_id", safeVoc.id)
      .order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({
    voc: safeVoc,
    attachments: attachments ?? [],
    activities: activities ?? [],
  });
}
