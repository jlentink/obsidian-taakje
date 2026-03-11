import {App, PluginSettingTab, Setting} from "obsidian";
import TaakjePlugin from "./main";

export interface TaakjePluginSettings {
	todoistApiKey: string | null;
	defaultProject: string | null;
	syncInterval: number;
	addObsidianLabel: boolean;
	obsidianLabel: string;
	debug: boolean;
}

export const DEFAULT_SETTINGS: TaakjePluginSettings = {
	todoistApiKey: null,
	defaultProject: null,
	syncInterval: 5,
	addObsidianLabel: false,
	obsidianLabel: 'obsidian',
	debug: false
};

export class TaakjeSettingTab extends PluginSettingTab {
	plugin: TaakjePlugin;

	constructor(app: App, plugin: TaakjePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();
	}
}
