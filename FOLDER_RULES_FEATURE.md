# Folder Rules Feature - Implementation Summary

## Overview

This feature allows users to automatically assign Todoist projects to tasks based on the folder location of the markdown file containing those tasks. This eliminates the need to manually add `#project` tags to every task when working in specific project folders.

## What Was Implemented

### 1. Settings Interface Update (`src/settings.ts`)

- Added `FolderRule` interface with:
  - `folder`: string - the folder path to match
  - `projectId`: string - the Todoist project ID to assign
  
- Added `folderRules: FolderRule[]` array to `TaakjePluginSettings`
- Updated `DEFAULT_SETTINGS` to include empty `folderRules` array

### 2. User Interface (`src/main.ts`)

Added a comprehensive UI in the settings tab:

- **Folder Rules Section Header**: Shows heading and description
- **Existing Rules Display**: Shows all configured folder rules with:
  - Rule number and folder path
  - Dropdown to change the assigned project
  - Delete button to remove the rule
- **Add New Rule Form**: Allows users to:
  - Enter a folder path
  - Select a project from a dropdown
  - Add button to create the rule

### 3. Core Logic (`src/main.ts`)

#### `getProjectIdForFile(filePath: string): string | null`

This method:
- Takes a file path and checks it against all configured folder rules
- Normalizes paths (removes leading/trailing slashes)
- Checks if the file is in a matching folder or subfolder
- Returns the most specific match (longest path wins)
- Returns `null` if no rules match

**Example:**
```typescript
// With rules:
// - "work/clients" -> Project A
// - "work" -> Project B

getProjectIdForFile("work/clients/acme/notes.md") 
// Returns Project A (most specific)

getProjectIdForFile("work/planning.md")
// Returns Project B

getProjectIdForFile("personal/diary.md")
// Returns null (no match)
```

#### Updated `createTodoistTask()` method

Modified to accept `filePath` parameter and implement priority logic:

**Project Assignment Priority:**
1. **Explicit `#project` tag in task content** - highest priority
2. **Folder rule match** - based on file location
3. **Default project setting** - fallback

```typescript
async createTodoistTask(
  content: string, 
  obsidianLink: string, 
  filePath: string,  // NEW parameter
  parentId: string | null = null, 
  isCompleted: boolean = false
): Promise<string | null>
```

#### Updated `processCurrentFile()` method

Updated the call to `createTodoistTask()` to pass the file path:

```typescript
const todoistTaskId = await this.createTodoistTask(
  task.text, 
  obsidianLink, 
  file.path,  // Pass file path
  parentTodoistId, 
  task.completed
);
```

## User Experience

### Setting Up Folder Rules

1. User opens Settings → Taakje
2. After testing connection and selecting default project, they see "Folder rules" section
3. They can add rules by:
   - Typing a folder path (e.g., `work/clients`)
   - Selecting a Todoist project from dropdown
   - Clicking "Add"
4. Rules appear in a list above the add form
5. Each rule can be modified (change project) or deleted

### Using Folder Rules

When processing a file:

1. User creates tasks in a markdown file
2. Plugin checks if file path matches any folder rules
3. Tasks automatically get assigned to the matching project
4. User can still override with explicit `#project` tags if needed

### Example Workflow

**Setup:**
```
Folder Rules:
- work/projects → "Work Projects"
- personal/health → "Health & Wellness"
- Default Project: "Inbox"
```

**Files:**

`work/projects/acme/meeting-notes.md`:
```markdown
- [ ] Follow up with client
- [ ] Send proposal
- [ ] Schedule review #home
```

Results:
- "Follow up with client" → Work Projects (folder rule)
- "Send proposal" → Work Projects (folder rule)
- "Schedule review" → Home (explicit #home tag overrides)

`personal/health/workout.md`:
```markdown
- [ ] Go for a run today
- [ ] Buy protein powder
```

Results:
- Both tasks → Health & Wellness (folder rule)

`random-file.md`:
```markdown
- [ ] Random task
```

Results:
- Task → Inbox (default project)

## Technical Notes

### Path Matching Logic

The implementation uses `startsWith()` to check if a file is in a folder:

```typescript
const normalizedFilePath = filePath.replace(/^\/+|\/+$/g, '');
const normalizedRuleFolder = rule.folder.replace(/^\/+|\/+$/g, '');

return normalizedFilePath.startsWith(normalizedRuleFolder + '/') || 
       normalizedFilePath.startsWith(normalizedRuleFolder) &&
       (normalizedFilePath === normalizedRuleFolder || 
        normalizedFilePath[normalizedRuleFolder.length] === '/');
```

This ensures:
- `work/clients/acme.md` matches `work/clients`
- `work/clients/acme.md` matches `work`
- `work.md` does NOT match `work` (exact file vs folder)

### Priority Handling

Most specific (longest) paths win when multiple rules match:

```typescript
.sort((a, b) => b.folder.length - a.folder.length)
```

This means `work/clients` takes priority over `work`.

## Documentation

Updated `README.md` with:
- Added "Folder Rules" to settings table
- Added detailed "Folder Rules" section explaining:
  - How to set up rules
  - Priority order
  - Example scenarios
  - Note about path specificity

## Benefits

1. **Reduced Manual Tagging**: No need to add `#project` to every task
2. **Organizational Clarity**: File structure mirrors project structure
3. **Flexible Override**: Can still use explicit tags when needed
4. **Subfolder Support**: Rules apply to all nested folders automatically
5. **Easy Management**: Simple UI to add/modify/delete rules

## Future Enhancements (Optional)

Potential improvements for future versions:

1. **Folder Browser**: Add folder picker instead of text input
2. **Pattern Matching**: Support wildcards or regex patterns
3. **Rule Ordering**: Manual reordering of rules
4. **Import/Export**: Share rule configurations
5. **Visual Indicators**: Show which rule applies to current file
6. **Multi-Project Rules**: Assign to multiple projects based on folder

