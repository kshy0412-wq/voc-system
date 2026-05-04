import { NextRequest, NextResponse } from "next/server";

import { createVocStatusEmailHtml } from "@/components/emails/VocStatusEmail";
import { resend, resendSender } from "@/lib/resend";
import { supabaseAdmin } from "@/lib/supabase-admin";

const statuses = ["접수", "검토중", "처리중", "완료", "반려"] as const;

type Status = (typeof statuses)[number];

type StatusRequestBody = {
  status?: unknown;
};

const isStatus = (value: string): value is Status => {
  return statuses.includes(value as Status);
};

export async function PATCH(
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

  let body: StatusRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "요청 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const nextStatus = typeof body.status === "string" ? body.status.trim() : "";

  if (!isStatus(nextStatus)) {
    return NextResponse.json(
      { message: "상태값이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const { id } = await context.params;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, name, email, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { message: "사용자 권한 정보를 찾지 못했습니다." },
      { status: 403 },
    );
  }

  const { data: voc, error: vocError } = await supabaseAdmin
    .from("vocs")
    .select("id, company, category, title, email, status, assigned_staff_id")
    .eq("id", id)
    .single();

  if (vocError || !voc) {
    return NextResponse.json(
      { message: "VOC를 찾지 못했습니다." },
      { status: 404 },
    );
  }

  if (profile.role !== "admin" && voc.assigned_staff_id !== user.id) {
    return NextResponse.json(
      { message: "상태를 변경할 권한이 없습니다." },
      { status: 403 },
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from("vocs")
    .update({ status: nextStatus })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { message: "상태 변경에 실패했습니다." },
      { status: 500 },
    );
  }

  let emailSent = false;
  let emailErrorMessage: string | null = null;

  if (nextStatus === "완료" || nextStatus === "반려") {
    const { error: emailError } = await resend.emails.send({
      from: resendSender,
      to: [voc.email],
      subject: `[VOC ${nextStatus}] ${voc.company} / ${voc.category} - ${voc.title}`,
      html: createVocStatusEmailHtml({
        status: nextStatus,
        company: voc.company,
        category: voc.category,
        title: voc.title,
        vocId: voc.id,
      }),
    });

    if (emailError) {
      console.error("VOC status email failed:", emailError);
      emailErrorMessage = JSON.stringify(emailError);
    } else {
      emailSent = true;
    }
  }

  const { data: activity, error: activityError } = await supabaseAdmin
    .from("voc_activities")
    .insert({
      voc_id: voc.id,
      actor_id: user.id,
      actor_name: profile.name ?? user.email ?? "사용자",
      action: "status_changed",
      from_status: voc.status,
      to_status: nextStatus,
      email_sent: emailSent,
      email_error: emailErrorMessage,
    })
    .select("created_at, actor_name, to_status")
    .single();

  if (activityError) {
    console.error("VOC activity log failed:", activityError);
  }

  return NextResponse.json({
    message: "상태가 변경되었습니다.",
    status: nextStatus,
    activity: activity
      ? {
          createdAt: activity.created_at,
          actorName: activity.actor_name,
          toStatus: activity.to_status,
        }
      : null,
  });
}
