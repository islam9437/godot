var game;
var background;
var middleground;
var gameWidth = 288;
var gameHeight = 192;
var hurtFlag = false;
var hurtTimer;
var frogTimer;
var frogJumpSide = 'left';

window.onload = function () {

    game = new Phaser.Game(gameWidth, gameHeight, Phaser.AUTO, "");
    game.state.add('Boot', boot);
    game.state.add('Preload', preload);
    game.state.add('TitleScreen', titleScreen);
    game.state.add('PlayGame', playGame);
    //
    game.state.start("Boot");
}

var boot = function (game) {};
boot.prototype = {
    preload: function () {
        this.game.load.image('loading', 'assets/sprites/loading.png');
    },
    create: function () {
        game.scale.pageAlignHorizontally = true;
        game.scale.pageAlignVertically = true;
        game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
        game.renderer.renderSession.roundPixels = true; // no blurring
        this.game.state.start('Preload');
    }
}

var preload = function (game) {};
preload.prototype = {
    preload: function () {

        var loadingBar = this.add.sprite(game.width / 2, game.height / 2, 'loading');
        loadingBar.anchor.setTo(0.5);
        game.load.setPreloadSprite(loadingBar);
        // load title screen
        game.load.image('title', 'assets/sprites/title-screen.png');
        game.load.image('enter', 'assets/sprites/press-enter-text.png');
        game.load.image('credits', 'assets/sprites/credits-text.png');
        // environment
        game.load.image('background', 'assets/environment/back.png');
        game.load.image('middleground', 'assets/environment/middle.png');
        //tileset
        game.load.image('tileset', 'assets/environment/tileset.png');
        game.load.tilemap('map', 'assets/maps/map.json', null, Phaser.Tilemap.TILED_JSON);
        // atlas sprites
        game.load.atlasJSONArray('atlas', 'assets/atlas/atlas.png', 'assets/atlas/atlas.json');
        game.load.atlasJSONArray('atlas-props', 'assets/atlas/atlas-props.png', 'assets/atlas/atlas-props.json');
		//
		game.load.audio('music', ['assets/sound/platformer_level03_loop.ogg']);
    },
    create: function () {
        this.game.state.start('TitleScreen');
    }
}

var titleScreen = function (game) {};
titleScreen.prototype = {
    create: function () {
        background = game.add.tileSprite(0, 0, gameWidth, gameHeight, 'background');
        middleground = game.add.tileSprite(0, 80, gameWidth, gameHeight, 'middleground');
        this.title = game.add.image(game.width / 2, 70, 'title');
        this.title.anchor.setTo(0.5, 0);
        var credits = game.add.image(game.width / 2, game.height - 10, 'credits');
        credits.anchor.setTo(0.5, 1);

        this.pressEnter = game.add.image(game.width / 2, game.height - 35, 'enter');
        this.pressEnter.anchor.setTo(0.5, 1);

        var startKey = game.input.keyboard.addKey(Phaser.Keyboard.ENTER);
        startKey.onDown.add(this.startGame, this);

        game.time.events.loop(700, this.blinkText, this);

        this.state = 1;
    },
    blinkText: function () {
        if (this.pressEnter.alpha) {
            this.pressEnter.alpha = 0;
        } else {
            this.pressEnter.alpha = 1;
        }
    }

    ,
    update: function () {
        background.tilePosition.x -= .3;
        middleground.tilePosition.x -= .6;

    },
    startGame: function () {
        if (this.state == 1) {
            this.state = 2;
            this.title2 = game.add.image(game.width / 2, 0, 'instructions');
            this.title2.anchor.setTo(0.5, 0);
            this.title.destroy();
        } else {
            this.game.state.start('PlayGame');
        }

    }
}

var playGame = function (game) {
    // Добавьте переменные для отслеживания касаний
    this.pointerDown = false;
    this.pointerX = 0;
};
playGame.prototype = {
    create: function () {
        // Добавьте обработчики событий касания
        game.input.onDown.add(this.onDown, this);
        game.input.onUp.add(this.onUp, this);

        this.createBackgrounds();

        this.createWorld();
        this.decorWorld();
        this.createPlayer(54, 9);
        this.bindKeys();
        game.camera.follow(this.player, Phaser.Camera.FOLLOW_PLATFORMER);
        this.populateWorld();
		
		// music
        this.music = game.add.audio('music');
        this.music.loop = true;
        this.music.play();

    },
    bindKeys: function () {
        this.wasd = {
            jump: game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR),
            left: game.input.keyboard.addKey(Phaser.Keyboard.LEFT),
            right: game.input.keyboard.addKey(Phaser.Keyboard.RIGHT),
            crouch: game.input.keyboard.addKey(Phaser.Keyboard.DOWN)
        }
        game.input.keyboard.addKeyCapture(
            [Phaser.Keyboard.SPACEBAR,
                Phaser.Keyboard.LEFT,
                Phaser.Keyboard.RIGHT,
                Phaser.Keyboard.DOWN]
        );
    },

    decorWorld: function () {
        game.add.image(31 * 16, 4 * 16 + 3, 'atlas-props', 'tree');
        game.add.image(48 * 16, 3 * 16 + 5, 'atlas-props', 'house');
        game.add.image(10 * 16, 8 * 16 + 4, 'atlas-props', 'bush');
        game.add.image(11 * 16, 19 * 16 - 4, 'atlas-props', 'sign');
        game.add.image(15 * 16, 19 * 16 + 6, 'atlas-props', 'skulls');
        game.add.image(23 * 16, 19 * 16, 'atlas-props', 'face-block');
        game.add.image(28 * 16, 20 * 16, 'atlas-props', 'shrooms');
    },

    populateWorld: function () {
        // groups
        this.enemies = game.add.group();
        this.enemies.enableBody = true;
        //
        this.items = game.add.group();
        this.items.enableBody = true;

        //timer for frog jumps
        frogTimer = game.time.create(false);
        frogTimer.loop(2000, this.switchFrogJump, this);
        frogTimer.start();

        // create items
        this.createCherry(30, 5);
        this.createCherry(31, 5);


        this.createCherry(32, 5);
        //
        this.createCherry(23, 17);
        this.createCherry(24, 17);
        this.createCherry(25, 17);
        //
        this.createGem(3, 6);
        this.createGem(4, 6);
        this.createGem(5, 6);
        //
        this.createGem(44, 12);
        this.createGem(42, 13);
        this.createGem(42, 16);

        // create enemies

        this.createFrog(15, 9);
        this.createFrog(30, 20);
        this.createEagle(33, 6);
        this.createEagle(6, 7);
        this.createOpossum(42, 9);
        this.createOpossum(23, 20);

    },

    switchFrogJump: function () {
        frogJumpSide = (frogJumpSide == 'left') ? 'right' : 'left';
    },

    createBackgrounds: function () {
        this.background = game.add.tileSprite(0, 0, gameWidth, gameHeight, 'background');
        this.middleground = game.add.tileSprite(0, 80, gameWidth, gameHeight, 'middleground');
        this.background.fixedToCamera = true;
        this.middleground.fixedToCamera = true;
    },

    createWorld: function () {
        // tilemap
        this.map = game.add.tilemap('map');
        this.map.addTilesetImage('tileset');
        this.layer = this.map.createLayer('Tile Layer 1');
        this.layer.resizeWorld();
        // which tiles collide
        this.map.setCollision([27, 29, 31, 33, 35, 37, 77, 81, 86, 87, 127, 129, 131, 133, 134, 135, 83, 84, 502, 504, 505, 529, 530, 333, 335, 337, 339, 366, 368, 262, 191, 193, 195, 241, 245, 291, 293, 295,]);
        // set some tiles one way collision
        this.setTopCollisionTiles(35);
        this.setTopCollisionTiles(36);
        this.setTopCollisionTiles(84);
        this.setTopCollisionTiles(86);
        this.setTopCollisionTiles(134);
        this.setTopCollisionTiles(135);
        this.setTopCollisionTiles(366);
        this.setTopCollisionTiles(367);
        this.setTopCollisionTiles(368);
        this.setTopCollisionTiles(262);
    },

    setTopCollisionTiles: function (tileIndex) {
        var x, y, tile;
        for (x = 0; x < this.map.width; x++) {
            for (y = 1; y < this.map.height; y++) {
                tile = this.map.getTile(x, y);
                if (tile !== null) {
                    if (tile.index == tileIndex) {
                        tile.setCollision(false, false, true, false);
                    }

                }
            }
        }
    },

    createPlayer: function (x, y) {
        x *= 16;
        y *= 16;
        this.player = game.add.sprite(x, y, 'atlas', 'player/idle/player-idle-1');
        this.player.anchor.setTo(0.5);
        game.physics.arcade.enable(this.player);
        this.player.body.gravity.y = 500;
        this.player.body.setSize(12, 16, 8, 16);
        //add animations
        var animVel = 15;
        this.player.animations.add('idle', Phaser.Animation.generateFrameNames('player/idle/player-idle-', 1, 4, '', 0), animVel - 3, true);
        this.player.animations.add('run', Phaser.Animation.generateFrameNames('player/run/player-run-', 1, 6, '', 0), animVel, true);
        this.player.animations.add('jump', ['player/jump/player-jump-1'], 1, false);
        this.player.animations.add('fall', ['player/jump/player-jump-2'], 1, false);
        this.player.animations.add('crouch', Phaser.Animation.generateFrameNames('player/crouch/player-crouch-', 1, 2, '', 0), 10, true);
        this.player.animations.add('hurt', Phaser.Animation.generateFrameNames('player/hurt/player-hurt-', 1, 2, '', 0), animVel, true);
        this.player.animations.play('idle');
        // timer
        hurtTimer = game.time.create(false);
        hurtTimer.loop(500, this.resetHurt, this);
    },
    createEnemyDeath: function (x, y) {
        this.enemyDeath = game.add.sprite(x, y, 'atlas');
        this.enemyDeath.anchor.setTo(0.5);
        this.animDeath = this.enemyDeath.animations.add('dead', Phaser.Animation.generateFrameNames('enemy-death/enemy-death-', 1, 6, '', 0), 16, false);
        this.enemyDeath.animations.play('dead');
        this.animDeath.onComplete.add(function () {
            this.enemyDeath.kill();
        }, this);
    },

    createItemFeedback: function (x, y) {
        var itemFeedback = game.add.sprite(x, y, 'atlas');
        itemFeedback.anchor.setTo(0.5);
        var animFeedback = itemFeedback.animations.add('feedback', Phaser.Animation.generateFrameNames('item-feedback/item-feedback-', 1, 4, '', 0), 16, false);
        itemFeedback.animations.play('feedback');
        animFeedback.onComplete.add(function () {
            itemFeedback.kill();
        }, this);
    },

    resetHurt: function () {
        hurtFlag = false;
    },

    createOpossum: function (x, y) {
        x *= 16;
        y *= 16;
        var temp = game.add.sprite(x, y, 'atlas', 'opossum/opossum-1');
        temp.anchor.setTo(0.5);
        game.physics.arcade.enable(temp);
        temp.body.gravity.y = 500;
        temp.body.setSize(16, 13, 8, 15);
        //add animations
        temp.animations.add('run', Phaser.Animation.generateFrameNames('opos

sum/opossum-', 1, 2, '', 0), 10, true);
        temp.animations.play('run');
        this.enemies.add(temp);
    },

    createEagle: function (x, y) {
        x *= 16;
        y *= 16;
        var temp = game.add.sprite(x, y, 'atlas', 'eagle/eagle-1');
        temp.anchor.setTo(0.5);
        game.physics.arcade.enable(temp);
        temp.body.gravity.y = 200;
        temp.body.setSize(15, 16, 9, 6);
        //add animations
        temp.animations.add('run', Phaser.Animation.generateFrameNames('eagle/eagle-', 1, 2, '', 0), 5, true);
        temp.animations.play('run');
        this.enemies.add(temp);
    },

    createFrog: function (x, y) {
        x *= 16;
        y *= 16;
        var temp = game.add.sprite(x, y, 'atlas', 'frog/frog-1');
        temp.anchor.setTo(0.5);
        game.physics.arcade.enable(temp);
        temp.body.gravity.y = 500;
        temp.body.setSize(15, 16, 9, 6);
        //add animations
        temp.animations.add('jump', Phaser.Animation.generateFrameNames('frog/frog-', 1, 2, '', 0), 5, false);
        temp.animations.add('run', Phaser.Animation.generateFrameNames('frog/frog-', 3, 4, '', 0), 5, true);
        temp.animations.play('run');
        this.enemies.add(temp);
    },

    createCherry: function (x, y) {
        x *= 16;
        y *= 16;
        var temp = game.add.sprite(x, y, 'atlas', 'cherry/cherry-1');
        temp.anchor.setTo(0.5);
        game.physics.arcade.enable(temp);
        temp.body.setSize(6, 6, 5, 10);
        this.items.add(temp);
    },

    createGem: function (x, y) {
        x *= 16;
        y *= 16;
        var temp = game.add.sprite(x, y, 'atlas', 'gem/gem-1');
        temp.anchor.setTo(0.5);
        game.physics.arcade.enable(temp);
        temp.body.setSize(6, 6, 5, 10);
        this.items.add(temp);
    },
    update: function () {
        // move backgrounds
        this.background.tilePosition.x = -game.camera.x / 2;
        this.middleground.tilePosition.x = -game.camera.x / 3;

        //game.physics.arcade.collide(this.player, this.layer);
        // overlap between items and player
        game.physics.arcade.overlap(this.player, this.items, this.collectItem, null, this);
        // overlap between enemies and player
        game.physics.arcade.overlap(this.player, this.enemies, this.hurtPlayer, null, this);
        // overlap between player and tiles (special tiles like springs)
        game.physics.arcade.collide(this.player, this.layer, this.specialTiles, null, this);

        //Проверьте, было ли касание, и если да, обновите движение игрока.
        if (this.pointerDown) {
            this.player.body.velocity.x = (this.pointerX - this.player.x) * 2;
            if (this.pointerX < this.player.x) {
                this.player.scale.x = -1;
            } else {
                this.player.scale.x = 1;
            }
        } else {
            this.player.body.velocity.x = 0;
        }

        //Проверьте, нажата ли клавиша прыжка
        if (this.wasd.jump.isDown && this.player.body.onFloor()) {
            this.player.body.velocity.y = -250;
        }
        //Проверьте, нажаты ли клавиши влево или вправо, и настройте анимацию игрока соответственно
        if (this.wasd.left.isDown || this.wasd.right.isDown) {
            this.player.animations.play('run');
        } else {
            this.player.animations.play('idle');
        }

        // Добавьте обновление анимации во время прыжка или падения
        if (!this.player.body.onFloor()) {
            if (this.player.body.velocity.y < 0) {
                this.player.animations.play('jump');
            } else {
                this.player.animations.play('fall');
            }
        }
    },

    onDown: function (pointer) {
        // Установите флаг касания и сохраните позицию касания
        this.pointerDown = true;
        this.pointerX = pointer.x;
    },

    onUp: function () {
        // Сбросьте флаг касания
        this.pointerDown = false;
    },

    specialTiles: function (player, tile) {
        // Ваш код для специальных действий на плитках
    },

    hurtPlayer: function (player, enemy) {
        if (!hurtFlag) {
            hurtFlag = true;
            player.animations.play('hurt');
            hurtTimer.start();
            player.body.velocity.y = -150;
            if (player.x < enemy.x) {
                player.body.velocity.x = -150;
            } else {
                player.body.velocity.x = 150;
            }
        }
    },

    collectItem: function (player, item) {
        item.kill();
        this.createItemFeedback(item.x, item.y);
    }
};
