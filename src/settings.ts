export interface FolderRule {
	folder: string;
	projectId: string;
}

export interface TaakjePluginSettings {
	todoistApiKeySecretId: string | null; // ID of the secret in SecretStorage
	todoistApiKey: string | null; // Deprecated - kept for migration
	defaultProject: string | null;
	folderRules: FolderRule[]; // Rules for auto-assigning projects based on folder
	addObsidianLabel: boolean;
	obsidianLabel: string;
	ignoreEmptyTasks: boolean;
	separatorChar: string;
	debug: boolean;
}

export const DEFAULT_SETTINGS: TaakjePluginSettings = {
	todoistApiKeySecretId: null,
	todoistApiKey: null,
	defaultProject: null,
	folderRules: [],
	addObsidianLabel: false,
	obsidianLabel: 'obsidian',
	ignoreEmptyTasks: true,
	separatorChar: '|',
	debug: false
};

