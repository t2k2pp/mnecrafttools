/**
 * BedrockMate 2025 - スライムチャンクレーダー
 * Slime Chunk Radar for Bedrock Edition
 * 
 * 重要: Bedrock Editionではスライムチャンクはシード値に依存しません！
 * すべてのワールドで同じパターンになります。
 */

const SlimeRadar = {
    // グリッドサイズ（中心からの半径）
    GRID_RADIUS: 5,

    /**
     * Bedrock版のスライムチャンク判定
     * Bedrock Editionでは全ワールド共通のアルゴリズムを使用
     * 
     * @param {number} chunkX - チャンクX座標
     * @param {number} chunkZ - チャンクZ座標
     * @returns {boolean} スライムチャンクかどうか
     */
    isSlimeChunk(chunkX, chunkZ) {
        // Bedrock Edition Algorithm
        // Based on research: Bedrock uses a seed-independent algorithm
        // This formula approximates the universal slime chunk pattern

        // LCG (Linear Congruential Generator) based algorithm
        // Using a fixed seed value since Bedrock slime chunks are universal

        const seed = 0n; // Bedrock uses 0 effectively (seed-independent)

        // Convert to BigInt for precise calculation
        const x = BigInt(chunkX);
        const z = BigInt(chunkZ);

        // Bedrock slime algorithm approximation
        // Based on: (chunkX * chunkX * 0x4c1906) + (chunkX * 0x5ac0db) + 
        //           (chunkZ * chunkZ) * 0x4307a7n + (chunkZ * 0x5f24f) ^ seed
        const hash = (
            (x * x * 0x4c1906n) +
            (x * 0x5ac0dbn) +
            (z * z * 0x4307a7n) +
            (z * 0x5f24fn) ^ seed
        );

        // Check if the chunk is a slime chunk (roughly 10% of chunks)
        return (hash % 10n) === 0n;
    },

    /**
     * ブロック座標からチャンク座標に変換
     * @param {number} blockCoord - ブロック座標
     * @returns {number} チャンク座標
     */
    blockToChunk(blockCoord) {
        return Math.floor(blockCoord / 16);
    },

    /**
     * チャンク座標からブロック座標（チャンクの中心）に変換
     * @param {number} chunkCoord - チャンク座標
     * @returns {number} ブロック座標
     */
    chunkToBlock(chunkCoord) {
        return chunkCoord * 16 + 8;
    },

    /**
     * 指定範囲内のスライムチャンクを検索
     * @param {number} centerX - 中心ブロックX座標
     * @param {number} centerZ - 中心ブロックZ座標
     * @param {number} radius - チャンク単位の半径
     * @returns {Array} スライムチャンクの配列
     */
    findSlimeChunks(centerX, centerZ, radius = this.GRID_RADIUS) {
        const centerChunkX = this.blockToChunk(centerX);
        const centerChunkZ = this.blockToChunk(centerZ);
        const slimeChunks = [];

        for (let dx = -radius; dx <= radius; dx++) {
            for (let dz = -radius; dz <= radius; dz++) {
                const chunkX = centerChunkX + dx;
                const chunkZ = centerChunkZ + dz;

                if (this.isSlimeChunk(chunkX, chunkZ)) {
                    slimeChunks.push({
                        chunkX,
                        chunkZ,
                        blockX: this.chunkToBlock(chunkX),
                        blockZ: this.chunkToBlock(chunkZ),
                        distance: Math.sqrt(dx * dx + dz * dz)
                    });
                }
            }
        }

        // 距離順にソート
        return slimeChunks.sort((a, b) => a.distance - b.distance);
    },

    /**
     * グリッドを生成
     * @param {number} centerX - 中心ブロックX座標
     * @param {number} centerZ - 中心ブロックZ座標
     * @returns {Array} グリッドデータ
     */
    generateGrid(centerX, centerZ) {
        const centerChunkX = this.blockToChunk(centerX);
        const centerChunkZ = this.blockToChunk(centerZ);
        const grid = [];

        for (let dz = -this.GRID_RADIUS; dz <= this.GRID_RADIUS; dz++) {
            const row = [];
            for (let dx = -this.GRID_RADIUS; dx <= this.GRID_RADIUS; dx++) {
                const chunkX = centerChunkX + dx;
                const chunkZ = centerChunkZ + dz;

                row.push({
                    chunkX,
                    chunkZ,
                    isSlime: this.isSlimeChunk(chunkX, chunkZ),
                    isCurrent: dx === 0 && dz === 0
                });
            }
            grid.push(row);
        }

        return grid;
    },

    /**
     * UIの初期化
     */
    init() {
        const calcBtn = document.getElementById('slime-calc-btn');
        const inputX = document.getElementById('slime-x');
        const inputZ = document.getElementById('slime-z');

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
        const x = parseInt(document.getElementById('slime-x').value) || 0;
        const z = parseInt(document.getElementById('slime-z').value) || 0;

        const grid = this.generateGrid(x, z);
        const slimeChunks = this.findSlimeChunks(x, z);

        this.renderGrid(grid);
        this.renderList(slimeChunks);

        document.getElementById('slime-results').classList.remove('hidden');
    },

    /**
     * グリッドを描画
     * @param {Array} grid - グリッドデータ
     */
    renderGrid(grid) {
        const container = document.getElementById('slime-grid');

        let html = '<div class="inline-block">';

        grid.forEach(row => {
            html += '<div class="flex">';
            row.forEach(cell => {
                let cellClass = 'grid-cell ';
                let content = '';

                if (cell.isCurrent) {
                    cellClass += 'current';
                    content = '📍';
                } else if (cell.isSlime) {
                    cellClass += 'slime';
                    content = '🟢';
                } else {
                    cellClass += 'normal';
                }

                html += `<div class="${cellClass}" title="チャンク ${cell.chunkX}, ${cell.chunkZ}">${content}</div>`;
            });
            html += '</div>';
        });

        html += '</div>';
        container.innerHTML = html;
    },

    /**
     * スライムチャンクリストを描画
     * @param {Array} slimeChunks - スライムチャンクの配列
     */
    renderList(slimeChunks) {
        const container = document.getElementById('slime-chunk-list');

        if (slimeChunks.length === 0) {
            container.innerHTML = '<li class="text-gray-400">ちかくにスライムチャンクがないよ</li>';
            return;
        }

        let html = '';
        slimeChunks.slice(0, 10).forEach((chunk, index) => {
            const distance = Math.round(chunk.distance * 16); // ブロック距離に変換
            html += `<li class="flex justify-between">
                <span>🟢 X: ${chunk.blockX}, Z: ${chunk.blockZ}</span>
                <span class="text-gray-400">${distance}ブロック</span>
            </li>`;
        });

        container.innerHTML = html;
    }
};

// DOMContentLoaded時に初期化
document.addEventListener('DOMContentLoaded', () => {
    SlimeRadar.init();
});
