# 🎈 气球打字 · Balloon Pop

网页打字游戏：气球从屏幕下方不断升起，打出气球上的文字即可炸掉它们。别让气球飞出顶部！

纯 **HTML / CSS / JS**，零依赖，适合 GitHub Pages 托管。支持桌面与外接键盘（iPad / Mac / PC）。

## 在线游玩

部署到 GitHub Pages 后访问：

```
https://notnotdinner.github.io/typing-game/
```

（需在仓库 Settings → Pages 中启用，Source 选 `main` 分支根目录。）

## 玩法

| 操作 | 说明 |
|------|------|
| 打字 | 匹配气球上的单词 / 数字 |
| `Backspace` | 删除已输入字符 |
| `Esc` | 暂停并返回菜单 |
| `Enter` | 菜单中开始 / 再来一局 |
| 🎵 / 🔊 | 开关背景音乐 / 音效 |

### 选项

| 选项 | 说明 |
|------|------|
| **简单** | 慢速、少气球、5 条生命、短词 |
| **普通** | 中等速度与词长、3 条生命 |
| **困难** | 快速、多气球、长词高分 |
| **数字** | 开启后出现纯数字与字母数字混合词 |

打对气球得分，连击有倍率。气球飞出顶部会扣生命，生命归零游戏结束。最高分保存在浏览器 `localStorage`。

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
