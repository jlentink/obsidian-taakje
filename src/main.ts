import {App, Plugin, PluginSettingTab, Setting, ButtonComponent, DropdownComponent, requestUrl, Notice, SecretComponent, AbstractInputSuggest} from 'obsidian';
import {DEFAULT_SETTINGS, TaakjePluginSettings} from "./settings";

class FolderSuggest extends AbstractInputSuggest<string> {
	private folders: string[];
	private input: HTMLInputElement;

	constructor(app: App, inputEl: HTMLInputElement) {
		super(app, inputEl);
		this.input = inputEl;
		// Get all folders and include root folder
		this.folders = ["/"].concat(this.app.vault.getAllFolders().map(folder => folder.path));
	}

	getSuggestions(inputStr: string): string[] {
		const inputLower = inputStr.toLowerCase();
		return this.folders.filter(folder =>
			folder.toLowerCase().includes(inputLower)
		);
	}

	renderSuggestion(folder: string, el: HTMLElement): void {
		el.createEl("div", { text: folder });
	}

	selectSuggestion(folder: string): void {
		this.input.value = folder;
		const event = new Event('input');
		this.input.dispatchEvent(event);
		this.close();
	}
}

export class TaakjeSettingTab extends PluginSettingTab {
	plugin: TaakjePlugin;
	projects: Record<string, string> = {};
	labels: Record<string, string> = {};

	constructor(app: App, plugin: TaakjePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	async fetchProjects(apiKey: string): Promise<Record<string, string>> {
		if (!apiKey) return {};
		try {
			const response = await requestUrl({
				url: 'https://api.todoist.com/api/v1/projects',
				method: 'GET',
				headers: { 'Authorization': `Bearer ${apiKey}` },
				throw: false
			});
			this.plugin.log('[Taakje] Projects API response:', response.status, response.json);
			if (response.status !== 200) return {};
			const json = response.json as Array<{id: string, name: string}> | {results?: Array<{id: string, name: string}>};
			// API v1 retourneert { results: [...] } of direct een array
			const raw = Array.isArray(json) ? json : (json.results ?? []);
			const projects: Record<string, string> = {};
			for (const p of raw) projects[p.id] = p.name;
			this.plugin.log('[Taakje] Parsed projects:', projects);
			return projects;
		} catch (e) {
			this.plugin.log('[Taakje] Error fetching projects:', e);
			return {};
		}
	}

	async fetchLabels(apiKey: string): Promise<Record<string, string>> {
		if (!apiKey) return {};
		try {
			const response = await requestUrl({
				url: 'https://api.todoist.com/api/v1/labels',
				method: 'GET',
				headers: { 'Authorization': `Bearer ${apiKey}` },
				throw: false
			});
			this.plugin.log('[Taakje] Labels API response:', response.status, response.json);
			if (response.status !== 200) return {};
			const json = response.json as Array<{id: string, name: string}> | {results?: Array<{id: string, name: string}>};
			const raw = Array.isArray(json) ? json : (json.results ?? []);
			const labels: Record<string, string> = {};
			for (const label of raw) {
				labels[label.name] = label.name;
			}
			this.plugin.log('[Taakje] Parsed labels:', labels);
			return labels;
		} catch (e) {
			this.plugin.log('[Taakje] Error fetching labels:', e);
			return {};
		}
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		// Load projects and labels if we have an API key
		this.plugin.getApiKey().then(apiKey => {
			if (apiKey && Object.keys(this.projects).length === 0) {
				this.fetchProjects(apiKey).then(projects => {
					if (Object.keys(projects).length > 0) {
						this.projects = projects;
						this.display();
					}
				}).catch(() => {
					// Ignore errors
				});
			}
			if (apiKey && Object.keys(this.labels).length === 0) {
				this.fetchLabels(apiKey).then(labels => {
					if (Object.keys(labels).length > 0) {
						this.labels = labels;
						this.display();
					}
				}).catch(() => {
					// Ignore errors
				});
			}
		}).catch(() => {
			// Ignore errors
		});

		new Setting(containerEl)
			.setName('Todoist API key')
			.setDesc('Select a secret from secret storage')
			.addComponent(el => new SecretComponent(this.app, el)
				.setValue(this.plugin.settings.todoistApiKeySecretId || '')
				.onChange(async (value) => {
					this.plugin.settings.todoistApiKeySecretId = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Test connection')
			.setDesc('Verify your API key and fetch projects')
			.addButton((button: ButtonComponent) => {
				button.setButtonText('Test connection').onClick(async () => {
					const currentApiKey = await this.plugin.getApiKey();
					const projects = await this.fetchProjects(currentApiKey || '');
					const labels = await this.fetchLabels(currentApiKey || '');
					if (Object.keys(projects).length > 0) {
						new Notice('Connection successful!');
						this.projects = projects;
						this.labels = labels;
						this.display();
					} else {
						new Notice('Connection failed. Check your API key.');
					}
				});
			});

		if (Object.keys(this.projects).length > 0) {
			new Setting(containerEl)
				.setName('Default project')
				.setDesc('Select the default project for new tasks')
				.addDropdown((dropdown: DropdownComponent) => {
					dropdown.addOptions(this.projects);
					dropdown.setValue(this.plugin.settings.defaultProject || '');
					dropdown.onChange(async (value) => {
						this.plugin.settings.defaultProject = value;
						await this.plugin.saveSettings();
					});
				});
		}


		new Setting(containerEl)
			.setName('Add Obsidian label')
			.setDesc('Add a label to all tasks created from Obsidian')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.addObsidianLabel)
				.onChange(async (value) => {
					this.plugin.settings.addObsidianLabel = value;
					await this.plugin.saveSettings();
					this.display(); // Refresh to show/hide label input
				}));

		if (this.plugin.settings.addObsidianLabel) {
			if (Object.keys(this.labels).length > 0) {
				new Setting(containerEl)
					.setName('Obsidian label name')
					.setDesc('Select a label from your labels')
					.addDropdown((dropdown: DropdownComponent) => {
						dropdown.addOptions(this.labels);
						dropdown.setValue(this.plugin.settings.obsidianLabel || 'obsidian');
						dropdown.onChange(async (value) => {
							this.plugin.settings.obsidianLabel = value || 'obsidian';
							await this.plugin.saveSettings();
						});
					});
			} else {
				new Setting(containerEl)
					.setName('Obsidian label name')
					.setDesc('The label name to add to tasks (without @). Test connection to load labels.')
					.addText(text => text
						.setPlaceholder('Obsidian')
						.setValue(this.plugin.settings.obsidianLabel || 'obsidian')
						.onChange(async (value) => {
							this.plugin.settings.obsidianLabel = value || 'obsidian';
							await this.plugin.saveSettings();
						}));
			}
		}

		new Setting(containerEl)
			.setName('Ignore empty tasks')
			.setDesc('Skip tasks with no meaningful content')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.ignoreEmptyTasks)
				.onChange(async (value) => {
					this.plugin.settings.ignoreEmptyTasks = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Separator character')
			.setDesc('Separator placed before the link, surrounded by spaces')
			.addText(text => text
				.setPlaceholder('|')
				.setValue(this.plugin.settings.separatorChar || '|')
				.onChange(async (value) => {
					this.plugin.settings.separatorChar = value || '|';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Debug mode')
			.setDesc('Show debug messages in the console')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.debug)
				.onChange(async (value) => {
					this.plugin.settings.debug = value;
					await this.plugin.saveSettings();
				}));

		// Folder Rules section at the bottom, only if projects are loaded
		if (Object.keys(this.projects).length > 0) {
			// Create a container div for the folder rules section
			const folderRulesContainer = containerEl.createDiv({ cls: 'taakje-folder-rules-container' });

			new Setting(folderRulesContainer)
				.setName('Folder rules')
				.setHeading();

			new Setting(folderRulesContainer)
				.setDesc('Automatically assign projects based on file location. Rules apply to the folder and all its subfolders.');

			// Display existing folder rules
			this.plugin.settings.folderRules.forEach((rule, index) => {
				new Setting(folderRulesContainer)
					.setName(`Rule ${index + 1}`)
					.setDesc(`📁 ${rule.folder || '(not set)'} → 🎯 ${this.projects[rule.projectId] || '(not set)'}`)
					.addSearch(search => {
						search
							.setPlaceholder('Folder path (e.g., folder1/folder2)')
							.setValue(rule.folder)
							.onChange(async (value) => {
								const ruleToUpdate = this.plugin.settings.folderRules[index];
								if (ruleToUpdate) {
									ruleToUpdate.folder = value;
									await this.plugin.saveSettings();
								}
							});
						new FolderSuggest(this.app, search.inputEl);
					})
					.addDropdown((dropdown: DropdownComponent) => {
						dropdown.addOptions(this.projects);
						dropdown.setValue(rule.projectId);
						dropdown.onChange(async (value) => {
							const ruleToUpdate = this.plugin.settings.folderRules[index];
							if (ruleToUpdate) {
								ruleToUpdate.projectId = value;
								await this.plugin.saveSettings();
							}
						});
					})
					.addButton((button: ButtonComponent) => {
						button.setButtonText('Delete')
							.setWarning()
							.onClick(async () => {
								this.plugin.settings.folderRules.splice(index, 1);
								await this.plugin.saveSettings();
								this.display();
							});
					});
			});

			// Add new folder rule
			let newFolderPath = '';
			let newProjectId = '';

			new Setting(folderRulesContainer)
				.setName('Add new folder rule')
				.addSearch(search => {
					search
						.setPlaceholder('Folder path (e.g., folder1/folder2)')
						.setValue('')
						.onChange((value) => {
							newFolderPath = value;
						});
					new FolderSuggest(this.app, search.inputEl);
				})
				.addDropdown((dropdown: DropdownComponent) => {
					dropdown.addOptions(this.projects);
					dropdown.setValue('');
					dropdown.onChange((value) => {
						newProjectId = value;
					});
				})
				.addButton((button: ButtonComponent) => {
					button.setButtonText('Add rule')
						.setCta()
						.onClick(async () => {
							if (newFolderPath && newProjectId) {
								this.plugin.settings.folderRules.push({
									folder: newFolderPath,
									projectId: newProjectId
								});
								await this.plugin.saveSettings();
								this.display();
								new Notice('Folder rule added');
							} else {
								new Notice('Please enter both folder path and project');
							}
						});
				});
		}
	}
}

export default class TaakjePlugin extends Plugin {
	settings: TaakjePluginSettings;
	projects: Record<string, {id: string, name: string}> = {}; // clean name -> {project ID, exact name}

	// Debug log helper - alleen loggen als debug mode aan staat
	log(...args: unknown[]) {
		if (this.settings?.debug === true) {
			// eslint-disable-next-line no-undef
			console.debug(...args);
		}
	}

	// Get API key from secret storage
	async getApiKey(): Promise<string | null> {
		try {
			// Migration: if we have old todoistApiKey in settings, migrate it to secret storage
			if (this.settings.todoistApiKey && !this.settings.todoistApiKeySecretId) {
				this.log('[Taakje] Migrating API key from settings to secret storage');
				// Create a unique secret ID for this vault
				const secretId = 'todoist-api-key';

				// Check if secretStorage is available (added in Obsidian 1.11.4)
				if (this.app.secretStorage) {
					this.app.secretStorage.setSecret(secretId, this.settings.todoistApiKey);
					this.settings.todoistApiKeySecretId = secretId;
					// Clear old storage
					this.settings.todoistApiKey = null;
					await this.saveSettings();
					this.log('[Taakje] Migration completed');
					return this.app.secretStorage.getSecret(secretId);
				} else {
					// Fallback for older Obsidian versions
					this.log('[Taakje] SecretStorage not available, using settings storage');
					return this.settings.todoistApiKey;
				}
			}

			// Get secret from storage using the secret ID
			if (this.settings.todoistApiKeySecretId) {
				if (this.app.secretStorage) {
					const secret = this.app.secretStorage.getSecret(this.settings.todoistApiKeySecretId);
					return secret;
				} else {
					// Fallback to old storage if secretStorage not available
					this.log('[Taakje] SecretStorage not available, using settings');
					return this.settings.todoistApiKey;
				}
			}

			// No API key configured
			return null;
		} catch (e) {
			this.log('[Taakje] Error getting API key from secret storage:', e);
			// Fallback to settings
			return this.settings.todoistApiKey;
		}
	}

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new TaakjeSettingTab(this.app, this));

		// Command: Process huidige file
		this.addCommand({
			id: 'process-current-file',
			name: 'Process current file',
			callback: async () => {
				await this.processCurrentFile();
			}
		});

		// Ribbon icon in de linker balk
		this.addRibbonIcon('check-square', 'Process file', async () => {
			await this.processCurrentFile();
		});

	// Luister naar checkbox changes met capture phase
	// eslint-disable-next-line no-undef
	this.registerDomEvent(document, 'change', (event: Event) => {
		const target = event.target as HTMLElement;

		// Moet een checkbox input zijn
		if (target.tagName !== 'INPUT') return;
		if ((target as HTMLInputElement).type !== 'checkbox') return;

		const checkbox = target as HTMLInputElement;
		const isChecked = checkbox.checked;
		const file = this.app.workspace.getActiveFile();
		if (!file) return;

		// Vind de task text in de parent element
		const taskItem = target.closest('.task-list-item') || target.closest('li');
		const rawTaskText = taskItem?.textContent?.trim() || 'Unknown task';
		const taskText = this.getCleanTaskText(rawTaskText);

		this.log('[Taakje] ═══════════════════════════════════════');
		this.log('[Taakje] ☑️ CHECKBOX CHANGED (DOM)');
		this.log('[Taakje] 📄 File:', file.path);
		this.log('[Taakje] 📝 Task:', taskText);
		this.log('[Taakje] 🔄 Changed to:', isChecked ? 'COMPLETED ✅' : 'OPEN ⬜');
		this.log('[Taakje] ═══════════════════════════════════════');
	}, true); // capture phase

		// Backup: Luister naar file modifications en detecteer checkbox changes
		let previousContent: Record<string, string> = {};

		this.registerEvent(
			this.app.vault.on('modify', async (abstractFile) => {
				if (!abstractFile.path.endsWith('.md')) return;

				// Type guard voor TFile
				const file = this.app.vault.getAbstractFileByPath(abstractFile.path);
				if (!file || !('stat' in file)) return;

				const content = await this.app.vault.read(file as import('obsidian').TFile);
				const prevContent = previousContent[abstractFile.path];

				if (prevContent) {
					// Vergelijk oude en nieuwe content om checkbox changes te vinden
					const oldLines = prevContent.split('\n');
					const newLines = content.split('\n');

					const taskRegex = /^(\s*)-\s*\[([ xX])\]\s*(.*)$/;
 					const todoistLinkRegex = /\[Todoist\]\(https:\/\/app\.todoist\.com\/app\/task\/([^)]+)\)/;

					for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
						const oldLine = oldLines[i] || '';
						const newLine = newLines[i] || '';

						if (oldLine !== newLine) {
							const oldMatch = oldLine.match(taskRegex);
							const newMatch = newLine.match(taskRegex);

							if (oldMatch && newMatch && oldMatch[2] && newMatch[2] && newMatch[3]) {
								const oldCompleted = oldMatch[2].toLowerCase() === 'x';
								const newCompleted = newMatch[2].toLowerCase() === 'x';

								if (oldCompleted !== newCompleted) {
									const rawTaskText = newMatch[3].trim();
									const taskText = this.getCleanTaskText(rawTaskText);
									const todoistMatch = rawTaskText.match(todoistLinkRegex);
									const todoistId = todoistMatch ? todoistMatch[1] : null;


									this.log('[Taakje] ═══════════════════════════════════════');
									this.log('[Taakje] ☑️ CHECKBOX CHANGED (File Modify)');
									this.log('[Taakje] 📄 File:', abstractFile.path);
									this.log('[Taakje] 📝 Line:', i + 1);
									this.log('[Taakje] 📝 Task:', taskText);
									this.log('[Taakje] 🔄 Changed to:', newCompleted ? 'COMPLETED ✅' : 'OPEN ⬜');
									this.log('[Taakje] 🔗 Todoist ID:', todoistId || 'No Todoist link');
									this.log('[Taakje] ═══════════════════════════════════════');

									// Update Todoist als we een ID hebben
									if (todoistId) {
										if (newCompleted) {
								const success = await this.completeTodoistTask(todoistId);
								if (success) {
									new Notice(`Task completed: ${taskText}`);
								}
							} else {
								const success = await this.reopenTodoistTask(todoistId);
								if (success) {
									new Notice(`Task reopened:  ${taskText}`);
								}
							}
									}
								}
							}
						}
					}
				}

				// Update previous content
				previousContent[abstractFile.path] = content;
			})
		);

	// Initialize previous content for active file
	const activeFile = this.app.workspace.getActiveFile();
	if (activeFile) {
		this.app.vault.read(activeFile).then(content => {
			previousContent[activeFile.path] = content;
		}).catch(() => {
			// Ignore errors during initial load
		});
	}
}

	async fetchProjects(): Promise<void> {
		const apiKey = await this.getApiKey();
		if (!apiKey) return;
		try {
			const response = await requestUrl({
				url: 'https://api.todoist.com/api/v1/projects',
				method: 'GET',
				headers: { 'Authorization': `Bearer ${apiKey}` },
				throw: false
			});
			this.log('[Taakje] fetchProjects response status:', response.status);
			if (response.status !== 200) return;
			const json = response.json as Array<{id: string, name: string}> | {results?: Array<{id: string, name: string}>};
			const raw = Array.isArray(json) ? json : (json.results ?? []);
		this.projects = {};
		for (const p of raw) {
			// Strip emoji's en spaties, lowercase voor matching -> store both ID and exact name
			const cleanName = this.stripForMatching(p.name);
			this.projects[cleanName] = {id: p.id, name: p.name}; // clean name -> {id, exact name}
			this.log('[Taakje] Added project:', cleanName, '->', p.id, '(', p.name, ')');
		}
			this.log('[Taakje] Total projects loaded:', Object.keys(this.projects).length);
		} catch (e) {
			this.log('[Taakje] Error fetching projects:', e);
		}
	}

	// Strip emoji's en spaties van een string voor matching
	stripForMatching(name: string): string {
		return name
			.replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove emoji's
			.replace(/[\u{2600}-\u{26FF}]/gu, '')   // Remove misc symbols
			.replace(/[\u{2700}-\u{27BF}]/gu, '')   // Remove dingbats
			.replace(/\s+/g, '')                     // Remove spaces
			.toLowerCase();
	}

	// Extract clean task text without Todoist link and separator
	getCleanTaskText(taskText: string): string {
		const sep = this.settings?.separatorChar || '|';
		// Create regex to match separator + Todoist link at the end
		const todoistLinkPattern = new RegExp(`\\s*\\${sep}\\s*\\[Todoist\\]\\(https:\\/\\/app\\.todoist\\.com\\/app\\/task\\/[^)]+\\)\\s*$`);
		return taskText.replace(todoistLinkPattern, '').trim();
	}

	// Get project ID based on file path and folder rules
	getProjectIdForFile(filePath: string): string | null {
		if (!this.settings.folderRules || this.settings.folderRules.length === 0) {
			return null;
		}

		// Normalize file path (remove leading/trailing slashes)
		const normalizedFilePath = filePath.replace(/^\/+|\/+$/g, '');

		// Find matching folder rules, prioritizing most specific (longest) paths
		const matchingRules = this.settings.folderRules
			.filter(rule => {
				const normalizedRuleFolder = rule.folder.replace(/^\/+|\/+$/g, '');
				// Check if file is in this folder or a subfolder
				return normalizedFilePath.startsWith(normalizedRuleFolder + '/') ||
				       normalizedFilePath.startsWith(normalizedRuleFolder) &&
				       (normalizedFilePath === normalizedRuleFolder || normalizedFilePath[normalizedRuleFolder.length] === '/');
			})
			.sort((a, b) => b.folder.length - a.folder.length); // Sort by path length (most specific first)

		if (matchingRules.length > 0) {
			const rule = matchingRules[0];
			if (rule) {
				this.log('[Taakje] Found folder rule match:', rule.folder, '-> Project ID:', rule.projectId);
				return rule.projectId;
			}
		}

		this.log('[Taakje] No folder rule matched for path:', filePath);
		return null;
	}

	// Extract project from content and return {text, projectId, projectName}
	extractProject(content: string): {text: string, projectId: string | null, projectName: string | null} {
		this.log('[Taakje] extractProject input:', content);
		this.log('[Taakje] Available projects:', this.projects);

		let projectId: string | null = null;
		let projectName: string | null = null;

		// Zoek alle #projectname in de content
		const result = content.replace(/#(\S+)/g, (match: string, projectNameParam: string) => {
			const cleanName = this.stripForMatching(projectNameParam);
			this.log('[Taakje] Found hashtag:', match, '-> looking for:', cleanName);
			if (this.projects[cleanName]) {
				projectId = this.projects[cleanName].id;
				projectName = this.projects[cleanName].name;
				this.log('[Taakje] Match found! Project ID:', projectId, 'Name:', projectName);
				// Verwijder de #project hashtag uit de tekst
				return '';
			}
			this.log('[Taakje] No match found for:', cleanName);
			return match; // Behoud onbekende hashtags
		}).replace(/\s+/g, ' ').trim(); // Clean up extra spaces

		this.log('[Taakje] extractProject output:', {text: result, projectId, projectName});
		return {text: result, projectId, projectName};
	}

	// Haal de status van een Todoist task op
	async getTodoistTaskStatus(taskId: string): Promise<boolean | null> {
		const apiKey = await this.getApiKey();
		if (!apiKey) return null;

		this.log('[Taakje] 🔍 Checking Todoist task status for ID:', taskId);

		try {
			const response = await requestUrl({
				url: `https://api.todoist.com/api/v1/tasks/${taskId}`,
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${apiKey}`
				},
				throw: false
			});

			this.log('[Taakje] 📡 API Response status:', response.status);

			if (response.status === 200) {
				const task = response.json as {id: string, checked?: boolean, is_completed?: boolean};
				this.log('[Taakje] 📋 Task data:', JSON.stringify(task, null, 2));
				// API v1 gebruikt 'checked' voor completion status
				const isCompleted = task.checked === true || task.is_completed === true;
				this.log('[Taakje] ✅ Task ID:', taskId, '| checked:', task.checked, '| is_completed:', isCompleted);
				return isCompleted;
			} else if (response.status === 404) {
				this.log('[Taakje] ❌ Task not found:', taskId);
				return null;
			} else {
				this.log('[Taakje] ⚠️ Unexpected response:', response.status, response.text);
			}
			return null;
		} catch (e) {
			this.log('[Taakje] ❌ Error fetching task status:', e);
			return null;
		}
	}

	// Complete een Todoist task
	async completeTodoistTask(taskId: string): Promise<boolean> {
		const apiKey = await this.getApiKey();
		if (!apiKey) return false;

		this.log('[Taakje] ✅ Completing Todoist task:', taskId);

		try {
			const response = await requestUrl({
				url: `https://api.todoist.com/api/v1/tasks/${taskId}/close`,
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${apiKey}`
				},
				throw: false
			});

			this.log('[Taakje] 📡 Close task response:', response.status);
			if (response.status === 200 || response.status === 204) {
				this.log('[Taakje] ✅ Task completed in Todoist');
				return true;
			}
			this.log('[Taakje] ❌ Failed to complete task:', response.status);
			return false;
		} catch (e) {
			this.log('[Taakje] ❌ Error completing task:', e);
			return false;
		}
	}

	// Heropen een Todoist task
	async reopenTodoistTask(taskId: string): Promise<boolean> {
		const apiKey = await this.getApiKey();
		if (!apiKey) return false;

		this.log('[Taakje] ⬜ Reopening Todoist task:', taskId);

		try {
			const response = await requestUrl({
				url: `https://api.todoist.com/api/v1/tasks/${taskId}/reopen`,
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${apiKey}`
				},
				throw: false
			});

			this.log('[Taakje] 📡 Reopen task response:', response.status);
			if (response.status === 200 || response.status === 204) {
				this.log('[Taakje] ⬜ Task reopened in Todoist');
				return true;
			}
			this.log('[Taakje] ❌ Failed to reopen task:', response.status);
			return false;
		} catch (e) {
			this.log('[Taakje] ❌ Error reopening task:', e);
			return false;
		}
	}

	async createTodoistTask(content: string, obsidianLink: string, filePath: string, parentId: string | null = null, isCompleted: boolean = false): Promise<string | null> {
		new Notice(`Creating task: ${content}.`);
		const apiKey = await this.getApiKey();
		if (!apiKey) return null;

		// Extract project from content
		const {text, projectId, projectName} = this.extractProject(content);
		let taskContent = text;

		// Voeg label toe als setting aan staat
		if (this.settings.addObsidianLabel) {
			const labelName = this.settings.obsidianLabel || 'obsidian';
			taskContent = taskContent + ` @${labelName}`;
		}

		// Project priority: 1) Explicit #project in content, 2) Folder rule, 3) Default project
		let finalProjectId = projectId;
		if (!finalProjectId) {
			// Check folder rules
			const folderProjectId = this.getProjectIdForFile(filePath);
			if (folderProjectId) {
				finalProjectId = folderProjectId;
				this.log('[Taakje]    -> Using folder rule project');
			} else {
				// Fall back to default project
				finalProjectId = this.settings.defaultProject || null;
				this.log('[Taakje]    -> Using default project');
			}
		} else {
			this.log('[Taakje]    -> Using explicit project from content');
		}

		this.log('[Taakje] Creating task:', taskContent);
		this.log('[Taakje]    -> File path:', filePath);
		this.log('[Taakje]    -> Project ID:', finalProjectId);
		this.log('[Taakje]    -> Project Name:', projectName);
		this.log('[Taakje]    -> Parent ID:', parentId);
		this.log('[Taakje]    -> Is Completed:', isCompleted);

		try {
			// Step 1: Create task via Quick Add API (supports natural language parsing)
			// De taskContent bevat nu de exacte #projectnaam voor Quick Add
			const taskBody: Record<string, unknown> = {
				text: taskContent
			};

			const response = await requestUrl({
				url: 'https://api.todoist.com/api/v1/tasks/quick',
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${apiKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(taskBody),
				throw: false
			});

		this.log('[Taakje] Create task response:', response.status, response.json);
		if (response.status !== 200 && response.status !== 201) {
			this.log('[Taakje] ❌ Failed to create task:', response.status, response.text);
			return null;
		}
		const task = response.json as {id: string, parent_id?: string};
		this.log('[Taakje] ✅ Created Todoist task:', task.id, 'parent_id:', task.parent_id);

		// Step 2: Update task with description via v1 API
		const updateBody: Record<string, unknown> = {};

		if (obsidianLink) {
			// Set description with Obsidian link
			updateBody.description = `[📝 Obsidian link](${obsidianLink})`;
			this.log('[Taakje] Setting description with Obsidian link');
		}

		if (Object.keys(updateBody).length > 0) {
			this.log(`[Taakje] Update body for ${task.id}:`, updateBody);
			const updateResponse = await requestUrl({
				url: `https://api.todoist.com/api/v1/tasks/${task.id}`,
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${apiKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(updateBody),
				throw: false
			});

			this.log('[Taakje] Update task response:', updateResponse.status);
			if (updateResponse.status !== 200 && updateResponse.status !== 204) {
				this.log('[Taakje] ⚠️ Warning: Failed to update task metadata:', updateResponse.status, updateResponse.text);
			} else {
				this.log('[Taakje] ✅ Updated task metadata successfully');
			}
		}

		// Step 3: Move task via /move endpoint
		if (parentId) {
			// Move task to parent (make it a subtask)
			this.log('[Taakje] Moving task to parent_id:', parentId);
			const moveResponse = await requestUrl({
				url: `https://api.todoist.com/api/v1/tasks/${task.id}/move`,
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${apiKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					parent_id: parentId
				}),
				throw: false
			});

			this.log('[Taakje] Move task to parent response:', moveResponse.status);
			if (moveResponse.status !== 200 && moveResponse.status !== 204) {
				this.log('[Taakje] ⚠️ Warning: Failed to move task to parent:', moveResponse.status, moveResponse.text);
			} else {
				this.log('[Taakje] ✅ Task moved to parent successfully');
			}
		} else if (finalProjectId) {
			// Move task to project (only for main tasks, not subtasks)
			this.log('[Taakje] Moving task to project_id:', finalProjectId);
			const moveResponse = await requestUrl({
				url: `https://api.todoist.com/api/v1/tasks/${task.id}/move`,
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${apiKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					project_id: finalProjectId
				}),
				throw: false
			});

			this.log('[Taakje] Move task to project response:', moveResponse.status);
			if (moveResponse.status !== 200 && moveResponse.status !== 204) {
				this.log('[Taakje] ⚠️ Warning: Failed to move task to project:', moveResponse.status, moveResponse.text);
			} else {
				this.log('[Taakje] ✅ Task moved to project successfully');
			}
		}

		// Step 4: Mark task as completed in Todoist if it was already completed in Obsidian
		if (isCompleted) {
			this.log('[Taakje] Task is already completed in Obsidian, marking as done in Todoist');
			const completionSuccess = await this.completeTodoistTask(task.id);
			if (completionSuccess) {
				this.log('[Taakje] ✅ Task marked as completed in Todoist');
			} else {
				this.log('[Taakje] ⚠️ Warning: Failed to mark task as completed in Todoist');
			}
		}

		return task.id;
		} catch (e) {
			this.log('[Taakje] ❌ Error creating task:', e);
			return null;
		}
	}

	async processCurrentFile() {
		const file = this.app.workspace.getActiveFile();
		if (!file) {
			this.log('[Taakje] No active file');
			return;
		}

		new Notice('Processing tasks...');

		// Fetch projects voor correcte casing
		await this.fetchProjects();

		const content = await this.app.vault.read(file);
		const lines = content.split('\n');
		let modified = false;

	// Regex voor todo items: - [ ] of - [x] met indentatie capture
	const taskRegex = /^(\s*)-\s*\[([ xX])\]\s*(.*)$/;
	// Regex voor Todoist link: [Todoist](https://app.todoist.com/app/task/task-ID)
	const todoistLinkRegex = /\[Todoist\]\(https:\/\/app\.todoist\.com\/app\/task\/([^)]+)\)/;

		const tasks: Array<{lineIndex: number, indent: number, completed: boolean, text: string, todoistId: string | null, parentIndex: number | null}> = [];

		lines.forEach((line, index) => {
			const match = line.match(taskRegex);
			if (match && match[1] !== undefined && match[2] && match[3]) {
				const indent = match[1].length; // Aantal spaties/tabs voor indentatie
				const rawTaskText = match[3].trim();
				const cleanTaskText = this.getCleanTaskText(rawTaskText);
				const todoistMatch = rawTaskText.match(todoistLinkRegex);
				tasks.push({
					lineIndex: index,
					indent: indent,
					completed: match[2].toLowerCase() === 'x',
					text: cleanTaskText,
					todoistId: todoistMatch && todoistMatch[1] ? todoistMatch[1] : null,
					parentIndex: null // Wordt later bepaald
				});
			}
		});

		// Bepaal parent-child relaties op basis van indentatie
		for (let i = 0; i < tasks.length; i++) {
			const task = tasks[i];
			if (task && task.indent > 0) {
				// Zoek de parent task (eerste task met minder indentatie erboven)
				for (let j = i - 1; j >= 0; j--) {
					const parentTask = tasks[j];
					if (parentTask && parentTask.indent < task.indent) {
						task.parentIndex = j;
						break;
					}
				}
			}
		}

		this.log('[Taakje] 📄 File:', file.path);
		this.log('[Taakje] 📋 Found', tasks.length, 'tasks:');

		for (const task of tasks) {
			const status = task.completed ? '✅' : '⬜';

			if (task.todoistId) {
				this.log(`[Taakje]   ${status} Line ${task.lineIndex + 1}: ${task.text}`);
				this.log(`[Taakje]      🔗 ${task.todoistId}`);

				// Check Todoist task status en sync naar Obsidian
				const todoistCompleted = await this.getTodoistTaskStatus(task.todoistId);
				this.log(`[Taakje]      📊 Todoist completed: ${todoistCompleted}, Obsidian completed: ${task.completed}`);

				if (todoistCompleted !== null) {
					// Als Todoist completed is maar Obsidian niet -> mark as done
					if (todoistCompleted && !task.completed) {
						const currentLine = lines[task.lineIndex];
						this.log(`[Taakje]      📝 Current line: "${currentLine}"`);
						if (currentLine) {
							const newLine = currentLine.replace(/- \[ \]/, '- [x]');
							this.log(`[Taakje]      📝 New line: "${newLine}"`);
							lines[task.lineIndex] = newLine;
							modified = true;
							this.log(`[Taakje]      ✅ Marked as completed in Obsidian (synced from Todoist)`);
						}
					}
					// Als Todoist niet completed is maar Obsidian wel -> mark as open
					else if (!todoistCompleted && task.completed) {
						const currentLine = lines[task.lineIndex];
						this.log(`[Taakje]      📝 Current line: "${currentLine}"`);
						if (currentLine) {
							const newLine = currentLine.replace(/- \[[xX]\]/, '- [ ]');
							this.log(`[Taakje]      📝 New line: "${newLine}"`);
							lines[task.lineIndex] = newLine;
							modified = true;
							this.log(`[Taakje]      ⬜ Marked as open in Obsidian (synced from Todoist)`);
						}
					} else {
						this.log(`[Taakje]      ℹ️ No change needed - status already in sync`);
					}
				}
			} else {
				// Geen Todoist link - maak nieuwe task aan via Quick Add
				this.log(`[Taakje]   ${status} Line ${task.lineIndex + 1}: ${task.text}`);
				this.log(`[Taakje]      ❌ No Todoist link - creating via Quick Add...`);
				this.log(`[Taakje]      📊 Indent: ${task.indent}, Parent index: ${task.parentIndex}`);

				// Obsidian URI link naar het bestand
				const vaultName = this.app.vault.getName();
				const obsidianLink = `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(file.path)}`;

				// Bepaal parent Todoist ID als dit een subtaak is
				let parentTodoistId: string | null = null;
				if (task.parentIndex !== null && task.parentIndex >= 0) {
					const parentTask = tasks[task.parentIndex];
					this.log(`[Taakje]      🔍 Looking for parent at index ${task.parentIndex}:`, parentTask);
					if (parentTask && parentTask.todoistId) {
						parentTodoistId = parentTask.todoistId;
						this.log(`[Taakje]      👆 Parent Todoist ID: ${parentTodoistId}`);
					} else {
						this.log(`[Taakje]      ⚠️ Parent task has no Todoist ID yet`);
					}
				}

				// Ignore empty tasks if setting is enabled
				if (this.settings.ignoreEmptyTasks) {
					const cleanText = task.text.trim();
					if (cleanText === '' || cleanText === '...') {
						this.log(`[Taakje]      ⏭️ Skipping empty task`);
						continue;
					}
				}

				// Quick Add parseert automatisch #project, @labels, datums (today, tomorrow, etc.)
				const todoistTaskId = await this.createTodoistTask(task.text, obsidianLink, file.path, parentTodoistId, task.completed);

				if (todoistTaskId) {
					// Update de regel met de Todoist link
					const currentLine = lines[task.lineIndex];
					if (currentLine) {
						const sep = this.settings.separatorChar || '|';
						const todoistLink = ` ${sep} [Todoist](https://app.todoist.com/app/task/${todoistTaskId})`;
						const newLine = currentLine + todoistLink;
						lines[task.lineIndex] = newLine;
						// Update ook de task in onze array zodat subtaken de juiste parent ID kunnen gebruiken
						task.todoistId = todoistTaskId;
						modified = true;
						this.log(`[Taakje]      ✅ Added Todoist link: ${todoistTaskId}`);
					}
				}
			}
		}

		// Schrijf wijzigingen terug naar bestand
		this.log('[Taakje] 📝 Modified:', modified);
		if (modified) {
			const newContent = lines.join('\n');
			this.log('[Taakje] 📝 Writing new content to file...');
			this.log('[Taakje] 📝 New content preview (first 500 chars):', newContent.substring(0, 500));
			try {
				await this.app.vault.modify(file, newContent);
				this.log('[Taakje] 💾 File updated successfully');
				new Notice('Tasks synced');
			} catch (e) {
				this.log('[Taakje] ❌ Error writing file:', e);
				new Notice('Error writing file');
			}
		} else {
			this.log('[Taakje] ℹ️ No modifications needed');
		}
	}

	onunload() {}

	async loadSettings() {
		this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData() as Partial<TaakjePluginSettings>) };
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}











