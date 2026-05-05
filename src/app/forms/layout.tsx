import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Easy Forms — Document Review & Signing",
  description: "Review and sign your insurance documents securely.",
};

export default function FormsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-navy/5 via-background to-slate-blue/5 font-sans antialiased">
      {children}
    </div>
  );
}
