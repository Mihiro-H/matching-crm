import Link from "next/link";
import { getMisocaConnectionStatus } from "@/lib/misoca/get-connection-status";
import { getSlackConnectionStatus } from "@/lib/slack/get-connection-status";
import { MisocaDisconnectButton } from "@/components/settings/misoca-disconnect-button";
import { formatDateTimeJa } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function SettingsIntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ misocaConnected?: string; misocaError?: string }>;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-8">
        <h2 className="text-lg text-neutral-900">Supabase未接続です</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Supabaseの接続情報を .env に設定すると、連携状況が表示されます。
        </p>
      </div>
    );
  }

  const { misocaConnected, misocaError } = await searchParams;
  const status = await getMisocaConnectionStatus();
  const slackStatus = getSlackConnectionStatus();

  return (
    <div className="flex flex-col gap-4">
      {misocaConnected && (
        <div className="rounded-lg border border-success-bg bg-success-bg p-4 text-sm text-success-text">
          Misocaと連携しました。
        </div>
      )}
      {misocaError && (
        <div className="rounded-lg border border-danger-bg bg-danger-bg p-4 text-sm text-danger-text">
          連携に失敗しました: {misocaError}
        </div>
      )}

      <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-md text-neutral-900">Misoca</h3>
            <p className="mt-1 text-xs text-neutral-600">
              見積書・請求書のPDF発行、精算管理の入金状況同期に使用します。
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs ${
              status.connected ? "bg-success-bg text-success-text" : "bg-neutral-100 text-neutral-600"
            }`}
          >
            {status.connected ? "連携中" : "未連携"}
          </span>
        </div>

        {status.connected ? (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-sm text-neutral-600">
              {status.connectedByName ? `${status.connectedByName}が連携` : "連携済み"}
              {status.updatedAt && `(${formatDateTimeJa(status.updatedAt)})`}
            </p>
            <MisocaDisconnectButton />
          </div>
        ) : (
          <a
            href="/api/integrations/misoca/authorize"
            className="mt-4 inline-block rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0"
          >
            Misocaと連携する
          </a>
        )}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-md text-neutral-900">Slack</h3>
            <p className="mt-1 text-xs text-neutral-600">
              通知(お知らせベル・レポート)のSlack送信、およびWebhook受信に使用します。
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs ${
              slackStatus.configured ? "bg-success-bg text-success-text" : "bg-neutral-100 text-neutral-600"
            }`}
          >
            {slackStatus.configured ? "連携中" : "未設定"}
          </span>
        </div>

        {slackStatus.configured ? (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-sm text-neutral-600">
              SLACK_BOT_TOKENが設定されているため、通知の送信が可能です。
            </p>
            {!slackStatus.webhookConfigured && (
              <p className="text-xs text-warning-text">
                SLACK_SIGNING_SECRETが未設定です。/api/webhooks/slackでのイベント受信(署名検証)は無効のままです。
              </p>
            )}
            <Link href="/settings/notifications" className="text-xs text-primary-600 hover:underline">
              通知先チャンネル・文面の設定はこちら →
            </Link>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-2 text-sm text-neutral-600">
            <p>Slack連携にはBotトークンが必要です。以下の手順で取得し、環境変数に設定してください。</p>
            <ol className="list-inside list-decimal">
              <li>
                <a
                  href="https://api.slack.com/apps"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary-600 hover:underline"
                >
                  api.slack.com/apps
                </a>
                で「Create New App」からアプリを作成
              </li>
              <li>「OAuth & Permissions」でBot Token Scopesに chat:write を追加</li>
              <li>「Install to Workspace」を実行し、発行された Bot User OAuth Token(xoxb-...)を SLACK_BOT_TOKEN に設定</li>
              <li>「Basic Information」の Signing Secret を SLACK_SIGNING_SECRET に設定(Webhook署名検証用)</li>
              <li>通知先チャンネルにBotを招待し、そのチャンネルIDを控える(<Link href="/settings/notifications" className="text-primary-600 hover:underline">通知設定</Link>で使用)</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
