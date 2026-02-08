import { existsSync, readFileSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

// 使用法: node scripts/setup-dev-vault.mjs "/absolute/path/to/your/vault"

const vaultPath = process.argv[2];

if (!vaultPath) {
	console.error("❌ Error: Vault path not provided.");
	console.error("Usage: node scripts/setup-dev-vault.mjs '/path/to/your/vault'");
	process.exit(1);
}

// 1. マニフェストからプラグインIDを取得
const manifestPath = "manifest.json";
if (!existsSync(manifestPath)) {
	console.error("❌ Error: manifest.json not found.");
	process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const pluginId = manifest.id;

console.log(`🔌 Setting up development environment for: ${pluginId}`);

// 2. Obsidianのプラグインディレクトリを確認
const pluginsDir = join(vaultPath, ".obsidian", "plugins");
if (!existsSync(pluginsDir)) {
	console.error(`❌ Error: Plugins directory not found at: ${pluginsDir}`);
	console.error("Make sure the path points to the root of your Obsidian Vault.");
	process.exit(1);
}

// 3. シンボリックリンクの作成
const targetPath = join(pluginsDir, pluginId);
const sourcePath = process.cwd();

if (existsSync(targetPath)) {
	console.log(`⚠️  Path already exists: ${targetPath}`);
	console.log("Skipping symlink creation.");
} else {
	try {
		// Linux/Mac/Windows(Admin) で動作するディレクトリシンボリックリンクを作成
		symlinkSync(sourcePath, targetPath, "dir");
		console.log(`✅ Symlink created!`);
		console.log(`   Source: ${sourcePath}`);
		console.log(`   Target: ${targetPath}`);
		console.log("\n🚀 You can now enable the plugin in Obsidian settings.");
	} catch (err) {
		console.error("❌ Failed to create symlink:", err);
		console.error("If you are on Windows, try running the terminal as Administrator.");
	}
}
