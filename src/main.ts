import { Plugin } from "obsidian";
import { PasteReplacementFeature } from "./lib/PasteReplacement";
import { DEFAULT_SETTINGS, type MyPluginSettings, MyPluginSettingTab } from "./settings";

// ------------------------------------------------------------
// メインのプラグインクラス (統合管理)
// ------------------------------------------------------------
export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	// 機能インスタンスを保持
	pasteReplacementFeature: PasteReplacementFeature;

	async onload() {
		await this.loadSettings();

		// --- 機能の初期化 ---
		// Featureクラスに「プラグイン本体」「その機能用の設定」「保存用コールバック」を渡す
		this.pasteReplacementFeature = new PasteReplacementFeature(
			this,
			this.settings.pasteReplacement,
			async () => await this.saveSettings(),
		);
		// 機能のロード処理（イベント登録など）を実行
		this.pasteReplacementFeature.onload();

		// 設定画面タブを追加
		this.addSettingTab(new MyPluginSettingTab(this.app, this));
	}

	onunload() {
		// 必要であれば各機能の終了処理を呼ぶ
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		// 新しく追加した機能の設定が既存データにない場合の補完
		if (!this.settings.pasteReplacement) {
			this.settings.pasteReplacement = DEFAULT_SETTINGS.pasteReplacement;
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
