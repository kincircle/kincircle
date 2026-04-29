// Re-export the existing PotluckSection from the parent components directory,
// scoped under the plan/ namespace so page.tsx can import from a consistent path.
// The actual implementation lives in @/components/reunion/PotluckSection to avoid
// duplicating the client component logic.
export {
  PotluckSection,
  type PotluckListItem,
} from "@/components/reunion/PotluckSection";
