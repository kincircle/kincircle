import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Preview,
  Heading,
} from "@react-email/components";

interface InviteEmailProps {
  reunionName: string;
  organizerName: string;
  inviteUrl: string;
  personalMessage?: string;
}

export function InviteEmail({
  reunionName,
  organizerName,
  inviteUrl,
  personalMessage,
}: InviteEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You&apos;re invited to {reunionName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Heading style={heading}>You&apos;re Invited!</Heading>
            <Text style={text}>
              {organizerName} has invited you to {reunionName}.
            </Text>
            {personalMessage && (
              <Section style={messageBlock}>
                <Text style={messageText}>{personalMessage}</Text>
              </Section>
            )}
            <Button href={inviteUrl} style={button}>
              RSVP Now
            </Button>
            <Hr style={hr} />
            <Text style={footer}>This invitation expires in 30 days.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default InviteEmail;

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

const heading = {
  fontSize: "24px",
  fontWeight: "bold" as const,
  color: "#1a1a1a",
  margin: "0 0 16px",
};

const text = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#4a4a4a",
};

const messageBlock = {
  backgroundColor: "#f0fdfa",
  borderLeft: "4px solid #0d9488",
  padding: "16px",
  margin: "20px 0",
  borderRadius: "4px",
};

const messageText = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#1a1a1a",
  fontStyle: "italic" as const,
  margin: "0",
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
  margin: "20px 0",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
};

const footer = {
  fontSize: "12px",
  color: "#8898aa",
  marginTop: "12px",
};
