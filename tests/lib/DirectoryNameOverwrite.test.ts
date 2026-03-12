import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	DEFAULT_DIRECTORY_NAME_OVERWRITE_SETTINGS,
	DirectoryNameOverwriteFeature,
	type UserMap,
} from "@/lib/DirectoryNameOverwrite";

// Obsidianモックの拡張
vi.mock("obsidian", () => {
	return {
		TFile: class {
			path: string;
			extension = "md";
			constructor(path: string) {
				this.path = path;
			}
		},
		TFolder: class {
			path: string;
			constructor(path: string) {
				this.path = path;
			}
		},
		Setting: class {
			setName() {
				return this;
			}
			setDesc() {
				return this;
			}
			addToggle() {
				return this;
			}
			addText() {
				return this;
			}
		},
	};
});

describe("DirectoryNameOverwriteFeature (Optimized)", () => {
	let feature: DirectoryNameOverwriteFeature;
	// biome-ignore lint/suspicious/noExplicitAny: <Test mock requires any>
	let pluginMock: any;
	// biome-ignore lint/suspicious/noExplicitAny: <Test mock requires any>
	let fileExplorerViewMock: any;

	const mockMap: UserMap = {
		scope: {
			mode: "under",
			roots: ["Shared"],
		},
		files: true,
		folders: true,
		map: {
			u123: "佐藤 太郎",
			"project-a": "プロジェクトA（進行中）",
		},
		order: ["u123", "project-a"],
	};

	beforeEach(() => {
		// File Explorer View のモックを作成
		fileExplorerViewMock = {
			fileItems: {},
		};

		pluginMock = {
			app: {
				vault: {
					adapter: { exists: vi.fn(), read: vi.fn() },
					on: vi.fn(),
				},
				workspace: {
					onLayoutReady: vi.fn((cb) => cb()),
					on: vi.fn(),
					getLeavesOfType: vi.fn().mockReturnValue([{ view: fileExplorerViewMock }]),
				},
				metadataCache: {
					on: vi.fn(),
					getFileCache: vi.fn(),
				},
			},
			registerEvent: vi.fn(),
		};

		feature = new DirectoryNameOverwriteFeature(
			pluginMock,
			{ ...DEFAULT_DIRECTORY_NAME_OVERWRITE_SETTINGS },
			vi.fn(),
		);

		// 手動でマップを注入
		// biome-ignore lint/suspicious/noExplicitAny: <Private property access>
		(feature as any).userMap = mockMap;
	});

	// ヘルパー: fileItems にモック要素を追加
	const addMockFileItem = (path: string, originalName: string, isFolder = false) => {
		const el = document.createElement("div");
		const titleEl = document.createElement("div");
		const titleInner = document.createElement("div");
		titleInner.className = isFolder ? "nav-folder-title-content" : "nav-file-title-content";
		titleInner.textContent = originalName;
		titleEl.appendChild(titleInner);

		const fileMock = isFolder ? { path } : { path, extension: "md" };

		fileExplorerViewMock.fileItems[path] = {
			el,
			titleEl,
			file: fileMock,
		};
		return fileExplorerViewMock.fileItems[path];
	};

	describe("コアロジック: 表示名の決定", () => {
		it("user-map.json の設定に従って名前を返すこと", () => {
			const name = feature.getDisplayName("Shared/u123", true);
			expect(name).toBe("佐藤 太郎");
		});

		it("scope 外のパスは null を返すこと", () => {
			const name = feature.getDisplayName("Other/u123", true);
			expect(name).toBeNull();
		});
	});

	describe("表示の上書き (applyTitleToItem)", () => {
		it("Mapに定義されたフォルダ名を書き換えること", () => {
			const item = addMockFileItem("Shared/u123", "u123", true);

			// biome-ignore lint/suspicious/noExplicitAny: <Access private method>
			(feature as any).applyTitleToItem(item);

			const titleInner = item.titleEl.querySelector(".nav-folder-title-content");
			expect(titleInner?.textContent).toBe("佐藤 太郎");
			expect(item.el.getAttribute("data-original-name")).toBe("u123");
			expect(item.el.getAttribute("data-knewrova-overwritten")).toBe("true");
		});

		it("FrontMatter に title がある場合、Map より優先されること", () => {
			const path = "Shared/u123";
			const item = addMockFileItem(path, "u123", false);

			// metadataCache のモック設定
			pluginMock.app.metadataCache.getFileCache.mockReturnValue({
				frontmatter: { title: "FMからの名前" },
			});

			// biome-ignore lint/suspicious/noExplicitAny: <Access private method>
			(feature as any).applyTitleToItem(item);

			const titleInner = item.titleEl.querySelector(".nav-file-title-content");
			expect(titleInner?.textContent).toBe("FMからの名前");
		});

		it("上書き対象でない場合は元の名前に戻ること", () => {
			const item = addMockFileItem("Other/Unknown", "Unknown", false);
			item.el.setAttribute("data-original-name", "Unknown");
			item.el.setAttribute("data-knewrova-overwritten", "true");

			// biome-ignore lint/suspicious/noExplicitAny: <Access private method>
			(feature as any).applyTitleToItem(item);

			expect(item.el.hasAttribute("data-original-name")).toBe(false);
			expect(item.el.style.color).toBe("");
		});
	});

	describe("ソート機能 (applyFolderSorting)", () => {
		it("order設定に基づいてDOM要素を並び替えること", () => {
			const rootPath = "Shared";
			const rootItem = addMockFileItem(rootPath, "Shared", true);

			// 子要素コンテナを作成
			const childrenContainer = document.createElement("div");
			childrenContainer.className = "nav-folder-children";

			// rootItem.el の隣に配置するシミュレーション
			Object.defineProperty(rootItem.el, "nextElementSibling", {
				get: () => childrenContainer,
			});

			// 子要素（ファイル/フォルダ）を逆順で作成
			const itemB = document.createElement("div");
			const selfB = document.createElement("div");
			selfB.className = "tree-item-self";
			selfB.setAttribute("data-path", "Shared/project-a");
			itemB.appendChild(selfB);

			const itemA = document.createElement("div");
			const selfA = document.createElement("div");
			selfA.className = "tree-item-self";
			selfA.setAttribute("data-path", "Shared/u123");
			itemA.appendChild(selfA);

			childrenContainer.appendChild(itemB); // project-a を先に
			childrenContainer.appendChild(itemA); // u123 を後に

			// ソート実行
			// biome-ignore lint/suspicious/noExplicitAny: <Access private method>
			(feature as any).applyFolderSorting(rootPath);

			// order: ["u123", "project-a"] なので順序が入れ替わっているはず
			expect(childrenContainer.children[0]).toBe(itemA);
			expect(childrenContainer.children[1]).toBe(itemB);
		});
	});

	describe("イベント連携", () => {
		it("onload 時に必要なイベントを登録すること", async () => {
			await feature.onload();

			// vault.on('rename'), metadataCache.on('changed') 等が呼ばれているか
			expect(pluginMock.app.vault.on).toHaveBeenCalledWith("rename", expect.any(Function));
			expect(pluginMock.app.metadataCache.on).toHaveBeenCalledWith("changed", expect.any(Function));
		});

		it("onunload 時にすべての変更を元に戻すこと", () => {
			const item = addMockFileItem("Shared/u123", "佐藤 太郎", true);
			item.el.setAttribute("data-original-name", "u123");

			feature.onunload();

			const titleInner = item.titleEl.querySelector(".nav-folder-title-content");
			expect(titleInner?.textContent).toBe("u123");
		});
	});
});
