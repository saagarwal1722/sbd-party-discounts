import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shree Balaji Decor | Party Discount Manager",
  description: "Private party discount directory for Shree Balaji Decor."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
