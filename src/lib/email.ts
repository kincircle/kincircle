import { Resend } from "resend";
import { getEmailFrom, getResendApiKey } from "./env";

let _resend: Resend | null = null;

function isExternalServiceTestMode() {
  return (
    process.env.NODE_ENV === "test" ||
    process.env.KINCIRCLE_TEST_MODE === "1"
  );
}

function getResend() {
  if (!_resend) {
    _resend = new Resend(getResendApiKey());
  }
  return _resend;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "Unknown email delivery error";
}

export async function sendEmail({
  to,
  subject,
  react,
  html,
}: {
  to: string;
  subject: string;
  react?: React.ReactElement;
  html?: string;
}) {
  const renderedFromReact = react
    ? await (async () => {
        const { renderToStaticMarkup } = await import("react-dom/server");
        return `<!DOCTYPE html>${renderToStaticMarkup(react)}`;
      })()
    : undefined;

  const renderedHtml =
    html ?? renderedFromReact;

  if (!renderedHtml) {
    throw new Error(`Email "${subject}" is missing rendered HTML content.`);
  }

  if (isExternalServiceTestMode()) {
    console.info(`[test-email] ${subject} -> ${to}`);
    return {
      id: `test-email-${Date.now()}`,
    };
  }

  const { data, error } = await getResend().emails.send({
    from: getEmailFrom(),
    to,
    subject,
    html: renderedHtml,
  });

  if (error) {
    throw new Error(
      `Failed to send "${subject}" email to ${to}: ${getErrorMessage(error)}`,
    );
  }

  return data;
}
