import nodemailer from "nodemailer";
import { config } from "./config";

type SendMailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

function hasSmtpConfig(): boolean {
  return Boolean(config.smtpHost && config.smtpUser && config.smtpPass && config.smtpFrom);
}

const transporter = hasSmtpConfig()
  ? nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    })
  : null;

export async function sendMail(input: SendMailInput): Promise<void> {
  if (!transporter) {
    console.warn(
      "[better-auth] SMTP is not configured; email delivery skipped",
      JSON.stringify({ to: input.to, subject: input.subject }),
    );
    return;
  }

  await transporter.sendMail({
    from: config.smtpFrom,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}
