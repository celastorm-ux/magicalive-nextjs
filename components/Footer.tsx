import Link from "next/link";
import { CLASSES } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black">
      <div className={`${CLASSES.section} py-10`}>
        <div className={CLASSES.footerBar}>
          <div>
            <span className="ml-font-heading text-sm font-semibold text-zinc-300">
              Pinnacle
              <span className="text-[var(--ml-gold)] italic">Magic</span>
            </span>
            <span className="ml-2">© {new Date().getFullYear()} PinnacleMagic</span>
          </div>
          <div className="flex flex-wrap gap-4 sm:gap-6">
            <Link href="/terms" className={CLASSES.footerLink}>
              Terms of Service
            </Link>
            <Link href="/privacy" className={CLASSES.footerLink}>
              Privacy Policy
            </Link>
            <Link href="/about" className={CLASSES.footerLink}>
              About
            </Link>
            <Link href="/contact" className={CLASSES.footerLink}>
              Contact
            </Link>
            <Link href="/for-magicians" className={CLASSES.footerLink}>
              For Magicians
            </Link>
            <Link href="/hire-a-magician" className={CLASSES.footerLink}>
              Hire a Magician
            </Link>
            <Link href="/magic-shows" className={CLASSES.footerLink}>
              Magic Shows
            </Link>
            <Link href="/groups" className={CLASSES.footerLink}>
              Groups
            </Link>
            <Link href="/submit-venue" className={CLASSES.footerLink}>
              Submit a venue
            </Link>
            <Link href="/magicians/los-angeles" className={CLASSES.footerLink}>
              Los Angeles
            </Link>
            <Link href="/magicians/new-york" className={CLASSES.footerLink}>
              New York
            </Link>
            <Link href="/magicians/chicago" className={CLASSES.footerLink}>
              Chicago
            </Link>
            <Link href="/magicians/las-vegas" className={CLASSES.footerLink}>
              Las Vegas
            </Link>
            <Link href="/magicians?city=London&country=United+Kingdom" className={CLASSES.footerLink}>
              London
            </Link>
            <Link href="/magicians?city=Sydney&country=Australia" className={CLASSES.footerLink}>
              Sydney
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
