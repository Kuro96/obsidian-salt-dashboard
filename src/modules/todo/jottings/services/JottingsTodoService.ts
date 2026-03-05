import { TodoBaseService } from '../../shared/services/TodoBaseService';
import { App, TFile, Notice } from 'obsidian';
import { JottingsTodoConfig, Task } from '../../../../app/types';
import { moment } from 'obsidian';

export class JottingsTodoService extends TodoBaseService {
  protected config: JottingsTodoConfig;

  constructor(app: App, config: JottingsTodoConfig) {
    super(app, config);
    this.config = config;
  }

  protected async fetchRawTasks(date?: string): Promise<Task[]> {
    const folderPath = this.config.todoSourceFolder || 'TODO';
    const jottingsPrefix = `${this.config.jottingsFolder || 'jottings'}/`;

    // Optimization: Get files specifically from the folder instead of scanning entire vault
    // Falls back to getFiles() filtering if folder abstract object not found (rare)
    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    let files: TFile[] = [];

    if (folder && 'children' in folder) {
      // Recursively or flatly get files? Usually TODO folder is flat for daily notes.
      // But if it has subfolders, we might need recursive.
      // Obsidian API doesn't have a simple recursive "getFiles in folder".
      // Let's stick to flat iteration of folder.children for now as it's most common structure.
      // If users organize TODOs in subfolders, we might need a recursive walker.
      // For safety and compatibility with complex setups, let's filter getFiles() but optimize the prefix check.
      // Actually, re-reading: "getFiles() returns all files in vault".
      // A better approach for performance is iterating folder.children if structure is known.
      // Given this is a dashboard for "Daily" type workflow, usually flat.
      // Let's optimize for flat structure but fallback if needed.

      // Iterating folder children
      files = (folder as any).children.filter(
        (f: any) => f instanceof TFile && f.extension === 'md'
      ) as TFile[];
    } else {
      // Fallback or if folder doesn't exist yet
      files = this.app.vault
        .getFiles()
        .filter(f => f.path.startsWith(folderPath) && f.extension === 'md');
    }

    const tasks: Task[] = [];

    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (!cache || !cache.links) continue;

      const hasJottingsLink = cache.links.some(link => link.link.startsWith(jottingsPrefix));
      if (!hasJottingsLink) continue;

      const content = await this.app.vault.read(file);
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        const trimmed = line.trim();
        const match = trimmed.match(/^- \[(.)\] (.*)$/);

        if (match) {
          const statusChar = match[1];
          const text = match[2];

          const linkRegex = new RegExp(`\\[\\[${jottingsPrefix}.*?\\]\\]`);
          if (!linkRegex.test(text)) return;

          const isCompleted = statusChar === 'x';
          const isAbandoned = statusChar === '-';
          const isPinned = statusChar === '!';

          let completedDate = undefined;
          let abandonedDate = undefined;

          const doneMatch = text.match(/✅ (\d{4}-\d{2}-\d{2})/);
          if (doneMatch) {
            completedDate = doneMatch[1];
          }

          const abandonMatch = text.match(/❌ (\d{4}-\d{2}-\d{2})/);
          if (abandonMatch) {
            abandonedDate = abandonMatch[1];
          }

          tasks.push({
            id: `jottings-${file.basename}-${index}`,
            text: text,
            completed: isCompleted,
            isAbandoned: isAbandoned,
            isPinned: isPinned,
            isDaily: false,
            isJottings: true,
            sourceFile: file,
            sourcePath: file.path,
            lineNumber: index,
            completedDate,
            abandonedDate,
            tags: [],
          });
        }
      });
    }

    return tasks;
  }

  async getCompletedTasks(date: string): Promise<Task[]> {
    const allTasks = await this.getTasks();
    return allTasks.filter(t => t.completed && t.completedDate === date);
  }

  async addTask(text: string, date?: string): Promise<void> {
    const dateFormat = 'YYMMDD';
    const fileName = `${moment().format(dateFormat)}.md`;
    const folderPath = this.config.todoSourceFolder || 'TODO';
    const path = `${folderPath}/${fileName}`;

    // Check for jottings links and create notes if needed
    const jottingsPrefix = `${this.config.jottingsFolder || 'jottings'}/`;
    // Modified Regex to capture link path more robustly
    const linkRegex = new RegExp(`\\[\\[(${jottingsPrefix}.*?)(?:\\|.*?)?\\]\\]`, 'g');

    let finalText = text;
    let match;
    let hasLink = false;

    while ((match = linkRegex.exec(text)) !== null) {
      hasLink = true;
      const linkPath = match[1];

      const exists = this.app.metadataCache.getFirstLinkpathDest(linkPath, '');

      if (!exists && this.config.templatePath) {
        await this.createJottingFromTemplate(linkPath);
      }
    }

    // If no link found, assume text is the title and auto-create link
    if (!hasLink) {
      // Sanitize title (simple replacement)
      const safeTitle = text.replace(/[\\/:?*"<>|#^[\]]/g, '-').trim();
      if (safeTitle) {
        // Resolve generation path
        const pathPattern = this.config.jottingsPathPattern || '[jottings]/YYYY/MM';
        const resolvedPath = moment().format(pathPattern);

        // Construct full link path: e.g. jottings/2026/02/NoteName
        // Note: We use '/' separator regardless of OS for Obsidian links
        const linkPath = `${resolvedPath}/${safeTitle}`;

        finalText = `[[${linkPath}|${text}]]`;

        // Check existence and create
        const exists = this.app.metadataCache.getFirstLinkpathDest(linkPath, '');
        if (!exists && this.config.templatePath) {
          // Pass the FULL link path (folder + name) to creator
          await this.createJottingFromTemplate(linkPath);
        }
      }
    }

    let file = this.app.vault.getAbstractFileByPath(path);
    if (!file) {
      if (!this.app.vault.getAbstractFileByPath(folderPath)) {
        await this.app.vault.createFolder(folderPath);
      }
      file = await this.app.vault.create(path, '');
    }

    if (file instanceof TFile) {
      await this.app.vault.append(file, `\n- [ ] ${finalText}`);
    }
  }

  private async createJottingFromTemplate(linkPath: string) {
    let templatePath = this.config.templatePath;
    if (!templatePath) return;

    // Path Normalization Logic
    // 1. Remove "home" tilde if present (Obsidian doesn't use it, but user might paste it)
    if (templatePath.startsWith('~/')) {
      templatePath = templatePath.substring(2);
    }

    // 2. Remove Vault Name prefix if present
    // Users sometimes copy "Vault/Folder/File" paths.
    const vaultName = this.app.vault.getName();
    if (templatePath.startsWith(`${vaultName}/`)) {
      templatePath = templatePath.substring(vaultName.length + 1);
    }

    const templateFile = this.app.vault.getAbstractFileByPath(templatePath);
    if (!(templateFile instanceof TFile)) {
      console.warn(`Template file not found: ${templatePath}`);
      new Notice(
        `[Dashboard] Template file not found:\n${templatePath}\nPlease check Jottings settings.`
      );
      return;
    }

    const lastSlash = linkPath.lastIndexOf('/');
    const folderPath = lastSlash > -1 ? linkPath.substring(0, lastSlash) : '';
    const fileName = lastSlash > -1 ? linkPath.substring(lastSlash + 1) : linkPath;

    if (folderPath && !this.app.vault.getAbstractFileByPath(folderPath)) {
      await this.app.vault.createFolder(folderPath);
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const templater = this.app.plugins.plugins['templater-obsidian'];
    if (templater) {
      try {
        await templater.templater.create_new_note_from_template(
          templateFile,
          this.app.vault.getAbstractFileByPath(folderPath),
          fileName,
          false
        );
      } catch (e) {
        console.error('Templater creation failed', e);
      }
    }
  }

  async updateTask(task: Task, newText: string): Promise<void> {
    await this.modifyTaskFile(task, (lines, idx) => {
      const line = lines[idx];
      const match = line.match(/^(- \[[ x!-]\s?\] )(.*)$/);
      if (match) {
        lines[idx] = `${match[1]}${newText}`;
      }
    });
  }

  async toggleComplete(task: Task): Promise<void> {
    let action = '';
    await this.modifyTaskFile(task, (lines, idx) => {
      const line = lines[idx];
      const today = moment().format('YYYY-MM-DD');

      if (line.includes('- [ ]')) {
        lines[idx] = line.replace('- [ ]', '- [x]') + ` ✅ ${today}`;
        action = 'complete';
      } else if (line.includes('- [!]')) {
        lines[idx] = line.replace('- [!]', '- [x]') + ` ✅ ${today}`;
        action = 'complete';
      } else if (line.includes('- [x]')) {
        lines[idx] = line.replace('- [x]', '- [ ]').replace(/ ✅ \d{4}-\d{2}-\d{2}/, '');
        action = 'uncomplete';
      }
    });
    if (action) await this.updateLinkedJottings(task.text, action);
  }

  async togglePin(task: Task): Promise<void> {
    await this.modifyTaskFile(task, (lines, idx) => {
      const line = lines[idx];
      if (line.includes('- [ ]')) {
        lines[idx] = line.replace('- [ ]', '- [!]');
      } else if (line.includes('- [!]')) {
        lines[idx] = line.replace('- [!]', '- [ ]');
      }
    });
  }

  async abandonTask(task: Task): Promise<void> {
    let action = '';
    await this.modifyTaskFile(task, (lines, idx) => {
      const line = lines[idx];
      const today = moment().format('YYYY-MM-DD');

      if (/^- \[[ !]\]/.test(line)) {
        lines[idx] = line.replace(/^- \[[ !]\]/, '- [-]') + ` ❌ ${today}`;
        action = 'abandon';
      } else if (/^- \[-]/.test(line)) {
        lines[idx] = line.replace(/^- \[-]/, '- [ ]').replace(/ ❌ \d{4}-\d{2}-\d{2}/, '');
        action = 'unabandon';
      }
    });
    if (action) await this.updateLinkedJottings(task.text, action);
  }

  async deleteTask(task: Task): Promise<void> {
    await this.modifyTaskFile(task, (lines, idx) => {
      lines.splice(idx, 1);
    });

    // If we delete a task, we should also revert any tags if it was completed/abandoned?
    // Or just treat it as removal.
    // If task was completed, we probably want to "uncomplete" it in terms of tags.
    // But text is gone, so regex won't match anymore.
    // We pass `task.text` which still holds the old text.
    if (task.completed) {
      await this.updateLinkedJottings(task.text, 'uncomplete');
    } else if (task.isAbandoned) {
      await this.updateLinkedJottings(task.text, 'unabandon');
    } else {
      // If it was just pending/pinned, we might still want to ensure 'jottings' tag is present/absent?
      // Actually "uncomplete" adds back base tag and removes done tag.
      // If we delete the task, should we remove the base tag too?
      // Usually we don't delete the NOTE, just the reference in TODO.
      // So the note status shouldn't change?
      // But if the TODO is gone, maybe it's not "in progress" anymore?
      // Let's stick to safe side: revert status tags if it was done/abandoned.
    }
  }

  private async updateLinkedJottings(text: string, action: string) {
    const jottingsPrefix = `${this.config.jottingsFolder || 'jottings'}/`;
    const linkRegex = new RegExp(`\\[\\[(${jottingsPrefix}.*?)(?:\\|.*?)?\\]\\]`, 'g');

    let match;
    while ((match = linkRegex.exec(text)) !== null) {
      const linkPath = match[1];
      const file = this.app.metadataCache.getFirstLinkpathDest(linkPath, '');
      if (file instanceof TFile) {
        await this.updateFileTags(file, action);
      }
    }
  }

  private async updateFileTags(file: TFile, action: string) {
    await this.app.fileManager.processFrontMatter(file, frontmatter => {
      let tags = frontmatter['tags'] || [];
      if (!Array.isArray(tags)) tags = [tags];

      const doneTag = this.config.doneTag || 'jottings/done';
      const abandonedTag = this.config.abandonedTag || 'jottings/abandoned';
      const baseTag = 'jottings';

      const removeTag = (t: string) => {
        const idx = tags.indexOf(t);
        if (idx > -1) tags.splice(idx, 1);
      };

      if (action === 'complete') {
        removeTag(baseTag);
        removeTag(abandonedTag);
        if (!tags.includes(doneTag)) tags.push(doneTag);
      } else if (action === 'abandon') {
        removeTag(baseTag);
        removeTag(doneTag);
        if (!tags.includes(abandonedTag)) tags.push(abandonedTag);
      } else if (action === 'uncomplete' || action === 'unabandon') {
        removeTag(doneTag);
        removeTag(abandonedTag);
        if (!tags.includes(baseTag)) tags.push(baseTag);
      }

      frontmatter['tags'] = tags;
    });
  }
}
