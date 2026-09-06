import { notFound } from "next/navigation";
import { getPublicFormById } from "@/lib/forms/get-public-form";
import { getPublicOrganizationProfile } from "@/lib/settings/organization-profile";
import { PublicContactForm } from "@/components/forms/public-contact-form";
import { Logo } from "@/components/layout/logo";

/**
 * 公開問い合わせフォーム(認証不要)。URLは短い連番(form_definitions.number)を使う
 * (フォーム編集画面の公開URL案内、resolve-form-id.tsと同じ理由)。
 * フォーム管理(/forms/[id])で構成した項目をその場で描画し、送信するとpeople(担当者)+
 * deals(商談)が作成される(実処理はsubmitFormSubmission、共有シークレット不要の
 * Server Action経由)。(app) route groupの外に置き、SideNav/Header等の管理画面レイアウトを
 * 一切持たない。
 */
export default async function PublicContactFormPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId: numberParam } = await params;

  const [form, organization] = await Promise.all([
    getPublicFormById(numberParam),
    getPublicOrganizationProfile(),
  ]);

  if (!form) {
    notFound();
  }

  // 「個人情報の取扱いへの同意」は常に最後の項目として表示する(admin側の並び順に
  // 依らず保証するため、公開ページの描画時にここで並べ替える)。
  const consentField = form.fields.find((f) => f.fieldKey === "privacy_consent");
  const otherFields = form.fields.filter((f) => f.fieldKey !== "privacy_consent");
  const orderedFields = consentField ? [...otherFields, consentField] : otherFields;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl text-neutral-900">{form.name}</h1>
        {organization.logoUrl || organization.companyName ? (
          // 設定 > 会社情報でロゴ・会社名が設定されている場合はそちらを優先表示する。
          <div className="flex items-center gap-2">
            {organization.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- 外部URLで管理者が設定する画像のため
              <img src={organization.logoUrl} alt={organization.companyName ?? ""} className="h-8 max-w-[160px] object-contain" />
            )}
            {organization.companyName && (
              <span className="text-sm text-neutral-600">{organization.companyName}</span>
            )}
          </div>
        ) : (
          // デフォルトはCRM左サイドバー上部と同じロゴ(components/layout/logo.tsx)を表示する。
          <Logo />
        )}
      </div>

      <PublicContactForm formId={form.id} fields={orderedFields} />
    </div>
  );
}
