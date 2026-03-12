import { type Plugin, Setting, type TAbstractFile, TFile } from "obsidian";

// --- 型定義 ---

export interface UserMapScope {
	mode: "under" | "exact";
	roots: string[];
}

export interface UserMap {
	scope: UserMapScope;
	files: boolean;
	folders: boolean;
	map: Record<string, string>;
	order?: string[];
}

export interface DirectoryNameOverwriteSettings {
	enabled: boolean;
	mapFilePath: string;
	frontMatterKey: string; // FrontMatter で表示名として使うキー
}

export const DEFAULT_DIRECTORY_NAME_OVERWRITE_SETTINGS: DirectoryNameOverwriteSettings = {
	enabled: true,
	mapFilePath: "user-map.json",
	frontMatterKey: "title",
};

// Obsidian 内部 API の型定義 (一部抜粋)
interface FileExplorerItem {
	el: HTMLElement;
	titleEl: HTMLElement;
	file: TAbstractFile;
}

interface FileExplorerView {
	fileItems: Record<string, FileExplorerItem>;
}

export class DirectoryNameOverwriteFeature {
	private plugin: Plugin;
	private settings: DirectoryNameOverwriteSettings;
	private onSettingsSave: () => Promise<void>;
	private userMap: UserMap | null = null;

	constructor(
		plugin: Plugin,
		settings: DirectoryNameOverwriteSettings,
		onSettingsSave: () => Promise<void>,
	) {
		this.plugin = plugin;
		this.settings = settings;
		this.onSettingsSave = onSettingsSave;
	}

	public async onload() {
		await this.loadUserMap();

		this.plugin.app.workspace.onLayoutReady(() => {
			console.log("[DirectoryNameOverwrite] Initializing via Internal API.");
			this.refreshAll();
		});

		// ファイル名変更時
		this.plugin.registerEvent(
			this.plugin.app.vault.on("rename", (file) => {
				this.updateSingleItem(file);
			}),
		);

		// メタデータ（FrontMatter）変更時
		this.plugin.registerEvent(
			this.plugin.app.metadataCache.on("changed", (file) => {
				this.updateSingleItem(file);
			}),
		);

		// マップファイル自体の変更
		this.plugin.registerEvent(
			this.plugin.app.vault.on("modify", async (file) => {
				if (file.path === this.settings.mapFilePath) {
					await this.loadUserMap();
					this.refreshAll();
				}
			}),
		);

		// ビューが切り替わった時などの再描画対策
		this.plugin.registerEvent(
			this.plugin.app.workspace.on("layout-change", () => {
				this.refreshAll();
			}),
		);
	}

	public onunload() {
		this.revertAll();
	}

	private async loadUserMap() {
		try {
			const adapter = this.plugin.app.vault.adapter;
			if (!(await adapter.exists(this.settings.mapFilePath))) {
				this.userMap = null;
				return;
			}
			const content = await adapter.read(this.settings.mapFilePath);
			this.userMap = JSON.parse(content);
		} catch (e) {
			console.error("[DirectoryNameOverwrite] Failed to load map:", e);
			this.userMap = null;
		}
	}

	/**
	 * File Explorer ビューを取得する内部 API へのアクセス
	 */
	private getFileExplorerView(): FileExplorerView | null {
		const leaf = this.plugin.app.workspace.getLeavesOfType("file-explorer")[0];
		if (!leaf) return null;
		// 内部 API のため unknown 経由でキャスト
		return (leaf.view as unknown) as FileExplorerView;
	}

	/**
	 * すべての表示をリフレッシュ（初回ロード用）
	 */
	public refreshAll() {
		if (!this.settings.enabled) return;
		const view = this.getFileExplorerView();
		if (!view) return;

		// 全アイテムを処理 (Object.entries を使用)
		for (const [_, item] of Object.entries(view.fileItems)) {
			if (item) this.applyTitleToItem(item);
		}

		// ソート適用 (Map に order がある場合)
		if (this.userMap?.order) {
			this.applyAllSorting();
		}
	}

	/**
	 * 特定のファイル/フォルダの表示名のみを更新
	 */
	private updateSingleItem(file: TAbstractFile) {
		if (!this.settings.enabled) return;
		const view = this.getFileExplorerView();
		if (!view) return;

		const item = view.fileItems[file.path];
		if (item) {
			this.applyTitleToItem(item);
			// 親フォルダのソートをトリガー
			if (file.parent) this.applyFolderSorting(file.parent.path);
		}
	}

	/**
	 * アイテムに表示名を適用するコアロジック
	 */
	private applyTitleToItem(item: FileExplorerItem) {
		const file = item.file;
		const isFolder = !(file instanceof TFile);

		let newTitle = this.getDisplayName(file.path, isFolder);

		// ファイルかつ FrontMatter 設定がある場合はそちらを優先
		if (file instanceof TFile && file.extension === "md") {
			const cache = this.plugin.app.metadataCache.getFileCache(file);
			const fmTitle = cache?.frontmatter?.[this.settings.frontMatterKey];
			if (fmTitle) {
				newTitle = String(fmTitle);
			}
		}

		const titleInner =
			item.titleEl.querySelector(".nav-folder-title-content, .nav-file-title-content") ||
			item.titleEl;

		if (newTitle) {
			// 元の名前を保存（未保存の場合のみ）
			if (!item.el.hasAttribute("data-original-name")) {
				item.el.setAttribute("data-original-name", titleInner.textContent || "");
			}

			if (titleInner.textContent !== newTitle) {
				titleInner.textContent = newTitle;
				item.el.setAttribute("data-knewrova-overwritten", "true");
				item.el.style.color = "var(--text-accent)";
			}
		} else {
			this.restoreItem(item);
		}
	}

	private restoreItem(item: FileExplorerItem) {
		if (item.el.hasAttribute("data-original-name")) {
			const original = item.el.getAttribute("data-original-name");
			const titleInner =
				item.titleEl.querySelector(".nav-folder-title-content, .nav-file-title-content") ||
				item.titleEl;
			if (original) titleInner.textContent = original;
			item.el.removeAttribute("data-original-name");
			item.el.removeAttribute("data-knewrova-overwritten");
			item.el.style.removeProperty("color");
		}
	}

	private revertAll() {
		const view = this.getFileExplorerView();
		if (!view) return;
		for (const [_, item] of Object.entries(view.fileItems)) {
			this.restoreItem(item);
		}
	}

	/**
	 * 指定されたパスと種別に基づき、user-map.json から表示名を取得
	 */
	public getDisplayName(path: string, isFolder: boolean): string | null {
		if (!this.userMap) return null;
		const { scope, map, files, folders } = this.userMap;

		if (isFolder && !folders) return null;
		if (!isFolder && !files) return null;

		const parts = path.split("/");
		const name = parts[parts.length - 1] || "";
		const parentPath = parts.slice(0, -1).join("/");

		// 大文字小文字を無視してマップ検索
		const matchedKey = Object.keys(map).find((k) => k.toLowerCase() === name.toLowerCase());
		if (!matchedKey) return null;

		const displayName = map[matchedKey] ?? null;

		if (scope.mode === "under") {
			return scope.roots.includes(parentPath) ? displayName : null;
		}
		if (scope.mode === "exact") {
			return scope.roots.includes(path) ? displayName : null;
		}
		return null;
	}

	// --- ソートロジック ---

	private applyAllSorting() {
		if (!this.userMap?.order || this.userMap.scope.mode !== "under") return;
		for (const root of this.userMap.scope.roots) {
			this.applyFolderSorting(root);
		}
	}

	private applyFolderSorting(folderPath: string) {
		if (!this.userMap?.order) return;
		const view = this.getFileExplorerView();
		if (!view) return;

		const parentItem = view.fileItems[folderPath];
		if (!parentItem) return;

		// 子要素コンテナを取得
		const childrenEl = parentItem.el.nextElementSibling;
		if (!childrenEl || !childrenEl.classList.contains("nav-folder-children")) return;

		const childNodes = Array.from(childrenEl.children) as HTMLElement[];
		if (childNodes.length < 2) return;

		const order = this.userMap.order;
		const sortedNodes = [...childNodes].sort((a, b) => {
			const pathA = a.querySelector(".tree-item-self")?.getAttribute("data-path") || "";
			const pathB = b.querySelector(".tree-item-self")?.getAttribute("data-path") || "";
			const nameA = pathA.split("/").pop()?.toLowerCase() || "";
			const nameB = pathB.split("/").pop()?.toLowerCase() || "";

			const indexA = order.indexOf(nameA);
			const indexB = order.indexOf(nameB);

			if (indexA !== -1 && indexB !== -1) return indexA - indexB;
			if (indexA !== -1) return -1;
			if (indexB !== -1) return 1;
			return nameA.localeCompare(nameB);
		});

		// 順序が変わっている場合のみ DOM を再配置
		let changed = false;
		for (let i = 0; i < childNodes.length; i++) {
			if (childNodes[i] !== sortedNodes[i]) {
				changed = true;
				break;
			}
		}

		if (changed) {
			for (const node of sortedNodes) {
				childrenEl.appendChild(node);
			}
		}
	}

	public displaySettings(containerEl: HTMLElement) {
		containerEl.createEl("h2", { text: "Directory Name Overwrite (Optimized)" });

		new Setting(containerEl)
			.setName("有効化")
			.setDesc("ファイルエクスプローラーの表示名を書き換えます。")
			.addToggle((toggle) =>
				toggle.setValue(this.settings.enabled).onChange(async (v) => {
					this.settings.enabled = v;
					await this.onSettingsSave();
					if (v) {
						this.refreshAll();
					} else {
						this.revertAll();
					}
				}),
			);

		new Setting(containerEl)
			.setName("FrontMatter Key")
			.setDesc("ファイルの表示名として優先的に使用する FrontMatter プロパティ名")
			.addText((text) =>
				text.setValue(this.settings.frontMatterKey).onChange(async (v) => {
					this.settings.frontMatterKey = v;
					await this.onSettingsSave();
					this.refreshAll();
				}),
			);

		new Setting(containerEl)
			.setName("Map File Path")
			.setDesc("マッピング定義ファイル (JSON) のパス")
			.addText((text) =>
				text.setValue(this.settings.mapFilePath).onChange(async (v) => {
					this.settings.mapFilePath = v;
					await this.onSettingsSave();
					await this.loadUserMap();
					this.refreshAll();
				}),
			);
	}
}
