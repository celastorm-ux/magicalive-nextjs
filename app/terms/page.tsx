import { LegalDocument } from "@/components/LegalDocument";

const sections = [
  {
    id: "acceptance-of-terms",
    title: "Acceptance of Terms",
    paragraphs: [
      "By accessing or using Magicalive you agree to be bound by these terms. If you disagree with any part you may not access the service.",
    ],
  },
  {
    id: "description-of-service",
    title: "Description of Service",
    paragraphs: [
      "Magicalive is an online directory and community platform connecting professional magicians with fans, event organisers and venues. We provide tools for magicians to create profiles, list shows, and receive booking enquiries.",
    ],
  },
  {
    id: "user-accounts",
    title: "User Accounts",
    paragraphs: [],
    bullets: [
      "You must provide accurate and complete information",
      "You are responsible for maintaining account security",
      "You must be at least 18 years old to create an account",
      "You must notify us immediately of any unauthorised access",
      "We reserve the right to suspend or terminate accounts that violate these terms",
    ],
  },
  {
    id: "magician-profiles",
    title: "Magician Profiles",
    paragraphs: [],
    bullets: [
      "Profile content must be accurate and not misleading",
      "You may not impersonate other performers",
      "You retain ownership of your content",
      "You grant Magicalive a license to display your content on the platform",
      "We may remove profiles that violate our community guidelines",
    ],
  },
  {
    id: "bookings-and-transactions",
    title: "Bookings and Transactions",
    paragraphs: [],
    bullets: [
      "Magicalive facilitates connections between magicians and clients",
      "We are not a party to any agreement between users",
      "We are not responsible for the quality of performances",
      "We are not liable for disputes between users",
      "Future payment processing will be subject to additional terms",
    ],
  },
  {
    id: "community-guidelines",
    title: "Community Guidelines",
    paragraphs: [],
    bullets: [
      "No spam, harassment or abusive behaviour",
      "No false reviews or fake profiles",
      "No copyright infringement",
      "No impersonation of other users",
      "No content that is illegal, harmful or offensive",
      "We may remove content that violates these guidelines at our sole discretion",
    ],
  },
  {
    id: "intellectual-property",
    title: "Intellectual Property",
    paragraphs: [],
    bullets: [
      "The Magicalive name, logo and design are our property",
      "User generated content remains owned by the user",
      "You grant us a worldwide license to use display and distribute your content on the platform",
      "You may not copy or reproduce our platform design",
    ],
  },
  {
    id: "limitation-of-liability",
    title: "Limitation of Liability",
    paragraphs: [],
    bullets: [
      "The service is provided on an as is basis",
      "We make no warranties about the availability or accuracy of the service",
      "We are not liable for any indirect or consequential damages",
      "Our maximum liability is limited to fees paid in the preceding 12 months",
    ],
  },
  {
    id: "privacy",
    title: "Privacy",
    paragraphs: [
      "Your use of Magicalive is also governed by our Privacy Policy which is incorporated into these terms by reference.",
    ],
  },
  {
    id: "modifications-to-terms",
    title: "Modifications to Terms",
    paragraphs: [
      "We reserve the right to modify these terms at any time. We will notify users of material changes by email. Continued use of the platform after changes constitutes acceptance of the new terms.",
    ],
  },
  {
    id: "governing-law",
    title: "Governing Law",
    paragraphs: [
      "These terms are governed by the laws of the United States. Any disputes will be resolved in the courts of the United States.",
    ],
  },
  {
    id: "contact-us",
    title: "Contact Us",
    paragraphs: ["For legal questions please contact us at hello@magicalive.com"],
  },
] as const;

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      titleAccent="Service"
      lastUpdated="March 2026"
      intro="Please read these terms carefully before using Magicalive"
      sections={sections}
    />
  );
}
