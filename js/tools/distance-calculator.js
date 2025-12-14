/**
 * BedrockMate 2025 - 距離計算ツール
 * Distance Calculator Tool
 */

const DistanceCalculator = {
    // 移動速度（ブロック/秒）
    SPEEDS: {
        walk: 4.317,          // 通常歩行
        sprint: 5.612,        // ダッシュ
        boat: 8.0,            // ボート
        horse: 9.8,           // 馬（平均）
        elytraGlide: 33.5,    // エリトラ（滑空）
        elytraRocket: 67.5    // エリトラ（ロケット使用）
    },

    /**
     * 2点間の3D距離を計算
     * @param {number} x1 - 始点X
     * @param {number} y1 - 始点Y
     * @param {number} z1 - 始点Z
     * @param {number} x2 - 終点X
     * @param {number} y2 - 終点Y
     * @param {number} z2 - 終点Z
     * @returns {number} 距離（ブロック）
     */
    calculate3DDistance(x1, y1, z1, x2, y2, z2) {
        return Math.sqrt(
            Math.pow(x2 - x1, 2) +
            Math.pow(y2 - y1, 2) +
            Math.pow(z2 - z1, 2)
        );
    },

    /**
     * 2点間の2D距離を計算（水平距離）
     * @param {number} x1 - 始点X
     * @param {number} z1 - 始点Z
     * @param {number} x2 - 終点X
     * @param {number} z2 - 終点Z
     * @returns {number} 距離（ブロック）
     */
    calculate2DDistance(x1, z1, x2, z2) {
        return Math.sqrt(
            Math.pow(x2 - x1, 2) +
            Math.pow(z2 - z1, 2)
        );
    },

    /**
     * 移動時間を計算
     * @param {number} distance - 距離（ブロック）
     * @param {number} speed - 速度（ブロック/秒）
     * @returns {object} 時間情報
     */
    calculateTravelTime(distance, speed) {
        const seconds = distance / speed;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.round(seconds % 60);

        if (minutes >= 60) {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            return {
                seconds: Math.round(seconds),
                display: `${hours}時間${remainingMinutes}分`
            };
        } else if (minutes > 0) {
            return {
                seconds: Math.round(seconds),
                display: `${minutes}分${remainingSeconds}秒`
            };
        } else {
            return {
                seconds: Math.round(seconds),
                display: `${remainingSeconds}秒`
            };
        }
    },

    /**
     * 全ての移動時間を計算
     * @param {number} distance - 距離（ブロック）
     * @returns {object} 各移動手段の時間
     */
    calculateAllTravelTimes(distance) {
        return {
            walk: this.calculateTravelTime(distance, this.SPEEDS.walk),
            sprint: this.calculateTravelTime(distance, this.SPEEDS.sprint),
            boat: this.calculateTravelTime(distance, this.SPEEDS.boat),
            horse: this.calculateTravelTime(distance, this.SPEEDS.horse),
            elytraGlide: this.calculateTravelTime(distance, this.SPEEDS.elytraGlide),
            elytraRocket: this.calculateTravelTime(distance, this.SPEEDS.elytraRocket)
        };
    },

    /**
     * 方角を計算
     * @param {number} x1 - 始点X
     * @param {number} z1 - 始点Z
     * @param {number} x2 - 終点X
     * @param {number} z2 - 終点Z
     * @returns {string} 方角
     */
    calculateDirection(x1, z1, x2, z2) {
        const angle = Math.atan2(z2 - z1, x2 - x1) * (180 / Math.PI);

        // Minecraftでは北がZ-方向
        // 角度を8方向に変換
        const directions = ['東', '南東', '南', '南西', '西', '北西', '北', '北東'];
        const index = Math.round(((angle + 180) / 45)) % 8;

        return directions[index];
    },

    /**
     * UIの初期化
     */
    init() {
        const calcBtn = document.getElementById('dist-calc-btn');

        if (!calcBtn) return;

        // 計算ボタンのクリックイベント
        calcBtn.addEventListener('click', () => {
            this.calculateAndDisplay();
        });

        // Enterキーでも計算
        const inputs = [
            'dist-from-x', 'dist-from-y', 'dist-from-z',
            'dist-to-x', 'dist-to-y', 'dist-to-z'
        ];

        inputs.forEach(id => {
            const input = document.getElementById(id);
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
        const fromX = parseInt(document.getElementById('dist-from-x').value) || 0;
        const fromY = parseInt(document.getElementById('dist-from-y').value) || 64;
        const fromZ = parseInt(document.getElementById('dist-from-z').value) || 0;
        const toX = parseInt(document.getElementById('dist-to-x').value) || 0;
        const toY = parseInt(document.getElementById('dist-to-y').value) || 64;
        const toZ = parseInt(document.getElementById('dist-to-z').value) || 0;

        const distance3D = this.calculate3DDistance(fromX, fromY, fromZ, toX, toY, toZ);
        const distance2D = this.calculate2DDistance(fromX, fromZ, toX, toZ);
        const times = this.calculateAllTravelTimes(distance3D);
        const direction = this.calculateDirection(fromX, fromZ, toX, toZ);

        // 結果を表示
        document.getElementById('result-distance').textContent =
            `${Math.round(distance3D).toLocaleString()}`;
        document.getElementById('result-walk').textContent = times.walk.display;
        document.getElementById('result-elytra').textContent = times.elytraRocket.display;

        // 結果コンテナを表示
        document.getElementById('dist-results').classList.remove('hidden');
    }
};

// DOMContentLoaded時に初期化
document.addEventListener('DOMContentLoaded', () => {
    DistanceCalculator.init();
});
