import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // 議事録アップロード(音声/動画ファイル)は既定の1MBでは足りないため引き上げる。
      // ホスティング環境(Vercelのプラン等)側の上限にも別途注意すること。
      bodySizeLimit: "300mb",
    },
    // Next.js 16で新設されたproxy層のボディサイズ上限(既定10MB)。serverActions.bodySizeLimit
    // とは別物で、これを上げ忘れるとproxy層側で先に「Request body exceeded 10MB」として
    // 弾かれてしまう(実際に発生した不具合。https://nextjs.org/docs/app/api-reference/
    // config/next-config-js/serverActionsBodySizeLimit で言及されているproxyClientMaxBodySize)。
    proxyClientMaxBodySize: "300mb",
  },
};

export default nextConfig;
