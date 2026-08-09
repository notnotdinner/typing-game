# 🎈 气球打字 · Balloon Pop

网页打字游戏：**每个气球上有一个字母**，从下方升起；按下对应键即可炸掉。别让气球飞出顶部！

纯 **HTML / CSS / JS**，零依赖，已托管于 GitHub Pages。

## 在线游玩

**https://notnotdinner.github.io/typing-game/**

## 如何彻底避免缓存旧版（iPad / Safari）

GitHub Pages 会对静态文件做约 **10 分钟** 的 CDN 缓存；iPad Safari 也会强缓存 JS。本项目用下面机制自动绕过：

| 机制 | 作用 |
|------|------|
| **`boot.js` 动态加载** | 每次打开用 `Date.now()` 拉 `boot.js`，旧 HTML 也能换新加载器 |
| **`version.json?_=随机数`** | 每次访问强制拉最新版本号（绕过 CDN 同名缓存） |
| **资源 `?v=<git-sha>`** | `style.css` / `game.js` / 音频都带版本参数，一发版就换 URL |
| **清 SW + Cache API** | 进入时注销 Service Worker、删掉 Cache Storage |

页脚会显示 **`build <版本号>`**。发版后若与 GitHub 最新 commit 一致，就是新版。

### 开发者发版流程

```bash
# 改完代码后、push 前：
./scripts/stamp-version.sh
git add -A && git commit -m "..." && git push
# 若希望 version.json 的 v 等于本次 commit：
./scripts/stamp-version.sh && git add version.json && git commit -m "chore: stamp version" && git push
```

### 用户仍看到旧版时（一次性）

1. Safari **无痕**打开站点  
2. 或：设置 → Safari → **清除历史记录与网站数据**  
3. 删掉主屏幕旧图标后重新「添加到主屏幕」  

之后正常打开即可自动跟新，不必再手动改 `?v=`。

## 玩法

| 操作 | 说明 |
|------|------|
| 按字母键 | 炸掉显示该字母的气球（优先消最高的） |
| `Esc` | 暂停并返回菜单 |
| `Enter` | 菜单中开始 / 再来一局 |
| 🎵 / 🔊 | 开关背景音乐 / 音效 |

**不需要屏幕输入框。** 在 iPad / Mac / PC 上接蓝牙或有线键盘即可；页面监听硬件 `keydown`，不会弹出 iPad 软键盘。

### 彩蛋

局中会**偶发**同屏刷出 **10 个相同字母**（金边高亮气球）。在它们飞出顶部前全部打掉，会触发清场动画、礼花与号角音效，并获得大额加分。若有一个飞出则彩蛋中断。

### 读音模式（儿童）

菜单可选 **🔊 读音模式**：

- 只响应键盘 **A–Z**（大小写均可）
- 按下字母播放英文读音，例如 **「A for apple」**
- 26 个字母均已配置（apple / ball / cat … zebra）
- **数字与其它键一律忽略**
- 字母名使用 **真人录制音频**（`audio/letters/*.m4a`，来源见 `audio/letters/ATTRIBUTION.txt`），**不用 TTS**

| 键 | 例句 |
|----|------|
| A | A for apple |
| B | B for ball |
| … | … |
| Z | Z for zebra |

### 选项

| 选项 | 说明 |
|------|------|
| **简单** | 慢速、少气球、5 条生命、常用字母偏多 |
| **普通** | 中等速度、3 条生命 |
| **困难** | 快速、多气球、高分 |
| **数字** | 开启后气球也会出现 `0–9` |

打对得分，连击有倍率。气球飞出顶部扣生命，生命归零结束。最高分存在 `localStorage`。

## 本地运行

```bash
cd ~/orca/projects/typing-game
python3 -m http.server 8080
# 打开 http://localhost:8080
```

也可直接打开 `index.html`（部分浏览器对 `file://` 下音频有限制，建议用本地服务器）。

## 目录

```
typing-game/
├── index.html   # 页面结构
├── style.css    # 天空 / 气球样式
├── words.js     # 词库（按难度 + 数字）
├── game.js      # 游戏逻辑与 Web Audio
└── README.md
```

音效与背景音乐使用 **Web Audio API** 程序生成，无需额外音频文件。

## GitHub Pages

1. 推送代码到 `main`
2. 仓库 **Settings → Pages → Build and deployment**
3. Source: **Deploy from a branch** → Branch: `main` / `/ (root)`
4. 保存后约一分钟可访问 `https://<user>.github.io/typing-game/`

## Orca

```bash
orca repo add --path ~/orca/projects/typing-game
```

## License

MIT
