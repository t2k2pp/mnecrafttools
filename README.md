# BedrockMate 2025 (Hybrid Edition)

🎮 **Minecraft Bedrock Edition (1.22+)** 向けの便利ツール集

小中学生のiPadユーザーをターゲットにした、使いやすいマインクラフト支援ツールです。

## 🛠️ Tier 1: どこでもツール (Static)

GitHub Pagesで動作。いつでもどこでも使えます！

| ツール | 説明 |
|--------|------|
| 📍 座標計算 | チャンク・リージョン・ネザー座標を一括計算 |
| 🌀 ネザーポータル | ポータルの最適な位置を計算 |
| 🟢 スライムレーダー | スライムチャンクを探す（シード不要！） |
| 📏 距離計算 | 2点間の距離とエリトラ所要時間 |
| ⭕ 建築ヘルパー | 円・球体・楕円のブロック配置図 |

## 💾 Tier 2: データ管理 (Home Server)

自宅サーバー接続時のみ有効。

- シードばんごう管理
- 座標ブックマーク

## 🗺️ Tier 3: 構造物レーダー (Rust CLI)

重い計算はRust CLIで実行。

- 構造物マップ生成
- バイオームファインダー

## 使い方

### GitHub Pages（推奨）

1. [BedrockMate 2025](https://t2k2pp.github.io/mnecrafttools/) にアクセス
2. 使いたいツールを選択
3. 座標を入力して計算！

### ローカルで動かす

```bash
# リポジトリをクローン
git clone https://github.com/t2k2pp/mnecrafttools.git
cd mnecrafttools

# ローカルサーバーで起動
npx serve .
```

## 技術スタック

- **Frontend**: HTML5, Tailwind CSS, Vanilla JS
- **Backend** (Phase 2): Python FastAPI, SQLite
- **Compute** (Phase 3): Rust CLI

## ライセンス

MIT License

---

Made with ⛏️ for Minecraft 冒険者たち
