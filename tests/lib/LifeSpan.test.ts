import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_LIFESPAN_SETTINGS, LifeSpanFeature } from "@/lib/LifeSpan";

// Obsidianモック
vi.mock("obsidian", () => import("../__mocks__/obsidian"));

describe("LifeSpanFeature - 文書保存ロジック", () => {
	let feature: LifeSpanFeature;

	beforeEach(() => {
		const pluginMock = {
			app: {
				workspace: { on: vi.fn(), getLeavesOfType: vi.fn() },
				metadataCache: { on: vi.fn(), getFileCache: vi.fn() },
			},
			registerEvent: vi.fn(),
		} as any;

		feature = new LifeSpanFeature(pluginMock, { ...DEFAULT_LIFESPAN_SETTINGS }, vi.fn());
	});

	describe("calculateExpiryDate (次年度末の計算)", () => {
		// 日本の会計年度: 4月開始、3月終了
		// 期限 = 次年度の3月31日

		it("4月の場合、翌々年の3月末になること (2024/04 -> 2024年度 -> 期限:2026/03/31)", () => {
			const date = new Date("2024-04-01");
			const result = feature.calculateExpiryDate(date);
			expect(result).toContain("2026/03/31");
		});

		it("12月の場合、翌々年の3月末になること (2024/12 -> 2024年度 -> 期限:2026/03/31)", () => {
			const date = new Date("2024-12-31");
			const result = feature.calculateExpiryDate(date);
			expect(result).toContain("2026/03/31");
		});

		it("1月の場合、翌年の3月末になること (2025/01 -> 2024年度 -> 期限:2026/03/31)", () => {
			const date = new Date("2025-01-15");
			const result = feature.calculateExpiryDate(date);
			expect(result).toContain("2026/03/31");
		});

		it("3月の場合、翌年の3月末になること (2025/03 -> 2024年度 -> 期限:2026/03/31)", () => {
			const date = new Date("2025-03-31");
			const result = feature.calculateExpiryDate(date);
			expect(result).toContain("2026/03/31");
		});
	});
});
