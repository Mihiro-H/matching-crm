# 業務システム向け 共通UI設計パターン集

> **このファイルの使い方(AIへの指示)**
> このドキュメントは、CRM(Next.js App Router + Tailwind CSS v4 + Supabase)で実装・運用して
> 効果が確認できたUI設計パターンを、別の業務システム(CRM/SFA/案件管理/社内管理画面など)で
> そのまま再利用できる形にまとめたものです。
>
> - 新しいシステムを作るときは、**まず「0. 前提と原則」を採用**し、見た目は導入先企業の**デザイントークンMD**(「1. デザインについて」参照)に従った上で、
>   その上で「2. 全ページ共通」「3. 要素共通」「4. 特定ページ種別共通」から必要なものを選んで実装してください。
> - 各パターンの **「仕様」は守るべき振る舞い**、**「実装メモ」は推奨実装**です。
>   技術スタックが異なる場合は仕様を優先し、実装メモは読み替えてください。
> - 業務ドメイン固有の名前(商談・案件・フリーランス等)は例です。
>   `<Entity>` と書かれた箇所は導入先のエンティティ名に置き換えてください。
> - 「⚠ 落とし穴」は実際に不具合として発生したものです。必ず回避策ごと実装してください。

---

## 目次

- [0. 前提と原則](#0-前提と原則)
- [1. デザインについて(トークンは別ファイル)](#1-デザインについてトークンは別ファイル)
- [2. 全ページ共通(アプリシェル)](#2-全ページ共通アプリシェル)
- [3. 要素共通(UIコンポーネント)](#3-要素共通uiコンポーネント)
- [4. 特定ページ種別共通(画面テンプレート)](#4-特定ページ種別共通画面テンプレート)
- [5. 実装上の落とし穴と対策](#5-実装上の落とし穴と対策)
- [6. 導入先ごとのカスタマイズポイント](#6-導入先ごとのカスタマイズポイント)
- [7. 新規システム立ち上げ時のチェックリスト](#7-新規システム立ち上げ時のチェックリスト)

---

## 0. 前提と原則

| # | 原則 | 理由 |
|---|------|------|
| P1 | **一覧の状態(ソート・絞り込み・ページ・表示切替)はすべてURLクエリに持つ** | リロード・ブラウザバック・URL共有で同じ画面を再現できる。サーバー側でそのままクエリに変換できる |
| P2 | **URLクエリは必ず「パース関数」を通し、不正値は安全なデフォルトにフォールバック** | 手打ちURLや古いブックマークで画面が壊れないようにする |
| P3 | **ステータス色は「意味(4分類)」経由でしか割り当てない** | 担当者の好みで色がばらつくのを防ぐ。新ステータス追加時も迷わない |
| P4 | **ページ権限は `edit / view / hidden` の3段階**。hidden はナビ非表示+URL直打ちでも404 | 画面単位の権限制御を、全ページ同じ仕組みで実現できる |
| P5 | **汎用コンポーネントは「データ」を受け取り、ドメイン知識を持たない** | 他ページ・他システムにそのまま持ち出せる |
| P6 | **定数(ページサイズ・表示数・ステータス順序など)は1か所に定義** | マジックナンバー排除。仕様変更が1行で済む |

---

## 1. デザインについて(トークンは別ファイル)

- 色・フォント・文字サイズ・角丸・影などの**デザイントークンは本書では定義しない**。
  導入先の企業ごとに用意する **デザイントークンMDファイル**(例: `DESIGN_TOKENS.md`)に従うこと。
- 本書のコード例に出てくるクラス名(`bg-primary-500`, `text-neutral-600`, `bg-success-bg` など)は
  **役割を示すための仮の名前**。実装時はデザイントークンMDで定義された対応するトークンに読み替える。
- 本書のパターンが前提とするトークンの「役割」は以下のみ。デザイントークンMDにこれらに当たるものが無い場合は、AIが勝手に作らず確認すること。

| 役割 | 使われる場所 |
|------|------------|
| 主色(primary) | 主ボタン、選択中のチップ・ページ番号、アクティブなタブ下線・ナビ、リンク |
| ステータス4分類(info / success / warning / danger)の背景色+文字色 | ステータスバッジ(3-1)、エラーバナー、危険/成功ボタン |
| ニュートラル(背景・枠線・本文・副次テキスト・無効) | カード、テーブル、入力欄、ラベル |
| ページ背景 / ホバー背景 | 画面背景、行・ボタンのホバー |
| フローティングUI用の影 | モーダル、ポップオーバー、ドロップダウン |

---

## 2. 全ページ共通(アプリシェル)

### 2-1. アプリシェル(サイドナビ + ヘッダー + メイン)

**仕様**
- 認証後の全画面は共通レイアウトグループ(例: `app/(app)/layout.tsx`)配下に置く。ログイン・公開フォーム・印刷ページは**グループ外**に置いてシェルを出さない。
- レイアウト: `[サイドナビ 220px] [ヘッダー 64px + メイン(スクロール領域, p-6)]`
- **ヘッダーとサイドナビは全ページで固定**。スクロールするのはメイン領域だけ(ページ全体=`body` はスクロールさせない)。
- **サイドナビはブラウザの高さが変わっても常に画面の下端まで届く**。メニューが画面に収まらないときはメニュー部分だけ縦スクロールし、ロゴ(上)とアカウント情報(下)は常に見える位置に残す。
- サイドナビは**開閉できる**(2-6 参照)。
- サーバー側レイアウトで「現在ユーザー」「全ページ権限」「通知初期データ」を**1回ずつ**取得し、propsで配る。

```
┌──────────────┬─────────────────────────────────────┐  ← 画面の高さぴったり(h-dvh)
│ Logo      [←]│ タイトル or パンくず        🔔  (A) │ ← Header h-16(固定)
│──────────────│─────────────────────────────────────│
│ ▌Dashbd      │                                   ▲ │
│  Deals       │   <main> (overflow-y-auto, p-6)   █ │ ← ここだけスクロール
│  ...     ↕   │                                   │ │ ← サイドナビはメニュー部分だけスクロール
│              │                                   ▼ │
│──────────────│                                     │
│ (A) 名前     │                                     │
│ ログアウト   │                                     │ ← 常に画面下端
└──────────────┴─────────────────────────────────────┘
```

```tsx
// 外枠を画面の高さに固定し、body ではなく main をスクロールさせる
<div className="flex h-dvh w-full overflow-hidden">
  <SideNav />                                    {/* h-full flex flex-col */}
  <div className="flex min-w-0 flex-1 flex-col">
    <Header />                                   {/* shrink-0 h-16 */}
    <main className="flex-1 overflow-y-auto p-6">{children}</main>
  </div>
</div>

// SideNav 内部: 上下を固定し、メニューだけスクロール
<nav className="flex h-full w-[220px] shrink-0 flex-col border-r">
  <div className="shrink-0">ロゴ + 閉じるボタン</div>
  <ul className="flex-1 overflow-y-auto">…メニュー…</ul>
  <div className="shrink-0 border-t">アカウント情報</div>
</nav>
```

- ⚠ 外枠を `min-h-screen` にすると、中身が長いページでページ全体が伸びてスクロールし、ヘッダー・サイドナビが一緒に流れる。**`h-dvh`(高さ固定)+`overflow-hidden`** にする。`100vh` はモバイルのアドレスバー分ずれるため `dvh` を使う。
- 3-18 のテーブル高さ上限(`TABLE_MAX_HEIGHT`)は、この「メイン領域の高さ」を基準に計算する。

**実装メモ**
- ナビ定義は1ファイルの配列に集約する(**ナビ・権限キー・ヘッダータイトルの唯一の情報源**)。

```ts
export type PageKey = "dashboard" | "deals" | "projects" | "settings" /* ... */;
export type NavItem = { pageKey: PageKey; label: string; href: string; icon: LucideIcon; adminOnly?: boolean };
export const NAV_ITEMS: NavItem[] = [
  { pageKey: "dashboard", label: "ダッシュボード", href: "/dashboard", icon: LayoutDashboard },
  // ...並び順 = サイドナビの表示順
  { pageKey: "settings", label: "設定", href: "/settings", icon: Settings, adminOnly: true },
];
```

- アクティブ判定: `pathname === href || pathname.startsWith(href + "/")`(詳細ページでも親メニューが光る)。
- アクティブ表示: `bg-primary-50 text-primary-600` + 左端に `w-1 bg-primary-500` のインジケータバー。
- アカウント情報(アバター・名前・部署・ログアウト)はサイドナビ下部に集約。ヘッダーのアバターは「ログイン中」表示のみ。

### 2-2. ヘッダータイトル / パンくず(Context方式)

**仕様**
- 通常はナビ定義から現在ページのラベルをタイトル表示。
- 詳細など下位ページは、ページ側から**パンくずを上書き**できる(`一覧 / 対象名`)。ページ離脱時は自動でクリア。

**実装メモ**

```tsx
// ページ(クライアント部)で呼ぶだけ
usePageBreadcrumbs([{ label: "案件管理", href: "/projects" }, { label: project.title }]);

// フック実装の要点: 配列は毎回新しく作られるため JSON 文字列を依存キーにして無限ループを防ぐ
export function usePageBreadcrumbs(crumbs: Breadcrumb[] | null) {
  const { setBreadcrumbs } = usePageHeaderContext();
  const key = crumbs ? JSON.stringify(crumbs) : null;
  useEffect(() => {
    setBreadcrumbs(crumbs);
    return () => setBreadcrumbs(null);
  }, [key]);
}
```

### 2-3. ページ権限ガード(edit / view / hidden)

**仕様**
- 権限はユーザー×ページキー単位。部署単位のテンプレートを持ち、ユーザーへ一括適用できる。
- 行が無い場合のデフォルトは `view`。ただし機密性の高いページは「既定 hidden」リストで管理できる。管理者は既定hiddenをバイパス。
- `adminOnly` のページは権限設定に関わらず管理者以外に出さない。
- **全ページの先頭で1行呼ぶ**:

```ts
const { user, canEdit } = await requirePageAccess("projects"); // hidden/未ログインなら notFound()
```

- `canEdit` は「新規作成」「編集」「D&D」などの**表示/活性制御**に使う。サーバーアクション側でも必ず再チェックする(UI制御だけに頼らない)。
- サイドナビ用には全ページ権限を**1クエリで一括取得**し、デフォルト値で全キーを埋めてから返す(N+1回避・既定hiddenの反映漏れ防止)。

### 2-4. 通知ベル(ヘッダー)

**仕様**
- 未読があればベル右上にドット(`bg-warning-text`)。クリックでドロップダウン(幅 w-80、最大高 max-h-96 スクロール)。
- 未読行は `bg-primary-50`+濃い文字、既読は薄い文字。行クリックで既読化+`linkPath` があれば遷移。
- 「すべて既読にする」ボタン。空のときは「通知はありません。」。
- 既読化は**楽観的更新**(先に画面を更新、サーバー反映は fire-and-forget)。

### 2-5. ページ状態の共通表示

| 状態 | 表示 |
|------|------|
| 外部依存(DB等)未設定 | 共通の案内カード(`XxxNotConfiguredNotice`)。データ取得・権限チェックより**前**にガード |
| データ取得失敗 | ページ上部にエラーバナー「〇〇の取得に失敗しました: {message}」。一部失敗なら箇条書きで列挙し、取得できた部分は表示を続ける |
| 0件 | テーブル内に `colSpan` 全幅で中央寄せ「〇〇が登録されていません。」 |
| 権限なし | 404(存在自体を見せない) |

### 2-6. サイドナビの開閉(折りたたみ)

**仕様**
- サイドナビ上部(ロゴの右)に **「←」ボタン**。押すとサイドナビが隠れ、メイン領域が画面幅いっぱいに広がる。
- 隠れている間は、**ヘッダー左端に「→」(またはハンバーガー☰)ボタン**を出し、押すと再表示する。サイドナビが無くても必ず戻せる導線を残す。
- 開閉は横方向のスライド(`width` または `transform` を 150〜200ms)で、ガタつかないようにする。
- 開閉状態は**ページ遷移しても維持**する(レイアウト側のstateで持つ)。「一時的に隠す」用途のため、既定は**ブラウザを再読み込みしたら開いた状態に戻る**。
  - 導入先が「閉じた状態を覚えておいてほしい」と言う場合のみ、`localStorage` に保存する(読み書きは try/catch で囲み、読めなければ開いた状態)。
- ボタンには `aria-label="サイドメニューを閉じる/開く"` と `aria-expanded` を付ける。
- 画面幅が狭い(タブレット以下)ときは、最初から閉じた状態にし、開いたときはメインの上に重ねて表示(背景クリック・Escで閉じる)してもよい。

**実装メモ**

```tsx
// レイアウト直下のクライアントコンポーネントで開閉stateを持つ(ページ遷移で消えない)
const [isSideNavOpen, setIsSideNavOpen] = useState(true);

<div className="flex h-dvh w-full overflow-hidden">
  <div className={`shrink-0 overflow-hidden transition-[width] duration-200 ${isSideNavOpen ? "w-[220px]" : "w-0"}`}>
    <SideNav onCollapse={() => setIsSideNavOpen(false)} />   {/* 中身は w-[220px] 固定のまま */}
  </div>
  <div className="flex min-w-0 flex-1 flex-col">
    <Header showExpandButton={!isSideNavOpen} onExpand={() => setIsSideNavOpen(true)} />
    <main className="flex-1 overflow-y-auto p-6">{children}</main>
  </div>
</div>
```

- 開閉stateは Context(2-2 のパンくずと同じProviderにまとめてよい)で持ち、ヘッダーとサイドナビの両方から触れるようにする。
- 中身の幅は固定にし、外側のラッパーの幅だけを変える(中身ごと縮めると文字が折り返してガタつく)。
- 閉じている間はメニューにフォーカスが入らないよう、`inert` 属性(または `hidden`)を付ける。

---

## 3. 要素共通(UIコンポーネント)

> いずれもドメイン知識を持たない汎用部品として `components/ui/` に置く。

### 3-1. ステータスバッジ(セマンティック色マッピング)

**仕様**
- 各ステータスは `{ label, semantic }` のメタ定義を持ち、色は semantic(info/success/warning/danger)からのみ決まる。
- バッジは `rounded-sm px-2 py-1 text-xs` + `bg-{semantic}-bg text-{semantic}-text`。

```ts
export type SemanticStatus = "info" | "success" | "warning" | "danger";
export type StatusMeta = { label: string; semantic: SemanticStatus };

export const SEMANTIC_STATUS_CLASSES: Record<SemanticStatus, { bg: string; text: string }> = {
  info: { bg: "bg-info-bg", text: "text-info-text" },
  success: { bg: "bg-success-bg", text: "text-success-text" },
  warning: { bg: "bg-warning-bg", text: "text-warning-text" },
  danger: { bg: "bg-danger-bg", text: "text-danger-text" },
};

// エンティティごとに Record<Status, StatusMeta> を1つ定義する(型で網羅性を保証)
export const DEAL_STATUS_META: Record<DealStatus, StatusMeta> = {
  new: { label: "未対応", semantic: "info" },
  on_hold: { label: "保留", semantic: "warning" },
  won: { label: "受注", semantic: "success" },
  lost: { label: "失注", semantic: "danger" },
};

export function StatusBadge({ meta }: { meta: StatusMeta }) { /* ... */ }
```

- **ステータスの表示順は別定数 `<ENTITY>_STATUS_ORDER` として配列で持つ**(カンバン列順・フィルターチップ順・ステップ表示で共用)。

### 3-2. ページネーション(サーバー版 / クライアント版)

**仕様**
- 1ページ件数は定数 `PAGE_SIZE = 20`。
- 表示: 左「全{N}件中 {start}-{end}件を表示」/ 右「前へ [1][2][3][4][5] 次へ」。
- ページ番号は**現在ページを中心に最大5個**のウィンドウ表示(定数 `MAX_PAGE_LINKS`)。
- 端では「前へ/次へ」を無効表示。0件のときはコンポーネント自体を出さない。
- テーブルカードの下端に `border-t` で連結して置く。

**2つのバリアントを用意する**

| バリアント | 使いどころ | ページ遷移 |
|-----------|-----------|-----------|
| `PaginationControls` | サーバー側でページング(DB の range/offset) | `hrefFor(page) => string` で `<Link>` |
| `PaginationControlsClient` | 全件をクライアントに持っている小規模一覧(ユーザー管理など) | `onPageChange(page)` で state 更新 |

```ts
export const PAGE_SIZE = 20;
export function parsePageParam(v?: string): number {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : 1; // 不正値は1
}
export function rangeForPage(page: number, size = PAGE_SIZE): [number, number] {
  const from = (page - 1) * size;
  return [from, from + size - 1]; // 0始まり・両端含む
}
// ウィンドウ計算
const windowStart = Math.max(1, Math.min(page - Math.floor(MAX / 2), totalPages - MAX + 1));
const pageNumbers = Array.from({ length: Math.min(MAX, totalPages) }, (_, i) => windowStart + i);
```

- **ソート列・絞り込みを変えたら page を 1 に戻す**(結果集合が変わるため)。`page=1` はURLから省略。

### 3-3. ソート+絞り込み一体型テーブル見出し(SortFilterHeader)

**仕様**
- 見出しラベルクリック → その列でソート。同じ列なら asc⇔desc トグル、別の列なら asc から。ソート中は `▲/▼`。
- ラベル横のフィルターアイコン(`ListFilter` 12px)で列ごとの絞り込み。適用中はアイコンが primary 色+「×」解除ボタン。
- フィルター種別:
  - `text`: アイコン直下にポップオーバー(入力+「適用」)。外側クリックで閉じる。
  - `person`(エンティティ参照): 3-4 の検索選択モーダルを開き、選んだ `id` と `name` の両方をURLに入れる(名前はリロード後の表示用)。
- 追加したい種別の例: `select`(固定選択肢)、`dateRange`。

```ts
export type TextFilterConfig = { type: "text"; value: string | null; placeholder: string; paramName: string };
export type PersonFilterConfig = {
  type: "person"; value: { id: string; name: string } | null; modalTitle: string;
  search: (q: string) => Promise<SearchResultItem[]>; // Server Action
  idParamName: string; nameParamName: string;
};
<SortFilterHeader label sortHref isSorted sortDir basePath currentQuery filter? />
```

- ⚠ サーバーコンポーネントからクライアントコンポーネントへ**普通の関数(hrefBuilder等)は渡せない**。`basePath` と `currentQuery: Record<string,string>` という素のデータを渡し、URL組み立てはクライアント側で行う(Server Action だけは例外的に渡せる)。

```ts
function buildHref(overrides: Record<string, string | null>) {
  const next = new URLSearchParams(currentQuery);
  for (const [k, v] of Object.entries(overrides)) v === null ? next.delete(k) : next.set(k, v);
  return `${basePath}?${next.toString()}`;
}
```

### 3-4. 検索選択モーダル(SearchSelectModal)

「企業を選ぶ」「担当者をアサインする」「ユーザーで絞り込む」など、**参照先を選ぶ操作はすべてこの1コンポーネント**で行う。

**仕様**
- ヘッダー(タイトル+×) / 検索入力(autoFocus) / 結果リスト / (複数選択時)フッター「N件選択中 [確定]」。
- 入力は **300ms デバウンス**でインクリメンタル検索。モーダルを開いた直後は空クエリで初期候補を表示。
- `mode: "single"` → 行クリックで即確定して閉じる。`"multiple"` → チェックボックスで複数選択し確定ボタン。
- 行表示: 頭文字アバター(丸・primary-100)+ラベル+サブラベル(所属など)。
- 0件時: 「該当なし」。`createNew` を渡した場合は「「{入力値}」を新規登録」行を出し、モーダル内でインライン作成フォームに切り替え → 作成したものをそのまま選択状態にする。
- 閉じ方: ×ボタン / 背景クリック / Esc。閉じたら内部状態(クエリ・結果・選択・エラー)をリセット。

```ts
type SearchResultItem = { id: string; label: string; sublabel?: string };
<SearchSelectModal
  isOpen onClose title placeholder
  mode="single" | "multiple"
  search={(q) => Promise<SearchResultItem[]>}
  onConfirm={(items) => void | Promise<void>}
  confirmLabel="アサイン"
  createNew?={{ label: (q) => `「${q}」を新規登録`, render: (q, onCreated) => <InlineCreateForm/> }}
/>
```

- ⚠ **`createPortal(..., document.body)` で描画する**。ページ内の `<form>` の中から開かれると、モーダル内のインライン作成フォーム(これも `<form>`)がネストし、送信でページ遷移してしまう不具合が実際に起きた。
- ⚠ 検索語をそのままDBクエリ文字列に埋め込まない(PostgREST の `or=` 等へのフィルタインジェクションが発生した)。エスケープ/パラメータ化すること。

### 3-5. 確認ダイアログ(ConfirmDialog)

- `role="alertdialog"`、タイトル+メッセージ+[キャンセル][確定]。背景クリックでキャンセル。
- ラベルは用途で変える(例: 「変更する / 変更しない」「削除する / キャンセル」)。
- ブラウザ標準の `confirm()` は使わない(見た目が揃わず、自動テストも止まる)。
- 用途例: 削除、関連データへの波及確認(「見積金額を変えました。案件側の金額も更新しますか?」)。

### 3-6. ポップオーバー / ドロップダウンの共通挙動

- `ref` を付けたコンテナの**外側 mousedown で閉じる**(開いている間だけリスナー登録)。
- 位置: `absolute top-full mt-1/mt-2` + `z-20`(モーダルは `z-50`)。ただし**スクロール領域(3-18)の中に置く場合は portal + `position: fixed`** にする(枠で切れるため)。
- 見た目: `rounded-md border bg-neutral-0 shadow-md`。

### 3-7. タブ = ルーティング(URL付きタブ)

**仕様**
- タブ切替は state ではなく**子ルート**で表現する(`/projects/12/invoices` など)。ブックマーク・直リンク・戻るが効く。
- 見た目: 下線タブ。アクティブ `border-b-2 border-primary-500 text-primary-600`、非アクティブ `text-neutral-600 hover:text-primary-600`、全体に `border-b border-neutral-100`。
- タブ定義は `const TABS = [{ key, label }] as const` で持ち、`href = base + "/" + key`。
- 使いどころ: 詳細ページ配下の関連データ、設定画面のカテゴリ、一覧のサブ分類。

### 3-8. フィルターチップ(ステータス絞り込み)

- 先頭に「すべて」+ `STATUS_ORDER` 順のチップ。`rounded-full px-3 py-1 text-sm`。
- 選択中 `bg-primary-500 text-neutral-0`、それ以外 `border border-neutral-200`。
- 各チップは他の絞り込み・ソート・表示モードを**維持したまま** status だけ差し替えたURLへの `<Link>`。

### 3-9. セグメント選択(ピル型ボタン群)

- 3択程度の排他選択(例: 権限 `編集 / 閲覧 / 非表示`)は select ではなくピル型ボタンを横に並べる。見た目はフィルターチップと同じで `text-xs`。
- 表形式の「行 × 選択肢」マトリクス(権限設定など)と組み合わせると一覧性が高い。

### 3-10. 表示⇔編集 切替カード(インライン編集)

**仕様**
- 詳細ページの情報カードは既定で**閲覧表示**(`<dl>` の2カラムグリッド、`dt` は `text-xs text-neutral-600`)。
- 右上に「編集」ボタン(`canEdit` のときのみ)。押すと同じ位置の値が入力欄に変わり、下部に[保存][キャンセル]。
- キャンセルで元の値に戻す。保存中は両ボタン disabled。成功で閲覧表示に戻り `router.refresh()`、失敗はカード内にエラー文。
- 未入力値は `-` で表示。長文は `whitespace-pre-wrap`。

### 3-11. KPIサマリーカード

- `[ラベル(sm, neutral-600) / 値(2xl)]` + 右上に `h-9 w-9 rounded-md bg-primary-50` のアイコン。
- グリッドで横並び(既定4列。カード枚数や画面幅に応じて列数を変える)。金額は通貨フォーマッタ、件数は「N件」、率は「%」。
- カードは「ラベル・値・アイコン・(任意)リンク先」だけを受け取る汎用部品にし、**何を表示するかはダッシュボード設定(4-8)側で決める**。

### 3-12. タグ(小ラベル)

- 分類タグ(職種・カテゴリ等)は `rounded-sm bg-page-bg px-2 py-0.5 text-xs text-neutral-600`。ステータスバッジと見た目を分け、意味(状態 vs 属性)を区別する。

### 3-13. 頭文字アバター

- 画像を持たない人物は `rounded-full bg-primary-100 text-primary-600` に名前の1文字目。サイズ h-8 w-8。
- 検索結果・ヘッダー・サイドナビ・担当者リストで共通。

### 3-14. ファイルドロップゾーン

- 点線枠のドロップ領域+「クリックして選択」も可(隠した `input[type=file]` を ref で開く)。
- ドラッグ中は枠色を変える。許可拡張子・**最大サイズを表示**し、その値はサーバー側の実際の上限設定と同じ定数を参照する(案内と実挙動のズレ防止)。
- クライアント側でサイズ・形式を事前チェックしてエラー表示。

### 3-15. 折りたたみ(長文の補助情報)

- 主役でない長文(文字起こし全文・ログなど)は既定で閉じ、「全文を表示 / 閉じる」トグルで開く。

### 3-16. チェックリスト(楽観的トグル)

- ToDo・アクションアイテムはチェックで即保存。先にUIを切り替え、失敗したら元に戻してエラー表示。

### 3-17. 共通フォーマッタ

```ts
formatCurrencyJPY(1234567)          // "￥1,234,567"
formatDateJa("2026-09-29T...")      // "2026/09/29"
formatDateTimeJa(iso)               // "2026/09/29 14:05" (タイムゾーン固定)
excerpt(text, 80)                   // 先頭80文字 + "…"
debounce(fn, 300)                   // インクリメンタル検索用
```

- 日時は**表示タイムゾーンを明示的に固定**する(サーバー/クライアントでずれないように)。

### 3-18. テーブル内スクロール(縦・横スクロールバー付きテーブルコンテナ)

**仕様**
- 行や列が多いとき、**ページ全体ではなくテーブル領域の中だけ**を縦・横にスクロールできるようにする(スクロールバーはテーブルの枠内に出る)。
- テーブル枠の高さの上限は「画面の高さ − (ヘッダー+ツールバー+ページネーション分)」。行が少ないときは内容の高さに縮み、余白を作らない。
- **縦スクロール中も見出し行は上に固定**(sticky header)。ソート・絞り込みがいつでも使えるようにする。
- 横スクロール中は**先頭列(主キー列: 名前・タイトルなど)を左に固定**するのを推奨(どの行を見ているか分からなくなるため)。列数が少ない一覧では省略してよい。
- **ページネーションはスクロール領域の外**(テーブル枠の下端)に置き、常に見えるようにする。
- セルは基本 `whitespace-nowrap` にして列幅を内容に合わせ、長い本文だけ最大幅+省略(`truncate`)にする。

```
┌ テーブル枠(border・角丸) ───────────────────────────┐
│┌ スクロール領域(overflow: auto, max-height) ──────┐▲│
││ 名前(固定) │ 見出し… (sticky top)                ││█│
││────────────┼──────────────────────────────       ││ │
││ 行…        │ …                                   ││ │
│└────────────┴───────────── ◀███▶ ─────────────────┘▼│
│ 全57件中 21-40件を表示              前へ [1][2] 次へ │ ← スクロール外
└─────────────────────────────────────────────────────┘
```

**実装メモ**

```tsx
// 画面上部の固定要素ぶんを引いた高さを上限にする(値は定数化する)
const TABLE_MAX_HEIGHT = "calc(100vh - 240px)";

export function ScrollableTable({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-lg border bg-white">      {/* 枠: overflowを付けない */}
      <div className="overflow-auto" style={{ maxHeight: TABLE_MAX_HEIGHT }}>
        <table className="w-full border-separate border-spacing-0 text-left text-sm">{children}</table>
      </div>
      {footer /* PaginationControls をここに渡す */}
    </div>
  );
}

// 見出しセル: sticky + 背景色必須(無いと下の行が透けて見える)
<th className="sticky top-0 z-10 border-b bg-white">…</th>
// 先頭列の固定: 左上の角セルは縦横両方に固定され他の見出しより手前に出す
<th className="sticky left-0 top-0 z-20 border-b bg-white">名前</th>
<td className="sticky left-0 z-[5] bg-white">…</td>
```

- ⚠ `border-collapse` のままだと sticky な見出しの下線がスクロールで流れて消える。見出しセルの下線は `box-shadow: inset 0 -1px 0 <線の色>` で引く(行の区切り線は既存の `tr` の `border-b` のままでよい)。`border-separate border-spacing-0` にしてセル側で線を引く方法でもよい。
- 見出し固定のスタイルは、全テーブルの `th` に個別にクラスを付けず、スクロール領域のクラス配下の `thead th` にまとめてCSSで当てると漏れがない。
- ⚠ **スクロール領域の中に置いたポップオーバー(3-3 の列絞り込み入力など)は、枠の外にはみ出す部分が切れて見えなくなる**。見出し内のポップオーバー・ドロップダウンは `createPortal` で `document.body` に出し、ボタン位置(`getBoundingClientRect()`)から `position: fixed` で配置する。
- 行ホバー時の背景色も固定列セルに同じ色を当てる(固定列だけ色が変わらないのを防ぐ)。
- スクロールバーは OS 既定を使ってよい。細くする場合もトラックが見える程度の太さは残す(操作できることが分かるように)。
- カンバン(4-3)も同じ考え方で、ボード全体は横スクロール、各列は `max-height` + 列内の縦スクロールにする。

### 3-19. 差し込み項目(プレースホルダー)挿入ドロップダウン

メールの件名・本文、Slack通知文、レポート通知文など**テンプレート文を編集する欄すべて**で使う。

**仕様**
- 使える項目を本文の下に文章で並べるのはやめ、入力欄の上(または右上)に **「差し込み項目を挿入 ▾」ドロップダウン**を置く。
- ドロップダウンには**利用者向けの項目名**(例: 「氏名」「企業名」「フォーム名」「対象ページのURL」「担当者へのメンション」)を表示する。`{{name}}` のような記号は利用者に選ばせない(補足として小さく出すのは可)。
- 項目を選ぶと、**直前にカーソルがあった入力欄のカーソル位置**に `{{name}}` を挿入する。文字を選択していた場合はその部分を置き換える。
  - 件名と本文のように入力欄が複数ある画面では、最後にフォーカスしていた欄に入れる(一度もフォーカスしていなければ本文の末尾)。
- 挿入後は入力欄にフォーカスを戻し、カーソルを挿入した文字列の直後に置く(続けて文章を打てるように)。
- 項目は用途ごとに**限定**する(その文面で値が必ず埋まるものだけ出す)。
- **どの用途の差し込み項目にも、必ず「該当ページのURL」(`{{url}}`)を入れる**。ドロップダウンの先頭に固定で表示する。
  - 中身は、その通知・メールのきっかけになったレコードの**システム内の詳細ページURL**(例: フォーム送信 → 作成された商談の詳細、レポート定期通知 → レポート表示画面、重複検知 → 担当者詳細)。
  - `https://` から始まる絶対URLにする。ドメインは環境変数(例: `APP_BASE_URL`)から取り、コードに直接書かない。パスは内部IDではなく短い連番(4-1)を使う。
  - 新しい通知・メールの種類を追加するときは、**「このメッセージの該当ページはどこか」を必ず決めてから**実装する(決まらないものは要件確認)。
  - 注意: システムのページはログインが必要なため、社外の人に届く文面(自動返信メールなど)に入れても相手は開けない。項目はドロップダウンに出しておき、文面に入れるかは運用側で判断する。
- 任意: 入力欄の下に「プレビュー」を出し、`{{name}}` をサンプル値(例: 山田 太郎)に置き換えた文面を表示する。
- 保存時に、定義に無い `{{xxx}}` があれば警告する(打ち間違い防止)。

```
件名 [お問い合わせありがとうございます            ]
本文                              [差し込み項目を挿入 ▾]
┌──────────────────────────────┐   ┌──────────────┐
│{{name}} 様                    │   │ 該当ページのURL │ ← 常に先頭
│                              │   │ 氏名           │
│この度は{{form_name}}より…     │   │ 企業名         │
│                              │   │ フォーム名     │
└──────────────────────────────┘   └────────────────┘
```

**実装メモ**

```ts
// 差し込み項目は用途ごとに定義し、画面(ドロップダウン)とサーバー(置換処理)で同じ定義を使う
export type PlaceholderDef = { key: string; label: string; sample: string };

// 該当ページのURLはすべての用途に必ず入れるため、個別定義には書かず definePlaceholders で先頭に付ける
const PAGE_URL_PLACEHOLDER: PlaceholderDef = { key: "url", label: "該当ページのURL", sample: "https://example.com/deals/123" };
function definePlaceholders(defs: PlaceholderDef[]): PlaceholderDef[] {
  return [PAGE_URL_PLACEHOLDER, ...defs.filter((d) => d.key !== PAGE_URL_PLACEHOLDER.key)];
}

export const AUTO_REPLY_PLACEHOLDERS = definePlaceholders([
  { key: "name", label: "氏名", sample: "山田 太郎" },
  { key: "company", label: "企業名", sample: "株式会社サンプル" },
  { key: "form_name", label: "フォーム名", sample: "お問い合わせフォーム" },
]);
export const SLACK_NOTIFICATION_PLACEHOLDERS = definePlaceholders([
  { key: "mentions", label: "担当者へのメンション", sample: "@山田" },
]);

// 送信側: url は必ず絶対URLで渡す(ドメインは環境変数から)
export function buildPageUrl(path: string): string {
  const base = process.env.APP_BASE_URL;
  if (!base) throw new Error("APP_BASE_URL が設定されていません");
  return new URL(path, base).toString();
}

export const toToken = (key: string) => `{{${key}}}`;
export function renderTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => values[k] ?? "");
}
export function findUnknownPlaceholders(template: string, defs: PlaceholderDef[]): string[] { /* 保存時の警告用 */ }
```

```tsx
// カーソル位置への挿入。ドロップダウンを押すと入力欄のフォーカスが外れるため、
// 選択範囲は onSelect / onKeyUp / onClick のたびに ref に控えておく
function insertAtCursor(el: HTMLInputElement | HTMLTextAreaElement, value: string, token: string, setValue: (v: string) => void) {
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? value.length;
  setValue(value.slice(0, start) + token + value.slice(end));
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(start + token.length, start + token.length);
  });
}
```

- ⚠ ドロップダウンのクリックで入力欄の選択範囲が失われ、常に末尾に入ってしまう。**選択範囲を事前に ref へ控える**か、ドロップダウンのボタンに `onMouseDown={(e) => e.preventDefault()}` を付けてフォーカス移動を防ぐ。

---

## 4. 特定ページ種別共通(画面テンプレート)

### 4-1. 一覧ページ(テーブル)テンプレート

**画面構成**

```
[フィルターチップ群 ..................] [表示切替] [+新規作成]
┌─────────────────────────────────────────────────────┐
│ 企業名▲ ⏷ │ 案件名 ⏷ │ ステータス │ 主担当 ⏷ │ 期間 │ ← SortFilterHeader(縦スクロール中も固定)
│─────────────────────────────────────────────────────│
│ リンク     │ リンク   │ [Badge]    │ 氏名     │ ...  │ ↕ テーブル内だけ縦・横スクロール(3-18)
│ ...                                                 │
│─────────────────────────────────────────────────────│
│ 全57件中 21-40件を表示          前へ [1][2][3] 次へ │ ← Pagination(スクロール領域の外)
└─────────────────────────────────────────────────────┘
```

- テーブルは必ず **3-18 のスクロールコンテナ**で包む(見出し固定・先頭列固定・ページネーションはスクロール外)。

**URLクエリ契約(全一覧で統一)**

| param | 意味 | 不正時 |
|-------|------|--------|
| `view` | `table` / `kanban` 等 | 既定ビュー |
| `sort` | ソート列キー(許可リスト) | 既定列 |
| `dir` | `asc` / `desc` | `asc` |
| `status` | ステータス絞り込み(許可リスト) | なし |
| `<field>` | テキスト絞り込み(trim、空は無視) | なし |
| `<ref>Id` + `<ref>Name` | 参照絞り込み(両方揃ったときだけ有効) | なし |
| `page` | 1始まり | 1 |

**実装メモ(1エンティティあたり作るもの)**

```ts
// lib/<entity>/list-params.ts
export const <ENTITY>_VIEWS = ["table", "kanban"] as const;
export const <ENTITY>_SORTABLE_COLUMNS = ["company", "title", "status", "assignee", "endDate"] as const;

export function parse<Entity>ListParams(raw: Record<string, string | undefined>): <Entity>ListParams {
  // 許可リストに含まれない値はすべてデフォルトへ(P2)
}
export function nextSortDirection(current, clicked) {
  return current.sortBy !== clicked ? "asc" : current.sortDir === "asc" ? "desc" : "asc";
}

// lib/<entity>/get-<entity>s.ts   … params を受けてDBクエリ(order/filter/range)+ totalCount(count: "exact")
// components/<entity>/<entity>s-table.tsx … hrefFor(overrides) で sort/page のリンクを生成
// app/<entity>s/page.tsx … requirePageAccess → parse → get → 描画
```

- `hrefFor` は「現在の全パラメータを保持しつつ一部だけ差し替える」関数として1つにまとめ、ソート・ページ・チップ全部で使う。
- 列ラベルは `Record<SortColumn, string>` で型付けして定義漏れを防ぐ。
- 行の主キー列はリンク(詳細ページへ)。参照先(企業など)も別リンクにする。
- **URLに内部UUIDを出さず、エンティティごとの短い連番(`number`)を使う**と共有・口頭伝達しやすい。

**小規模データ版(クライアント完結)**
- ユーザー管理のように件数が少なく全件取得済みなら、上部に「名前検索・セレクト絞り込み」を置き、`useMemo` で絞り込み → `PaginationControlsClient`。絞り込み変更時は `setPage(1)`。

### 4-2. 表示切替(テーブル ⇔ カンバン)

**仕様**
- 同じ一覧ページ内で `?view=table|kanban` を切り替える。ボタンは現在と逆のビュー名を表示(「カンバン表示に切り替え」)。
- ビューごとに適したコントロールだけ出す(チップ・ページネーションはテーブル用。カンバンは列自体がステータスなので不要)。
- データ取得関数は共通。カンバン時はページングしない/上限件数を別に設ける。
- 追加しやすいビュー: カード(グリッド)ビュー、カレンダービュー。同じ `view` パラメータに値を足すだけ。

### 4-3. カンバンボード

**仕様**
- 列 = `STATUS_ORDER` の順、列見出しに「ラベル + 件数」。列幅 `w-64` 固定。ボード全体は横スクロール、カードが多い列は列の中だけ縦スクロール(列見出しは固定、3-18 と同じ考え方)。
- カード: タイトル(詳細へのリンク)+ 補助情報2行程度(取引先・担当など)。`canEdit` のときだけ `draggable` / `cursor-move`。
- ドロップで**楽観的更新** → サーバー更新 → 失敗したら**直前の状態へロールバック**+上部にエラーバナー。
- **手動で移動してはいけない列**(外部連携で自動遷移するステータス等)はグレーアウト(`bg-neutral-100 opacity-60`)し、ドロップ不可。落とそうとしたら理由をエラー表示。
- ドロップ可否は純粋関数に切り出してテストする。

```ts
export function isManualDropAllowed(target: Status): boolean {
  return !AUTO_ONLY_STATUSES.includes(target); // 例: 電子契約Webhookでのみ遷移する「契約済」
}

function handleDrop(target: Status, id: string) {
  if (!isManualDropAllowed(target)) { setError("…は自動で反映されます。"); return; }
  const previous = items;
  setItems((cur) => cur.map((x) => (x.id === id ? { ...x, status: target } : x)));
  startTransition(async () => {
    const r = await updateStatus(id, target);
    if (!r.success) { setError(r.error); setItems(previous); }
  });
}
```

- 拡張候補: 前進のみ許可/特定遷移のみ許可の遷移表、列ごとの合計金額、WIP上限、ドロップ時に理由入力モーダル(失注理由など)。

### 4-4. 詳細ページ(シェル + 子タブ)

**画面構成**

```
パンくず: 一覧 / 対象名
┌ 情報カード(3-10 表示⇔編集) ───────────── [Badge][編集] ┐
│ 親エンティティへのリンク(小) / タイトル(lg)                 │
│ dl 2カラム: 項目…                                           │
└──────────────────────────────────────────────────────────┘
┌ サブセクション(担当者アサイン・内訳など、各自で追加/削除) ┐
[タブ: 見積 | 請求 | 議事録]   ← 子ルート
{children}  ← 子ルートの一覧(4-1と同じテーブル部品)
```

**実装メモ**
- `app/<entity>/[id]/layout.tsx` でデータ取得+権限チェック → `<Entity>DetailShell` に渡し、`children` に子タブのページが入る。
- シェルでパンくずを設定。存在しないIDは 404。
- サブセクション(アサイン一覧など)は `initialXxx` を受け取り、追加は検索選択モーダル、削除は確認ダイアログ。

### 4-5. ステータス遷移アクション(理由入力付き)

- 詳細ページ上部に「失注(危険色枠)」「受注(成功色)」「次へ進める(主色)」などのアクションボタン。
- 終端ステータスへの遷移はボタン押下でインラインフォームを展開し、**理由の入力を必須**にする。遷移に付随して必要な情報(受注時の取引先企業など)もここで検索選択モーダルから選ばせる。
- 実行中は全アクション disabled。`canEdit` でなければ disabled。

### 4-6. 新規作成ページ

- `/<entity>/new` の独立ページ(一覧右上の「+新規作成」から)。項目が少ないもの(ユーザー追加等)はモーダルでよい。
- 参照項目(企業・担当者)は検索選択モーダル、見つからなければ `createNew` でその場作成。
- 送信成功で詳細ページへ遷移。失敗はフォーム上部にエラー。送信中はボタン disabled +「作成中...」。

### 4-7. 設定ページ(タブ + 管理者専用)

- `/settings/<category>` をタブ(3-7)で切替。`/settings` 直下は既定タブ(最もよく使うもの)へリダイレクト。
- 典型カテゴリ: 組織情報 / 通知設定 / 権限設定 / ユーザー管理 / 部署管理 / 外部連携 / **処理結果**。
- **権限設定**: 「部署別テンプレート」と「個人別」の2タブ。行=ページ、列=`編集/閲覧/非表示` のピル選択マトリクス(3-9)。部署テンプレートは所属ユーザーへ一括適用。
- **外部連携**: サービスごとのカードに「接続状態 / 接続・切断ボタン」。切断は確認ダイアログ。APIキー等は画面に表示しない。
- **通知設定**: イベント種別 × 通知先(アプリ内・Slack等)のON/OFF、メッセージテンプレート(差し込み項目は 3-19 のドロップダウンで挿入)。
- **処理結果**: 裏側で動く処理の実行結果をまとめて見る画面。各機能の画面には実行履歴を出さず、ここに集約する。
  - 対象例: レポートの定期通知、CSVインポート、フォーム送信時の自動返信メール、Slack/メール通知、外部サービスからのWebhook受信、定期バッチ。
  - 一覧の列: 日時 / 処理の種類 / 対象(該当ページへのリンク) / 結果(成功=success・失敗=danger のバッジ) / 詳細(件数やエラー内容。長いものは折りたたみ 3-15)。
  - 絞り込み: 処理の種類・結果(成功/失敗)のチップ(3-8)、期間。新しい順、ページネーション(3-2)、スクロールコンテナ(3-18)。
  - 失敗が出たら管理者に通知ベル(2-4)で知らせ、通知から処理結果の該当行へ飛べるようにする。
  - 実装は処理ごとに別テーブルを作らず、共通の実行ログ(`job_runs`: 種類・対象ID・結果・メッセージ・詳細JSON・日時)に書き込む。

### 4-8. ダッシュボード(表示項目は企業ごとに設定)

**前提**: ダッシュボードで見たい数字は企業(業種・業務フロー)ごとに異なる。表示項目を画面にベタ書きせず、**「ウィジェット定義(カタログ)」+「どれをどの順で出すかの設定」**に分ける。

**既定構成(導入先から特に指定がない場合はこれを使う)**

| 位置 | ウィジェット | 種類 | 内容 |
|------|------------|------|------|
| 上段1 | 未対応の問い合わせ | KPIカード | ステータスが未対応の商談/リード件数 |
| 上段2 | 進行中案件数 | KPIカード | 完了以外の案件件数 |
| 上段3 | 今月の受注額 | KPIカード | 今月受注した商談の金額合計 |
| 上段4 | 未回収請求額 | KPIカード | 未回収ステータスの請求額合計 |
| 下段 | 今日やること | リスト | 期限が今日以前のToDo・対応待ち(各行は対象ページへのリンク) |

**ウィジェットの種類(カタログに追加していく)**

| 種類 | 用途の例 |
|------|---------|
| KPIカード(3-11) | 件数・金額・率(例: 今月の新規リード数、受注率、平均単価、稼働中の人数) |
| リスト | 今日やること、期限切れ、最近の更新、自分の担当分 |
| グラフ | 月別受注額の推移、ステータス別件数、担当者別実績 |
| ミニテーブル | 直近の問い合わせ5件、入金予定一覧 |

**実装メモ**

```ts
// lib/dashboard/widgets.ts … 使えるウィジェットの一覧(カタログ)。1ウィジェット=1取得関数
export type WidgetKey = "newContactsCount" | "activeProjectsCount" | "monthlyWonAmount" | "unpaidInvoiceTotal" | "todoList" /* 企業ごとに追加 */;
export type WidgetDefinition = {
  key: WidgetKey;
  label: string;
  kind: "kpi" | "list" | "chart" | "table";
  icon?: LucideIcon;
  href?: string;            // クリックで該当一覧(絞り込み済みURL)へ
  requiredPageKey?: PageKey; // 閲覧権限のないページの数字は出さない
  load: () => Promise<WidgetData>;
};

// 既定の表示構成(指定がなければこれ)
export const DEFAULT_DASHBOARD_LAYOUT: WidgetKey[] = [
  "newContactsCount", "activeProjectsCount", "monthlyWonAmount", "unpaidInvoiceTotal", "todoList",
];
```

- 表示構成の置き場所は段階的に選ぶ:
  1. **コード上の定数**(導入時に企業ごとに書き換える)… 最小構成。まずはこれで十分。
  2. **組織設定としてDBに保存**し、設定画面(4-7)で管理者が並び替え・表示/非表示を切り替える。
  3. 必要ならユーザー単位で上書き(自分用ダッシュボード)。
- 表示時は「設定された構成」→ 無ければ `DEFAULT_DASHBOARD_LAYOUT` の順に採用する。カタログに存在しないキーは無視する(P2 と同じ考え方)。
- **権限連動**: `requiredPageKey` のページが hidden のユーザーにはそのウィジェットを出さない。
- 各ウィジェットの取得は**並列実行し、一部失敗しても他は表示**(失敗したものだけエラーバナーに列挙、またはそのカード内にエラー表示)。
- KPIカードは可能なら該当一覧の**絞り込み済みURL**へリンクする(例: 未対応件数 → `/deals?status=new`)。

### 4-9. CSVインポート

- 2つのボタン: **「追加でインポート」**(未登録分だけ追加・既存は変更しない)/ **「上書きでインポート」**(既存も更新)。違いは `title` 属性のツールチップで説明。
- クライアントで CSV をパース(ヘッダー行あり・空行スキップ)→ サーバーでバリデーション+登録。
- 結果はモーダルで「追加N件 / 更新N件 / スキップN件 / エラー行一覧(行番号+理由)」を表示。
- 同じファイルを続けて選べるよう、処理後に `input.value = ""`。

### 4-10. 重複データの統合(マージ)

- 起点: 重複検知の通知から遷移、または詳細ページの「統合」ボタン。
- 3ステップ: ①統合相手を検索選択モーダルで選ぶ → ②**項目ごとに「残す値」をラジオで選ぶ比較表**(左: この画面の値 / 右: 相手の値)→ ③確認ダイアログで実行。
- 統合後、相手の関連データ(商談など)は残す側に付け替え、相手は削除。
- 重複の扱い方針(削除/統合/通知のみ)は**要件定義の段階で決めておく**。

### 4-11. フォームビルダー + 公開フォーム

- 管理画面: フォーム一覧 → 編集画面で項目(ラベル・種類・必須・選択肢)をテーブル形式で追加/編集/並び替え。
- **システム必須のビルトイン項目**(氏名・個人情報同意など)は削除不可・必須固定、DB制約と対応する選択肢の値は編集不可にし、UI上でも理由が分かるようにする。
- 公開側: `/contact/<短い番号>` を**認証不要ルート**(アプリシェル外)として提供。送信で「リード作成+重複チェック+通知+自動返信メール」。
- 自動返信メール設定: ON/OFF・件名・本文。差し込み項目は 3-19 のドロップダウンから選んで挿入(使える項目は氏名・企業名・フォーム名などに限定)。

### 4-12. レポート(一覧 / 表示 / 2段階の編集画面)

**画面とURL**

| 画面 | URL | 内容 |
|------|-----|------|
| レポート一覧 | `/reports` | 作成済みレポートの一覧 + 「+新規作成」 |
| レポート表示 | `/reports/<番号>` | 完成したレポートをそのまま表示 |
| 作成・編集 | `/reports/new`, `/reports/<番号>/edit` | 2段階(①内容 → ②出力方法) |
| 印刷用 | `/print/reports/<番号>` | PDF出力用(シェル外) |

**① レポート一覧**
- テーブル(4-1 / 3-18)の列: レポート名 / 出力方法(「ダウンロード」または「定期通知: 毎週月曜 9:00」のような要約) / 最終更新日 / 操作。
- **レポート名をクリック → レポート表示画面**(完成したレポートが見える)。
- 各行の右端に **「編集」「削除」ボタン**(アイコン+ツールチップ、`canEdit` のときのみ)。
  - 編集 → 編集画面の①へ。
  - 削除 → 確認ダイアログ(3-5)「レポート『◯◯』を削除しますか?定期通知も停止されます。」→ 削除後は一覧を再読み込み。
- 実行履歴はここにも表示画面にも出さない(設定 > 処理結果 に集約、4-7)。

**② レポート表示**
- 選んだ項目・レイアウトどおりにレポートを描画する(KPIカード・表・グラフなど)。対象期間を上部に表示。
- 右上に「編集」「ダウンロード ▾」ボタン。「ダウンロード」を押すとドロップダウンが開き、**PDF / CSV** を選んでダウンロードする(ドロップダウンの挙動は 3-6)。

**③ 作成・編集(2段階構造)**

```
 ① 内容  ───────  ② 出力方法              ← ステップ表示(現在のステップを強調)

[ステップ①]                                   [ステップ②]
 レポート名 [            ]                      出力方法  (●) ダウンロード  ( ) 定期通知
 対象期間   [今月 ▾]                            ─ ダウンロードを選んだ場合 ─
 表示する項目 ☑受注額 ☑件数 ☐受注率 …           [ダウンロード ▾] → PDF / CSV
 レイアウト  (●)カード (○)表 (○)カード+グラフ     ─ 定期通知を選んだ場合 ─
 ┌ プレビュー ──────────┐                        頻度 [毎週▾] 曜日[月▾] 時刻[09:00]
 │ 選んだ内容で即時表示   │                        通知先チャンネル [      ]
 └──────────────────────┘                        メッセージ [差し込み項目を挿入▾](3-19)
                           [キャンセル] [次へ →]  [← 戻る] [保存] (定期通知時は[今すぐ実行]も)
```

- **ステップ①「内容」**: レポート名、対象期間、表示する項目(チェックボックス)、レイアウト(カード並び / 表 / カード+グラフ など)、項目の並び順。右側(または下)に**プレビュー**を出し、選んだ内容で完成形がどう見えるかをその場で確認できる。
  - 項目を1つも選んでいない・名前が空のときは「次へ」を押せない(理由を表示)。
- **ステップ②「出力方法」**: 「ダウンロード」か「定期通知」をラジオで選ぶ。
  - ダウンロード: 表示画面と同じ「ダウンロード ▾」(PDF / CSV を選択)。選ぶとレポート定義を保存してからファイルを出力する。
  - 定期通知: 実行スケジュール(頻度=毎週/毎月、曜日 / 日付、時刻)、通知先チャンネル、メッセージテンプレート(差し込み項目は 3-19)。「保存」「今すぐ実行」(新規時は保存してから実行)。
- 「← 戻る」で①に戻っても入力内容は消さない(2つのステップの状態は1つの親コンポーネントで持つ)。保存は②で一括して行う。
- 現在のステップはURLに持つ(例: `?step=2`)とリロードしても同じ画面に戻れる。ただし②を直接開いて①が未入力のときは①に戻す。

**出力の実装メモ**
- PDF: `/print/reports/<番号>` をシェル外のルートとして印刷用レイアウトで描画し、マウント時に `window.print()` を自動実行(データ未準備なら実行しない)。サーバー側でPDFを生成する方式に置き換えてもよい。
- CSV: サーバー側で作成し `Content-Disposition: attachment; filename="<レポート名>_<日付>.csv"` で返す。
  - ⚠ Excelで開くと日本語が文字化けするため、**UTF-8 BOM を先頭に付ける**。
  - 値にカンマ・改行・ダブルクォートを含む場合はクォートする。`=` `+` `-` `@` で始まる値は先頭に `'` を付けてCSVインジェクションを防ぐ。
- 定期通知の実行結果・ダウンロードの失敗は共通の実行ログ(4-7「処理結果」)に書き込む。

---

## 5. 実装上の落とし穴と対策

| # | 事象 | 対策 |
|---|------|------|
| 1 | サーバーコンポーネントから関数propsをクライアントに渡すとエラー | 素のデータ(`basePath`, `currentQuery`)を渡してクライアントでURLを組み立てる。Server Action のみ関数渡し可 |
| 2 | `<form>` 内から開いたモーダルの中の `<form>` がネストし、送信でページ遷移 | モーダルは `createPortal` で `document.body` へ |
| 3 | モーダルを閉じても前回の検索結果が残る | `isOpen` の変化をレンダー中に検知してstateをリセット(`useEffect` 内 setState はカスケード再描画を招くので避ける) |
| 4 | パンくずの `useEffect` が無限ループ | 配列を `JSON.stringify` した値を依存キーにする |
| 5 | ソートを変えたのに3ページ目のまま → 空表示 | ソート/絞り込み変更時は page を 1 に戻す |
| 6 | 検索語でDBクエリが壊れる/意図しない条件が注入される | 検索語のエスケープ・パラメータ化 |
| 7 | 管理者なのに「既定hidden」ページが404 | 既定値の算出で管理者をバイパス |
| 8 | 権限の既定値がナビに反映されない | 全ページキーをデフォルト値で埋めてから、DBの明示行で上書き |
| 9 | アップロード上限の案内と実際の上限がずれる | 表示値とサーバー設定を同じ定数から参照 |
| 10 | 固定選択肢の値を管理画面で編集して既存データと不整合 | DB制約と結びつく値は編集不可に。要件定義時に明言 |
| 11 | 日時表示が環境で1日ずれる | フォーマッタでタイムゾーンを固定 |
| 12 | 楽観的更新が失敗時に画面と実データが乖離 | 更新前の状態を退避し、失敗時に必ず戻す |
| 13 | テーブルをスクロール領域に入れたら、列の絞り込みポップオーバーが切れて見えない | ポップオーバーをportalで`document.body`に出し、`position: fixed`で配置(3-18) |
| 14 | sticky見出しの下線・背景がスクロールで消える/透ける | 見出しセルに背景色+下線は inset box-shadow(3-18) |
| 15 | 差し込み項目を選ぶと、カーソル位置ではなく末尾に入る | 選択範囲を ref に控える / ボタンの mousedown で `preventDefault`(3-19) |
| 16 | ヘッダー・サイドナビが本文と一緒にスクロールしてしまう | 外枠を `h-dvh overflow-hidden`、`main` だけ `overflow-y-auto`(2-1) |
| 17 | CSVをExcelで開くと文字化け | UTF-8 BOM を付けて出力(4-12) |

---

## 6. 導入先ごとのカスタマイズポイント

| 項目 | 置き場所 | 内容 |
|------|---------|------|
| 色・フォント・角丸・影 | 企業ごとのデザイントークンMD | 本書では定義しない(1章参照) |
| ナビ項目・順序・アイコン | `lib/navigation.ts` | `NAV_ITEMS`、`adminOnly`、既定hiddenページ |
| ステータス定義 | `lib/status-badges.ts` + `<entity>/status-transitions.ts` | ラベル・semantic・表示順・手動遷移可否 |
| ページサイズ | `lib/pagination.ts` | `PAGE_SIZE`、`MAX_PAGE_LINKS` |
| 一覧の列・ソート・絞り込み | `lib/<entity>/list-params.ts` | 列キー、既定ソート、フィルター種別 |
| 表示ビュー | `<ENTITY>_VIEWS` | table / kanban / card / calendar |
| ダッシュボード表示項目 | `lib/dashboard/widgets.ts`(→ 必要なら組織設定DB) | 表示するウィジェットと順序。指定なしは既定構成(4-8) |
| テーブルの高さ上限 | `TABLE_MAX_HEIGHT`(3-18) | ヘッダー・ツールバーの高さに合わせて調整 |
| 差し込み項目 | `lib/<用途>/placeholders.ts`(3-19) | 用途ごとに使える項目と表示名 |
| サイドナビ開閉状態の保持 | 2-6 | 既定は再読み込みで開く。要望があれば localStorage に保存 |
| レポートの項目・レイアウト | レポートのカタログ定義(4-12) | 選べる指標、レイアウトの種類 |
| 通貨・日付・タイムゾーン | `lib/format.ts` | ロケール、通貨、TZ |
| 権限レベル | `requirePageAccess` | 3段階で不足ならロール×ページ×操作に拡張 |
| 外部連携 | 設定 > 外部連携 | 電子契約・請求書・メール・チャット通知など |

---

## 7. 新規システム立ち上げ時のチェックリスト

**基盤**
- [ ] 導入先企業のデザイントークンMDを用意し、「1. デザインについて」の役割(主色・ステータス4分類・ニュートラル・影)がすべて揃っているか確認した
- [ ] アプリシェル(サイドナビ・ヘッダー・パンくずContext・通知ベル)を置いた
- [ ] ヘッダー・サイドナビを固定し、メイン領域だけがスクロールする。サイドナビは画面の高さを変えても下端まで届く
- [ ] サイドナビを「←」で閉じ、ヘッダーのボタンで再表示できる
- [ ] ナビ定義を1ファイルに集約し、ページキー=権限キーにした
- [ ] 全ページ先頭で `requirePageAccess` を呼び、hidden は404にした
- [ ] 外部依存未設定時の案内・取得失敗バナー・0件表示を共通化した

**共通部品**
- [ ] StatusBadge + `<ENTITY>_STATUS_META` + `<ENTITY>_STATUS_ORDER`
- [ ] PaginationControls(サーバー版/クライアント版)
- [ ] SortFilterHeader(text / person フィルター)
- [ ] SearchSelectModal(single / multiple / createNew、portal描画)
- [ ] ConfirmDialog(標準 `confirm()` は使わない)
- [ ] URL付きタブ、フィルターチップ、ピル選択、表示⇔編集カード
- [ ] テンプレート文の入力欄すべてに差し込み項目ドロップダウン(3-19)を付け、どの用途にも「該当ページのURL」を入れた

**画面**
- [ ] 各一覧に `list-params.ts`(パース+不正値フォールバック)と `hrefFor` を用意した
- [ ] 全テーブルをスクロールコンテナ(3-18)で包み、見出し固定・ページネーションがスクロール外にあることを確認した
- [ ] ダッシュボードをウィジェットカタログ+表示構成に分け、指定がない企業には既定構成を出した
- [ ] ステータスを持つ一覧にテーブル⇔カンバン切替を付けた(自動遷移列はドロップ不可)
- [ ] 詳細ページは layout + Shell + 子ルートタブ構成にした
- [ ] URLに内部IDではなく短い連番を使った
- [ ] 設定ページ(権限マトリクス・ユーザー管理・外部連携・通知・処理結果)を用意した
- [ ] 実行履歴は各画面に出さず、設定 > 処理結果 に集約した
- [ ] レポートは一覧(編集・削除ボタン)/ 表示 / 2段階の編集画面(①内容 → ②ダウンロード or 定期通知)にした

**要件定義時に顧客へ確認すること**(ここが曖昧だと手戻りが出た)
- [ ] 固定選択肢の項目は編集不可でよいか / 将来増える前提か
- [ ] 重複データの扱い(削除 / 統合 / 通知のみ)
- [ ] ダッシュボードで毎日見たい数字・リスト(指定がなければ既定構成でよいか)
- [ ] 通知は「誰に・どこに・何を含めて」、そして「該当ページはどこか」(URLの差し込み先)
- [ ] 使う外部サービス(メール送信・電子契約・請求書・チャット)
- [ ] 「全部の一覧に〇〇」の対象一覧を列挙してもらう
- [ ] デプロイのタイミング・頻度

---

### 付録: 参照実装(このリポジトリ内)

| パターン | ファイル |
|---------|---------|
| アプリシェル | `src/app/(app)/layout.tsx`, `src/components/layout/{side-nav,header,page-header-context,notification-bell}.tsx` |
| ナビ定義 | `src/lib/navigation.ts` |
| 権限ガード | `src/lib/auth/page-access.ts` |
| ステータスバッジ | `src/lib/status-badges.ts`, `src/components/ui/status-badge.tsx` |
| ページネーション | `src/lib/pagination.ts`, `src/components/ui/pagination-controls{,-client}.tsx` |
| ソート+絞り込み見出し | `src/components/ui/sort-filter-header.tsx` |
| 検索選択モーダル | `src/components/ui/search-select-modal.tsx` |
| 確認ダイアログ | `src/components/ui/confirm-dialog.tsx` |
| 一覧パラメータ | `src/lib/projects/list-params.ts` |
| テーブル / カンバン / 表示切替 | `src/components/projects/{projects-table,projects-kanban}.tsx`, `src/app/(app)/projects/page.tsx` |
| カンバンのドロップ規則 | `src/lib/projects/status-transitions.ts` |
| 詳細シェル+タブ | `src/components/projects/project-detail-shell.tsx` |
| 表示⇔編集カード | `src/components/deals/deal-info-section.tsx` |
| ステータス遷移アクション | `src/components/deals/deal-detail-actions.tsx` |
| 設定タブ / 権限マトリクス | `src/components/settings/{settings-tabs,permission-matrix}.tsx` |
| CSVインポート | `src/components/freelancers/csv-import-button.tsx` |
| マージ | `src/components/people/person-merge-section.tsx` |
| フォームビルダー / 公開フォーム | `src/components/forms/{form-editor,public-contact-form}.tsx` |
| 固定シェル+サイドナビ開閉(2-1, 2-6) | `src/components/layout/app-shell.tsx`, `src/components/layout/{side-nav,header}.tsx` |
| テーブル内スクロール(3-18) | `src/components/ui/scrollable-table.tsx`, `src/app/globals.css`(`.scrollable-table`), `src/lib/popover-position.ts` |
| 印刷ページ | `src/app/print/reports/[id]/page.tsx`, `src/components/reports/report-print-trigger.tsx` |

> 注意: 次の内容は本書で仕様を決めたもので、このリポジトリにはまだ実装されていません(現在の実装とは異なります)。
> レポートの2段階編集・一覧の編集/削除ボタン・CSV出力(4-12)、設定 > 処理結果(4-7)、差し込み項目ドロップダウン(3-19)、
> ダッシュボードのウィジェット設定(4-8)。
| ダッシュボード | `src/app/(app)/dashboard/{page,summary-card,todo-list}.tsx` |
