"use client";

import Image from "next/image";
import { PROJECT } from "@/lib/project";

type BrandLogoProps = {
  size?: "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  className?: string;
};

const sizes = {
  sm: { box: 44, img: 400 },
  md: { box: 52, img: 400 },
  lg: { box: 64, img: 400 },
  xl: { box: 128, img: 400 },
};

export default function BrandLogo({
  size = "md",
  showWordmark = true,
  className = "",
}: BrandLogoProps) {
  const dim = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className="relative flex-shrink-0"
        style={{ width: dim.box, height: dim.box }}
      >
        <Image
          src={PROJECT.logoPath}
          alt={`${PROJECT.name} logo`}
          width={dim.img}
          height={dim.img}
          quality={95}
          className="w-full h-full object-contain"
          priority
          unoptimized
        />
      </div>
      {showWordmark && (
        <div className="flex flex-col min-w-0">
          <span
            className="font-black text-lg sm:text-xl tracking-[0.28em] text-white leading-none"
            style={{ fontFamily: "var(--font-orbitron)" }}
          >
            {PROJECT.name}
          </span>
          <span className="text-[9px] tracking-[0.22em] text-[#00d4ff]/60 font-mono uppercase leading-none mt-0.5">
            {PROJECT.taglineShort}
          </span>
        </div>
      )}
    </div>
  );
}
