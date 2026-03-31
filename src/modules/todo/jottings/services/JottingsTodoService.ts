import { TodoBaseService } from '../../shared/services/TodoBaseService';
import { App, TFile, Notice } from 'obsidian';
import { JottingsTodoConfig, Task } from '../../../../app/types';
import { moment } from '../../../../shared/utils/momentHelper';

export class JottingsTodoService extends TodoBaseService {
  private static pendingAddKeys = new Set<string>();
  private static recentAddTimestamps = new Map<string, number>();
  protected config: JottingsTodoConfig;

  constructor(app: App, config: JottingsTodoConfig) {
    super(app, config);
    this.config = config;
  }

  private extractJottingsLinkPaths(text: string): string[] {
    const jottingsPrefix = `${this.config.jottingsFolder || 'jottings'}/`;
    const linkRegex = new RegExp(`\\[\\[(${jottingsPrefix}.*?)(?:\\|.*?)?\\]\\]`, 'g');
    const paths = new Set<string>();

    let match;
    while ((match = linkRegex.exec(text)) !== null) {
      paths.add(match[1]);
    }

    return Array.from(paths);
  }

  private getLinkedJottingsFiles(text: string): TFile[] {
    return this.extractJottingsLinkPaths(text)
      .map(linkPath => this.app.metadataCache.getFirstLinkpathDest(linkPath, ''))
      .filter((file): file is TFile => file instanceof TFile);
  }

  protected async fetchRawTasks(date?: string): Promise<Task[]> {
    const folderPath = this.config.todoSourceFolder || 'TODO';
    const jottingsPrefix = `${this.config.jottingsFolder || 'jottings'}/`;

    // Recursively collect all markdown files under folderPath using vault.getFiles().
    // This is consistent with other modules and supports nested subfolder structures.
    const files: TFile[] = this.app.vault
      .getFiles()
      .filter(f => f.path.startsWith(folderPath + '/') && f.extension === 'md');

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
          const jottingLinks = this.extractJottingsLinkPaths(text);
          if (jottingLinks.length === 0) return;

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
            jottingLinks,
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

    let finalText = text;
    const linkPaths = this.extractJottingsLinkPaths(text);
    const hasLink = linkPaths.length > 0;

    for (const linkPath of linkPaths) {
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

    const addKey = `${path}::${finalText}`;
    const now = Date.now();
    const lastAddedAt = JottingsTodoService.recentAddTimestamps.get(addKey);

    if (lastAddedAt && now - lastAddedAt < 1500) {
      return;
    }

    if (JottingsTodoService.pendingAddKeys.has(addKey)) {
      return;
    }

    JottingsTodoService.pendingAddKeys.add(addKey);

    try {
      let file = this.app.vault.getAbstractFileByPath(path);
      if (!file) {
        if (!this.app.vault.getAbstractFileByPath(folderPath)) {
          await this.app.vault.createFolder(folderPath);
        }
        file = await this.app.vault.create(path, '');
      }

      if (file instanceof TFile) {
        const lineToAppend = `- [ ] ${finalText}`;
        const existingContent = await this.app.vault.read(file);
        const existingLines = existingContent.split('\n').map(line => line.trim());

        if (!existingLines.includes(lineToAppend)) {
          await this.app.vault.append(file, `\n${lineToAppend}`);
          JottingsTodoService.recentAddTimestamps.set(addKey, now);
        }
      }
    } finally {
      JottingsTodoService.pendingAddKeys.delete(addKey);
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
    const linkedFiles = this.getLinkedJottingsFiles(task.text);

    await this.modifyTaskFile(task, (lines, idx) => {
      lines.splice(idx, 1);
    });

    for (const file of linkedFiles) {
      try {
        await this.app.fileManager.trashFile(file);
      } catch (e) {
        console.error('Failed to delete linked jotting file', e);
        new Notice(`[Dashboard] Failed to delete linked jotting: ${file.path}`);
      }
    }
  }

  private async updateLinkedJottings(text: string, action: string) {
    const linkedFiles = this.getLinkedJottingsFiles(text);

    for (const file of linkedFiles) {
      await this.updateFileTags(file, action);
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
