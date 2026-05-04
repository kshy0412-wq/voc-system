type VocStatusEmailProps = {
  status: "완료" | "반려";
  company: string;
  category: string;
  title: string;
  vocId: string;
};

const escapeHtml = (value: string) => {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

export function createVocStatusEmailHtml({
  status,
  company,
  category,
  title,
  vocId,
}: VocStatusEmailProps) {
  const isCompleted = status === "완료";
  const theme = isCompleted
    ? {
        background: "#eff6ff",
        border: "#bfdbfe",
        badgeBackground: "#dcfce7",
        badgeText: "#166534",
        accent: "#2563eb",
        title: "접수한 VOC가 완료되었습니다.",
      }
    : {
        background: "#f8fafc",
        border: "#cbd5e1",
        badgeBackground: "#e2e8f0",
        badgeText: "#334155",
        accent: "#475569",
        title: "접수한 VOC가 반려되었습니다.",
      };

  const rows = [
    ["회사", company],
    ["유형", category],
    ["VOC 제목", title],
    ["접수 ID", vocId],
  ];

  return `
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(theme.title)}</title>
  </head>
  <body style="margin:0; padding:0; background:#f1f5f9; font-family:Arial, sans-serif; color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e2e8f0;">
            <tr>
              <td style="padding:28px 28px 20px; background:${theme.background}; border-bottom:1px solid ${theme.border};">
                <div style="font-size:13px; font-weight:700; color:${theme.accent}; margin-bottom:10px;">VOC 처리 결과 안내</div>
                <h1 style="margin:0; font-size:24px; line-height:1.35; color:#0f172a;">${escapeHtml(theme.title)}</h1>
                <div style="display:inline-block; margin-top:16px; padding:6px 12px; border-radius:999px; background:${theme.badgeBackground}; color:${theme.badgeText}; font-size:13px; font-weight:700;">
                  상태: ${escapeHtml(status)}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 20px; font-size:15px; line-height:1.7; color:#334155;">
                  접수하신 VOC의 처리 상태가 아래와 같이 변경되었습니다.
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden;">
                  ${rows
                    .map(
                      ([label, value]) => `
                  <tr>
                    <th align="left" style="width:120px; padding:14px 16px; background:#f8fafc; border-bottom:1px solid #e2e8f0; color:#475569; font-size:14px; font-weight:700;">
                      ${escapeHtml(label)}
                    </th>
                    <td style="padding:14px 16px; border-bottom:1px solid #e2e8f0; color:#0f172a; font-size:14px; line-height:1.6;">
                      ${escapeHtml(value)}
                    </td>
                  </tr>`,
                    )
                    .join("")}
                </table>
                <p style="margin:24px 0 0; font-size:15px; line-height:1.7; color:#334155;">
                  서비스를 이용해 주셔서 감사합니다.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px; background:#f8fafc; border-top:1px solid #e2e8f0; color:#64748b; font-size:12px; line-height:1.6;">
                본 메일은 VOC 관리 시스템에서 자동 발송되었습니다.<br />
                문의가 필요한 경우 담당 부서에 연락해 주세요.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}
