import { MarkdownView, type Plugin, Setting, TFile } from "obsidian";

export interface LifeSpanSettings {
	enabled: boolean;
	responsibleParty: string;
	custodianMessage: string;
}

export const DEFAULT_LIFESPAN_SETTINGS: LifeSpanSettings = {
	enabled: true,
	responsibleParty: "Knewrova Document Control Admin",
	custodianMessage:
		"本文書は、上記の保管責任者の管理下において、規定の保存期間（原則として次年度末まで）保持されます。",
};

/**
 * 文書の末尾（コンテンツ領域の底）に「保存管理情報」を注入する機能
 */
export class LifeSpanFeature {
	private plugin: Plugin;
	private settings: LifeSpanSettings;
	private onSettingsSave: () => Promise<void>;
	private readonly footerClass = "knewrova-lifespan-footer";
	private observer: MutationObserver | null = null;

	constructor(plugin: Plugin, settings: LifeSpanSettings, onSettingsSave: () => Promise<void>) {
		this.plugin = plugin;
		this.settings = settings;
		this.onSettingsSave = onSettingsSave;
	}

	public onload() {
		// 1. イベント監視
		this.plugin.registerEvent(
			this.plugin.app.workspace.on("layout-change", () => this.refreshAllFooters()),
		);
		this.plugin.registerEvent(
			this.plugin.app.workspace.on("active-leaf-change", () => this.refreshAllFooters()),
		);
		this.plugin.registerEvent(
			this.plugin.app.metadataCache.on("changed", (file) => {
				if (file instanceof TFile) this.updateFooterForFile(file);
			}),
		);

		// 2. DOM監視 (CodeMirror等の再描画対策)
		this.setupObserver();

		this.refreshAllFooters();
	}

	public onunload() {
		this.observer?.disconnect();
		const footers = document.querySelectorAll(`.${this.footerClass}`);
		for (const f of Array.from(footers)) {
			f.remove();
		}
	}

	private setupObserver() {
		this.observer = new MutationObserver(() => {
			// 必要な場所にフッターがない場合のみ再注入
			const leaves = this.plugin.app.workspace.getLeavesOfType("markdown");
			for (const leaf of leaves) {
				const view = leaf.view as MarkdownView;
				// フッターがあるべきターゲットを探す
				const targets = this.getTargetElements(view.contentEl);
				for (const target of targets) {
					if (!target.querySelector(`.${this.footerClass}`)) {
						this.injectFooter(view);
						return; // 1つでも再注入したらこのサイクルは終了（パフォーマンス考慮）
					}
				}
			}
		});

		this.observer.observe(document.body, {
			childList: true,
			subtree: true,
		});
	}

	private refreshAllFooters() {
		const leaves = this.plugin.app.workspace.getLeavesOfType("markdown");
		for (const leaf of leaves) {
			if (leaf.view instanceof MarkdownView) {
				this.injectFooter(leaf.view);
			}
		}
	}

	private updateFooterForFile(file: TFile) {
		const leaves = this.plugin.app.workspace.getLeavesOfType("markdown");
		for (const leaf of leaves) {
			const view = leaf.view as MarkdownView;
			if (view.file && view.file.path === file.path) {
				this.injectFooter(view);
			}
		}
	}

	/**
	 * 注入すべきターゲット要素（コンテンツサイザー）を取得
	 */
	private getTargetElements(contentEl: HTMLElement): HTMLElement[] {
		// 編集モード: .cm-sizer (コンテンツの高さを決定する要素)
		const editorSizer = contentEl.querySelector(".cm-sizer");
		// 閲覧モード: .markdown-preview-sizer
		const previewSizer = contentEl.querySelector(".markdown-preview-sizer");

		return [editorSizer, previewSizer].filter((t): t is HTMLElement => t !== null);
	}

	private injectFooter(view: MarkdownView) {
		const file = view.file;
		if (!file) return;

		if (!this.settings.enabled) {
			this.removeFooter(view);
			return;
		}

		// Front-matter チェック
		const cache = this.plugin.app.metadataCache.getFileCache(file);
		const dateVal = cache?.frontmatter?.date;

		if (!dateVal) {
			this.removeFooter(view);
			return;
		}

		const dateObj = new Date(dateVal);
		if (Number.isNaN(dateObj.getTime())) {
			this.removeFooter(view);
			return;
		}

		// ターゲット取得
		const targets = this.getTargetElements(view.contentEl);
		if (targets.length === 0) return;

		for (const target of targets) {
			this.renderFooter(target, dateObj, file);
		}
	}

	private renderFooter(parent: HTMLElement, dateObj: Date, file: TFile) {
		// 既に存在する場合は再利用せず、一度削除して再作成（位置の整合性のため）
		let footer = parent.querySelector(`.${this.footerClass}`) as HTMLElement;
		if (footer) footer.remove();

		footer = parent.createDiv({ cls: this.footerClass });

		// デザイン構成
		footer.createDiv({ cls: "lifespan-header", text: "■ 公文書保管管理ステータス" });

		const grid = footer.createDiv({ cls: "lifespan-grid" });

		// ① 保管期限
		const expiryStr = this.calculateExpiryDate(dateObj);
		this.createGridRow(grid, "保管期限", `${expiryStr} まで`);

		// ② 文書保管責任者
		this.createGridRow(grid, "保管責任者", this.settings.responsibleParty);

		// 管理メッセージ
		const msgBox = footer.createDiv({ cls: "lifespan-message" });
		msgBox.setText(this.settings.custodianMessage);

		// システム情報
		const idBox = footer.createDiv({ cls: "lifespan-id" });
		idBox.setText(`Ref: ${file.path}`);
	}

	private createGridRow(parent: HTMLElement, label: string, value: string) {
		const row = parent.createDiv({ cls: "lifespan-row" });
		row.createDiv({ cls: "lifespan-label", text: label });
		row.createDiv({ cls: "lifespan-value", text: value });
	}

	private removeFooter(view: MarkdownView) {
		const footers = view.contentEl.querySelectorAll(`.${this.footerClass}`);
		for (const f of Array.from(footers)) {
			f.remove();
		}
	}

	public calculateExpiryDate(date: Date): string {
		const year = date.getFullYear();
		const month = date.getMonth() + 1;
		const fiscalYear = month >= 4 ? year : year - 1;
		const targetYear = fiscalYear + 2;
		const targetDate = new Date(targetYear, 2, 31);

		return new Intl.DateTimeFormat("ja-JP", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			weekday: "short",
		}).format(targetDate);
	}

	public displaySettings(containerEl: HTMLElement) {
		containerEl.createEl("h2", { text: "LifeSpan (公文書フッター設定)" });

		new Setting(containerEl)
			.setName("有効化")
			.setDesc("dateプロパティがある場合に管理情報を表示します。")
			.addToggle((toggle) =>
				toggle.setValue(this.settings.enabled).onChange(async (v) => {
					this.settings.enabled = v;
					await this.onSettingsSave();
					this.refreshAllFooters();
				}),
			);

		new Setting(containerEl).setName("保管責任者名").addText((text) =>
			text.setValue(this.settings.responsibleParty).onChange(async (v) => {
				this.settings.responsibleParty = v;
				await this.onSettingsSave();
				this.refreshAllFooters();
			}),
		);

		new Setting(containerEl).setName("保管メッセージ").addTextArea((text) =>
			text.setValue(this.settings.custodianMessage).onChange(async (v) => {
				this.settings.custodianMessage = v;
				await this.onSettingsSave();
				this.refreshAllFooters();
			}),
		);
	}
}
