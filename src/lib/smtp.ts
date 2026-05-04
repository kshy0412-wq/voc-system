import "server-only";

import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT ?? "25");
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM;

if (!smtpHost) {
  throw new Error("Missing SMTP_HOST");
}

if (!smtpFrom) {
  throw new Error("Missing SMTP_FROM");
}

export const smtpSender = `VOC 시스템 <${smtpFrom}>`;

export const smtpTransporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: false,
  auth:
    smtpUser && smtpPass
      ? {
          user: smtpUser,
          pass: smtpPass,
        }
      : undefined,
});
