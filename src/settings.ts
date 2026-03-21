export interface TaakjePluginSettings {
	todoistApiKeySecretId: string | null; // ID of the secret in SecretStorage
	todoistApiKey: string | null; // Deprecated - kept for migration
	defaultProject: string | null;
	addObsidianLabel: boolean;
	obsidianLabel: string;
	debug: boolean;
}

export const DEFAULT_SETTINGS: TaakjePluginSettings = {
	todoistApiKeySecretId: null,
	todoistApiKey: null,
	defaultProject: null,
	addObsidianLabel: false,
	obsidianLabel: 'obsidian',
	debug: false
};

