import nodemailer from "nodemailer";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

function createTransport() {
  const port = Number(process.env.SMTP_PORT ?? "587");
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
}

export async function sendEmailWithPdfAttachment(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  filename: string;
  pdf: Buffer;
}): Promise<{ success: true } | { success: false; error: string }> {
  if (!isEmailConfigured()) {
    return {
      success: false,
      error:
        "Email is not configured. Add SMTP_HOST, SMTP_FROM (and SMTP_USER/SMTP_PASS if required) to your environment.",
    };
  }

  try {
    const transport = createTransport();
    await transport.sendMail({
      from: process.env.SMTP_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html ?? input.text.replace(/\n/g, "<br>"),
      attachments: [
        {
          filename: input.filename,
          content: input.pdf,
          contentType: "application/pdf",
        },
      ],
    });
    return { success: true };
  } catch (error) {
    console.error("sendEmailWithPdfAttachment:", error);
    return { success: false, error: "Failed to send email. Check SMTP settings and try again." };
  }
}
