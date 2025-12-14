/**
 * BedrockMate 2025 - ネザーポータルプランナー
 * Nether Portal Planner Tool
 */

const NetherPortalPlanner = {
    // ポータル検索範囲（ブロック単位）
    PORTAL_SEARCH_RADIUS: 128,

    /**
     * オーバーワールド座標からネザー側の最適座標を計算
     * @param {number} owX - オーバーワールドX座標
     * @param {number} owZ - オーバーワールドZ座標
     * @returns {object} ネザー側の座標情報
     */
    calculateNetherCoords(owX, owZ) {
        const netherX = Math.floor(owX / 8);
        const netherZ = Math.floor(owZ / 8);

        return {
            x: netherX,
            z: netherZ,
            display: `X: ${netherX}, Z: ${netherZ}`
        };
    },

    /**
     * オーバーワールドでの安全設置範囲を計算
     * @param {number} owX - オーバーワールドX座標
     * @param {number} owZ - オーバーワールドZ座標
     * @returns {object} 安全範囲情報
     */
    calculateSafeZone(owX, owZ) {
        // ネザー側での128ブロック = オーバーワールド側での1024ブロック
        const owSafeRadius = this.PORTAL_SEARCH_RADIUS * 8;

        return {
            netherRadius: this.PORTAL_SEARCH_RADIUS,
            overworldRadius: owSafeRadius,
            minX: owX - owSafeRadius,
            maxX: owX + owSafeRadius,
            minZ: owZ - owSafeRadius,
            maxZ: owZ + owSafeRadius
        };
    },

    /**
     * 2つのポータル間で混線が発生するかチェック
     * @param {object} portal1 - ポータル1のオーバーワールド座標 {x, z}
     * @param {object} portal2 - ポータル2のオーバーワールド座標 {x, z}
     * @returns {boolean} 混線の可能性があるかどうか
     */
    checkConflict(portal1, portal2) {
        // ネザー座標に変換
        const nether1 = this.calculateNetherCoords(portal1.x, portal1.z);
        const nether2 = this.calculateNetherCoords(portal2.x, portal2.z);

        // ネザー側での距離を計算
        const distance = Math.sqrt(
            Math.pow(nether2.x - nether1.x, 2) +
            Math.pow(nether2.z - nether1.z, 2)
        );

        return distance < this.PORTAL_SEARCH_RADIUS;
    },

    /**
     * 最適なネザーポータルのY座標を推奨
     * @returns {object} Y座標の推奨
     */
    getRecommendedY() {
        return {
            // ネザーでは屋根の下（Y=120未満）に作る
            netherMax: 120,
            // 安全なY座標
            netherRecommended: 64,
            // オーバーワールドでは通常のY
            overworldRecommended: 64
        };
    },

    /**
     * UIの初期化
     */
    init() {
        const calcBtn = document.getElementById('portal-calc-btn');
        const inputX = document.getElementById('portal-ow-x');
        const inputZ = document.getElementById('portal-ow-z');

        if (!calcBtn) return;

        // 計算ボタンのクリックイベント
        calcBtn.addEventListener('click', () => {
            this.calculateAndDisplay();
        });

        // Enterキーでも計算
        [inputX, inputZ].forEach(input => {
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.calculateAndDisplay();
                    }
                });
            }
        });
    },

    /**
     * 計算を実行して結果を表示
     */
    calculateAndDisplay() {
        const owX = parseInt(document.getElementById('portal-ow-x').value) || 0;
        const owZ = parseInt(document.getElementById('portal-ow-z').value) || 0;

        const netherCoords = this.calculateNetherCoords(owX, owZ);
        const safeZone = this.calculateSafeZone(owX, owZ);
        const yRecommend = this.getRecommendedY();

        const resultsContainer = document.getElementById('portal-results');
        const coordsDisplay = document.getElementById('portal-nether-coords');

        // 結果を表示
        coordsDisplay.innerHTML = `
            <span class="text-purple-300">X: ${netherCoords.x}</span>, 
            <span class="text-gray-400">Y: ${yRecommend.netherRecommended}くらい</span>, 
            <span class="text-purple-300">Z: ${netherCoords.z}</span>
        `;

        // 結果コンテナを表示
        resultsContainer.classList.remove('hidden');
    }
};

// DOMContentLoaded時に初期化
document.addEventListener('DOMContentLoaded', () => {
    NetherPortalPlanner.init();
});
