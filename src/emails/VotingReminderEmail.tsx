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

interface VotingReminderEmailProps {
  reunionName: string;
  voteUrl: string;
  organizerName: string;
}

export function VotingReminderEmail({
  reunionName,
  voteUrl,
  organizerName,
}: VotingReminderEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Vote on dates for {reunionName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Heading style={heading}>Time to Vote!</Heading>
            <Text style={text}>
              {organizerName} has added date options for {reunionName}. Cast
              your vote to help pick the best dates.
            </Text>
            <Button href={voteUrl} style={button}>
              Vote Now
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default VotingReminderEmail;

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
  marginBottom: "16px",
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
