/**
 * BedrockMate 2025 - メインアプリケーション
 * Main Application Logic
 */

const App = {
    // サーバー接続状態
    isServerConnected: false,

    // アクティブなワールドID
    activeWorldId: null,

    // ヘルスチェック間隔（ミリ秒）
    HEALTH_CHECK_INTERVAL: 30000,

    /**
     * アプリケーションの初期化
     */
    init() {
        this.initToolSwitching();
        this.initFuriganaToggle();
        this.initConnectionStatus();
        this.initBookmarkForm();

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
                // disabled状態のボタンは無視
                if (btn.disabled) return;

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

                // ブックマークツールの場合、アクティブワールドを読み込む
                if (toolId === 'bookmarks' && this.isServerConnected) {
                    this.loadActiveWorldForBookmarks();
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
        const serverButtons = document.querySelectorAll('.tool-btn.server-only');

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch('/api/health', {
                method: 'GET',
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                this.isServerConnected = true;
                statusContainer.classList.add('connected');
                statusIcon.textContent = '🏠';
                statusText.innerHTML = 'Home Server <ruby>接続中<rp>(</rp><rt>せつぞくちゅう</rt><rp>)</rp></ruby>';
                serverFeatures.classList.remove('opacity-50');

                // サーバー機能のボタンを有効化
                serverButtons.forEach(btn => {
                    btn.disabled = false;
                });

                console.log('✅ Server connected');
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
            serverButtons.forEach(btn => {
                btn.disabled = true;
            });

            console.log('☁️ Static mode (server not available)');
        }
    },

    /**
     * ブックマークフォームの初期化
     */
    initBookmarkForm() {
        const form = document.getElementById('bookmark-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!this.activeWorldId) {
                this.showNotification('ワールドをえらんでください', 'error');
                return;
            }

            const formData = new FormData(form);
            const data = {
                world_id: this.activeWorldId,
                name: formData.get('name'),
                x: parseInt(formData.get('x')),
                y: parseInt(formData.get('y')) || 64,
                z: parseInt(formData.get('z')),
                dimension: formData.get('dimension'),
                icon: formData.get('icon')
            };

            try {
                const response = await fetch('/api/bookmarks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    form.reset();
                    this.loadBookmarks();
                    this.showNotification('ブックマークをついかしました！', 'success');
                } else {
                    throw new Error('Failed to create bookmark');
                }
            } catch (error) {
                console.error('Bookmark creation error:', error);
                this.showNotification('エラーがおきました', 'error');
            }
        });
    },

    /**
     * アクティブワールドをブックマーク用に読み込み
     */
    async loadActiveWorldForBookmarks() {
        try {
            const response = await fetch('/api/seeds/active');
            if (response.ok) {
                const world = await response.json();
                if (world) {
                    this.activeWorldId = world.id;
                    document.getElementById('active-world-name').textContent = world.name;
                    this.loadBookmarks();
                } else {
                    document.getElementById('active-world-name').textContent = 'なし（シードをえらんでね）';
                    document.getElementById('bookmark-list').innerHTML =
                        '<p class="text-yellow-400 text-center py-4">⚠️ シードばんごうでワールドをえらんでね</p>';
                }
            }
        } catch (error) {
            console.error('Failed to load active world:', error);
        }
    },

    /**
     * ブックマークを読み込み
     */
    async loadBookmarks() {
        if (!this.activeWorldId) return;

        const container = document.getElementById('bookmark-list');

        try {
            const response = await fetch(`/api/bookmarks/htmx/list?world_id=${this.activeWorldId}`);
            if (response.ok) {
                container.innerHTML = await response.text();
            }
        } catch (error) {
            console.error('Failed to load bookmarks:', error);
            container.innerHTML = '<p class="text-red-400">エラーがおきました</p>';
        }
    },

    /**
     * 通知を表示
     * @param {string} message - メッセージ
     * @param {string} type - タイプ（success, error, info）
     */
    showNotification(message, type = 'info') {
        // シンプルなアラート（将来的にはより良いUIに）
        const colors = {
            success: '✅',
            error: '❌',
            info: 'ℹ️'
        };
        console.log(`${colors[type] || 'ℹ️'} ${message}`);

        // 簡易トースト通知
        const toast = document.createElement('div');
        toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white z-50 ${type === 'success' ? 'bg-green-600' :
                type === 'error' ? 'bg-red-600' : 'bg-blue-600'
            }`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
};

// 座標コピー用のグローバル関数
function copyCoords(x, y, z) {
    const text = `X: ${x}, Y: ${y}, Z: ${z}`;
    navigator.clipboard.writeText(text).then(() => {
        App.showNotification('座標をコピーしました！', 'success');
    }).catch(() => {
        App.showNotification('コピーできませんでした', 'error');
    });
}

// DOMContentLoaded時に初期化
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
