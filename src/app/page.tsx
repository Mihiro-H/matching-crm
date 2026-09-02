import { redirect } from "next/navigation";

// 未ログインの場合はsrc/proxy.tsが先に/loginへリダイレクトするため、
// ここに到達するのは認証済みの場合のみ。
export default function RootPage() {
  redirect("/dashboard");
}
