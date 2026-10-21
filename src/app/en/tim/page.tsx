import {
  marketingMetadata,
  marketingViewport,
} from "@/components/marketing/site";
import { TeamPage } from "@/components/marketing/team";

/** Versi bahasa Inggris dari `/tim`. */
export const viewport = marketingViewport;
export const metadata = marketingMetadata("en", "team");

export default function TeamPageEn() {
  return <TeamPage lang="en" />;
}
