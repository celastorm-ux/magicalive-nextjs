import { LegalDocument } from "@/components/LegalDocument";

const sections = [
  {
    id: "information-we-collect",
    title: "Information We Collect",
    paragraphs: ["Account information:"],
    bullets: [
      "Name and display name",
      "Email address",
      "Password (stored securely via Clerk, never in plain text)",
      "Profile information (if you create a profile):",
      "Biography and location",
      "Profile photos and banner images",
      "Specialty tags and credentials",
      "Social media links",
      "Show and event listings",
      "Usage information:",
      "Pages visited and searches performed",
      "How you interact with other profiles",
      "Device type and browser",
      "IP address and approximate location",
    ],
  },
  {
    id: "how-we-use-your-information",
    title: "How We Use Your Information",
    paragraphs: [],
    bullets: [
      "To create and manage your account",
      "To display your public profile to other users",
      "To send booking request notifications",
      "To send emails you have opted into",
      "To improve the platform and fix issues",
      "To prevent fraud and abuse",
      "To comply with legal obligations",
    ],
  },
  {
    id: "information-we-share",
    title: "Information We Share",
    paragraphs: [
      "Public information:",
      "Service providers:",
      "We do not sell your personal data to third parties. We may share information if required by law.",
    ],
    bullets: [
      "Your profile is visible to anyone on the internet",
      "Your shows and events are publicly listed",
      "Your reviews are publicly visible",
      "Clerk: handles authentication and password security",
      "Supabase: stores your profile and platform data",
      "Resend: delivers email notifications",
      "Vercel: hosts the platform",
    ],
  },
  {
    id: "data-storage-and-security",
    title: "Data Storage and Security",
    paragraphs: [],
    bullets: [
      "Your data is stored securely via Supabase",
      "Passwords are never stored in plain text",
      "We use industry standard encryption",
      "We regularly review our security practices",
      "No method of transmission is 100% secure",
    ],
  },
  {
    id: "your-rights-and-choices",
    title: "Your Rights and Choices",
    paragraphs: ["You have the right to:"],
    bullets: [
      "Access your personal data at any time",
      "Correct inaccurate information via edit profile",
      "Delete your account and associated data",
      "Opt out of email notifications in dashboard settings",
      "Request a copy of your data by emailing us",
    ],
  },
  {
    id: "cookies",
    title: "Cookies",
    paragraphs: ["We use cookies and similar technologies for:"],
    bullets: [
      "Keeping you logged in (essential)",
      "Remembering your preferences (functional)",
      "Understanding how the platform is used (analytics)",
      "You can control cookies through your browser settings or our cookie consent banner.",
    ],
  },
  {
    id: "childrens-privacy",
    title: "Children's Privacy",
    paragraphs: [
      "PinnacleMagic is not directed at anyone under 18 years of age. We do not knowingly collect personal information from minors. If you believe a minor has created an account please contact us immediately.",
    ],
  },
  {
    id: "gdpr-rights",
    title: "GDPR Rights (European Users)",
    paragraphs: [
      "If you are located in the European Economic Area you have additional rights under GDPR:",
      "To exercise these rights contact privacy@pinnaclemagic.com",
    ],
    bullets: [
      "Right to access your personal data",
      "Right to rectification of inaccurate data",
      "Right to erasure (right to be forgotten)",
      "Right to restrict processing",
      "Right to data portability",
      "Right to object to processing",
    ],
  },
  {
    id: "ccpa-rights",
    title: "CCPA Rights (California Users)",
    paragraphs: [
      "If you are a California resident you have the right to:",
      "To exercise these rights contact privacy@pinnaclemagic.com",
    ],
    bullets: [
      "Know what personal information we collect",
      "Know whether we sell your information (we do not)",
      "Delete your personal information",
      "Non-discrimination for exercising your rights",
    ],
  },
  {
    id: "third-party-links",
    title: "Third Party Links",
    paragraphs: [
      "PinnacleMagic may contain links to third party websites including social media profiles and ticket platforms. We are not responsible for the privacy practices of these sites.",
    ],
  },
  {
    id: "changes-to-this-policy",
    title: "Changes to This Policy",
    paragraphs: [
      "We may update this privacy policy from time to time. We will notify you of significant changes by email. The date at the top of this page shows when it was last updated.",
    ],
  },
  {
    id: "contact-us",
    title: "Contact Us",
    paragraphs: [
      "For privacy questions or to exercise your rights:",
      "Email: privacy@pinnaclemagic.com",
      "General: hello@pinnaclemagic.com",
    ],
  },
] as const;

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      titleAccent="Policy"
      lastUpdated="March 2026"
      intro="Your privacy is important to us. This policy explains how we collect use and protect your information."
      sections={sections}
    />
  );
}
