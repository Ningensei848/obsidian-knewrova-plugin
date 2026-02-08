import type { Plugin } from "obsidian";
import {
	DEFAULT_DIRECTORY_NAME_OVERWRITE_SETTINGS,
	type DirectoryNameOverwriteFeature,
	type DirectoryNameOverwriteSettings,
} from "@/lib/DirectoryNameOverwrite";
import {
	DEFAULT_LIFESPAN_SETTINGS,
	type LifeSpanFeature,
	type LifeSpanSettings,
} from "@/lib/LifeSpan";
import {
	DEFAULT_PASTE_REPLACEMENT_SETTINGS,
	type PasteReplacementFeature,
	type PasteReplacementSettings,
} from "@/lib/PasteReplacement";

export interface MyPluginSettings {
	pasteReplacement: PasteReplacementSettings;
	lifeSpan: LifeSpanSettings;
	directoryNameOverwrite: DirectoryNameOverwriteSettings;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	pasteReplacement: DEFAULT_PASTE_REPLACEMENT_SETTINGS,
	lifeSpan: DEFAULT_LIFESPAN_SETTINGS,
	directoryNameOverwrite: DEFAULT_DIRECTORY_NAME_OVERWRITE_SETTINGS,
};

export interface MyPluginInterface extends Plugin {
	settings: MyPluginSettings;
	saveSettings(): Promise<void>;

	pasteReplacementFeature: PasteReplacementFeature;
	lifeSpanFeature: LifeSpanFeature;
	directoryNameOverwriteFeature: DirectoryNameOverwriteFeature;
}
