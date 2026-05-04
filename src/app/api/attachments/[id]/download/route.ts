import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

const storageBucket = "voc-files";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.replace("Bearer ", "");

  if (!accessToken) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const { id } = await context.params;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { message: "사용자 권한 정보를 찾지 못했습니다." },
      { status: 403 },
    );
  }

  const { data: attachment, error: attachmentError } = await supabaseAdmin
    .from("voc_attachments")
    .select("id, voc_id, file_path")
    .eq("id", id)
    .single();

  if (attachmentError || !attachment) {
    return NextResponse.json(
      { message: "첨부파일을 찾지 못했습니다." },
      { status: 404 },
    );
  }

  const { data: voc, error: vocError } = await supabaseAdmin
    .from("vocs")
    .select("id, assigned_staff_id")
    .eq("id", attachment.voc_id)
    .single();

  if (vocError || !voc) {
    return NextResponse.json(
      { message: "VOC를 찾지 못했습니다." },
      { status: 404 },
    );
  }

  if (profile.role !== "admin" && voc.assigned_staff_id !== user.id) {
    return NextResponse.json(
      { message: "첨부파일을 다운로드할 권한이 없습니다." },
      { status: 403 },
    );
  }

  const { data: signedUrlData, error: signedUrlError } =
    await supabaseAdmin.storage
      .from(storageBucket)
      .createSignedUrl(attachment.file_path, 60);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    return NextResponse.json(
      { message: "다운로드 링크 생성에 실패했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    signedUrl: signedUrlData.signedUrl,
  });
}
