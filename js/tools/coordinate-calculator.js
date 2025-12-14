/**
 * BedrockMate 2025 - 座標計算ツール
 * Coordinate Calculator Tool
 */

const CoordinateCalculator = {
    /**
     * チャンク座標を計算
     * @param {number} blockCoord - ブロック座標
     * @returns {number} チャンク座標
     */
    toChunkCoord(blockCoord) {
        return Math.floor(blockCoord / 16);
    },

    /**
     * チャンク内の相対座標を計算 (0-15)
     * @param {number} blockCoord - ブロック座標
     * @returns {number} チャンク内座標 (0-15)
     */
    toChunkLocalCoord(blockCoord) {
        return ((blockCoord % 16) + 16) % 16;
    },

    /**
     * リージョン座標を計算
     * @param {number} chunkCoord - チャンク座標
     * @returns {number} リージョン座標
     */
    toRegionCoord(chunkCoord) {
        return Math.floor(chunkCoord / 32);
    },

    /**
     * リージョンファイル名を生成
     * @param {number} regionX - リージョンX座標
     * @param {number} regionZ - リージョンZ座標
     * @returns {string} リージョンファイル名
     */
    getRegionFileName(regionX, regionZ) {
        return `r.${regionX}.${regionZ}.mca`;
    },

    /**
     * オーバーワールド座標からネザー座標に変換
     * @param {number} overworldCoord - オーバーワールド座標
     * @returns {number} ネザー座標
     */
    toNetherCoord(overworldCoord) {
        return Math.floor(overworldCoord / 8);
    },

    /**
     * ネザー座標からオーバーワールド座標に変換
     * @param {number} netherCoord - ネザー座標
     * @returns {number} オーバーワールド座標
     */
    toOverworldCoord(netherCoord) {
        return netherCoord * 8;
    },

    /**
     * 全ての座標計算を実行
     * @param {number} x - X座標
     * @param {number} y - Y座標
     * @param {number} z - Z座標
     * @returns {object} 計算結果
     */
    calculate(x, y, z) {
        const chunkX = this.toChunkCoord(x);
        const chunkZ = this.toChunkCoord(z);
        const localX = this.toChunkLocalCoord(x);
        const localZ = this.toChunkLocalCoord(z);
        const regionX = this.toRegionCoord(chunkX);
        const regionZ = this.toRegionCoord(chunkZ);

        return {
            // チャンク情報
            chunk: {
                x: chunkX,
                z: chunkZ,
                display: `${chunkX}, ${chunkZ}`
            },
            // チャンク内座標
            chunkLocal: {
                x: localX,
                z: localZ,
                display: `(${localX}, ${localZ})`
            },
            // リージョン情報
            region: {
                x: regionX,
                z: regionZ,
                display: `${regionX}, ${regionZ}`,
                fileName: this.getRegionFileName(regionX, regionZ)
            },
            // ネザー座標（オーバーワールド→ネザー）
            nether: {
                x: this.toNetherCoord(x),
                z: this.toNetherCoord(z),
                display: `${this.toNetherCoord(x)}, ${y}, ${this.toNetherCoord(z)}`
            },
            // オーバーワールド座標（ネザー→オーバーワールド）
            overworld: {
                x: this.toOverworldCoord(x),
                z: this.toOverworldCoord(z),
                display: `${this.toOverworldCoord(x)}, ${y}, ${this.toOverworldCoord(z)}`
            }
        };
    },

    /**
     * UIの初期化
     */
    init() {
        const calcBtn = document.getElementById('coord-calc-btn');
        const inputX = document.getElementById('coord-x');
        const inputY = document.getElementById('coord-y');
        const inputZ = document.getElementById('coord-z');

        if (!calcBtn) return;

        // 計算ボタンのクリックイベント
        calcBtn.addEventListener('click', () => {
            this.calculateAndDisplay();
        });

        // Enterキーでも計算
        [inputX, inputY, inputZ].forEach(input => {
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
        const x = parseInt(document.getElementById('coord-x').value) || 0;
        const y = parseInt(document.getElementById('coord-y').value) || 64;
        const z = parseInt(document.getElementById('coord-z').value) || 0;

        const results = this.calculate(x, y, z);
        const resultsContainer = document.getElementById('coord-results');

        // 結果を表示
        document.getElementById('result-chunk').textContent = results.chunk.display;
        document.getElementById('result-chunk-local').textContent = results.chunkLocal.display;
        document.getElementById('result-region').textContent = results.region.display;
        document.getElementById('result-region-file').textContent = results.region.fileName;
        document.getElementById('result-nether').textContent = results.nether.display;
        document.getElementById('result-overworld').textContent = results.overworld.display;

        // 結果コンテナを表示
        resultsContainer.classList.remove('hidden');
    }
};

// DOMContentLoaded時に初期化
document.addEventListener('DOMContentLoaded', () => {
    CoordinateCalculator.init();
});
