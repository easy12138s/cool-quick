# CoolQuick

一款智能、快速的剪贴板管理工具，自动识别和分类复制的内容，让笔记记录变得零摩擦。

## 特性

- 📋 **智能监听** - 自动感知剪贴板变化，快速弹窗提示
- 🎯 **智能分类** - 自动识别手机号、邮箱、网址、代码、密码等类型
- 🔧 **悬浮窗口** - 可自由拖动的悬浮按钮，悬停展开笔记抽屉
- ⚡ **极速访问** - 滚轮浏览历史，一键复制
- 💾 **本地存储** - SQLite 数据库，数据安全可靠
- 🌓 **明暗主题** - 支持浅色/深色/跟随系统
- 🗄️ **智能归档** - 按日期自动归档旧笔记
- 📤 **数据导出** - 支持 JSON/TXT/PDF 格式导出
- 🔐 **数据加密** - 可选AES-256加密保护
- 📊 **统计分析** - Dashboard可视化数据趋势
- ⚙️ **自定义规则** - 支持正则表达式自定义识别规则

## 安装与使用

### Windows

- 推荐使用安装包（MSI / NSIS）。安装与卸载界面已配置为中文。
- 默认数据库位置：优先尝试写入“安装目录”下的 `data.db`，如果安装目录不可写（例如 `Program Files`），会自动回退到 `%APPDATA%\CoolQuick\data.db`。

### macOS / Linux

当前仓库提供开发构建方式；发布包可通过 `tauri build` 生成对应平台产物（具体见下方“打包发布”）。

### 环境要求

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://www.rust-lang.org/) >= 1.70

Windows 额外建议：安装 Visual Studio Build Tools（C++ build tools）。

### 开发环境搭建

```bash
# 克隆仓库
git clone https://github.com/easy12138s/cool-quick.git
cd cool-quick

# 安装依赖
npm install

# 启动开发服务器
npm run tauri-dev
```

### 构建应用

```bash
# 构建生产版本（默认 bundles 取决于 tauri.conf.json 配置）
npm run tauri-build

# 构建所有平台
npm run build:all
```

## 打包发布

本项目使用 Tauri v1。

### Windows（MSI / NSIS）

```bash
# 依次构建 MSI + NSIS
npm run build:win

# 只构建 MSI（网络受限时优先）
npm run build:win:msi

# 只构建 NSIS
npm run build:win:nsis
```

产物目录：

- `src-tauri/target/**/release/bundle/msi/`
- `src-tauri/target/**/release/bundle/nsis/`

受限网络说明：NSIS 打包阶段需要下载 `nsis-3.zip`（来自 GitHub Release）。如果网络无法访问，可手动下载并解压到 `%LOCALAPPDATA%\tauri\NSIS\` 后再执行 `npm run build:win:nsis`。

### iOS

Tauri v1 不支持 iOS；如需 iOS 需升级到 Tauri v2 Mobile，并按 iOS 沙盒规范存储数据（iOS 不支持自定义安装路径）。

## 使用说明

### 日常使用流程

1. **复制内容** → 自动检测并弹窗提示
2. **点击保存** → 内容存入笔记库
3. **鼠标悬停悬浮窗** → 展开抽屉查看历史
4. **滚轮浏览** → 查看所有笔记
5. **单击复制** → 将笔记复制到剪贴板


## 配置

数据库文件：

- **Windows**: 优先 `<安装目录>\data.db`，不可写则回退到 `%APPDATA%\CoolQuick\data.db`
- **macOS**: `~/Library/Application Support/CoolQuick/data.db`
- **Linux**: `~/.config/CoolQuick/data.db`

## 许可证

[MIT](LICENSE)

---

Made with ❤️ by CoolQuick Team
