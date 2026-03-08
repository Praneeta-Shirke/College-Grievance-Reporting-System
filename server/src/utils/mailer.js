import nodemailer from "nodemailer";

const senderEmail = process.env.OTP_SENDER_EMAIL || "praneetashirke30@gmail.com";
const gmailAppPassword =
  process.env.GmailAppPassword || process.env.OTP_SENDER_APP_PASSWORD || "";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.OTP_SENDER_EMAIL || senderEmail,
    pass: gmailAppPassword
  }
});

export const sendRegistrationOtpEmail = async (toEmail, otp) => {
  if (!process.env.OTP_SENDER_EMAIL || !gmailAppPassword) {
    throw new Error(
      "OTP email is not configured. Set OTP_SENDER_EMAIL and GmailAppPassword (or GMAIL_PASSWORD / OTP_SENDER_APP_PASSWORD)"
    );
  }

  await transporter.sendMail({
    from: senderEmail,
    to: toEmail,
    subject: "College Grievance Portal - Registration OTP",
    text: `Your registration OTP is ${otp}. It is valid for 10 minutes.`,
    html: `<p>Your registration OTP is <strong>${otp}</strong>.</p><p>It is valid for 10 minutes.</p>`
  });
};
