import type { Plugin } from "obsidian";
import {
	DEFAULT_PASTE_REPLACEMENT_SETTINGS,
	type PasteReplacementFeature,
	type PasteReplacementSettings,
} from "./lib/PasteReplacement";

// ------------------------------------------------------------
// 設定データの型定義
// ------------------------------------------------------------
export interface MyPluginSettings {
	pasteReplacement: PasteReplacementSettings;
	// 他の機能が増えたらここに追加
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	pasteReplacement: DEFAULT_PASTE_REPLACEMENT_SETTINGS,
};

// ------------------------------------------------------------
// プラグイン本体のインターフェース
// ------------------------------------------------------------
// settings.ts など、プラグインの機能を利用する側が参照する型。
// 具象クラス(main.ts)への依存を避けるために定義します。
export interface MyPluginInterface extends Plugin {
	settings: MyPluginSettings;
	saveSettings(): Promise<void>;

	// 各機能へのアクセス
	pasteReplacementFeature: PasteReplacementFeature;
}
