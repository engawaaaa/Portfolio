/* =========================================
   1) 設定・定数
   ========================================= 
   画面サイズや難易度名を設定
   */
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const PLAYER_SIZE = 40;

/*難易度の定義
 EASY:0 NORMAL:1 HARD:2 
*/
const Difficulty = {
  EASY: 0,
  NORMAL: 1,
  HARD: 2
} as const;

//オブジェクトから型を生成
type Difficulty = typeof Difficulty[keyof typeof Difficulty];

//画面表示用の文字ラベル
const DifficultyLabels = ["EASY", "NORMAL", "HARD"];

// アイテムの種類定義
const ItemType = {
  SPEED: 0,  // 移動速度アップ (青)
  RAPID: 1,  // 連射速度アップ (赤)
  WIDE: 2,   // ワイドショット (黄)
  SHIELD: 3, // シールド (緑)
  LIFE: 4    // 残機アップ (ピンク)
} as const;
type ItemType = typeof ItemType[keyof typeof ItemType];

//座標を扱うための共通の型定義
interface Position {
  x: number;
  y: number;
}

/* =========================================
   2) キーの入力管理
   ========================================= */
class InputManager {
  //押されているキーの状態を保持
  private keys: { [key: string]: boolean } = {};
  
  constructor() {
    //キーを押したときと話したときのイベントを登録
    window.addEventListener("keydown", (e) => this.keys[e.code] = true);
    window.addEventListener("keyup", (e) => this.keys[e.code] = false);
  }
//指定したキーが押されているかを返す
  isDown(code: string): boolean {
    return !!this.keys[code];
  }
}

/* =========================================
   3) 描画管理
   ========================================= */
class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.ctx.imageSmoothingEnabled = false;
  }

  //画面全体をクリア
  clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
  //四角形を塗りつぶす
  fillRect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, h);
  }
  //四角形の枠を描画
  strokeRect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, w, h);
  }
  // 円の枠を描画（シールド用）
  strokeCircle(x: number, y: number, radius: number, color: string): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.stroke();
  }
  //画像を描画
  drawImage(image: HTMLImageElement, x: number, y: number, w: number, h: number): void {
    this.ctx.drawImage(image, x, y, w, h);
  }
  //文字を中央揃えで描画
  drawTextCenter(text: string, size: number, color: string, y: number): void {
    this.ctx.font = `${size}px sans-serif`;
    this.ctx.fillStyle = color;
    this.ctx.textAlign = "center";
    this.ctx.fillText(text, this.width / 2, y);
  }
  //文字を左揃えで描画
  drawTextLeft(text: string, size: number, color: string, x: number, y: number): void {
    this.ctx.font = `${size}px sans-serif`;
    this.ctx.fillStyle = color;
    this.ctx.textAlign = "left";
    this.ctx.fillText(text, x, y);
  }
  //文字を右揃えで描画
  drawTextRight(text: string, size: number, color: string, x: number, y: number): void {
    this.ctx.font = `${size}px sans-serif`;
    this.ctx.fillStyle = color;
    this.ctx.textAlign = "right";
    this.ctx.fillText(text, x, y);
  }

  getWidth(): number { return this.width; }
  getHeight(): number { return this.height; }
}


/* =========================================
   4) 素材管理
   ========================================= */
class ResourceManager {
  static playerImage: HTMLImageElement;
  static enemyImages: HTMLImageElement[] = [];
  static bossImages: HTMLImageElement[] = [];
  static bulletPImage: HTMLImageElement;
  static bulletEImage: HTMLImageElement;
  static itemImages: HTMLImageElement[] = []; // アイテム画像

  //すべての画像を読み込む
  static async loadAll(): Promise<void> {
    //プレイヤー画像の読み込み
    this.playerImage = await this.loadImage('/player.png');
    
    //敵画像の読み込み
    for (let i = 1; i <= 5; i++) {
      this.enemyImages.push(await this.loadImage(`/enemy${i}.png`));
    }

    //ボス画像の読み込み
    for (let i = 1; i <= 5; i++) {
      this.bossImages.push(await this.loadImage(`/boss${i}.png`));
    }

    //弾画像の読み込み
    this.bulletPImage = await this.loadImage('/bulletP.png');
    this.bulletEImage = await this.loadImage('/bulletE.png');

    // 0:Speed, 1:Rapid, 2:Wide, 3:Shield, 4:Life
    for (let i = 1; i <= 5; i++) {
        this.itemImages.push(await this.loadImage(`/powerup${i}.png`));
    }
  }

  private static loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous"; 
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  }
}

/* =========================================
   5) 基底クラス・弾クラス・アイテムクラス
   ========================================= */
   //ゲームの状態を表すインターフェース
interface IGameState {
  update(): void; //計算処理
  draw(): void; //描画処理
}
//状態の基本クラス
abstract class StateBase implements IGameState {
  protected game: ShooterGame;
  constructor(game: ShooterGame) { this.game = game; }
  abstract update(): void;
  abstract draw(): void;
}
/*ゲームオブジェクトの基底クラス
*画面上に表示されて動くすべてのオブジェクトの親クラス
*共通のプロパティ（位置、サイズ、画像、当たり判定など）を持つ
*/
abstract class GameObject {
  pos: Position;
  width: number;
  height: number;
  color: string;
  //画面内に存在するかどうか
  isActive: boolean = true;
  hp: number = 1;
  maxHp: number = 1;
  image: HTMLImageElement | null = null;
  //当たり判定の大きさの倍率（見た目より少し小さい）
  hitAreaScale: number = 0.8; 

  constructor(x: number, y: number, w: number, h: number, color: string, image?: HTMLImageElement) {
    this.pos = { x, y };
    this.width = w;
    this.height = h;
    this.color = color;
    if (image) this.image = image;
  }
  //描画処理
  draw(renderer: CanvasRenderer): void {
    if (this.image) {
        renderer.drawImage(this.image, this.pos.x, this.pos.y, this.width, this.height);
    } else {
      //画像がない場合は四角形で代用
        renderer.fillRect(this.pos.x, this.pos.y, this.width, this.height, this.color);
    }
    //デバッグモード時、当たり判定の枠を緑色で表示
    if (ShooterGame.debugMode) {
      const hit = this.getHitBox();
      renderer.strokeRect(hit.x, hit.y, hit.w, hit.h, "lime");
    }
  }
  //更新処理（子クラスで具体的に実装）
  abstract update(): void;

  //中心座標を取得
  getCenter(): Position {
    return { x: this.pos.x + this.width / 2, y: this.pos.y + this.height / 2 };
  }

  //当たり判定領域の計算
  getHitBox() {
    const hitW = this.width * this.hitAreaScale;
    const hitH = this.height * this.hitAreaScale;
    const hitX = this.pos.x + (this.width - hitW) / 2;
    const hitY = this.pos.y + (this.height - hitH) / 2;
    return { x: hitX, y: hitY, w: hitW, h: hitH };
  }
  //衝突判定
  isColliding(other: GameObject): boolean {
    const a = this.getHitBox();
    const b = other.getHitBox();

    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }
}
//弾クラス
class Bullet extends GameObject {
  vx: number; //ｘ方向の速度
  vy: number; //ｙ方向の速度
  isEnemy: boolean; //敵の弾かどうかの判定

  constructor(x: number, y: number, vx: number, vy: number, isEnemy: boolean) {
    //敵の弾かどうかで画像を切り替え
    const image = isEnemy ? ResourceManager.bulletEImage : ResourceManager.bulletPImage;
    const w = 24;
    const h = 24;
    const c = isEnemy ? "orange" : "white";
    
    super(x, y, w, h, c, image);
    this.vx = vx;
    this.vy = vy;
    this.isEnemy = isEnemy;
    this.hitAreaScale = 0.5; 
  }

  update(): void {
    //速度分だけ移動
    this.pos.x += this.vx;
    this.pos.y += this.vy;
    //画面外に出たら非アクティブにする
    if (this.pos.y < -20 || this.pos.y > CANVAS_HEIGHT + 20 ||
        this.pos.x < -20 || this.pos.x > CANVAS_WIDTH + 20) {
      this.isActive = false;
    }
  }
}

// アイテムクラス
class Item extends GameObject {
    type: ItemType;
    vy: number = 2; // 落下速度

    constructor(x: number, y: number, type: ItemType) {
        const image = ResourceManager.itemImages[type];
        // アイテムのサイズを 20x20 から 30x30 に変更
        super(x, y, 30, 30, "white", image);
        this.type = type;
        this.hitAreaScale = 1.0; // 拾いやすく100%
    }

    update(): void {
        this.pos.y += this.vy;
        // 画面外に出たら消える
        if (this.pos.y > CANVAS_HEIGHT) {
            this.isActive = false;
        }
    }
}

/* =========================================
   6) キャラクタークラス (Player)
   ========================================= */
class Player extends GameObject {
  private baseSpeed: number = 5; // 基本速度
  private input: InputManager;
  private game: ShooterGame;
  //連射制限用タイマー
  private cooldown: number = 0;
  
  // パワーアップ状態管理
  speedLevel: number = 0;
  fireRateLevel: number = 0;
  hasWideShot: boolean = false;
  hasShield: boolean = false;

  constructor(game: ShooterGame) {
    super(
      //画面中央下に配置
      CANVAS_WIDTH / 2 - PLAYER_SIZE / 2,
      CANVAS_HEIGHT - PLAYER_SIZE - 20,
      PLAYER_SIZE, PLAYER_SIZE, "cyan",
      ResourceManager.playerImage
    );
    this.game = game;
    this.input = game.getInput();
    //判定の調整
    this.hitAreaScale = 0.3;
  }

  // アイテム取得時の効果適用
  powerUp(type: ItemType): void {
      switch(type) {
          case ItemType.SPEED:
              this.speedLevel++;
              break;
          case ItemType.RAPID:
              this.fireRateLevel++;
              break;
          case ItemType.WIDE:
              this.hasWideShot = true;
              break;
          case ItemType.SHIELD:
              this.hasShield = true;
              break;
          case ItemType.LIFE:
              this.game.addLife(); // 残機追加
              break;
      }
  }

  // シールド描画のためにdrawを拡張
  draw(renderer: CanvasRenderer): void {
      super.draw(renderer);
      // シールドがある場合、周りに円を描画
      if (this.hasShield) {
          const center = this.getCenter();
          renderer.strokeCircle(center.x, center.y, this.width/2 + 5, "cyan");
      }
  }

  update(): void {
    // 速度計算 (アイテム1つにつき+1)
    const currentSpeed = this.baseSpeed + this.speedLevel;

    //左右移動処理
    if (this.input.isDown("ArrowLeft")) {
      this.pos.x = Math.max(0, this.pos.x - currentSpeed);
    }
    if (this.input.isDown("ArrowRight")) {
      this.pos.x = Math.min(CANVAS_WIDTH - this.width, this.pos.x + currentSpeed);
    }
    
    //弾発射処理
    if (this.cooldown > 0) this.cooldown--;
    if (this.input.isDown("Space") && this.cooldown <= 0) {
      
      const bx = this.pos.x + this.width / 2 - 12;
      const by = this.pos.y;

      // 通常弾
      this.game.addBullet(new Bullet(bx, by, 0, -10, false));

      // ワイドショットがあれば斜め弾を追加
      if (this.hasWideShot) {
          this.game.addBullet(new Bullet(bx, by, -3, -9, false));
          this.game.addBullet(new Bullet(bx, by, 3, -9, false));
      }

      // 連射速度計算 (基本8F、レベルごとに1F短縮、最低4F)
      const interval = Math.max(4, 8 - this.fireRateLevel);
      this.cooldown = interval;
    }
  }
}

/* =========================================
   7) 敵クラス群(Enemies)
   ========================================= */
//敵の共通部分を定義した抽象クラス
abstract class Enemy extends GameObject {
  protected game: ShooterGame;
  protected speed: number;
  //弾を撃つ確率
  protected fireRate: number;
  //敵を倒したときのスコア
  public scoreValue: number = 0;
  
  constructor(game: ShooterGame, x: number, y: number, w: number, h: number, color: string, diff: Difficulty, image: HTMLImageElement) {
    super(x, y, w, h, color, image);
    this.game = game;
    //難易度によるパラメータ補正
    const mult = diff === Difficulty.HARD ? 1.5 : (diff === Difficulty.EASY ? 0.8 : 1.0);
    this.speed = 2 * mult;
    this.fireRate = 0.01 * mult; 
    this.hitAreaScale = 0.8;
  }

  //敵が弾を撃つヘルパーメソッド
  protected shoot(vx: number, vy: number): void {
    const bx = this.pos.x + this.width / 2 - 12;
    const by = this.pos.y + this.height;
    this.game.addBullet(new Bullet(bx, by, vx, vy, true));
  }

  // アイテムドロップ処理
  dropItem(): void {
      if (Math.random() < 0.2) {
          // アイテムの種類をランダム決定 (0~4)
          const type = Math.floor(Math.random() * 5) as ItemType;
          const center = this.getCenter();
          this.game.addItem(new Item(center.x - 15, center.y - 15, type));
      }
  }
}

//１．直進する敵
class BasicEnemy extends Enemy {
  constructor(game: ShooterGame, x: number, diff: Difficulty, image: HTMLImageElement, score: number) {
    super(game, x, -30, 30, 30, "red", diff, image);
    this.scoreValue = score;
    this.maxHp = this.hp; 
  }
  update(): void {
    //下に直進
    this.pos.y += this.speed;
    if (this.pos.y > CANVAS_HEIGHT) this.isActive = false;
    //たまに真下に弾を撃つ
    if (Math.random() < this.fireRate) this.shoot(0, this.speed + 3);
  }
}

//２．蛇行する敵
class WavyEnemy extends Enemy {
  private startX: number;
  private time: number = 0;
  constructor(game: ShooterGame, x: number, diff: Difficulty, image: HTMLImageElement, score: number) {
    super(game, x, -30, 25, 25, "magenta", diff, image);
    this.startX = x;
    this.speed = this.speed * 0.8;
    this.scoreValue = score;
    this.maxHp = this.hp;
  }
  update(): void {
    this.time += 0.05;
    this.pos.y += this.speed;
    //サイン波を使って左右に揺れる
    this.pos.x = this.startX + Math.sin(this.time) * 50; 
    if (this.pos.y > CANVAS_HEIGHT) this.isActive = false;
    if (Math.random() < this.fireRate * 0.5) this.shoot(0, 4);
  }
}

//３．拡散弾を撃つ敵
class SpreadEnemy extends Enemy {
  constructor(game: ShooterGame, x: number, diff: Difficulty, image: HTMLImageElement, score: number) {
    super(game, x, -30, 35, 35, "orange", diff, image);
    this.speed = this.speed * 0.6;
    //ＨＰを２に設定
    this.hp = 2;
    this.scoreValue = score;
    this.maxHp = this.hp;
  }
  update(): void {
    this.pos.y += this.speed;
    if (this.pos.y > CANVAS_HEIGHT) this.isActive = false;
    if (Math.random() < this.fireRate * 0.8) {
      //３方向に発射
      const bulletSpeed = 4;
      this.shoot(0, bulletSpeed);
      this.shoot(-2, bulletSpeed * 0.9);
      this.shoot(2, bulletSpeed * 0.9);
    }
  }
}

//４．狙撃する敵
class SniperEnemy extends Enemy {
  constructor(game: ShooterGame, x: number, diff: Difficulty, image: HTMLImageElement, score: number) {
    super(game, x, -30, 20, 20, "lime", diff, image);
    this.scoreValue = score;
    this.maxHp = this.hp;
  }
  update(): void {
    this.pos.y += this.speed;
    if (this.pos.y > CANVAS_HEIGHT) this.isActive = false;
    
    if (Math.random() < this.fireRate * 0.5) {
      const player = this.game.getPlayer();
      if (player) {
        //プレイヤーの位置への角度を計算して撃つ
        const dx = player.pos.x - this.pos.x;
        const dy = player.pos.y - this.pos.y;
        const angle = Math.atan2(dy, dx);
        const bSpeed = 3;
        this.shoot(Math.cos(angle) * bSpeed, Math.sin(angle) * bSpeed);
      }
    }
  }
}

//５．突撃する敵
class DasherEnemy extends Enemy {
  private timer: number = 0;
  constructor(game: ShooterGame, x: number, diff: Difficulty, image: HTMLImageElement, score: number) {
    super(game, x, -30, 25, 40, "white", diff, image);
    this.speed = 1;
    this.scoreValue = score;
    this.maxHp = this.hp;
  }
  update(): void {
    this.timer++;
    //一定時間経過後に急加速
    if (this.timer > 60) this.pos.y += 10;
    else this.pos.y += this.speed;
    if (this.pos.y > CANVAS_HEIGHT) this.isActive = false;
  }
}

//ボスクラス
class Boss extends Enemy {
  private moveDir: number = 1;
  constructor(game: ShooterGame, image: HTMLImageElement, diff: Difficulty) {
    super(game, CANVAS_WIDTH / 2 - 40, -100, 80, 80, "purple", Difficulty.HARD, image);
    
    //難易度にかかわらずＨＰは３０
    this.hp=30;
    this.maxHp=30;

    // 難易度に応じてボスの強さを変える
    if (diff === Difficulty.EASY) {
        this.fireRate = 0.05; // 攻撃頻度低下
        this.speed = 1.5; // 移動速度低下
    } else {
        this.fireRate = 0.1;
        this.speed = 2;
    }
    
    this.maxHp = this.hp;
    this.scoreValue = 100;
    this.hitAreaScale = 0.9;
  }

  //描画処理
  draw(renderer: CanvasRenderer): void {
    super.draw(renderer);

    //ＨＰばーの表示
    if (this.hp > 0) {
        const barWidth = this.width;
        const barHeight = 6;
        const gap = 10;
        const x = this.pos.x;
        const y = this.pos.y - gap - barHeight;

        //ＨＰ残量の割合
        const ratio = this.hp / this.maxHp;
        
        renderer.fillRect(x, y, barWidth, barHeight, "red");
        renderer.fillRect(x, y, barWidth * ratio, barHeight, "lime");
    }
  }

  update(): void {
    //画面上部からゆっくり降りてくる
    if (this.pos.y < 50) {
      this.pos.y += 2;
      return;
    }
    //左右に往復移動
    this.pos.x += this.speed * this.moveDir;
    if (this.pos.x <= 0 || this.pos.x + this.width >= CANVAS_WIDTH) this.moveDir *= -1;

    //ランダムな方向に弾をばらまく
    if (Math.random() < this.fireRate) {
      const vx = (Math.random() - 0.5) * 10;
      const vy = Math.random() * 5 + 2;
      this.shoot(vx, vy);
    }
  }
}

/* =========================================
   8) 敵生成
   ========================================= */
class EntityFactory {
  //ランダムに敵を生成
  static createRandomEnemy(game: ShooterGame, diff: Difficulty): Enemy {
    const x = Math.random() * (CANVAS_WIDTH - 30);
    let maxTypeIndex = 0;

    //難易度によって出現する敵の種類を制限
    switch (diff) {
      case Difficulty.EASY: maxTypeIndex = 2; break;
      case Difficulty.NORMAL: maxTypeIndex = 3; break;
      case Difficulty.HARD: maxTypeIndex = 4; break;
    }

    const typeId = Math.floor(Math.random() * (maxTypeIndex + 1));
    const image = ResourceManager.enemyImages[typeId];
    //敵の種類ID+1がスコアになる
    const score = typeId + 1;

    switch (typeId) {
      case 0: return new BasicEnemy(game, x, diff, image, score);
      case 1: return new WavyEnemy(game, x, diff, image, score);
      case 2: return new SpreadEnemy(game, x, diff, image, score);
      case 3: return new SniperEnemy(game, x, diff, image, score);
      case 4: return new DasherEnemy(game, x, diff, image, score);
      default: return new BasicEnemy(game, x, diff, image, score);
    }
  }

  //ボスを生成
  static createBoss(game: ShooterGame): Enemy {
    const randomIndex = Math.floor(Math.random() * ResourceManager.bossImages.length);
    const bossImage = ResourceManager.bossImages[randomIndex];
    // ボス生成時に難易度を渡す
    return new Boss(game, bossImage, game.getDifficulty());
  }
}

/* =========================================
   9) 衝突判定管理
   ========================================= */
class CollisionManager {
  static resolve(game: ShooterGame): void {
    const player = game.getPlayer();
    const bullets = game.getBullets();
    const enemies = game.getEnemies();
    const items = game.getItems(); 

    //弾の当たり判定
    bullets.forEach(b => {
      if (!b.isActive) return;
      if (b.isEnemy) {
        //敵の弾がプレイヤーに当たった時
        if (player && player.isColliding(b)) {
            // ダメージ処理
            game.damagePlayer();
        }
      } else {
        //プレイヤーの弾が敵に当たった時
        enemies.forEach(e => {
          if (e.isActive && b.isActive && b.isColliding(e)) {
            //弾は消える
            b.isActive = false;
            //敵のHPを減らす
            e.hp--;
            if (e.hp <= 0) {
              //敵撃破
              e.isActive = false;
              //スコア加算
              game.addScore(e.scoreValue);
              e.dropItem(); // アイテムドロップ
            }
          }
        });
      }
    });

    //プレイヤーが敵本体に当たった時
    if (player) {
      enemies.forEach(e => {
        if (e.isActive && e.isColliding(player)) {
            // ダメージ処理
            game.damagePlayer();
        }
      });
    }

    // プレイヤーがアイテムを取得した時
    if (player) {
        items.forEach(item => {
            if (item.isActive && item.isColliding(player)) {
                item.isActive = false; // アイテム消滅
                player.powerUp(item.type); // 効果適用
            }
        });
    }
  }
}

/* =========================================
   10) 各画面の処理
   ========================================= */
//タイトル画面
//難易度選択やデバッグモードの切り替えを行う
class TitleState extends StateBase {
  update(): void {
    const input = this.game.getInput();
    //１，２，３キーで難易度選択してゲーム開始
    if (input.isDown("Digit1")) this.game.startLevel(Difficulty.EASY);
    if (input.isDown("Digit2")) this.game.startLevel(Difficulty.NORMAL);
    if (input.isDown("Digit3")) this.game.startLevel(Difficulty.HARD);
    //ｄキーでデバッグモードの切り替え
    if (input.isDown("KeyD")) {
        ShooterGame.debugMode = !ShooterGame.debugMode;
    }
  }
  draw(): void {
    const r = this.game.getRenderer();
    r.drawTextCenter("SHOOTER GAME", 30, "black", 150);
    r.drawTextCenter("[1] EASY  [2] NORMAL  [3] HARD", 16, "black", 300);
    r.drawTextCenter("Enemy1:1pt ... Enemy5:5pt / Boss:50pt each", 12, "gray", 330);
    
    if (ShooterGame.debugMode) {
        r.drawTextCenter("DEBUG MODE ON", 12, "red", 400);
    }
  }
}

//プレイ画面
class PlayingState extends StateBase {
  private frameCount: number = 0;
  private bossSpawned: boolean = false;
  private lastBossScore: number = 0; // 前回ボスを倒した/またはゲーム開始時の基準スコア
  private isWarning: boolean = false; //警告演出中かどうか
  private warningTimer: number = 0;

  update(): void {
    //プレイ中にもデバッグモードの切り替え可能
    if (this.game.getInput().isDown("KeyD")) ShooterGame.debugMode = !ShooterGame.debugMode;

    //WARNING演出中の処理
    if (this.isWarning) {
      this.warningTimer++;
      //３秒経過でボス出現
      if (this.warningTimer > 180) {
        this.isWarning = false;
        this.game.spawnBoss();
        this.bossSpawned = true;
      }
      return; //演出中はゲームを進行しない
    }

    this.frameCount++;
    this.game.getPlayer()?.update();

    const currentScore = this.game.getScore();

    // ボス出現チェック (前回ボス撃破スコア + 50点)
    // 最初のボスは50点で出るように初期値を0にする
    if (!this.bossSpawned && currentScore >= this.lastBossScore + 50) {
        this.isWarning = true;
        this.warningTimer = 0;
    }

    //ボスも警告もないときは普通の敵を出す
    if (!this.bossSpawned && !this.isWarning) {
        let rate = 60; //基本出現頻度
        const d = this.game.getDifficulty();
        if (d === Difficulty.HARD) rate = 20;
        else if (d === Difficulty.EASY) rate = 80;
        
        if (this.frameCount % rate === 0) {
          this.game.spawnRandomEnemy();
        }
    }
    
    // ボス撃破チェック
    if (this.bossSpawned) {
        const bossExists = this.game.getEnemies().some(e => e instanceof Boss);
        if (!bossExists) {
            this.bossSpawned = false;
            // ボスを倒した瞬間のスコアを記録。ここから+50で次が出る
            this.lastBossScore = this.game.getScore();
        }
    }

    //各オブジェクトの更新と削除
    this.game.getBullets().forEach(b => b.update());
    this.game.cleanupBullets();
    this.game.getEnemies().forEach(e => e.update());
    this.game.cleanupEnemies();
    
    // アイテムの更新と削除
    this.game.getItems().forEach(i => i.update());
    this.game.cleanupItems();

    //衝突判定
    CollisionManager.resolve(this.game);
  }

  draw(): void {
    const r = this.game.getRenderer();
    //各オブジェクトを描画
    this.game.getPlayer()?.draw(r);
    this.game.getBullets().forEach(b => b.draw(r));
    this.game.getEnemies().forEach(e => e.draw(r));
    // アイテム描画
    this.game.getItems().forEach(i => i.draw(r));

    //ＵＩ描画
    r.drawTextLeft(`SCORE: ${this.game.getScore()}`, 16, "black", 10, 25);
    r.drawTextRight(DifficultyLabels[this.game.getDifficulty()], 16, "black", CANVAS_WIDTH - 10, 25);

    // 残機表示 (右下)
    // 画像サイズ20x20で、右から並べていく
    const lives = this.game.getLives();
    for (let i = 0; i < lives; i++) {
        // 右端から25px間隔で配置
        const x = CANVAS_WIDTH - 30 - (i * 25);
        const y = CANVAS_HEIGHT - 30;
        r.drawImage(ResourceManager.playerImage, x, y, 20, 20);
    }

    //WARNING演出描画
    if (this.isWarning) {
        if (Math.floor(this.warningTimer / 20) % 2 === 0) {
            r.drawTextCenter("WARNING", 40, "red", CANVAS_HEIGHT / 2);
            r.drawTextCenter("A HUGE BATTLESHIP IS APPROACHING FAST", 14, "red", CANVAS_HEIGHT / 2 + 30);
        }
    }
    
    if (ShooterGame.debugMode) {
        r.drawTextCenter("DEBUG MODE", 10, "red", 50);
    }
  }
}

//ゲームオーバー画面
//スペースキーでタイトルに戻る
class GameOverState extends StateBase {
  update(): void {
    if (this.game.getInput().isDown("Space")) this.game.toTitle();
  }
  draw(): void {
    const r = this.game.getRenderer();
    r.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, "rgba(0,0,0,0.7)");
    r.drawTextCenter("GAME OVER", 40, "red", CANVAS_HEIGHT / 2);
    r.drawTextCenter(`Score: ${this.game.getScore()}`, 24, "white", CANVAS_HEIGHT / 2 + 50);
    r.drawTextCenter("Press SPACE", 16, "white", CANVAS_HEIGHT / 2 + 100);
  }
}

/* =========================================
   11) ゲーム本体
   ========================================= */
class ShooterGame {
  private renderer: CanvasRenderer;
  private input: InputManager;
  private state!: IGameState; //現在のゲームの状態
  
  static debugMode: boolean = false; //デバッグモードフラグ
  
  private player: Player | null = null;
  private bullets: Bullet[] = [];
  private enemies: Enemy[] = [];
  private items: Item[] = []; // アイテム配列
  private score: number = 0;
  private difficulty: Difficulty = Difficulty.NORMAL;
  private lives: number = 4; // 残機 ４機分

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new CanvasRenderer(canvas);
    this.input = new InputManager();
    
    //画像読み込み完了後にゲームを開始
    ResourceManager.loadAll()
      .then(() => {
        console.log("Images loaded.");
        this.state = new TitleState(this);
        this.loop();
      })
      .catch((e) => {
        console.error("Load Failed", e);
        alert("画像の読み込みに失敗しました。");
      });
  }

  //メインループ（毎フレーム実行）
  private loop = (): void => {
    this.renderer.clear();
    if (this.state) {
        this.state.update();
        this.state.draw();
    }
    requestAnimationFrame(this.loop);
  }

  //ゲーム開始（初期化）
  startLevel(diff: Difficulty): void {
    this.difficulty = diff;
    this.score = 0;
    this.lives = 4; // 残機リセット
    this.bullets = [];
    this.enemies = [];
    this.items = []; // アイテムリセット
    this.player = new Player(this);
    this.state = new PlayingState(this);
  }

  //敵の生成関連
  spawnRandomEnemy(): void {
    this.enemies.push(EntityFactory.createRandomEnemy(this, this.difficulty));
  }

  spawnBoss(): void {
    this.enemies.push(EntityFactory.createBoss(this));
  }

  addBullet(b: Bullet): void { this.bullets.push(b); }
  addItem(i: Item): void { this.items.push(i); } // アイテム追加
  addScore(s: number): void { this.score += s; }
  setGameOver(): void { this.state = new GameOverState(this); }
  toTitle(): void { this.state = new TitleState(this); }
  addLife(): void { this.lives++; } // 残機アップ

  // プレイヤーがダメージを受けた時の処理
  damagePlayer(): void {
    // シールドがある場合は残機を減らさずシールド消費のみ
    if (this.player && this.player.hasShield) {
        this.player.hasShield = false;
        return; 
    }

    this.lives--;
    if (this.lives < 0) {
        this.setGameOver();
    } else {
        // リスポーン処理: 弾を消し、プレイヤー位置をリセット
        this.bullets = []; // 画面上の弾を全て消す（安全確保）
        this.items = []; // 死んだらアイテムも消す
        this.player = new Player(this); // プレイヤー再生成（パワーアップもリセット）
    }
  }
  
  //画面外に出たり破壊されたオブジェクトをリストから削除
  cleanupBullets(): void { this.bullets = this.bullets.filter(b => b.isActive); }
  cleanupEnemies(): void { this.enemies = this.enemies.filter(e => e.isActive); }
  cleanupItems(): void { this.items = this.items.filter(i => i.isActive); } // ★追加

  //ゲッターで外部から情報を取得
  getInput() { return this.input; }
  getRenderer() { return this.renderer; }
  getPlayer() { return this.player; }
  getBullets() { return this.bullets; }
  getEnemies() { return this.enemies; }
  getItems() { return this.items; } 
  getScore() { return this.score; }
  getDifficulty() { return this.difficulty; }
  getLives() { return this.lives; } //残機取得
}

// 起動処理
const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
if (canvas) new ShooterGame(canvas);