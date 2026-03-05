# Obsidian Salt Dashboard

[English](README.md)|中文

欢迎使用 Salt Dashboard！这是一款为 Obsidian 打造的响应式仪表盘插件。它提供了一个直观的网格界面，帮你快速查看日期、待办事项、最近的文件以及你的活跃度图表。

![Dashboard Screenshot](assets/salt-dashboard.png)

## 如何安装 (使用 BRAT)

目前插件还在开发阶段。你可以通过 BRAT 插件来安装它。

1. 打开 Obsidian，进入第三方插件社区。
2. 搜索并安装 **Obsidian42 - BRAT** 插件。
3. 启用 BRAT。
4. 打开 BRAT 的设置页面，点击 **Add Beta plugin**。
5. 在弹出的输入框里填入本仓库的地址 ( `Kuro96/obsidian-salt-dashboard`)。
6. 点击确定。BRAT 会自动帮你下载并安装。
7. 回到 Obsidian 的插件列表，找到 **Salt Dashboard** 并开启。

## 如何配置

开启插件后，你可以进入设置页面进行个性化调整。

**全局设置：**

- **开启自启**: 勾选 `Open Dashboard on Startup`，每次打开 Obsidian 时仪表盘会自动弹出。
- **待办数据源**: 填入 `TODO Source Folder`。你的所有待办文件都会存在这个文件夹里。
- **全局过滤**: 使用 `Global Filter` 排除不需要的文件。语法类似 Dataview，比如 `(-"Templates")` 可以过滤掉模板文件夹。

**模块开关：**
你可以在设置里一键开启或关闭不需要的模块。关闭后，相关的设置项也会自动隐藏，保持界面清爽。

## 日常使用

你可以通过按 `Ctrl/Cmd + P` 打开命令面板，输入 `Salt Dashboard: Open Dashboard` 来手动打开面板。也可以点击左侧边栏的专属图标。

**布局调整：**

- **拖动模块**: 鼠标按住模块右上角的**拖拽手柄（Grip 图标）**即可拖动。我们限制了只能通过手柄拖动，这样你复制模块里的文字时就不会误触。
- **调整大小**: 鼠标放在模块的边缘或右下角，拉动即可改变模块的宽和高。
- **重置布局**: 如果你不小心把界面弄乱了，去设置页面点击 `Reset to Default Layout` 就能一键恢复。

**内置模块介绍：**

1. **日期与进度 (Date Progress)**: 看当天的日期，了解今年、本周过了多少。你还可以开启统计，看看库里每天新建和修改了多少笔记。
2. **活跃度热力图 (Contribution Graph)**: 类似 GitHub 的绿色方块图。你可以直观看到自己每天的任务完成情况。点击小方块可以查看当天的任务详情。
3. **三种待办模块 (Todo)**:
   - **日常待办 (Daily Todo)**: 适合吃药、打卡等固定任务。支持简单的 crontab 语法，帮你设置每月的哪几天重复。
   - **常规待办 (Regular Todo)**: 每天独立生成的待办列表。你可以直接在面板上打勾或放弃，插件会自动修改源文件。
   - **随手记 (Jottings Todo)**: 抓取你散落在各个笔记里的特殊任务链接（比如指向 `[[jottings/idea]]` 的链接）。
4. **近期文档 (Recent Files)**: 分列显示你最近修改过的笔记。你可以按需增删列，或者设定每一列的具体过滤规则。
5. **随机漫步 (Random Note)**: 随机抽出一篇老笔记给你看，帮你温故知新。
6. **临时笔记 (Tmp Note)**: 一个常驻在面板上的快捷记录区，方便你随时写点东西。

## 更多文档

如果你想了解更详细的配置指南、架构设计或是开发细节，请查看 [`docs/`](docs/) 目录下的文档：

- [用户指南](docs/user-guide-zh.md)
- [架构说明](docs/architecture.md)
- [如何编写自定义插件](docs/how-to-write-a-gist-plugin.md)

## 如何编写自定义插件

觉得内置模块不够用？Salt Dashboard 支持你用 React 和 JSX 自己写插件！

我们采用微内核设计，你只要在设置里的 `Custom Plugin Folder` 指定一个本地文件夹，把写好的 JSX 文件放进去，点击 `Reload Extensions` 就能热加载。

这里以 `weather.jsx` 为例，教你如何写一个简单的天气模块。

创建一个 `weather.jsx` 文件，包含以下基本结构：

```jsx
const { useState, useEffect } = React;
const { Setting } = require('obsidian');

// 1. 编写你的 React 组件
const WeatherCard = () => {
  const [data, setData] = useState(null);

  // 在这里请求天气 API
  useEffect(() => {
    fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=35.68&longitude=139.69&current_weather=true'
    )
      .then(res => res.json())
      .then(json => setData(json.current_weather));
  }, []);

  if (!data) return <div>加载中...</div>;

  return (
    <div style={{ padding: '16px', background: '#f6d365', borderRadius: '12px' }}>
      <h2>天气</h2>
      <p>{data.temperature}°C</p>
    </div>
  );
};

// 2. 导出模块配置
module.exports = {
  id: 'weather-gist-card', // 模块的唯一 ID
  title: '天气预报', // 模块名称
  icon: 'sun', // 图标
  defaultSettings: {
    // 默认的设置数据
    'weather-gist': { lat: '35.68', long: '139.69' },
  },
  defaultLayout: {
    // 默认大小
    w: 4,
    h: 8,
    showTitle: false,
  },
  component: WeatherCard, // 绑定的 React 组件
  // 3. (可选) 渲染对应的设置项
  renderSettings: (containerEl, plugin, settings) => {
    containerEl.createEl('h3', { text: '天气设置' });

    const config = settings['weather-gist'];
    new Setting(containerEl).setName('纬度').addText(text =>
      text.setValue(config.lat).onChange(async v => {
        config.lat = v;
        await plugin.saveSettings();
      })
    );
  },
};
```

写完后，在仪表盘设置里重新加载一下外部插件，你就能在面板上添加并看到你自己的天气卡片了。
