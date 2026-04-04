export default {
  settings: {
    title: 'Salt Dashboard Settings',
    general: {
      heading: 'General',
      language: {
        name: 'Language',
        desc: 'Choose dashboard language. A reload is required to apply the changes fully.',
        system: 'Follow Obsidian Settings',
        en: 'English',
        zh: '简体中文',
        'zh-meme': 'Machine Translated Chinese (Meme)',
      },
      openOnStartup: {
        name: 'Open on startup',
        desc: 'Automatically open the dashboard when Obsidian starts.',
      },
      todoSource: {
        name: 'TODO Source Folder',
        desc: 'The folder where your TODO files are located.',
      },
      globalFilter: {
        name: 'Global Filter',
        desc: 'Filter applied to Recent Files and Random Note modules. Supports logical operators (AND, OR, NOT), tags (#tag), and strings ("folder").',
        syntaxHelp: {
          label: 'Query syntax examples',
          ariaLabel: 'Show global filter query syntax help',
          intro:
            'Supports paths, tags, AND / OR / NOT logic, and [property] / [property:value] frontmatter filters.',
          exampleExclude: 'Example: (-"SCRIPTS") AND (-"TODO")',
          exampleTag: 'Example: #published',
          exampleProperty: 'Example: [status:active]',
          exampleCombined: 'Example: "notes" AND NOT #draft AND [reviewed:true]',
        },
      },
    },
    todo: {
      heading: 'TODO Common',
      sourceFolder: {
        name: 'TODO Source Folder',
        desc: 'Root folder where all TODO modules read their files from.',
      },
      statsFile: {
        name: 'Stats File Path',
        desc: 'Path to the JSON file storing Daily Todo completion records, read by the Contribution Graph.',
      },
      weekStart: {
        name: 'Week Start Day',
        desc: 'Affects how week columns are displayed in the Contribution Graph.',
        sunday: 'Sunday',
        monday: 'Monday',
      },
    },
    extensions: {
      heading: 'Extensions',
      customPluginFolder: {
        name: 'Custom Plugins Folder',
        desc: 'Path to folder containing .js plugin files.',
      },
      buttons: {
        reload: 'Reload Plugins',
        clean: 'Clean Orphaned Configs',
        cleanTooltip: 'Remove layout configurations for modules that are no longer installed.',
      },
      notices: {
        orphanedRemoved: 'Removed {{count}} orphaned module configurations.',
        noOrphaned: 'No orphaned configurations found.',
      },
    },
    activeModules: {
      heading: 'Active Modules',
      desc: 'Toggle modules to show or hide them on the dashboard.',
      errorLoading: 'Error loading settings for {{title}}',
    },
    layout: {
      heading: 'Layout',
      undo: {
        name: 'Undo Layout Reset',
        desc: 'Restore the layout from before the last reset.',
        button: 'Undo Reset',
        notice: 'Layout reset undone.',
      },
      reset: {
        name: 'Reset Layout',
        desc: 'Reset all module positions and widths to default.',
        button: 'Reset to Default',
        notice: 'Layout reset to default.',
      },
    },
    dangerZone: {
      heading: 'Danger Zone',
      undo: {
        name: 'Undo Restore',
        desc: 'Restore your settings from before the last reset.',
        button: 'Undo Restore',
        notice: 'Restoration undone. Settings reverted.',
      },
      restore: {
        name: 'Restore Initial Settings',
        desc: 'Reset ALL settings to default values. Can be undone within this session; closing the settings panel makes it permanent.',
        button: 'Restore Initial Settings',
        confirm: 'Are you sure? Click to confirm',
        notice: 'All settings restored to default.',
      },
    },
  },
  commands: {
    openDashboard: 'Open Dashboard',
    ribbonTooltip: 'Open Salt Dashboard',
    viewTitle: 'Salt Dashboard',
  },
  shared: {
    sort: {
      ascending: 'Ascending',
      descending: 'Descending',
      time: 'Time',
    },
  },
  modules: {
    todo: {
      daily: {
        title: '📅 Daily Tasks',
        loading: 'Loading...',
        empty: 'No tasks for selected filter.',
        addTask: '+ Add Task',
        placeholder: 'Task description...',
        cronEdit: 'Click to edit schedule',
        saveSchedule: 'Save Schedule',
        nextTrigger: 'Next',
        filter: {
          today: "Today's Tasks",
          future: "Non-Today's Tasks",
        },
      },
      jottings: {
        title: '✍️ Jottings Tasks',
        empty: 'No jottings tasks found.',
        placeholder: 'Add task',
      },
      regular: {
        title: '📝 Regular Tasks',
        empty: 'No pending regular tasks.',
        addTask: '+ Add Task',
        placeholder: 'Add new task...',
      },
      shared: {
        sort: {
          default: 'Default',
          name: 'Name',
          modified: 'Modified',
          created: 'Created',
        },
        filter: {
          label: 'Filter Status',
          active: 'Active',
          completed: 'Completed',
          abandoned: 'Abandoned',
        },
        item: {
          confirmDelete: 'Confirm Delete',
          cancel: 'Cancel',
          pin: 'Pin task',
          abandon: 'Abandon task',
          delete: 'Delete task',
        },
        cron: {
          invalid: 'Invalid Cron',
          expr: {
            daily: 'Daily',
            every: 'Every {{step}} {{unit}}',
            range: '{{start}}-{{end}}',
            list: '{{val}}',
            in: 'in {{val}}',
            on: 'on {{val}}',
            day: 'day',
            days: 'days',
            month: 'month',
            months: 'months',
            weekday: 'weekday',
            weekdays: 'weekdays',
            ordinal: '{{val}}{{suffix}}',
          },
          presets: {
            daily: 'Daily',
            every2daysOdd: 'Every 2 days (Odd)',
            every2daysEven: 'Every 2 days (Even)',
            every3days: 'Every 3 days',
            weeklyMon: 'Weekly (Monday)',
            weeklyFri: 'Weekly (Friday)',
            weekdays: 'Weekdays (Mon-Fri)',
            weekends: 'Weekends (Sat,Sun)',
            monthly1st: 'Monthly (1st day)',
            monthlyEnd: 'Monthly (End of month)',
            monthly15th: 'Monthly (15th)',
            quarterly1st: 'Quarterly (1st)',
            yearlyJan1st: 'Yearly (Jan 1st)',
          },
        },
      },
    },
    tmpNote: {
      title: '📝 Tmp Note',
      loading: 'Loading...',
      notFound: 'Tmp note not found.',
      openFile: 'Open File',
      updated: 'Updated {{time}}',
    },
    recentFiles: {
      title: '🗂️ Recent Files',
      loading: 'Loading files...',
      empty: 'No recent files',
      createNote: 'Create Note',
      createPlaceholder: 'Note title...',
      sort: {
        modified: 'Modified',
        created: 'Created',
        name: 'Name',
        size: 'Size',
      },
    },
    randomNote: {
      title: '🎲 Random Note',
      loading: 'Loading random note...',
      notFound: 'No notes found.',
      refresh: 'Refresh Note',
      clickToOpen: 'Click to open',
      updated: 'Updated {{time}}',
    },
    dateProgress: {
      title: 'Date Progress',
      loading: 'Loading...',
      daysLeft: '{{days}} days left',
      yearProgress: '{{year}} Year Progress',
      passedDays: 'Passed {{days}} / {{total}} Days',
      vaultStats: 'Vault Stats',
      stats: {
        total: 'Total',
        newDay: 'New Day',
        newWeek: 'New Wk',
        modDay: 'Mod Day',
        modWeek: 'Mod Wk',
      },
    },
    contributionGraph: {
      title: '📈 Activity',
      loading: 'Loading graph...',
      dataSources: 'Data Sources',
      sources: {
        daily: 'Daily Todo',
        regular: 'Regular Todo',
        jottings: 'Jottings',
      },
      tooltip: {
        loading: 'Loading...',
        tasks: '{{count}} tasks',
        more: '+{{count}} more...',
        empty: 'No tasks details',
      },
      weekdays: {
        mon: 'Mon',
        wed: 'Wed',
        fri: 'Fri',
      },
    },
    settings: {
      dailyTodo: {
        title: 'Daily Todo',
        heading: 'Daily Todo Settings',
        fileName: { name: 'Daily File Name', desc: 'e.g. daily.md' },
        statsFile: { name: 'Stats JSON File Path', desc: 'Path to store task completion stats.' },
        crontab: { name: 'Enable Crontab', desc: 'Parse crontab syntax in daily tasks.' },
        showPinButton: {
          name: 'Show Pin Button',
          desc: 'Show the pin action button in each task row.',
        },
        showDeleteButton: {
          name: 'Show Delete Button',
          desc: 'Show the delete action button in each task row.',
        },
      },
      regularTodo: {
        title: 'Regular Todo',
        heading: 'Regular Todo Settings',
        dateFormat: { name: 'Date Format', desc: 'Format for daily files (e.g. YYMMDD).' },
        autoCreate: {
          name: 'Auto Create File',
          desc: "Create today's file if missing when checking tasks.",
        },
        showPinButton: {
          name: 'Show Pin Button',
          desc: 'Show the pin action button in each task row.',
        },
        showAbandonButton: {
          name: 'Show Abandon Button',
          desc: 'Show the abandon action button in each task row.',
        },
        showDeleteButton: {
          name: 'Show Delete Button',
          desc: 'Show the delete action button in each task row.',
        },
      },
      jottingsTodo: {
        title: 'Jottings Todo',
        heading: 'Jottings Todo Settings',
        folder: { name: 'Jottings Folder', desc: 'Folder where jottings notes live.' },
        pathPattern: {
          name: 'Generation Path Pattern',
          desc: 'Path pattern for new jottings (e.g. [jottings]/YYYY/MM). Wrap text in [] to avoid formatting.',
        },
        template: {
          name: 'Jottings Template Path',
          desc: 'Path to the Templater template for new jottings (e.g. Templates/Jotting.md). Leave empty to disable.',
        },
        showPinButton: {
          name: 'Show Pin Button',
          desc: 'Show the pin action button in each task row.',
        },
        showAbandonButton: {
          name: 'Show Abandon Button',
          desc: 'Show the abandon action button in each task row.',
        },
        showDeleteButton: {
          name: 'Show Delete Button',
          desc: 'Show the delete action button in each task row.',
        },
      },
      tmpNote: {
        title: 'Tmp Note',
        heading: 'Tmp Note Settings',
        path: { name: 'Tmp Note Path', desc: 'Relative path to the temporary note file.' },
      },
      recentFiles: {
        title: 'Recent Files',
        heading: 'Recent Files Settings',
        showTitle: {
          name: 'Show Module Title',
          desc: "Show the 'Recent Files' header above the columns.",
        },
        limit: { name: 'File Limit', desc: 'Number of files to show per column.' },
        creationProp: {
          name: 'Creation Date Property',
          desc: 'Frontmatter property for creation date. Falls back to file creation time.',
        },
        modifiedProp: {
          name: 'Modified Date Property',
          desc: 'Frontmatter property for modification date. Falls back to file modification time.',
        },
        columns: {
          heading: 'Content Columns',
          desc: "Configure the columns displayed in the Recent Files module. The 'Source' field supports Dataview-like queries plus frontmatter filters such as [property] and [property:value].",
          syntaxHelp: {
            label: 'Query syntax examples',
            ariaLabel: 'Show recent files query syntax help',
            intro:
              'Supports paths, tags, AND / OR / NOT logic, plus frontmatter filters using [property] and [property:value].',
            examplePath: 'Example: "Folder" AND #tag',
            exampleProperty: 'Example: [status]',
            examplePropertyValue: 'Example: [status:active]',
            exampleCombined: 'Example: "Projects" AND #pinned AND [reviewed:true]',
          },
          placeholder: 'Column Title',
          sourceLabel: 'Source Query:',
          sourcePlaceholder: 'e.g. "Folder" AND #tag AND [status:active]',
          templateLabel: 'Templater Template Path:',
          templatePlaceholder: 'Leave blank for empty note. Example: @tmp/notes.md',
          addBtn: '+ Add Column',
          newColumn: 'New Column',
        },
      },
      randomNote: {
        title: 'Random Note',
        heading: 'Random Note Settings',
        query: {
          name: 'Source Query (Override Global Filter)',
          desc: 'Leave empty to use the Global Filter setting. When filled, this completely replaces the global filter for random notes only. Supports logical operators.',
          placeholder: 'Leave empty to use Global Filter',
          syntaxHelp: {
            label: 'Query syntax examples',
            ariaLabel: 'Show random note query syntax help',
            intro:
              'Supports paths, tags, AND / OR / NOT logic, and [property] / [property:value] frontmatter filters.',
            exampleExclude: 'Example: (-"SCRIPTS") AND (-"VIEWS")',
            exampleTag: 'Example: #published',
            exampleProperty: 'Example: [status:active]',
            exampleCombined: 'Example: "notes" AND NOT #draft AND [reviewed:true]',
          },
        },
      },
      contributionGraph: {
        title: 'Contribution Graph',
        heading: 'Contribution Graph Settings',
        enableDaily: 'Enable Daily Todo',
        enableRegular: 'Enable Regular Todo',
        enableJottings: 'Enable Jottings Todo',
        click: {
          name: 'Click Behavior',
          desc: 'What happens when you click a day.',
          options: {
            modal: 'Show Tasks Modal',
            jump: 'Jump to Daily File',
            filter: 'Filter Todo List (Not Implemented)',
          },
        },
      },
      dateProgress: {
        title: 'Date Progress',
        heading: 'Date Progress Settings',
        stats: { name: 'Show Stats', desc: 'Show vault statistics (notes count, etc).' },
      },
    },
  },
};
