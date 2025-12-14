/**
 * BedrockMate 2025 - メインアプリケーション
 * Main Application Logic
 */

const App = {
    // サーバー接続状態
    isServerConnected: false,

    // ヘルスチェック間隔（ミリ秒）
    HEALTH_CHECK_INTERVAL: 30000,

    /**
     * アプリケーションの初期化
     */
    init() {
        this.initToolSwitching();
        this.initFuriganaToggle();
        this.initConnectionStatus();

        console.log('🎮 BedrockMate 2025 initialized!');
    },

    /**
     * ツール切り替えの初期化
     */
    initToolSwitching() {
        const toolBtns = document.querySelectorAll('.tool-btn');
        const toolContents = document.querySelectorAll('.tool-content');

        toolBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const toolId = btn.dataset.tool;

                // すべてのボタンを非アクティブに
                toolBtns.forEach(b => b.classList.remove('active'));

                // クリックされたボタンをアクティブに
                btn.classList.add('active');

                // すべてのコンテンツを非表示に
                toolContents.forEach(content => {
                    content.classList.add('hidden');
                });

                // 対応するコンテンツを表示
                const targetContent = document.getElementById(`tool-${toolId}`);
                if (targetContent) {
                    targetContent.classList.remove('hidden');
                }
            });
        });
    },

    /**
     * ふりがな切り替えの初期化
     */
    initFuriganaToggle() {
        const toggle = document.getElementById('furigana-toggle');

        if (!toggle) return;

        // 初期状態の読み込み
        const savedState = localStorage.getItem('furigana-enabled');
        if (savedState !== null) {
            toggle.checked = savedState === 'true';
        }

        this.updateFurigana(toggle.checked);

        toggle.addEventListener('change', () => {
            this.updateFurigana(toggle.checked);
            localStorage.setItem('furigana-enabled', toggle.checked);
        });
    },

    /**
     * ふりがな表示を更新
     * @param {boolean} enabled - 有効かどうか
     */
    updateFurigana(enabled) {
        if (enabled) {
            document.body.classList.remove('no-furigana');
        } else {
            document.body.classList.add('no-furigana');
        }
    },

    /**
     * 接続ステータスの初期化
     */
    initConnectionStatus() {
        this.checkServerConnection();

        // 定期的にヘルスチェック
        setInterval(() => {
            this.checkServerConnection();
        }, this.HEALTH_CHECK_INTERVAL);
    },

    /**
     * サーバー接続をチェック
     */
    async checkServerConnection() {
        const statusContainer = document.getElementById('connection-status');
        const statusIcon = statusContainer.querySelector('.status-icon');
        const statusText = statusContainer.querySelector('.status-text');
        const serverFeatures = document.getElementById('server-features');

        try {
            const response = await fetch('/api/health', {
                method: 'GET',
                timeout: 5000
            });

            if (response.ok) {
                this.isServerConnected = true;
                statusContainer.classList.add('connected');
                statusIcon.textContent = '🏠';
                statusText.innerHTML = 'Home Server <ruby>接続中<rp>(</rp><rt>せつぞくちゅう</rt><rp>)</rp></ruby>';
                serverFeatures.classList.remove('opacity-50');

                // サーバー機能のボタンを有効化
                this.enableServerFeatures(true);
            } else {
                throw new Error('Server not available');
            }
        } catch (error) {
            this.isServerConnected = false;
            statusContainer.classList.remove('connected');
            statusIcon.textContent = '☁️';
            statusText.innerHTML = '<ruby>静的<rp>(</rp><rt>せいてき</rt><rp>)</rp></ruby>モード';
            serverFeatures.classList.add('opacity-50');

            // サーバー機能のボタンを無効化
            this.enableServerFeatures(false);
        }
    },

    /**
     * サーバー機能の有効/無効を切り替え
     * @param {boolean} enabled - 有効かどうか
     */
    enableServerFeatures(enabled) {
        const serverFeatures = document.getElementById('server-features');

        if (!serverFeatures) return;

        const buttons = serverFeatures.querySelectorAll('li');
        buttons.forEach(btn => {
            if (enabled) {
                btn.classList.remove('text-gray-500');
                btn.classList.add('cursor-pointer', 'hover:bg-mc-grass-dark');
            } else {
                btn.classList.add('text-gray-500');
                btn.classList.remove('cursor-pointer', 'hover:bg-mc-grass-dark');
            }
        });
    },

    /**
     * 通知を表示
     * @param {string} message - メッセージ
     * @param {string} type - タイプ（success, error, info）
     */
    showNotification(message, type = 'info') {
        // TODO: 通知UIを実装
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
};

// DOMContentLoaded時に初期化
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
