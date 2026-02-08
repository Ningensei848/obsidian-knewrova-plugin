import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";

const targetVersion = process.env.npm_package_version;

if (!targetVersion) {
	console.error("Error: npm_package_version is not set. Run this script via 'npm version'");
	process.exit(1);
}

// 1. Update manifest.json
const manifestPath = "manifest.json";
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.version = targetVersion;
writeFileSync(manifestPath, JSON.stringify(manifest, null, "\t"));
console.log(`Updated manifest.json to ${targetVersion}`);

// 2. Update versions.json
const versionsPath = "versions.json";
let versions = {};
try {
	versions = JSON.parse(readFileSync(versionsPath, "utf8"));
	// oxlint-disable-next-line no-unused-vars
} catch (_e) {
	// versions.json doesn't exist yet, start fresh
}
versions[targetVersion] = manifest.minAppVersion;
writeFileSync(versionsPath, JSON.stringify(versions, null, "\t"));
console.log(`Updated versions.json entry for ${targetVersion}`);
