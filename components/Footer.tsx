import Link from "next/link";
import { CLASSES } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black">
      <div className={`${CLASSES.section} py-10`}>
        <div className={CLASSES.footerBar}>
          <div>
            <span className="ml-font-heading text-sm font-semibold text-zinc-300">
              Magic
              <span className="text-[var(--ml-gold)] italic">alive</span>
            </span>
            <span className="ml-2">© {new Date().getFullYear()} Magicalive</span>
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
            <Link href="/magicians/cities" className={CLASSES.footerLink}>
              Magicians by city
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
