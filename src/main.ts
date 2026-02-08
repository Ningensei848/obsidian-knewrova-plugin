import { Plugin } from "obsidian";
import { DirectoryNameOverwriteFeature } from "@/lib/DirectoryNameOverwrite";
import { LifeSpanFeature } from "@/lib/LifeSpan";
import { PasteReplacementFeature } from "@/lib/PasteReplacement";
import { MyPluginSettingTab } from "@/settings";
import { DEFAULT_SETTINGS, type MyPluginSettings } from "@/types";

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	pasteReplacementFeature: PasteReplacementFeature;
	lifeSpanFeature: LifeSpanFeature;
	directoryNameOverwriteFeature: DirectoryNameOverwriteFeature;

	async onload() {
		await this.loadSettings();

		// 1. Paste Replacement
		this.pasteReplacementFeature = new PasteReplacementFeature(
			this,
			this.settings.pasteReplacement,
			async () => await this.saveSettings(),
		);
		this.pasteReplacementFeature.onload();

		// 2. LifeSpan
		this.lifeSpanFeature = new LifeSpanFeature(
			this,
			this.settings.lifeSpan,
			async () => await this.saveSettings(),
		);
		this.lifeSpanFeature.onload();

		// 3. Directory Name Overwrite
		this.directoryNameOverwriteFeature = new DirectoryNameOverwriteFeature(
			this,
			this.settings.directoryNameOverwrite,
			async () => await this.saveSettings(),
		);
		await this.directoryNameOverwriteFeature.onload();

		this.addSettingTab(new MyPluginSettingTab(this.app, this));
	}

	onunload() {
		this.lifeSpanFeature?.onunload();
		this.directoryNameOverwriteFeature?.onunload();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		// 欠落設定の補完
		if (!this.settings.pasteReplacement)
			this.settings.pasteReplacement = DEFAULT_SETTINGS.pasteReplacement;
		if (!this.settings.lifeSpan) this.settings.lifeSpan = DEFAULT_SETTINGS.lifeSpan;
		if (!this.settings.directoryNameOverwrite)
			this.settings.directoryNameOverwrite = DEFAULT_SETTINGS.directoryNameOverwrite;
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
