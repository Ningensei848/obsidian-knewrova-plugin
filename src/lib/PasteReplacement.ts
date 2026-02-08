import { type Editor, type MarkdownView, type Plugin, Setting } from "obsidian";

// ------------------------------------------------------------
// 機能固有の型定義
// ------------------------------------------------------------

export interface ReplacementRule {
	pattern: string;
	replacement: string;
	useRegex: boolean;
	matchEntire: boolean;
}

export interface PasteReplacementSettings {
	enabled: boolean;
	rules: ReplacementRule[];
}

export const DEFAULT_PASTE_REPLACEMENT_SETTINGS: PasteReplacementSettings = {
	enabled: true,
	rules: [
		{
			pattern: "https://www.youtube.com/watch\\?v=([a-zA-Z0-9_-]+)",
			replacement: "YouTube Video ID: $1",
			useRegex: true,
			matchEntire: true,
		},
	],
};

// ------------------------------------------------------------
// Featureクラス
// ------------------------------------------------------------
export class PasteReplacementFeature {
	private plugin: Plugin;
	private settings: PasteReplacementSettings;
	private onSettingsSave: () => Promise<void>;

	constructor(
		plugin: Plugin,
		settings: PasteReplacementSettings,
		onSettingsSave: () => Promise<void>,
	) {
		this.plugin = plugin;
		this.settings = settings;
		this.onSettingsSave = onSettingsSave;
	}

	// 機能の初期化処理
	public onload() {
		this.plugin.registerEvent(
			this.plugin.app.workspace.on("editor-paste", this.handlePaste.bind(this)),
		);
	}

	// ペースト処理ロジック
	private handlePaste(evt: ClipboardEvent, editor: Editor, view: MarkdownView) {
		if (this.settings.enabled === false) return;

		const clipboardText = evt.clipboardData?.getData("text/plain");
		if (!clipboardText) return;

		for (const rule of this.settings.rules) {
			if (!rule.pattern) continue;

			let isMatch = false;
			let newText = "";

			try {
				if (rule.useRegex) {
					let patternBody = rule.pattern;

					if (rule.matchEntire) {
						if (!patternBody.startsWith("^")) patternBody = `^${patternBody}`;
						if (!patternBody.endsWith("$")) patternBody = `${patternBody}$`;
					}

					const regex = new RegExp(patternBody, "g");

					if (regex.test(clipboardText)) {
						isMatch = true;
						newText = clipboardText.replace(regex, rule.replacement);
					}
				} else {
					if (rule.matchEntire) {
						if (clipboardText === rule.pattern) {
							isMatch = true;
							newText = rule.replacement;
						}
					} else {
						if (clipboardText.includes(rule.pattern)) {
							isMatch = true;
							newText = clipboardText.split(rule.pattern).join(rule.replacement);
						}
					}
				}

				if (isMatch) {
					evt.preventDefault();
					evt.stopPropagation();
					editor.replaceSelection(newText);
					console.log(`[Paste Replacement] Replaced pattern: "${rule.pattern}"`);
					break;
				}
			} catch (err) {
				console.error(`[Paste Replacement] Error processing rule "${rule.pattern}":`, err);
			}
		}
	}

	// 設定画面の描画ロジック
	public displaySettings(containerEl: HTMLElement) {
		containerEl.createEl("h2", { text: "Paste Replacement" });

		// 1. 機能のON/OFFスイッチ
		new Setting(containerEl)
			.setName("Enable Paste Replacement")
			.setDesc("Toggle this feature on or off.")
			.addToggle((toggle) =>
				toggle.setValue(this.settings.enabled ?? true).onChange(async (value) => {
					this.settings.enabled = value;
					await this.onSettingsSave();
				}),
			);

		containerEl.createEl("h3", { text: "Rules" });
		containerEl.createEl("p", {
			text: "上から順に評価され、最初にマッチしたルールが適用されます。",
		});

		this.settings.rules.forEach((rule, index) => {
			const div = containerEl.createDiv({
				cls: "paste-replacement-rule-container",
			});

			div.style.marginBottom = "20px";
			div.style.border = "1px solid var(--background-modifier-border)";
			div.style.padding = "15px";
			div.style.borderRadius = "6px";
			div.style.backgroundColor = "var(--background-secondary)";

			const header = div.createEl("h4", { text: `Rule #${index + 1}` });
			header.style.marginTop = "0";

			// 2. Search Pattern
			new Setting(div)
				.setName("Search Pattern")
				.setDesc("検索する文字列、または正規表現パターン")
				.addText((text) =>
					text
						.setPlaceholder("Enter pattern...")
						.setValue(rule.pattern)
						.onChange(async (value) => {
							rule.pattern = value;
							await this.onSettingsSave();
						}),
				);

			// 3. Replacement
			new Setting(div)
				.setName("Replacement")
				.setDesc("置換後の文字列 ($1, $2 等で正規表現グループを参照可)")
				.addText((text) =>
					text
						.setPlaceholder("Enter replacement...")
						.setValue(rule.replacement)
						.onChange(async (value) => {
							rule.replacement = value;
							await this.onSettingsSave();
						}),
				);

			// 4. Options
			const optionsDiv = div.createDiv();
			optionsDiv.style.display = "flex";
			optionsDiv.style.flexWrap = "wrap";
			optionsDiv.style.gap = "20px";
			optionsDiv.style.marginTop = "10px";
			optionsDiv.style.marginBottom = "10px";

			const regexSetting = new Setting(optionsDiv)
				.setName("Regex")
				.setDesc("正規表現を使用")
				.addToggle((toggle) =>
					toggle.setValue(rule.useRegex).onChange(async (value) => {
						rule.useRegex = value;
						await this.onSettingsSave();
					}),
				);
			regexSetting.settingEl.style.border = "none";
			regexSetting.settingEl.style.padding = "0";

			const matchEntireSetting = new Setting(optionsDiv)
				.setName("Match Entire")
				.setDesc("完全一致 (推奨)")
				.addToggle((toggle) =>
					toggle.setValue(rule.matchEntire).onChange(async (value) => {
						rule.matchEntire = value;
						await this.onSettingsSave();
					}),
				);
			matchEntireSetting.settingEl.style.border = "none";
			matchEntireSetting.settingEl.style.padding = "0";

			// 5. Delete Button (最後の1個の場合は表示しない)
			if (this.settings.rules.length > 1) {
				const deleteBtnDiv = div.createDiv();
				deleteBtnDiv.style.textAlign = "right";
				deleteBtnDiv.style.marginTop = "10px";

				new Setting(deleteBtnDiv).addButton((button) =>
					button
						.setButtonText("Delete Rule")
						.setWarning()
						.onClick(async () => {
							// 削除確認ダイアログ
							if (!window.confirm("Are you sure you want to delete this rule?")) {
								return;
							}

							this.settings.rules.splice(index, 1);
							await this.onSettingsSave();
							// 再描画
							containerEl.empty();
							this.displaySettings(containerEl);
						}),
				);
				deleteBtnDiv
					.querySelector(".setting-item")
					?.setAttribute("style", "border: none; padding: 0;");
			}
		});

		// Add New Rule Button
		const addDiv = containerEl.createDiv();
		addDiv.style.marginTop = "20px";
		addDiv.style.textAlign = "center";

		new Setting(addDiv).setName("Add New Rule").addButton((button) =>
			button
				.setButtonText("Add Rule")
				.setCta()
				.onClick(async () => {
					this.settings.rules.push({
						pattern: "",
						replacement: "",
						useRegex: false,
						matchEntire: true,
					});
					await this.onSettingsSave();
					containerEl.empty();
					this.displaySettings(containerEl);
				}),
		);
	}
}
