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

interface DateLockedEmailProps {
  reunionName: string;
  startDate: string;
  endDate: string;
  reunionUrl: string;
}

export function DateLockedEmail({
  reunionName,
  startDate,
  endDate,
  reunionUrl,
}: DateLockedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Date confirmed for {reunionName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Heading style={heading}>Date Confirmed!</Heading>
            <Text style={text}>
              The dates for {reunionName} have been set: {startDate} – {endDate}
              .
            </Text>
            <Button href={reunionUrl} style={button}>
              View Reunion Details
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default DateLockedEmail;

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
