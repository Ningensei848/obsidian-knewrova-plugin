// Obsidianのクラスや関数を模倣するモック
// 必要に応じて拡張していきます

export class Plugin {
	app: any;
	constructor(app: any) {
		this.app = app;
	}
	registerEvent() {}
	loadData() {
		return Promise.resolve({});
	}
	saveData() {
		return Promise.resolve();
	}
}

export class Setting {
	setName() {
		return this;
	}
	setDesc() {
		return this;
	}
	addText() {
		return this;
	}
	addToggle() {
		return this;
	}
	addButton() {
		return this;
	}
	// ... 他のメソッドも必要に応じてチェーンできるようにする
}

export class PluginSettingTab {
	app: any;
	plugin: any;
	containerEl: HTMLElement;
	constructor(app: any, plugin: any) {
		this.app = app;
		this.plugin = plugin;
		this.containerEl = document.createElement("div");
	}
	display() {}
}

export const Editor = {
	// インターフェースとしての定義が必要な場合
};

export const MarkdownView = {};
