# Obsidian Salt Dashboard Configuration and User Guide

Welcome to the **Salt Dashboard** plugin. This guide will help you quickly understand how to configure the dashboard and use its various modules.

## 1. Basic Operations & Layout

### 1.1 Opening the Dashboard

- **Auto-open**: Go to the plugin settings under "General" and check `Open Dashboard on Startup`. This will automatically open the dashboard every time you launch Obsidian.
- **Manual open**: Use the Obsidian Command Palette (Ctrl/Cmd + P), search for and execute `Salt Dashboard: Open Dashboard`, or click the corresponding icon in the left ribbon.

### 1.2 Layout Interaction (Grid System)

Salt Dashboard uses a responsive 12-column grid layout:

- **Drag Modules**: Click and hold the **Grip Icon** at the top right of a module to move it. We restricted dragging to this handle only, preventing accidental moves when you want to select text.
- **Resize Modules**: Hover over the edges or the bottom right corner of a module, then drag to adjust the number of columns and height it occupies.
- **Reset Layout**: If your layout gets messed up or you want to restore the default style, go to the "Layout" section in the settings panel and click `Reset to Default Layout`.

---

## 2. General Settings

At the top of the plugin settings page, you will find the general settings:

- **TODO Source Folder**: Defines the folder where all your task files (Daily/Regular) are stored (e.g., `TODO`).
- **Global Filter**: Used to exclude specific folders in modules like "Recent Files" and "Random Note". It uses a Dataview-style query, such as: `(-"SCRIPTS") and (-"Templates")`, to avoid fetching irrelevant files.

---

## 3. Core Modules & Configuration

In the "Active Modules" section, you can toggle any module on or off with a single click. When a module is disabled, its corresponding settings will automatically hide.

### 3.1 Date & Progress

Displays the current date, a calendar, and year/quarter/week progress bars. It can also track your Vault note statistics.

- **Settings**:
  - `Show Stats`: Check this to display statistics for newly created and modified notes in your vault (Today/This Week/Total).
  - `Exclude Folders`: Set a list of folder names to exclude from the statistics.

### 3.2 Contribution Graph

A GitHub-style annual heatmap showing your task completion status.

- **Settings**:
  - `Color Scheme`: Choose between `github` or `monokai` color palettes.
  - `Click Behavior`: Controls what happens when you click a heatmap block:
    - `modal`: Opens a popup showing all task details for that day.
    - `jump`: Jumps directly to the source file of the tasks.
    - `filter`: Filters the current Todo module to show only tasks from that day.
  - `Data Sources`: You can select which data sources this graph should track (Daily/Regular).

### 3.3 Todo Management Modules

Salt provides two built-in Todo modules. A third module for jotting-style tasks (linking TODO checkboxes to notes with `type: jotting`) is available as an external plugin (`brainattic-jotting-task`).

**① Daily Todo**

- Best for fixed, recurring daily tasks (e.g., taking medicine, checking in, vocabulary practice).
- Features a minimalist crontab syntax editor, allowing you to control which days of the month or days of the week a task appears.
- **Settings**: Specify the file name for daily tasks (e.g., `daily.md`), decide whether to enable crontab syntax, and configure the path for the status cache file.

**② Regular Todo**

- Best for independent, day-by-day task planning (e.g., automatically creating a `260302.md` file every day to store that day's miscellaneous tasks).
- You can check off or abandon tasks directly in the module, and it will automatically modify the source file content.
- **Settings**: Set the naming format for date files (default `YYMMDD`), and choose whether to **automatically create a file** if today's file doesn't exist.

### 3.4 Recent Files

Displays recently modified or created notes in columns, supporting multi-column grouping.

- **Settings**:
  - You can add or remove columns. Each column can have a custom title, a specific number of items to read, and a specific filter query (e.g., only show files with `#diary`).
  - Supports configuring a specific field in the Frontmatter (like `modified_date`) to be prioritized as the document's timestamp.

### 3.5 Random Note

Used to display a preview of a random past note on your dashboard.

- **Settings**:
  - Configure the search source, for example, only draw from the `Notes/` folder.
  - Customize the display height of the card and the preview text length for desktop/mobile.

### 3.6 Tmp Note

An always-present, convenient scratchpad rendered in plain text or Markdown.

- **Settings**: Specify the file path for this temporary note (e.g., `tmp/notes.md`) and its fixed display height.

---

## 4. Extensions

Salt Dashboard uses a microkernel design, supporting the loading of custom modules from external sources:

- **Custom Plugin Folder**: Enter the directory where your custom components are located in the `Custom Plugin Folder` setting.
- **Reload Extensions**: After writing or modifying external JSX/JS plugins, click this button to hot-reload and apply the new modules.
- **Clean Orphaned Configs**: If you uninstall certain modules, you can click this button to clean up residual layout configurations and keep your settings clean.

---

## 5. Danger Zone

At the very bottom of the settings, the following operations are provided:

- **Restore Default Settings**: One-click reset of all plugin settings (including data, layout, and global options) to their initial state. (Requires clicking twice to confirm and prevent accidental triggers).
- **Undo**: If you just reset your settings, an undo button will appear here, allowing you to restore the state from right before the reset.
