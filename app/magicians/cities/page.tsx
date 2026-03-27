import { redirect } from "next/navigation";

/** City hub removed; directory dropdown handles filtering. */
export default function MagiciansCitiesRedirectPage() {
  redirect("/magicians");
}
