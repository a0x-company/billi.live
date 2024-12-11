import Navbar from "@/components/navbar";

export default function TokenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-[1440px] mx-auto">{children}</main>
    </div>
  );
}
