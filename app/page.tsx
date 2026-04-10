import JsonLd from "@/components/JsonLd";
import { siteBaseUrl } from "@/lib/pinnaclemagic-resend";
import HomeClient from "./HomeClient";

export default function Home() {
  const base = siteBaseUrl();
  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "PinnacleMagic",
    url: base,
    description:
      "The world's magic community — discover magicians, browse shows, and explore venues.",
    sameAs: [] as string[],
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "PinnacleMagic",
    url: base,
    potentialAction: {
      "@type": "SearchAction",
      target: `${base}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <JsonLd data={[org, website]} />
      <HomeClient />
    </>
  );
}
