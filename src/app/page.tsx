"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import Footer from "@/components/Footer";
import VenaLandAppLanding from "@/components/VenaLandAppLanding";

export default function Home() {
  const [isAppDomain, setIsAppDomain] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (window.location.hostname.startsWith("app.")) {
      setIsAppDomain(true);
    }
  }, []);

  // Prevent hydration mismatch by not rendering anything until mounted
  if (!mounted) return null;

  if (isAppDomain) {
    return <VenaLandAppLanding />;
  }

  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <Footer />
      </main>
    </>
  );
}
