import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Preview,
  Heading,
} from "@react-email/components";

interface ReunionUpdateEmailProps {
  reunionName: string;
  updateTitle: string;
  updateMessage: string;
  appUrl: string;
  reunionId: string;
}

export function ReunionUpdateEmail({
  reunionName,
  updateTitle,
  updateMessage,
  appUrl,
  reunionId,
}: ReunionUpdateEmailProps) {
  const reunionUrl = `${appUrl.replace(/\/$/, "")}/reunion/${reunionId}`;

  return (
    <Html>
      <Head />
      <Preview>Update from {reunionName}: {updateTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Heading style={heading}>{reunionName}</Heading>
            <Text style={eyebrow}>New reunion update</Text>
            <Heading as="h2" style={subheading}>
              {updateTitle}
            </Heading>
            <Text style={message}>{updateMessage}</Text>
            <Button href={reunionUrl} style={button}>
              View Reunion
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default ReunionUpdateEmail;

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "560px",
  borderRadius: "8px",
};

const eyebrow = {
  fontSize: "12px",
  fontWeight: "bold" as const,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "#0d9488",
  margin: "0 0 8px",
};

const heading = {
  fontSize: "24px",
  fontWeight: "bold" as const,
  color: "#1a1a1a",
  margin: "0 0 16px",
};

const subheading = {
  fontSize: "20px",
  fontWeight: "bold" as const,
  color: "#1a1a1a",
  margin: "0 0 16px",
};

const message = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#4a4a4a",
  whiteSpace: "pre-wrap" as const,
  margin: "0 0 20px",
};

const button = {
  backgroundColor: "#0d9488",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 24px",
  marginTop: "20px",
};
