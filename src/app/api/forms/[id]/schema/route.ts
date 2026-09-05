import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// 別ドメインで公開する問い合わせフォームのブラウザから直接fetchされる想定のため、
// 読み取り専用のこのエンドポイントだけはCORSを許可する(内容は公開フォームの構成のみで
// 機微情報を含まないため)。送信用のPOST /api/webhooks/form は共有シークレットで
// 保護されており、フォーム側のバックエンドから呼ぶ想定でCORSは付けていない。
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

/**
 * 公開問い合わせフォーム(別ドメインで公開予定)向けの、フォーム構成の取得API。
 * 認証なしで呼べる公開エンドポイントのため、RLSを経由しないservice role
 * クライアントで明示的に必要な列だけを返す(access_token等の機微情報は扱わないテーブルだが、
 * 念のため他のwebhook/APIと同じ方針でadminクライアントを使う)。
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createSupabaseAdminClient();

  const { data: form, error: formError } = await admin
    .from("form_definitions")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();

  if (formError || !form) {
    return NextResponse.json({ error: "フォームが見つかりません。" }, { status: 404, headers: CORS_HEADERS });
  }

  const { data: fields, error: fieldsError } = await admin
    .from("form_fields")
    .select("field_key, label, answer_type, options, is_required, sort_order")
    .eq("form_id", id)
    .order("sort_order", { ascending: true });

  if (fieldsError) {
    return NextResponse.json({ error: fieldsError.message }, { status: 500, headers: CORS_HEADERS });
  }

  return NextResponse.json(
    {
      id: form.id,
      name: form.name,
      fields: (fields ?? []).map((field) => ({
        key: field.field_key,
        label: field.label,
        answerType: field.answer_type,
        options: field.options,
        required: field.is_required,
      })),
    },
    { headers: CORS_HEADERS }
  );
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
