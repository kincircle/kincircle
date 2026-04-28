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

interface FinalPlanEmailProps {
  reunionName: string;
  startDate: string;
  endDate: string;
  locationName: string;
  planUrl: string;
  organizerName: string;
}

export function FinalPlanEmail({
  reunionName,
  startDate,
  endDate,
  locationName,
  planUrl,
  organizerName,
}: FinalPlanEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Final plan for {reunionName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Heading style={heading}>The Plan is Set!</Heading>
            <Text style={text}>
              {organizerName} has finalized the plan for {reunionName}.
            </Text>
            <Section style={detailsBlock}>
              <Text style={detailsLabel}>Dates</Text>
              <Text style={detailsValue}>
                {startDate} – {endDate}
              </Text>
              <Hr style={detailsDivider} />
              <Text style={detailsLabel}>Location</Text>
              <Text style={detailsValue}>{locationName}</Text>
            </Section>
            <Button href={planUrl} style={button}>
              View Full Plan
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default FinalPlanEmail;

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

const detailsBlock = {
  backgroundColor: "#f0fdfa",
  padding: "20px",
  margin: "24px 0",
  borderRadius: "8px",
  border: "1px solid #99f6e4",
};

const detailsLabel = {
  fontSize: "12px",
  fontWeight: "bold" as const,
  textTransform: "uppercase" as const,
  color: "#0d9488",
  marginBottom: "4px",
  letterSpacing: "0.5px",
};

const detailsValue = {
  fontSize: "16px",
  color: "#1a1a1a",
  margin: "0 0 16px",
  fontWeight: "500" as const,
};

const detailsDivider = {
  borderColor: "#99f6e4",
  margin: "16px 0",
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
