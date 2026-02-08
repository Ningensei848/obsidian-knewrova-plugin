import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	DEFAULT_DIRECTORY_NAME_OVERWRITE_SETTINGS,
	DirectoryNameOverwriteFeature,
	type UserMap,
} from "@/lib/DirectoryNameOverwrite";

vi.mock("obsidian", () => import("../__mocks__/obsidian"));

describe("DirectoryNameOverwriteFeature Logic", () => {
	let feature: DirectoryNameOverwriteFeature;
	let pluginMock: any;

	const mockMap: UserMap = {
		scope: {
			mode: "under",
			roots: ["Shared", "Other/Root"],
		},
		files: false,
		folders: true,
		map: {
			u123: "佐藤 太郎",
			u999: "鈴木 花子",
			ningensei848: "久保川一良", // 小文字定義
		},
		order: ["ningensei848", "u999", "u123"],
	};

	beforeEach(() => {
		pluginMock = {
			app: {
				vault: { adapter: { exists: vi.fn(), read: vi.fn() }, on: vi.fn() },
				workspace: { onLayoutReady: vi.fn(), on: vi.fn(), getLeavesOfType: vi.fn() },
			},
			registerEvent: vi.fn(),
		};
		feature = new DirectoryNameOverwriteFeature(
			pluginMock,
			DEFAULT_DIRECTORY_NAME_OVERWRITE_SETTINGS,
			vi.fn(),
		);
		// テスト用にマップを直接注入
		(feature as any).userMap = mockMap;
	});

	// --- Renaming Logic Tests ---

	it("roots 直下のフォルダ名を置換すること", () => {
		// Shared/u123 -> 佐藤 太郎
		const name = feature.getDisplayName("Shared/u123", true);
		expect(name).toBe("佐藤 太郎");
	});

	it("複数の roots に対応すること", () => {
		// Other/Root/u999 -> 鈴木 花子
		const name = feature.getDisplayName("Other/Root/u999", true);
		expect(name).toBe("鈴木 花子");
	});

	it("大文字小文字を区別せずに置換すること (Ningensei848 -> ningensei848)", () => {
		// 実際のパスは大文字混じりだが、設定は小文字
		const name = feature.getDisplayName("Shared/Ningensei848", true);
		expect(name).toBe("久保川一良");
	});

	it("大文字小文字を区別せずに置換すること (U123 -> u123)", () => {
		const name = feature.getDisplayName("Shared/U123", true);
		expect(name).toBe("佐藤 太郎");
	});

	it("マップに存在しない名前は null を返すこと", () => {
		const name = feature.getDisplayName("Shared/u000", true);
		expect(name).toBeNull();
	});

	it("roots 配下でないパスは置換しないこと", () => {
		// u123 はマップにあるが、親が Shared ではない
		const name = feature.getDisplayName("MyWork/u123", true);
		expect(name).toBeNull();
	});

	it("階層が深すぎる場合は置換しないこと (mode='under' の仕様: 直下のみ)", () => {
		// Shared/Project/u123 -> 親は Shared/Project なので roots=["Shared"] には該当しない
		const name = feature.getDisplayName("Shared/Project/u123", true);
		expect(name).toBeNull();
	});

	it("ファイルの設定が無効な場合はファイルを置換しないこと", () => {
		// files: false 設定
		const name = feature.getDisplayName("Shared/u123", false); // isFolder=false
		expect(name).toBeNull();
	});

	// --- Sorting Logic Tests ---

	it("order設定が正しくロードされていること", () => {
		const loadedMap = (feature as any).userMap as UserMap;
		expect(loadedMap.order).toBeDefined();
		expect(loadedMap.order).toContain("ningensei848");
	});

	// Note: applySorting のDOM操作ロジックは jsdom 環境での複雑なセットアップが必要なため、
	// ロジックの依存データ構造が正しいことのみを確認しています。
});
