# CoolQuick

🚀 一款智能、快速的剪贴板管理工具

## 产品特性

- 📋 **智能监听** - 自动感知剪贴板变化，快速弹窗提示
- 🎯 **智能分类** - 自动识别手机号、邮箱、网址、代码、密码等类型
- 🔧 **悬浮窗口** - 可自由拖动的悬浮按钮，悬停展开笔记抽屉
- ⚡ **极速访问** - 滚轮浏览历史，一键复制
- 💾 **本地存储** - SQLite数据库，数据安全可靠
- 🌓 **明暗主题** - 支持浅色/深色模式切换
- 🗄️ **智能归档** - 按日期和类型自动归档旧笔记
- 📤 **数据导出** - 支持 JSON/TXT/PDF 格式导出

## 技术栈

- **框架**: Tauri (Rust + React + TypeScript)
- **前端**: React 18 + TypeScript + TailwindCSS + Framer Motion
- **后端**: Rust + SQLite
- **构建**: Vite

## 快速开始

### 环境要求

- Node.js >= 18
- Rust >= 1.70
- Tauri CLI

### 安装依赖

```bash
# 安装前端依赖
npm install

# 安装 Tauri CLI
cargo install tauri-cli
```

### 开发模式

```bash
# 启动开发服务器
cargo tauri dev
```

### 构建应用

```bash
# 构建生产版本
cargo tauri build
```

## 项目结构

```
coolquick/
├── src/                    # 前端源代码
│   ├── components/        # React组件
│   ├── App.tsx           # 主应用组件
│   ├── main.tsx          # 入口文件
│   └── index.css         # 全局样式
├── src-tauri/            # Rust后端源代码
│   ├── src/
│   │   ├── main.rs       # 主入口
│   │   ├── clipboard.rs  # 剪贴板监听
│   │   ├── detector.rs   # 内容识别
│   │   ├── database.rs   # 数据库操作
│   │   ├── commands.rs   # Tauri命令
│   │   ├── config.rs     # 配置管理
│   │   └── window.rs     # 窗口管理
│   ├── Cargo.toml        # Rust依赖
│   └── tauri.conf.json   # Tauri配置
├── docs/                 # 文档
│   ├── PRD.md           # 产品需求文档
│   └── DEVELOPMENT_PLAN.md # 开发计划
├── package.json         # 前端依赖
├── vite.config.ts       # Vite配置
└── README.md           # 项目说明
```

## 功能模块

### 1. 剪贴板监听模块 (`clipboard.rs`)
- 使用 `clipboard-master` 监听系统剪贴板变化
- 自动去重（5秒内重复内容不触发）
- 调用内容识别引擎分类内容

### 2. 内容识别模块 (`detector.rs`)
- 正则表达式匹配手机号、邮箱、URL
- 代码特征识别（语法关键词）
- 密码熵值检测
- 支持自定义识别规则

### 3. 数据库模块 (`database.rs`)
- SQLite本地存储
- 支持笔记CRUD操作
- 全文搜索（FTS5）
- 自动归档策略
- 导入导出功能

### 4. 窗口管理模块 (`window.rs`)
- 悬浮窗口（可拖动）
- 抽屉面板（悬停展开）
- 弹窗提示（跟随悬浮窗位置）
- 设置窗口

### 5. 前端组件
- `FloatingWindow.tsx` - 悬浮窗组件
- `Drawer.tsx` - 抽屉面板组件
- `Popup.tsx` - 弹窗提示组件

## 配置说明

配置文件位置：
- Windows: `%APPDATA%\CoolQuick\config.json`
- macOS: `~/Library/Application Support/CoolQuick/config.json`
- Linux: `~/.config/CoolQuick/config.json`

### 默认配置

```json
{
  "auto_start": false,
  "min_popup_length": 20,
  "popup_auto_close_seconds": 3,
  "floating_window_size": 48,
  "floating_window_opacity": 0.9,
  "shortcut_search": "Ctrl+Shift+V",
  "shortcut_paste_last": "Ctrl+Shift+1",
  "enable_encryption": false,
  "archive_after_days": 7,
  "theme": "system",
  "language": "zh"
}
```

## 内容识别规则

| 类型 | 识别规则 | 图标 |
|------|----------|------|
| 手机号 | `^1[3-9]\d{9}$` 或国际格式 | 📱 |
| 邮箱 | 标准邮箱正则 | ✉️ |
| 网址 | `https?://` 或 `www.` 开头 | 🔗 |
| 代码片段 | 包含 `{}` `;` `function` `class` `def` 等 | 💻 |
| 密码 | 高熵字符串（长度>10，含多种字符类型） | 🔐 |
| 文本 | 其他内容 | 📝 |

## 开发计划

### v1.0 MVP（核心功能）✅
- [x] 剪贴板监听与基础弹窗
- [x] 基础内容识别
- [x] 悬浮窗与抽屉面板
- [x] 本地数据库存储
- [x] 搜索功能
- [x] 导出JSON/TXT

### v1.1 体验优化
- [ ] 自定义正则规则
- [ ] 开机自启动
- [ ] 数据加密
- [ ] 多显示器支持优化
- [ ] 操作快捷键

### v1.2 高级功能
- [ ] PDF导出
- [ ] 智能归档策略
- [ ] 数据备份与恢复
- [ ] 历史统计视图

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

[MIT](LICENSE)

## 致谢

- [Tauri](https://tauri.app/) - 跨平台应用框架
- [React](https://react.dev/) - UI框架
- [TailwindCSS](https://tailwindcss.com/) - CSS框架
- [Framer Motion](https://www.framer.com/motion/) - 动画库

---

<p align="center">
  Made with ❤️ by CoolQuick Team
</p>
