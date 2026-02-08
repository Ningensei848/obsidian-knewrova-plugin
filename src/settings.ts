import { type App, PluginSettingTab } from "obsidian";
import type MyPlugin from "./main";

export class MyPluginSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// 1. Paste Replacement
		this.plugin.pasteReplacementFeature.displaySettings(containerEl);

		containerEl.createEl("hr");

		// 2. LifeSpan
		this.plugin.lifeSpanFeature.displaySettings(containerEl);

		containerEl.createEl("hr");

		// 3. Directory Name Overwrite
		this.plugin.directoryNameOverwriteFeature.displaySettings(containerEl);
	}
}
