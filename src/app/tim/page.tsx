import {
  marketingMetadata,
  marketingViewport,
} from "@/components/marketing/site";
import { TeamPage } from "@/components/marketing/team";

/**
 * Halaman tim situs publik. Versi Inggrisnya di `/en/tim`; slug-nya
 * sengaja sama supaya pengalih bahasa cukup menukar awalan `/en`.
 */
export const viewport = marketingViewport;
export const metadata = marketingMetadata("id", "team");

export default function TeamPageId() {
  return <TeamPage lang="id" />;
}
