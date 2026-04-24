import sendgridMail from "@sendgrid/mail";

import { logger } from "./logger.js";

const sendgridApiKey = process.env.SENDGRID_API_KEY || "";
const defaultFromEmail = process.env.SENDGRID_FROM_EMAIL || "noreply@swasthaparivar.app";

if (sendgridApiKey) {
  sendgridMail.setApiKey(sendgridApiKey);
}

export async function sendEmail({ to, subject, text, html }) {
  if (!to) {
    return;
  }

  if (!sendgridApiKey) {
    logger.info({
      route: "email",
      to,
      subject,
      configured: false,
    }, "Skipping email send because SENDGRID_API_KEY is missing");
    return;
  }

  await sendgridMail.send({
    to,
    from: defaultFromEmail,
    subject,
    text,
    html,
  });
}

export default sendEmail;
