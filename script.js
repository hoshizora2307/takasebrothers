// ===============================================
// game.js - Starry Navigator: 星屑のプログラマーと宇宙の記憶
// ===============================================

// --- キャンバスとコンテキストの初期化 ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 画面サイズ設定（スマホ向けに横長にするが、縦画面でも表示可能にする）
// 比率を固定し、ウィンドウサイズに合わせて調整する
const GAME_WIDTH = 800;
const GAME_HEIGHT = 450; // 16:9 の比率
let scale = 1; // スケールファクター

function resizeCanvas() {
    const windowRatio = window.innerWidth / window.innerHeight;
    const gameRatio = GAME_WIDTH / GAME_HEIGHT;

    if (windowRatio < gameRatio) {
        // ウィンドウがゲームより縦長の場合、幅に合わせる
        canvas.width = window.innerWidth;
        canvas.height = window.innerWidth / gameRatio;
    } else {
        // ウィンドウがゲームより横長の場合、高さに合わせる
        canvas.height = window.innerHeight;
        canvas.width = window.innerHeight * gameRatio;
    }
    scale = canvas.width / GAME_WIDTH; // スケールファクターを更新
    ctx.imageSmoothingEnabled = false; // ピクセルアートをぼかさない
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // 初回ロード時にもサイズ調整

// --- ゲーム設定 ---
const PLAYER_SPEED = 5; // プレイヤーの移動速度
const GRAVITY = 0.5;    // 重力
const JUMP_POWER = 10;  // ジャンプ力
const TILE_SIZE = 32;   // タイルのサイズ（ピクセルアートの基準）

// --- アセットの読み込み (画像) ---
// 実際には画像パスを指定し、ロード完了後にゲームを開始する処理が必要
// 今回は簡略化のため、色で表現
const assets = {
    player: { color: '#00FF00', width: TILE_SIZE, height: TILE_SIZE * 1.5 }, // 緑色のプレイヤー
    backgroundLayer1: { color: '#220044', speed: 0.5 }, // 奥の背景 (ゆっくり動く)
    backgroundLayer2: { color: '#440088', speed: 1.0 }, // 中間の背景
    backgroundLayer3: { color: '#6600CC', speed: 2.0 }, // 手前の背景 (速く動く)
    platform: { color: '#AAAAAA' } // プラットフォーム
};

// --- ゲームオブジェクト ---

// プレイヤー
const player = {
    x: 50,
    y: GAME_HEIGHT - assets.player.height - TILE_SIZE * 2, // 地面より少し上に配置
    width: assets.player.width,
    height: assets.player.height,
    dx: 0, // X方向の速度
    dy: 0, // Y方向の速度
    onGround: false // 地面にいるか
};

// 背景レイヤー
const backgroundLayers = [
    { x: 0, y: 0, width: GAME_WIDTH, height: GAME_HEIGHT, color: assets.backgroundLayer1.color, speed: assets.backgroundLayer1.speed },
    { x: 0, y: 0, width: GAME_WIDTH, height: GAME_HEIGHT, color: assets.backgroundLayer2.color, speed: assets.backgroundLayer2.speed },
    { x: 0, y: 0, width: GAME_WIDTH, height: GAME_HEIGHT, color: assets.backgroundLayer3.color, speed: assets.backgroundLayer3.speed }
];

// プラットフォーム（仮の地面）
const platforms = [
    { x: 0, y: GAME_HEIGHT - TILE_SIZE, width: GAME_WIDTH, height: TILE_SIZE, color: assets.platform.color }, // 地面
    { x: GAME_WIDTH * 0.5, y: GAME_HEIGHT - TILE_SIZE * 4, width: TILE_SIZE * 5, height: TILE_SIZE, color: assets.platform.color } // 浮島
];


// --- 入力ハンドリング (タッチ/キーボード) ---
let keys = {}; // 押されているキーを管理
let touchControls = {
    left: false,
    right: false,
    jump: false,
    jumpTouchIdentifier: null // ジャンプに使われたタッチID
};

// キーボード入力 (デバッグ用やPCでのテスト用)
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
});
window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// タッチ入力
canvas.addEventListener('touchstart', handleTouchStart, false);
canvas.addEventListener('touchend', handleTouchEnd, false);
canvas.addEventListener('touchcancel', handleTouchEnd, false);
canvas.addEventListener('touchmove', handleTouchMove, false);

function handleTouchStart(e) {
    e.preventDefault(); // デフォルトのスクロールなどを防止
    const touches = e.changedTouches;

    for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        const touchX = (touch.clientX - canvas.getBoundingClientRect().left) / scale; // キャンバス座標に変換
        const touchY = (touch.clientY - canvas.getBoundingClientRect().top) / scale; // キャンバス座標に変換

        // 画面の左半分をタッチ: 左移動
        if (touchX < GAME_WIDTH / 2 && touchY > GAME_HEIGHT / 3) { // 上部はジャンプボタンにするので除外
            touchControls.left = true;
        }
        // 画面の右半分をタッチ: 右移動
        else if (touchX >= GAME_WIDTH / 2 && touchY > GAME_HEIGHT / 3) {
            touchControls.right = true;
        }
        // 画面の上部をタッチ: ジャンプ
        if (touchY < GAME_HEIGHT / 3 && !touchControls.jump) { // 上部1/3をジャンプエリアに
            touchControls.jump = true;
            touchControls.jumpTouchIdentifier = touch.identifier; // ジャンプに使われたタッチを記録
        }
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    const touches = e.changedTouches;

    for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        const touchX = (touch.clientX - canvas.getBoundingClientRect().left) / scale;
        const touchY = (touch.clientY - canvas.getBoundingClientRect().top) / scale;

        // 画面の左半分を離した
        if (touchX < GAME_WIDTH / 2 && touchY > GAME_HEIGHT / 3) {
            touchControls.left = false;
        }
        // 画面の右半分を離した
        else if (touchX >= GAME_WIDTH / 2 && touchY > GAME_HEIGHT / 3) {
            touchControls.right = false;
        }
        // ジャンプに使われたタッチが離された場合
        if (touch.identifier === touchControls.jumpTouchIdentifier) {
            touchControls.jump = false;
            touchControls.jumpTouchIdentifier = null;
        }
    }
}

function handleTouchMove(e) {
    // スワイプで移動、タップでジャンプのような複雑な操作は今後の課題
    // 現状はtouchstart/touchendで十分
}


// --- ゲームの更新 (update) ---
function update() {
    // プレイヤーの左右移動
    player.dx = 0;
    if (keys['ArrowLeft'] || touchControls.left) {
        player.dx = -PLAYER_SPEED;
    }
    if (keys['ArrowRight'] || touchControls.right) {
        player.dx = PLAYER_SPEED;
    }

    player.x += player.dx;

    // プレイヤーのジャンプと重力
    if ((keys['Space'] || touchControls.jump) && player.onGround) {
        player.dy = -JUMP_POWER;
        player.onGround = false;
        touchControls.jump = false; // ジャンプ入力は一度消費
    }
    player.dy += GRAVITY;
    player.y += player.dy;

    // 画面外に出ないように制限
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > GAME_WIDTH) player.x = GAME_WIDTH - player.width;

    // 地面との衝突判定
    player.onGround = false;
    platforms.forEach(platform => {
        if (checkCollision(player, platform)) {
            // プレイヤーが上からプラットフォームに着地した場合
            if (player.dy > 0 && player.y + player.height - player.dy <= platform.y) {
                player.y = platform.y - player.height;
                player.dy = 0;
                player.onGround = true;
            }
            // 横からの衝突や下からの衝突は今回は無視（より複雑な判定が必要）
        }
    });


    // 背景のスクロール
    backgroundLayers.forEach(layer => {
        layer.x -= layer.speed; // 左にスクロール
        // 画面外に出たらループさせる
        if (layer.x <= -GAME_WIDTH) {
            layer.x = 0;
        }
    });
}

// AABB衝突判定 (Axis-Aligned Bounding Box)
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}


// --- ゲームの描画 (draw) ---
function draw() {
    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // スケールを適用
    ctx.save();
    ctx.scale(scale, scale);

    // 背景の描画 (無限スクロール)
    backgroundLayers.forEach(layer => {
        ctx.fillStyle = layer.color;
        ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
        // 画面外に出た分を補完して無限に見えるようにする
        ctx.fillRect(layer.x + layer.width, layer.y, layer.width, layer.height);
    });

    // プラットフォームの描画
    platforms.forEach(platform => {
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    });

    // プレイヤーの描画
    ctx.fillStyle = assets.player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // スケールを元に戻す
    ctx.restore();
}


// --- ゲームループ ---
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop); // 次の描画タイミングで再実行
}

// ゲーム開始
gameLoop();
