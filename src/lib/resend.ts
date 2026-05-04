import "server-only";

import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail = process.env.RESEND_FROM_EMAIL;

if (!resendApiKey) {
  throw new Error("Missing RESEND_API_KEY");
}

if (!resendFromEmail) {
  throw new Error("Missing RESEND_FROM_EMAIL");
}

export const resend = new Resend(resendApiKey);
export const resendSender = `VOC 시스템 <${resendFromEmail}>`;
