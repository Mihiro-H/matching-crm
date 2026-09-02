import { redirect } from "next/navigation";

// TODO(auth): 認証実装後は、セッション有無に応じて /login または /dashboard へ振り分ける
export default function RootPage() {
  redirect("/dashboard");
}
