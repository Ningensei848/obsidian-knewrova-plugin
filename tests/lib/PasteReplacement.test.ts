import type { Editor, MarkdownView, Plugin } from "obsidian";
import { beforeEach, describe, expect, it, vi } from "vitest";
// 階層が深くなったため、../.. でルートに戻り、src/lib を参照します
import {
	DEFAULT_PASTE_REPLACEMENT_SETTINGS,
	PasteReplacementFeature,
} from "../../src/lib/PasteReplacement";

// モックの場所も階層に合わせて調整 (tests/__mocks__ は tests 直下のまま維持するのが一般的ですが、
// 相対パスで参照する場合は ../../tests/__mocks__ となります。
// ただし、Vitestはデフォルトで __mocks__ を解決するため、パス指定は不要なケースが多いですが、
// ここでは明示的な vi.mock を使っているためパスを合わせます)
vi.mock("obsidian", () => import("../__mocks__/obsidian"));

describe("PasteReplacementFeature", () => {
	let pluginMock: Plugin;
	let editorMock: Editor;
	let viewMock: MarkdownView;
	let feature: PasteReplacementFeature;
	let saveSettingsMock: any;

	beforeEach(() => {
		// モックの初期化
		pluginMock = {
			app: { workspace: { on: vi.fn() } },
			registerEvent: vi.fn(),
		} as unknown as Plugin;

		editorMock = {
			replaceSelection: vi.fn(),
		} as unknown as Editor;

		viewMock = {} as unknown as MarkdownView;
		saveSettingsMock = vi.fn();

		// テスト対象のクラスをインスタンス化
		feature = new PasteReplacementFeature(
			pluginMock,
			JSON.parse(JSON.stringify(DEFAULT_PASTE_REPLACEMENT_SETTINGS)), // Deep copy settings
			saveSettingsMock,
		);

		// イベント登録を済ませる
		feature.onload();
	});

	it("YouTubeのURLが正規表現で置換されること", () => {
		// クリップボードイベントのモック
		const clipboardEvent = {
			clipboardData: {
				getData: vi.fn().mockReturnValue("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
			},
			preventDefault: vi.fn(),
			stopPropagation: vi.fn(),
		} as unknown as ClipboardEvent;

		// privateメソッドへのアクセス (anyキャスト)
		(feature as any).handlePaste(clipboardEvent, editorMock, viewMock);

		// 検証
		expect(clipboardEvent.preventDefault).toHaveBeenCalled();
		expect(editorMock.replaceSelection).toHaveBeenCalledWith("YouTube Video ID: dQw4w9WgXcQ");
	});

	it("パターンに一致しない場合は置換されないこと", () => {
		const clipboardEvent = {
			clipboardData: {
				getData: vi.fn().mockReturnValue("Just a normal text"),
			},
			preventDefault: vi.fn(),
			stopPropagation: vi.fn(),
		} as unknown as ClipboardEvent;

		(feature as any).handlePaste(clipboardEvent, editorMock, viewMock);

		expect(clipboardEvent.preventDefault).not.toHaveBeenCalled();
		expect(editorMock.replaceSelection).not.toHaveBeenCalled();
	});
});
