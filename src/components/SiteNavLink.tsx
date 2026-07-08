"use client";

import Link from "next/link";
import type { SiteNavLink as SiteNavLinkType } from "@/lib/site-nav";

type Props = {
  link: SiteNavLinkType;
  className: string;
  onNavigate?: () => void;
};

export default function SiteNavLink({ link, className, onNavigate }: Props) {
  const content = (
    <>
      {link.label}
      <span className="absolute -bottom-1 left-0 h-px w-0 bg-[#00d4ff] transition-all duration-300 group-hover:w-full" />
    </>
  );
  const style = { fontFamily: "var(--font-orbitron)" };

  if (link.kind === "external") {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        style={style}
        onClick={onNavigate}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={link.href} className={className} style={style} onClick={onNavigate}>
      {content}
    </Link>
  );
}
