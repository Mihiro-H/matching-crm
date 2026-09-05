import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getPagePermission } from "@/lib/auth/page-access";
import { getValidMisocaAccessToken } from "@/lib/misoca/token-store";
import { getInvoicePdf } from "@/lib/misoca/client";

/**
 * 請求書PDFのプロキシ配信(SCREEN_SPEC.md 7章)。
 * MisocaのPDF取得APIはアクセストークンが必要でブラウザから直接は叩けないため、
 * Orbitサーバー側でトークン付きで取得し、そのままバイト列を返す。
 * notFound()/redirect()はRoute Handler内では正しく機能しないため、
 * requirePageAccess()ではなくgetPagePermission()で権限だけ確認する。
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const permission = await getPagePermission("invoices");
  if (permission === "hidden") {
    return NextResponse.json({ error: "この操作を行う権限がありません。" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("misoca_invoice_id")
    .eq("id", id)
    .maybeSingle();

  if (error || !invoice?.misoca_invoice_id) {
    return NextResponse.json({ error: "請求書が見つかりません。" }, { status: 404 });
  }

  const tokenResult = await getValidMisocaAccessToken();
  if (!tokenResult.ok) {
    return NextResponse.json({ error: tokenResult.error }, { status: 502 });
  }

  const pdfResult = await getInvoicePdf(tokenResult.accessToken, invoice.misoca_invoice_id);
  if (!pdfResult.ok) {
    return NextResponse.json({ error: pdfResult.error }, { status: 502 });
  }

  return new NextResponse(pdfResult.pdf, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="invoice-${id}.pdf"`,
    },
  });
}
