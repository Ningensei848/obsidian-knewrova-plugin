以前別のセッションで君と話した内容を以下に示す。これと添付したリポジトリとそのコードを元に、残りのタスクを消化していこう。

---

### ✅ 達成済み事項

* プロジェクト基盤構築 (`proto`, `pnpm` 固定)
* 品質管理ツールの導入と設定 (`Biome`, `Oxlint`)
* テスト環境の構築 (`Vitest`, `jsdom`)
* CIパイプラインの構築 (`GitHub Actions`)
* ディレクトリ構造の最適化 (`src/`, `tests/`, `scripts/`)
* 開発者体験の向上 (`VSCode Settings`, `Symlink Script`)
* **機能実装: ペースト置換 (Issue #8)**

### 📝 今後のタスクリスト (To-Do)

cf. https://github.com/Ningensei848/.obsidian/issues

1. **自動リリースフローの構築**
* `pnpm version` でタグを打った後、GitHub Actions で自動的にビルドし、`main.js`, `manifest.json`, `styles.css` を GitHub Releases にアップロードするワークフローを作成する。（添付報告書「標準化指針」に基づく）


2. **READMEの更新**
* 開発者向けセットアップ手順（`setup-dev-vault.mjs` の使い方など）と、ユーザー向け機能説明を記述する。


3. **Issue #7: 保存期間表示プラグインの実装**
* ステータスバーに「作成/更新からの経過時間」を表示する機能を追加する。 (`src/lib/LifeSpan.ts` 等を作成)


4. **Issue #6: FrontMatterによる管理区分表示**
* ファイルエクスプローラーのDOMを操作し、メタデータに基づいて色やアイコンを付与する機能。


5. **Issue #2: ディレクトリ名の上書き表示**
* `data.json` にマッピングを持ち、フォルダ名を仮想的に書き換える機能。

---

### Prompt

````markdown
# Project Context: Obsidian Knewrova Plugin

**Project Goal**: Develop a high-quality Obsidian plugin integrating multiple utilities based on user issues.

**Current Tech Stack**:
* **Runtime/Manager**: Node.js (LTS), pnpm (v10.29.1 pinned via proto)
* **Build**: esbuild (Target: ES2018, Entry: `src/main.ts`)
* **Lint/Format**: **Biome** (Formatter/Linter, v2.3.14) + **Oxlint** (Linter/Gatekeeper)
* **Test**: **Vitest** (v3, environment: jsdom, coverage: v8)
* **CI**: GitHub Actions (Oxlint -> Biome -> Test -> Build)

**Directory Structure**:
* `src/`: Source code (`main.ts`, `settings.ts`, `types.ts`, `lib/`)
* `src/lib/`: Feature logic (Currently contains `PasteReplacement.ts`)
* `tests/`: Unit tests (Mirrors `src` structure, uses `__mocks__`)
* `scripts/`: Helper scripts (`version-bump.mjs`, `setup-dev-vault.mjs`)
* `.vscode/`: Settings ensuring Biome format-on-save and Oxlint on-type.

**Key Configuration Details**:
* **TypeScript**: `baseUrl: "."`, `paths: { "@/*": ["src/*"] }` (Strict mode enabled)
* **Feature Architecture**: Features are encapsulated in `src/lib/` classes, instantiated in `main.ts`, and settings are defined in `src/types.ts`.
* **Current Feature**: "Paste Replacement" (Auto-replace pasted text based on Regex rules). Fully implemented with settings UI and Unit Tests.

**Immediate Next Tasks**:
1.  **Automate Release**: Implement GitHub Actions workflow to upload `main.js`, `manifest.json`, `styles.css` to GitHub Releases on tag push.
2.  **Documentation**: Update README.md.
3.  **Next Feature**: Implement "Save Duration Display" (Issue #7).

**Instructions for AI**:
* Maintain the current directory structure (`src/`, `tests/`).
* Always use `proto run pnpm -- <command>` for execution.
* Prioritize Biome for formatting/linting and Oxlint for error detection.
* Ensure all new features have corresponding unit tests in `tests/`.

````
