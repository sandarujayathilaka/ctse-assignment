const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const logger = require("./logger");
const config = require("../config");

// Default variables for email templates
const DEFAULT_VARS = {
  CompanyName: "AuthService",
  ContactEmail: "support@authservice.com",
  year: new Date().getFullYear(),
  SiteUrl: config.siteUrl || "http://localhost:3000",
};

/**
 * Configure email transport based on environment
 */
const createTransporter = () => {
  // In production, use actual SMTP settings
  if (process.env.NODE_ENV === "production") {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  // In development or test, use ethereal.email or local test account
  if (process.env.NODE_ENV === "test") {
    // For testing, use a mock transport that doesn't actually send emails
    return {
      sendMail: (mailOptions) => {
        logger.info("Test email would send:", mailOptions);
        return Promise.resolve({
          messageId: "test-message-id",
          envelope: { to: [mailOptions.to] },
        });
      },
    };
  }

  // For development, use ethereal.email (fake SMTP service for testing)
  return nodemailer.createTransport({
    host: process.env.ETHEREAL_HOST || "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: process.env.ETHEREAL_EMAIL || "ethereal.user@ethereal.email",
      pass: process.env.ETHEREAL_PASSWORD || "ethereal_password",
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

/**
 * Reads HTML template from file and replaces placeholders with actual values
 * @param {string} templateName - Name of the template file (without extension)
 * @param {object} variables - Variables to replace in the template
 * @returns {string} - Processed HTML content
 */
const processTemplate = (templateName, variables) => {
  // Merge default variables with provided ones
  const finalVars = { ...DEFAULT_VARS, ...variables };

  // Load template file
  const templatePath = path.join(
    __dirname,
    "..",
    "templates",
    "emails",
    `${templateName}.html`
  );

  try {
    let htmlTemplate = fs.readFileSync(templatePath, "utf-8");

    // Replace placeholders with actual values
    Object.keys(finalVars).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      htmlTemplate = htmlTemplate.replace(regex, finalVars[key]);
    });

    return htmlTemplate;
  } catch (error) {
    logger.error(`Error processing email template ${templateName}:`, error);
    // Fallback to a simple template
    return `
      <html>
        <body>
          <h1>${variables.subject || "Message from AuthService"}</h1>
          <p>${variables.message || "Please check your account."}</p>
        </body>
      </html>
    `;
  }
};

/**
 * Sends an email
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} templateName - Template name to use
 * @param {object} variables - Variables to replace in the template
 * @returns {Promise} - Result of sending the email
 */
const sendEmail = async (to, subject, templateName, variables) => {
  try {
    const transporter = createTransporter();
    const htmlContent = processTemplate(templateName, {
      ...variables,
      subject,
    });

    const mailOptions = {
      from: `${DEFAULT_VARS.CompanyName} <${
        process.env.EMAIL_USER || "notifications@authservice.com"
      }>`,
      to,
      subject,
      html: htmlContent,
      text:
        variables.message ||
        `Please view this email in an HTML-compatible email client.`,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId}`);

    return info;
  } catch (error) {
    logger.error("Error sending email:", error);
    throw error;
  }
};

/**
 * Sends an OTP email
 */
const sendOtpEmail = async (to, otp) => {
  return sendEmail(to, "Your Authentication Code", "otp-email", {
    otp,
    message: `Your authentication code is: ${otp}. This code will expire in 10 minutes.`,
  });
};

/**
 * Sends an account activation email
 */
const sendActivationEmail = async (to, token) => {
  const activationUrl = `${DEFAULT_VARS.SiteUrl}/api/auth/activate/${token}`;

  return sendEmail(to, "Activate Your Account", "activation-email", {
    activationUrl,
    message: `Please click on the link to activate your account: ${activationUrl}`,
  });
};

/**
 * Sends a password reset email
 */
const sendPasswordResetEmail = async (to, token) => {
  const resetUrl = `${DEFAULT_VARS.SiteUrl}/api/auth/reset-password/${token}`;

  return sendEmail(to, "Reset Your Password", "reset-password-email", {
    resetUrl,
    message: `You requested a password reset. Please click on the link to set a new password: ${resetUrl}`,
  });
};

module.exports = {
  sendEmail,
  sendOtpEmail,
  sendActivationEmail,
  sendPasswordResetEmail,
};
