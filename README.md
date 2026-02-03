# CoolQuick

一款智能、快速的剪贴板管理工具，自动识别和分类复制的内容，让笔记记录变得零摩擦。

## 特性

- 📋 **智能监听** - 自动感知剪贴板变化，快速弹窗提示
- 🎯 **智能分类** - 自动识别手机号、邮箱、网址、代码、密码等类型
- 🔧 **悬浮窗口** - 可自由拖动的悬浮按钮，悬停展开笔记抽屉
- ⚡ **极速访问** - 滚轮浏览历史，一键复制
- 💾 **本地存储** - SQLite数据库，数据安全可靠
- 🌓 **明暗主题** - 支持浅色/深色/跟随系统
- 🗄️ **智能归档** - 按日期自动归档旧笔记
- 📤 **数据导出** - 支持 JSON/TXT/PDF 格式导出
- 🔐 **数据加密** - 可选AES-256加密保护
- 📊 **统计分析** - Dashboard可视化数据趋势
- ⚙️ **自定义规则** - 支持正则表达式自定义识别规则

## 安装

### 环境要求

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://www.rust-lang.org/) >= 1.70

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
# 构建生产版本
npm run tauri-build

# 构建所有平台
npm run build:all
```

## 使用说明

### 日常使用流程

1. **复制内容** → 自动检测并弹窗提示
2. **点击保存** → 内容存入笔记库
3. **鼠标悬停悬浮窗** → 展开抽屉查看历史
4. **滚轮浏览** → 查看所有笔记
5. **单击复制** → 将笔记复制到剪贴板

### 快捷键

- `Ctrl+Shift+V` - 快速打开搜索
- `Ctrl+Shift+1` - 粘贴最近一条笔记
- `Esc` - 关闭弹窗或抽屉

## 配置

配置文件位置：
- **Windows**: `%APPDATA%\CoolQuick\config.json`
- **macOS**: `~/Library/Application Support/CoolQuick/config.json`
- **Linux**: `~/.config/CoolQuick/config.json`

## 许可证

[MIT](LICENSE)

---

Made with ❤️ by CoolQuick Team
