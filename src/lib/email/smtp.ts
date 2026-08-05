import nodemailer from "nodemailer";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function getFromAddress(user: string): string {
  return process.env.SMTP_FROM?.trim() || `SPGPS <${user}>`;
}

function createTransport() {
  const host = process.env.SMTP_HOST?.trim() || "smtp.office365.com";
  const port = Number(process.env.SMTP_PORT || "587");
  const secure =
    process.env.SMTP_SECURE === "1" || process.env.SMTP_SECURE === "true";
  const user = requireEnv("SMTP_USER");
  const pass = requireEnv("SMTP_PASS");

  return {
    transport: nodemailer.createTransport({
      host,
      port,
      secure,
      requireTLS: !secure,
      auth: { user, pass },
    }),
    from: getFromAddress(user),
  };
}

export async function sendResetPasswordEmail(options: {
  to: string;
  resetUrl: string;
}): Promise<void> {
  const { transport, from } = createTransport();

  try {
    await transport.sendMail({
      from,
      to: options.to,
      subject: "รีเซ็ตรหัสผ่าน SPGPS",
      html: `
      <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#171717;max-width:480px">
        <h1 style="font-size:18px;margin:0 0 12px">รีเซ็ตรหัสผ่าน SPGPS</h1>
        <p style="margin:0 0 12px;font-size:14px">
          มีคำขอรีเซ็ตรหัสผ่านสำหรับบัญชีนี้ หากเป็นคุณ กดปุ่มด้านล่างภายใน
          <strong>1 ชั่วโมง</strong>
        </p>
        <p style="margin:0 0 20px">
          <a href="${options.resetUrl}"
             style="display:inline-block;background:#171717;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-size:14px">
            ตั้งรหัสผ่านใหม่
          </a>
        </p>
        <p style="margin:0 0 8px;font-size:12px;color:#666">
          หรือคัดลอกลิงก์นี้:<br/>
          <a href="${options.resetUrl}" style="color:#171717;word-break:break-all">${options.resetUrl}</a>
        </p>
        <p style="margin:16px 0 0;font-size:12px;color:#666">
          หากคุณไม่ได้ขอรีเซ็ต สามารถเพิกเฉยอีเมลนี้ได้
        </p>
      </div>
    `,
      text: `รีเซ็ตรหัสผ่าน SPGPS\n\nเปิดลิงก์นี้ภายใน 1 ชั่วโมง:\n${options.resetUrl}\n\nหากคุณไม่ได้ขอรีเซ็ต ให้เพิกเฉยอีเมลนี้`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send reset email";
    throw new Error(message);
  } finally {
    transport.close();
  }
}
