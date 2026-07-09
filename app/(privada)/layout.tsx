import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/ui/Sidebar";

export default async function LayoutPrivado({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar email={user.email ?? ""} />
      <main className="flex-1 px-5 py-8 md:px-10">{children}</main>
    </div>
  );
}
