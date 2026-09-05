export type SlackConnectionStatus = {
  /** SLACK_BOT_TOKENが設定されていれば通知の送信が可能。 */
  configured: boolean;
  /** SLACK_SIGNING_SECRETが設定されていれば/api/webhooks/slackの署名検証が有効。 */
  webhookConfigured: boolean;
};

/**
 * 設定画面「外部連携」用のSlack接続状況(SCREEN_SPEC.md「外部連携」)。
 * MisocaのようなOAuth連携ではなく、SLACK_BOT_TOKEN/SLACK_SIGNING_SECRETという
 * 環境変数の設定有無をそのまま状態として扱う(DBに保存する情報がないため)。
 */
export function getSlackConnectionStatus(): SlackConnectionStatus {
  return {
    configured: Boolean(process.env.SLACK_BOT_TOKEN),
    webhookConfigured: Boolean(process.env.SLACK_SIGNING_SECRET),
  };
}
