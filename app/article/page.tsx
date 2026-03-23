import { redirect } from "next/navigation";

export default function LegacyArticleRoute() {
  redirect("/articles");
}
