import Header from "@/components/Header";
import Footer from "@/components/Footer";

type Props = {
  children: React.ReactNode;
};

/** Shared shell for marketing routes (header offset for fixed nav). */
export default function MarketingPage({ children }: Props) {
  return (
    <>
      <Header />
      <main className="pt-20">{children}</main>
      <Footer />
    </>
  );
}
