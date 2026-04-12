import nodemailer from 'nodemailer';

// ── SMTP Transport (Gmail) ──

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ── Email templates ──

interface MatchEmailData {
  toEmail: string;
  matchCount: number;
  topScore: number;
  dashboardUrl: string;
}

/**
 * Send a "new matches" email to a user.
 */
export async function sendMatchEmail(data: MatchEmailData): Promise<void> {
  const { toEmail, matchCount, topScore, dashboardUrl } = data;

  const subject = matchCount === 1
    ? 'New contract match found!'
    : `${matchCount} new contract matches found!`;

  const text = [
    `Hi,`,
    ``,
    matchCount === 1
      ? `We found a contract matching your profile (score: ${topScore}/100).`
      : `We found ${matchCount} contracts matching your profile. Best match score: ${topScore}/100.`,
    ``,
    `View your matches: ${dashboardUrl}`,
    ``,
    `—`,
    `Contract Finder`,
    ``,
    `To stop receiving these emails, disable Contract Finder on your dashboard.`,
  ].join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #111827; margin-bottom: 0.5rem;">${subject}</h2>
      <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
        ${matchCount === 1
          ? `We found a contract matching your profile with a relevance score of <strong>${topScore}/100</strong>.`
          : `We found <strong>${matchCount} contracts</strong> matching your profile. Best match score: <strong>${topScore}/100</strong>.`
        }
      </p>
      <a href="${dashboardUrl}"
         style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white;
                text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; margin: 16px 0;">
        View Your Matches
      </a>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">
        To stop receiving these emails, disable Contract Finder on your
        <a href="${dashboardUrl}" style="color: #6b7280;">dashboard</a>.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'Contract Finder <noreply@contractfinder.dev>',
    to: toEmail,
    subject,
    text,
    html,
  });
}

/**
 * Verify SMTP connection is working.
 * Useful for health checks.
 */
export async function verifySMTP(): Promise<boolean> {
  try {
    await transporter.verify();
    return true;
  } catch {
    return false;
  }
}
