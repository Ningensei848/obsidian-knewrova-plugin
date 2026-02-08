import { type App, PluginSettingTab } from "obsidian";
import {
	DEFAULT_PASTE_REPLACEMENT_SETTINGS,
	type PasteReplacementSettings,
} from "./lib/PasteReplacement";
// 型定義のみをインポート（循環参照回避）
import type MyPlugin from "./main";

// ------------------------------------------------------------
// プラグイン全体の設定定義
// ------------------------------------------------------------

export interface MyPluginSettings {
	// 将来的に機能が増えたらここに追加していく
	pasteReplacement: PasteReplacementSettings;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	pasteReplacement: DEFAULT_PASTE_REPLACEMENT_SETTINGS,
};

// ------------------------------------------------------------
// 統合設定画面
// ------------------------------------------------------------
export class MyPluginSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// --- Paste Replacement Feature Settings ---
		// コンテナを渡して描画を委譲する
		this.plugin.pasteReplacementFeature.displaySettings(containerEl);
	}
}
