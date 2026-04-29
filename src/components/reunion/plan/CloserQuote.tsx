export function CloserQuote({
  organizerName,
}: {
  organizerName: string | null;
}) {
  return (
    <section className="kc-closer">
      <blockquote>See you under the string lights.</blockquote>
      <cite>- {organizerName ?? "The host"}</cite>
    </section>
  );
}
