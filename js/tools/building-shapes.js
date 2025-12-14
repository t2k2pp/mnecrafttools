/**
 * BedrockMate 2025 - 建築ヘルパー（形状ジェネレーター）
 * Building Shapes Generator Tool
 */

const BuildingShapes = {
    // 現在の形状タイプ
    currentShape: 'circle',

    // 球体のレイヤー管理
    sphereLayers: [],
    currentLayerIndex: 0,

    /**
     * 円を生成（Bresenham's circle algorithm）
     * @param {number} radius - 半径
     * @returns {Array} 円の座標配列
     */
    generateCircle(radius) {
        const points = new Set();

        // Bresenham's circle algorithm
        let x = 0;
        let y = radius;
        let d = 3 - 2 * radius;

        const addSymmetricPoints = (cx, cy) => {
            // 8方向の対称点を追加
            points.add(`${cx},${cy}`);
            points.add(`${-cx},${cy}`);
            points.add(`${cx},${-cy}`);
            points.add(`${-cx},${-cy}`);
            points.add(`${cy},${cx}`);
            points.add(`${-cy},${cx}`);
            points.add(`${cy},${-cx}`);
            points.add(`${-cy},${-cx}`);
        };

        while (y >= x) {
            addSymmetricPoints(x, y);
            x++;

            if (d > 0) {
                y--;
                d = d + 4 * (x - y) + 10;
            } else {
                d = d + 4 * x + 6;
            }
        }

        // 塗りつぶし円に変換
        const filledPoints = [];
        for (let py = -radius; py <= radius; py++) {
            for (let px = -radius; px <= radius; px++) {
                if (px * px + py * py <= radius * radius) {
                    filledPoints.push({ x: px, y: py });
                }
            }
        }

        return filledPoints;
    },

    /**
     * 円の輪郭のみを生成
     * @param {number} radius - 半径
     * @returns {Array} 円の輪郭座標配列
     */
    generateCircleOutline(radius) {
        const points = [];

        for (let py = -radius; py <= radius; py++) {
            for (let px = -radius; px <= radius; px++) {
                const distSq = px * px + py * py;
                const innerRadius = radius - 0.5;
                const outerRadius = radius + 0.5;

                if (distSq >= innerRadius * innerRadius && distSq <= outerRadius * outerRadius) {
                    points.push({ x: px, y: py });
                }
            }
        }

        return points;
    },

    /**
     * 球体を生成
     * @param {number} radius - 半径
     * @returns {Array} 各レイヤーの座標配列
     */
    generateSphere(radius) {
        const layers = [];

        for (let y = -radius; y <= radius; y++) {
            const layerPoints = [];
            // このY座標での円の半径を計算
            const layerRadiusSq = radius * radius - y * y;

            if (layerRadiusSq < 0) continue;

            const layerRadius = Math.sqrt(layerRadiusSq);

            for (let z = -radius; z <= radius; z++) {
                for (let x = -radius; x <= radius; x++) {
                    const distSq = x * x + y * y + z * z;

                    // 球体の表面上のブロックのみを追加
                    if (distSq <= radius * radius && distSq > (radius - 1) * (radius - 1)) {
                        layerPoints.push({ x, z });
                    }
                }
            }

            if (layerPoints.length > 0) {
                layers.push({
                    y,
                    points: layerPoints,
                    radius: Math.round(layerRadius)
                });
            }
        }

        return layers;
    },

    /**
     * 塗りつぶし球体を生成
     * @param {number} radius - 半径
     * @returns {Array} 各レイヤーの座標配列
     */
    generateFilledSphere(radius) {
        const layers = [];

        for (let y = -radius; y <= radius; y++) {
            const layerPoints = [];

            for (let z = -radius; z <= radius; z++) {
                for (let x = -radius; x <= radius; x++) {
                    const distSq = x * x + y * y + z * z;

                    if (distSq <= radius * radius) {
                        layerPoints.push({ x, z });
                    }
                }
            }

            if (layerPoints.length > 0) {
                layers.push({
                    y,
                    points: layerPoints
                });
            }
        }

        return layers;
    },

    /**
     * 楕円を生成
     * @param {number} rx - X方向の半径
     * @param {number} ry - Y方向の半径
     * @returns {Array} 楕円の座標配列
     */
    generateEllipse(rx, ry) {
        const points = [];

        for (let py = -ry; py <= ry; py++) {
            for (let px = -rx; px <= rx; px++) {
                // 楕円方程式: (x/a)² + (y/b)² <= 1
                const value = (px * px) / (rx * rx) + (py * py) / (ry * ry);

                if (value <= 1) {
                    points.push({ x: px, y: py });
                }
            }
        }

        return points;
    },

    /**
     * ブロック数をカウント
     * @param {Array} points - 座標配列
     * @returns {number} ブロック数
     */
    countBlocks(points) {
        if (Array.isArray(points[0]?.points)) {
            // 球体の場合（レイヤー配列）
            return points.reduce((sum, layer) => sum + layer.points.length, 0);
        }
        return points.length;
    },

    /**
     * グリッドを描画
     * @param {Array} points - 座標配列
     * @param {number} radius - 半径（グリッドサイズ用）
     * @param {string} containerId - コンテナのID
     */
    renderGrid(points, radius, containerId = 'shape-grid') {
        const container = document.getElementById(containerId);
        const size = radius * 2 + 1;

        // ポイントをセットに変換
        const pointSet = new Set(points.map(p => `${p.x},${p.y}`));

        let html = '<div class="inline-block">';

        for (let y = -radius; y <= radius; y++) {
            html += '<div class="flex">';
            for (let x = -radius; x <= radius; x++) {
                const key = `${x},${y}`;
                let cellClass = 'shape-cell ';

                if (x === 0 && y === 0) {
                    cellClass += 'center';
                } else if (pointSet.has(key)) {
                    cellClass += 'filled';
                } else {
                    cellClass += 'empty';
                }

                html += `<div class="${cellClass}"></div>`;
            }
            html += '</div>';
        }

        html += '</div>';
        container.innerHTML = html;
    },

    /**
     * 球体のレイヤーを描画
     * @param {number} layerIndex - レイヤーインデックス
     */
    renderSphereLayer(layerIndex) {
        if (!this.sphereLayers.length) return;

        layerIndex = Math.max(0, Math.min(layerIndex, this.sphereLayers.length - 1));
        this.currentLayerIndex = layerIndex;

        const layer = this.sphereLayers[layerIndex];
        const radius = Math.ceil(Math.sqrt(this.sphereLayers.length));

        // ポイントを2D形式に変換
        const points = layer.points.map(p => ({ x: p.x, y: p.z }));

        this.renderGrid(points, radius + 2, 'sphere-layer-grid');
        document.getElementById('current-layer').textContent =
            `Y=${layer.y} (${layerIndex + 1}/${this.sphereLayers.length})`;
    },

    /**
     * UIの初期化
     */
    init() {
        const generateBtn = document.getElementById('shape-generate-btn');
        const shapeTypeBtns = document.querySelectorAll('.shape-type-btn');
        const layerPrev = document.getElementById('layer-prev');
        const layerNext = document.getElementById('layer-next');

        if (!generateBtn) return;

        // 形状タイプ切り替え
        shapeTypeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                shapeTypeBtns.forEach(b => {
                    b.classList.remove('active');
                    b.classList.add('bg-mc-stone');
                });
                btn.classList.add('active');
                btn.classList.remove('bg-mc-stone');

                this.currentShape = btn.dataset.shape;
                this.updateInputVisibility();
            });
        });

        // 生成ボタン
        generateBtn.addEventListener('click', () => {
            this.generateAndDisplay();
        });

        // レイヤー切り替え
        if (layerPrev) {
            layerPrev.addEventListener('click', () => {
                this.renderSphereLayer(this.currentLayerIndex - 1);
            });
        }

        if (layerNext) {
            layerNext.addEventListener('click', () => {
                this.renderSphereLayer(this.currentLayerIndex + 1);
            });
        }
    },

    /**
     * 入力フィールドの表示を更新
     */
    updateInputVisibility() {
        document.getElementById('shape-circle-inputs').classList.add('hidden');
        document.getElementById('shape-sphere-inputs').classList.add('hidden');
        document.getElementById('shape-ellipse-inputs').classList.add('hidden');
        document.getElementById(`shape-${this.currentShape}-inputs`).classList.remove('hidden');
    },

    /**
     * 生成して表示
     */
    generateAndDisplay() {
        let points;
        let radius;
        let blockCount;

        switch (this.currentShape) {
            case 'circle':
                radius = parseInt(document.getElementById('circle-radius').value) || 5;
                radius = Math.min(50, Math.max(1, radius));
                points = this.generateCircle(radius);
                blockCount = points.length;
                this.renderGrid(points, radius);
                document.getElementById('sphere-layers').classList.add('hidden');
                break;

            case 'sphere':
                radius = parseInt(document.getElementById('sphere-radius').value) || 5;
                radius = Math.min(30, Math.max(1, radius));
                this.sphereLayers = this.generateSphere(radius);
                blockCount = this.countBlocks(this.sphereLayers);

                // 中央レイヤーを表示
                const centerIndex = Math.floor(this.sphereLayers.length / 2);
                this.renderSphereLayer(centerIndex);

                // グリッドには全体像を表示
                const allPoints = [];
                this.sphereLayers.forEach(layer => {
                    layer.points.forEach(p => {
                        allPoints.push({ x: p.x, y: p.z });
                    });
                });
                this.renderGrid(allPoints, radius, 'shape-grid');
                document.getElementById('sphere-layers').classList.remove('hidden');
                break;

            case 'ellipse':
                const rx = parseInt(document.getElementById('ellipse-rx').value) || 7;
                const ry = parseInt(document.getElementById('ellipse-ry').value) || 4;
                radius = Math.max(rx, ry);
                points = this.generateEllipse(
                    Math.min(50, Math.max(1, rx)),
                    Math.min(50, Math.max(1, ry))
                );
                blockCount = points.length;
                this.renderGrid(points, radius);
                document.getElementById('sphere-layers').classList.add('hidden');
                break;
        }

        document.getElementById('block-count').textContent = blockCount.toLocaleString();
        document.getElementById('shape-results').classList.remove('hidden');
    }
};

// DOMContentLoaded時に初期化
document.addEventListener('DOMContentLoaded', () => {
    BuildingShapes.init();
});
