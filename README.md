# ⌨️ Type Rush · 键盘打字游戏

网页打字测速 / 练习，纯 HTML / CSS / JS，零依赖。适合外接蓝牙键盘的 iPad、Mac、PC。

## 玩法

| 操作 | 按键 |
|------|------|
| 开始 | 任意字母键，或点「开始挑战」 |
| 删除 | `Backspace` |
| 再来一局 | `Tab` |
| 重置 | `Esc` |

### 模式

| 模式 | 说明 |
|------|------|
| 60 / 30 / 15 秒 | 限时打字，时间到结算 WPM |
| 短文 | 打完一句英文名言即结束 |

### 词库

- **English** — 常用英语词
- **Code** — 编程相关词（`const`、`async`、`git`…）
- **Mix** — 混合

HUD 显示实时 **WPM**、**准确率**、剩余时间；最高 WPM 存在浏览器 `localStorage`。

## 本地运行

```bash
cd ~/orca/projects/typing-game
python3 -m http.server 8080
# 打开 http://localhost:8080
```

也可直接打开 `index.html`。

## 目录

```
typing-game/
├── index.html   # 页面
├── style.css    # 样式
├── words.js     # 词库 / 短文
├── game.js      # 逻辑
└── README.md
```

## Orca

```bash
orca repo add --path ~/orca/projects/typing-game
```

## License

MIT
