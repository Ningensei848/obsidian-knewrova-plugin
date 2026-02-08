import { type Plugin, Setting } from "obsidian";

export interface UserMapScope {
	mode: "under" | "exact";
	roots: string[];
}

export interface UserMap {
	scope: UserMapScope;
	files: boolean;
	folders: boolean;
	map: Record<string, string>;
	order?: string[]; // 並び順定義（オプション）
}

export interface DirectoryNameOverwriteSettings {
	enabled: boolean;
	mapFilePath: string;
}

export const DEFAULT_DIRECTORY_NAME_OVERWRITE_SETTINGS: DirectoryNameOverwriteSettings = {
	enabled: true,
	mapFilePath: "user-map.json",
};

export class DirectoryNameOverwriteFeature {
	private plugin: Plugin;
	private settings: DirectoryNameOverwriteSettings;
	private onSettingsSave: () => Promise<void>;
	private userMap: UserMap | null = null;
	private observer: MutationObserver | null = null;

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
			console.log("[DirectoryNameOverwrite] Layout Ready.");
			this.startObserving();
			setTimeout(() => {
				this.applyOverwrites();
				this.applySorting(); // 初回ソート
			}, 1000);
		});

		this.plugin.registerEvent(
			this.plugin.app.vault.on("modify", async (file) => {
				if (file.path === this.settings.mapFilePath) {
					console.log("[DirectoryNameOverwrite] Map file changed.");
					await this.loadUserMap();
					this.applyOverwrites();
					this.applySorting();
				}
			}),
		);

		this.plugin.registerEvent(
			this.plugin.app.workspace.on("layout-change", () => {
				this.applyOverwrites();
				this.applySorting();
			}),
		);
	}

	public onunload() {
		this.stopObserving();
		this.revertOverwrites();
		// ソートのリセットはDOM構造を破壊する可能性があるため行わない（リロードで戻る）
	}

	private async loadUserMap() {
		try {
			const exists = await this.plugin.app.vault.adapter.exists(this.settings.mapFilePath);
			if (!exists) {
				console.log(
					`[DirectoryNameOverwrite] Map file not found: ${this.settings.mapFilePath}`,
				);
				this.userMap = null;
				return;
			}
			const content = await this.plugin.app.vault.adapter.read(this.settings.mapFilePath);
			this.userMap = JSON.parse(content);
		} catch (e) {
			console.error("[DirectoryNameOverwrite] Failed to load user map:", e);
			this.userMap = null;
		}
	}

	private startObserving() {
		this.stopObserving();

		this.observer = new MutationObserver((mutations) => {
			let shouldUpdate = false;
			for (const mutation of mutations) {
				if (mutation.type === "childList" || mutation.type === "characterData") {
					shouldUpdate = true;
				}
			}
			if (shouldUpdate) {
				this.applyOverwrites();
				this.applySorting(); // DOM変更時もソート適用
			}
		});

		const leaves = this.plugin.app.workspace.getLeavesOfType("file-explorer");
		for (const leaf of leaves) {
			const container = leaf.view.containerEl;
			this.observer.observe(container, {
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: ["data-path", "class"],
			});
		}
	}

	private stopObserving() {
		if (this.observer) {
			this.observer.disconnect();
			this.observer = null;
		}
	}

	// --- Renaming Logic ---

	private applyOverwrites() {
		if (!this.settings.enabled || !this.userMap) return;

		const navItems = document.querySelectorAll(".tree-item-self");

		for (const node of Array.from(navItems)) {
			const item = node as HTMLElement;

			let path = item.getAttribute("data-path");
			if (!path && item.parentElement) {
				path = item.parentElement.getAttribute("data-path");
			}

			if (!path) continue;

			let isFolder = false;
			if (item.classList.contains("nav-folder-title")) {
				isFolder = true;
			} else if (item.parentElement?.classList.contains("nav-folder")) {
				isFolder = true;
			}

			const newName = this.getDisplayName(path, isFolder);

			if (newName) {
				this.overwriteItemName(item, newName);
			} else {
				this.restoreItemName(item);
			}
		}
	}

	private overwriteItemName(item: HTMLElement, newName: string) {
		const contentEl = item.querySelector(
			".tree-item-inner, .nav-folder-title-content, .nav-file-title-content",
		);
		if (!contentEl) return;

		if (contentEl.textContent === newName && item.hasAttribute("data-knewrova-overwritten"))
			return;

		if (!item.hasAttribute("data-original-name")) {
			item.setAttribute("data-original-name", contentEl.textContent || "");
		}

		console.log(
			`[DirectoryNameOverwrite] Overwriting: ${item.getAttribute("data-path")} -> ${newName}`,
		);
		contentEl.textContent = newName;
		item.setAttribute("data-knewrova-overwritten", "true");
		item.style.color = "var(--text-accent)";
	}

	private restoreItemName(item: HTMLElement) {
		if (item.hasAttribute("data-original-name")) {
			const originalName = item.getAttribute("data-original-name");
			const contentEl = item.querySelector(
				".tree-item-inner, .nav-folder-title-content, .nav-file-title-content",
			);
			if (contentEl && originalName) {
				contentEl.textContent = originalName;
			}
			item.removeAttribute("data-original-name");
			item.removeAttribute("data-knewrova-overwritten");
			item.style.removeProperty("color");
		}
	}

	private revertOverwrites() {
		const items = document.querySelectorAll("[data-knewrova-overwritten='true']");
		for (const item of Array.from(items)) {
			this.restoreItemName(item as HTMLElement);
		}
	}

	public getDisplayName(path: string, isFolder: boolean, debug = false): string | null {
		if (!this.userMap) return null;

		const { scope, map, files, folders } = this.userMap;

		if (isFolder && !folders) return null;
		if (!isFolder && !files) return null;

		const parts = path.split("/");
		const name = parts[parts.length - 1];
		const parentPath = parts.slice(0, -1).join("/");

		// Case Insensitive Search
		const matchedKey = Object.keys(map).find((key) => key.toLowerCase() === name.toLowerCase());

		if (!matchedKey) {
			if (debug) console.log(`[Debug] No match in map for '${name}'`);
			return null;
		}

		const displayName = map[matchedKey];

		if (scope.mode === "under") {
			if (scope.roots.includes(parentPath)) {
				if (debug) console.log(`[Debug] Match!: path='${path}' -> '${displayName}'`);
				return displayName;
			}
		} else if (scope.mode === "exact") {
			if (scope.roots.includes(path)) {
				return displayName;
			}
		}

		return null;
	}

	// --- Sorting Logic ---

	private applySorting() {
		if (!this.settings.enabled || !this.userMap || !this.userMap.order) return;

		const { scope, order } = this.userMap;
		if (scope.mode !== "under") return;

		for (const rootPath of scope.roots) {
			// ルートフォルダの要素を探す
			// data-path="Shared/User" のような .tree-item-self を探す
			// セレクタエスケープが必要な文字が含まれる場合は CSS.escape を使う
			// const safePath = CSS.escape(rootPath);
			// DOM検索: .tree-item-self[data-path="..."]
			const navItems = document.querySelectorAll(".tree-item-self");
			let targetRootEl: HTMLElement | null = null;

			// data-path 完全一致で探す
			for (const item of Array.from(navItems)) {
				const path = item.getAttribute("data-path");
				if (path === rootPath) {
					targetRootEl = item as HTMLElement;
					break;
				}
			}

			if (!targetRootEl) continue;

			// .tree-item コンテナを取得
			const parentItem = targetRootEl.closest(".tree-item");
			if (!parentItem) continue;

			// 子要素コンテナ (.tree-item-children)
			const childrenContainer = parentItem.querySelector(".tree-item-children");
			if (!childrenContainer) continue;

			// 子要素 (.tree-item) のリスト
			const children = Array.from(childrenContainer.children) as HTMLElement[];
			if (children.length < 2) continue;

			// マップ作成: フォルダ名(小文字) -> 要素
			const childMap = new Map<string, HTMLElement>();
			for (const child of children) {
				const self = child.querySelector(".tree-item-self");
				const path = self?.getAttribute("data-path");
				if (path) {
					const name = path.split("/").pop();
					if (name) childMap.set(name.toLowerCase(), child);
				}
			}

			const sortedNodes: HTMLElement[] = [];
			const processedSet = new Set<HTMLElement>();

			// 1. order 指定順に並べる
			for (const orderKey of order) {
				const child = childMap.get(orderKey.toLowerCase());
				if (child) {
					sortedNodes.push(child);
					processedSet.add(child);
				}
			}

			// 2. order にないものは元の順序を維持して後ろに追加
			for (const child of children) {
				if (!processedSet.has(child)) {
					sortedNodes.push(child);
				}
			}

			// 並び替え適用 (変更がある場合のみ appendChild し直す)
			let isDifferent = false;
			for (let i = 0; i < children.length; i++) {
				if (children[i] !== sortedNodes[i]) {
					isDifferent = true;
					break;
				}
			}

			if (isDifferent) {
				console.log(`[DirectoryNameOverwrite] Sorting items in: ${rootPath}`);
				for (const node of sortedNodes) {
					childrenContainer.appendChild(node);
				}
			}
		}
	}

	public displaySettings(containerEl: HTMLElement) {
		containerEl.createEl("h2", { text: "Directory Name Overwrite" });

		new Setting(containerEl)
			.setName("Enable Overwrite")
			.setDesc("user-map.json に基づいてファイルエクスプローラーの表示名を書き換えます。")
			.addToggle((toggle) =>
				toggle.setValue(this.settings.enabled).onChange(async (value) => {
					this.settings.enabled = value;
					await this.onSettingsSave();
					if (value) {
						await this.loadUserMap();
						this.applyOverwrites();
						this.applySorting();
					} else {
						this.revertOverwrites();
					}
				}),
			);

		new Setting(containerEl)
			.setName("Map File Path")
			.setDesc("マッピング定義ファイルのパス")
			.addText((text) =>
				text.setValue(this.settings.mapFilePath).onChange(async (value) => {
					this.settings.mapFilePath = value;
					await this.onSettingsSave();
					await this.loadUserMap();
				}),
			);
	}
}
