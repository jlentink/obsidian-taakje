# Taakje - Todoist Sync for Obsidian
<p align="center">
  <img src="https://img.shields.io/badge/Obsidian-Plugin-purple" alt="Obsidian Plugin">
  <img src="https://img.shields.io/badge/Todoist-Integration-red" alt="Todoist Integration">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License MIT">
</p>
**Taakje** (Dutch for "little task") is an Obsidian plugin that provides seamless two-way synchronization between your Obsidian tasks and Todoist.
## ✨ Features
### 🔄 Two-Way Sync
- **Obsidian → Todoist**: Create tasks in your markdown files and sync them to Todoist
- **Todoist → Obsidian**: Complete tasks in Todoist and see them checked off in Obsidian
### 📝 Smart Task Creation
- Automatically parses **dates** (today, tomorrow, next week, etc.)
- Recognizes **#project** tags and assigns tasks to the correct Todoist project
- Supports **@labels** for task categorization
- Handles **priority** levels (!!1, !!2, !!3, !!4)
### 📂 Subtask Support
Nested tasks in Obsidian are automatically created as subtasks in Todoist:
\`\`\`markdown
- [ ] Main task
	- [ ] Subtask 1
	- [ ] Subtask 2
- [ ] Another main task
\`\`\`
### 🔗 Bidirectional Links
- Each synced task gets a \`[Todoist](link)\` appended for quick access
- Tasks in Todoist include an "Open in Obsidian" link in the description
### ⚡ Real-Time Checkbox Sync
When you check/uncheck a task in Obsidian, it's immediately updated in Todoist.
## 📦 Installation
### Manual Installation
1. Download the latest release from the releases page
2. Extract the files to your vault's \`.obsidian/plugins/taakje/\` folder
3. Reload Obsidian
4. Enable the plugin in Settings → Community Plugins
### From Source
\`\`\`bash
git clone https://github.com/jlentink/obsidian-taakje.git
cd taakje
npm install
npm run build
\`\`\`
## ⚙️ Configuration
### 1. Get Your Todoist API Key
1. Open [Todoist Settings](https://todoist.com/app/settings/integrations)
2. Scroll to "API token"
3. Copy your API token
### 2. Configure the Plugin
1. Go to Settings → Taakje
2. Paste your API key
3. Click "Test Connection" to verify
4. Select your default project for new tasks
### Settings Overview
| Setting | Description |
|---------|-------------|
| **Todoist API Key** | Your personal Todoist API token |
| **Default Project** | Where tasks without a #project tag go |
| **Sync Interval** | How often to check Todoist for changes |
| **Add Obsidian Label** | Automatically add a label to synced tasks |
| **Label Name** | Custom label name (default: "obsidian") |
| **Debug Mode** | Show detailed logs in the console |
## 🚀 Usage
### Creating Tasks
Write tasks in your markdown files using standard checkbox syntax:
\`\`\`markdown
- [ ] Buy groceries today #shopping
- [ ] Call mom tomorrow !!1
- [ ] Review document @work #ahold
\`\`\`
### Syncing Tasks
**Option 1**: Click the checkmark icon in the left ribbon
**Option 2**: Use Command Palette (Cmd/Ctrl + P) → "Taakje: Process current file"
### Project Matching
Use \`#projectname\` to assign tasks to specific Todoist projects. Taakje matches project names case-insensitively and ignores emojis:
| Your markdown | Matches Todoist project |
|---------------|------------------------|
| \`#inbox\` | Inbox |
| \`#work\` | 💼 Work |
| \`#ahold\` | 🛒 Ahold |
### Subtasks
Indent tasks to create subtasks:
\`\`\`markdown
- [ ] Plan vacation #travel
	- [ ] Book flights
	- [ ] Reserve hotel
	- [ ] Pack bags
\`\`\`
## 🔧 Commands
| Command | Description |
|---------|-------------|
| **Process current file** | Sync all tasks in the active file |
## 📋 Task Format
After syncing, tasks look like this:
\`\`\`markdown
- [ ] Buy groceries [Todoist](https://app.todoist.com/app/task/abc123)
- [x] Call mom [Todoist](https://app.todoist.com/app/task/def456)
\`\`\`
## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.
1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/AmazingFeature\`)
3. Commit your changes (\`git commit -m 'Add some AmazingFeature'\`)
4. Push to the branch (\`git push origin feature/AmazingFeature\`)
5. Open a Pull Request
## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
## 🙏 Acknowledgments
- [Obsidian](https://obsidian.md/) for the amazing knowledge management platform
- [Todoist](https://todoist.com/) for the powerful task management API
## 📞 Support
If you encounter any issues or have questions:
- Open an [issue](https://github.com/jlentink/obsidian-taakje/issues)
- Check existing issues for solutions
---
<p align="center">
  Made with ❤️ for the Obsidian community
</p>
