import "@/app/globals.css";
import CookieBanner from "@/components/CookieBanner";
import Footer from "@/components/layout/Footer";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en">
      <body>
        {children}
        <CookieBanner />
        <Footer />
      </body>
    </html>
  );
}
