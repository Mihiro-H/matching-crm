import { getDepartments, getUsers } from "@/lib/settings/get-permissions";
import { PermissionsPageClient } from "@/components/settings/permissions-page-client";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function SettingsPermissionsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-8">
        <h2 className="text-lg text-neutral-900">Supabase未接続です</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Supabaseの接続情報を .env に設定すると、権限設定が表示されます。
        </p>
      </div>
    );
  }

  const [departments, users] = await Promise.all([getDepartments(), getUsers()]);

  return <PermissionsPageClient departments={departments} users={users} />;
}
