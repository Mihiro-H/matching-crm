import "server-only";

export type SendSlackMessageResult = { success: true } | { success: false; error: string };

/**
 * Slack Web API(chat.postMessage)でメッセージを送信する。
 * SLACK_BOT_TOKEN(bot権限: chat:write)が必要。
 * 未設定の間は送信をスキップしてエラーを返す(呼び出し元はintegration_logsに記録する)。
 */
export async function sendSlackMessage(
  channelId: string,
  text: string
): Promise<SendSlackMessageResult> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    return { success: false, error: "SLACK_BOT_TOKENが未設定です。" };
  }

  try {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ channel: channelId, text }),
    });

    const body = (await response.json()) as { ok: boolean; error?: string };
    if (!body.ok) {
      return { success: false, error: body.error ?? "Slackへの送信に失敗しました。" };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Slackへの送信に失敗しました。" };
  }
}
