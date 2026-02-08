# Obsidian Knewrova\[ult\] Plugin

チームのための多機能ユーティリティプラグイン。

## 🚀 機能 (Features)

### 1. Paste Replacement (ペースト置換)

貼り付けたテキストの内容に応じて自動的に置換を行います。

正規表現を用いた高度なマッチングに対応。

設定画面から独自のルールを複数定義可能。

### 2. LifeSpan (保存期間表示)

ステータスバーに、現在表示しているファイルの「作成からの経過時間」と「最終更新からの経過時間」をコンパクトに表示します。

🌱 3d : 作成から3日経過

bw 1h : 更新から1時間経過

🛠 開発者ガイド (For Developers)

技術スタック

Runtime: Node.js v22+

Manager: pnpm v10+ (proto推奨)

Tooling: Biome (Lint/Format), Oxlint, Vitest

セットアップ

# 依存関係インストール
pnpm install

# 開発用Vaultへのリンク作成
node scripts/setup-dev-vault.mjs "/path/to/your/vault"


リリース

タグをプッシュすると GitHub Actions (release.yml) が起動し、リリースバイナリを自動生成します。

npm version patch
git push origin main --tags


License

MIT