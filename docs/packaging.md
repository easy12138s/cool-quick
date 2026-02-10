# 打包与安装（Windows / iOS）

本项目当前使用 Tauri v1（Rust 侧依赖 `tauri = 1.5`）。

## Windows 安装包（NSIS + MSI）

### 目标

- 生成 Windows 安装程序与卸载程序
  - NSIS：`*-setup.exe`
  - MSI：`*.msi`
- 安装程序支持选择安装目录、创建快捷方式等常规能力（由 NSIS/MSI 安装向导提供）
- 数据库默认保存到“安装目录”下的 `data.db`；如果安装目录不可写（例如 `Program Files`），自动回退到 `%APPDATA%\CoolQuick\data.db`

### 先决条件

- Windows 10/11
- Node.js + npm
- Rust（MSVC toolchain）
- Visual Studio Build Tools（C++ build tools）

说明：Tauri 打包时会自动下载 NSIS / WiX 等构建工具。如果当前网络环境无法访问 GitHub Release，需要配置代理或手动准备 NSIS。

### 打包命令

在项目根目录执行（依次构建 MSI + NSIS）：

```bash
npm run build:win
```

只打 MSI（网络受限时优先用这个）：

```bash
npm run build:win:msi
```

只打 NSIS：

```bash
npm run build:win:nsis
```

### 产物目录

- `src-tauri/target/release/bundle/msi/`
- `src-tauri/target/release/bundle/nsis/`

### 安装/卸载语言

- MSI：已配置为 `zh-CN`
- NSIS：已配置为 `SimpChinese` 且关闭语言选择器（强制中文界面）

### 数据库路径策略

- 默认：`<安装目录>\data.db`
- 如果 `<安装目录>` 不可写：回退到 `%APPDATA%\CoolQuick\data.db`

该逻辑在应用启动时自动判定，无需安装器额外写入配置。

建议：Windows 端 NSIS 使用 `currentUser` 安装模式作为默认值，降低落到需要管理员权限目录的概率。

### 受限网络（手动准备 NSIS）

如果打包时报错下载 `nsis-3.zip` 超时：

1. 在可访问网络的环境中下载：
   - `https://github.com/tauri-apps/binary-releases/releases/download/nsis-3/nsis-3.zip`
2. 解压到本机：
   - `%LOCALAPPDATA%\tauri\NSIS\`
3. 确认解压后目录中存在 `makensis.exe`（通常在 `nsis-*\makensis.exe`）
4. 重新执行：

```bash
npm run build:win:nsis
```

## iOS（重要：当前版本不支持）

Tauri v1 **不支持 iOS**。要打包 iOS 需要升级到 **Tauri v2（Mobile）** 并进行适配迁移（项目结构与配置方式会变化）。

同时 iOS 平台也不允许“自定义安装路径”，更不允许把数据库写到安装目录；正确做法是使用应用沙盒（Documents/Library/Application Support）。
