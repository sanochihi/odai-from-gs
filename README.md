# piyochihi

D3.js のお題表示画面と、Google スプレッドシート連携 API（Cloudflare Pages Functions）のプロジェクトです。

## ローカル開発

本番に近い形（静的ファイル + `/api/sheets`）で確認するには **Wrangler** を使います。開発サーバーは **http://localhost:8788** で動きます。

### 初回だけ

```bash
npm install
cp .dev.vars.example .dev.vars
```

`.dev.vars` に本番と同じ `SPREADSHEET_ID` を設定してください（スプレッドシート URL の `/d/` と `/edit` の間の ID）。`.dev.vars` は Git に含めません。

スピーカー表示用: リポジトリに同梱の `speakers/speakers.yaml` を編集します（秘密情報は含みません。名前・アイコン URL は環境変数から読み込みます）。

`.dev.vars` に `SPEAKER1_NAME` / `SPEAKER2_NAME` と、任意で `SPEAKER1_ICON_PATH` / `SPEAKER2_ICON_PATH` を設定します。

- ローカル画像: `/speakers/speaker1.jpg` のように `speakers/` 配下へのパス
- Google Drive: `https://drive.google.com/uc?id=ファイルID` や共有リンク（`/file/d/.../view`）でも可。表示時は `/api/speaker-icon/SPEAKER1` 経由で取得します（リンクを知っている全員が閲覧可にしてください）。

### 開発サーバーを起動する

```bash
npm run dev
```

ブラウザで **http://localhost:8788** を開きます。

Wrangler の対話メニューが出たら、そのターミナルは dev サーバー専用にしておきます（`[x]` で終了、`[b]` でブラウザを開く、など）。

---

## dev サーバーを止めて再起動する

`.dev.vars` の変更や `functions/api/sheets.js`・`index.html` の反映確認のときは、**一度止めてから** 起動し直します。`.dev.vars` は起動時にだけ読み込まれます。

### 1. 止める

`npm run dev` を実行しているターミナルで:

- **Ctrl+C** を押す  
  または
- メニュー表示中なら **`x`** で終了

プロンプト（`➜ piyochihi` など）に戻れば停止できています。

### 2. 起動し直す

同じプロジェクトディレクトリで:

```bash
npm run dev
```

### 3. ブラウザを更新

**http://localhost:8788** をリロードします。

---

## `Address already in use (127.0.0.1:8788)` が出るとき

別ターミナルや以前のセッションで、すでに 8788 番で dev が動いている状態です。

**手順 A（推奨）:** 以前 `npm run dev` を実行したターミナルを探し、そこで **Ctrl+C** してから、もう一度 `npm run dev`。

**手順 B:** 8788 を使っているプロセスを確認して終了する:

```bash
lsof -i :8788
kill $(lsof -t -i :8788)
npm run dev
```

`kill` してもエラーが続く場合:

```bash
kill -9 $(lsof -t -i :8788)
npm run dev
```

---

## 本番デプロイ

Cloudflare Pages にリポジトリを接続している場合は、通常は **push でデプロイ**されます。ローカル（`wrangler pages dev`）と **同じコード・同じ API** が動きます。環境ごとの `if (local)` のような分岐はありません。

本番がローカルと違って見えるときは、次を確認してください。

1. **最新コミットがデプロイされているか**（Pages の Deployments）
2. **環境変数**（Settings → Environment variables）。ローカルの `.dev.vars` と同じキーを **Production** に設定する:
   - `SPREADSHEET_ID`（必須）
   - `SPEAKER1_NAME` / `SPEAKER2_NAME`
   - `SPEAKER1_ICON_PATH` / `SPEAKER2_ICON_PATH`（任意）
3. **`speakers/speakers.yaml` がデプロイに含まれているか**（リポジトリにコミット済みであること）。ファイルが無くても API は既定の SPEAKER1/2 定義にフォールバックしますが、名前・アイコンは環境変数が必須です。

反映後、ブラウザでハードリロード（キャッシュ削除）してください。
