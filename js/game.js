var game;
var savedData;

var gameOptions = {
  gameHeight: 1024,
  backgroundColor: 0x08131a,
  boxSize: 64,
  boxMargin: 34,
  startingBlocks: 5,
  startingSpeed: 0.75,
  maxRows: 10,
  shiftRows: 4,
  localStorageName: "stackygame"
}

window.onload = function() {
  var windowWidth = window.innerWidth;
  var windowHeight = window.innerHeight;
  if (windowWidth > windowHeight) {
    windowWidth = windowHeight / 1.8;
  }
  var gameWidth = windowWidth * gameOptions.gameHeight / windowHeight;
  game = new Phaser.Game(gameWidth, gameOptions.gameHeight, Phaser.CANVAS);
  game.state.add("Boot", boot);
  game.state.add("Preload", preload);
  game.state.add("TitleScreen", titleScreen);
  game.state.add("PlayGame", playGame);
  game.state.start("Boot");
}

var boot = {
  preload: function(game) {
    game.load.image("loading", "assets/sprites/loading.png");
  },
  create: function(game) {
    game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    game.scale.pageAlignHorizontally = true;
    game.scale.pageAlignVertically = true;
    game.stage.disableVisibilityChange = true;
    game.stage.backgroundColor = gameOptions.backgroundColor;
    game.state.start("Preload");
  }
}

var preload = {
  preload: function(game) {
    var loadingBar = this.add.sprite(game.width / 2, game.height / 2, "loading");
    loadingBar.anchor.setTo(0.5);
    game.load.setPreloadSprite(loadingBar);
    game.load.image("title", "assets/sprites/title.png");
    game.load.image("playbutton", "assets/sprites/playbutton.png");
    //game.load.image("ball", "assets/sprites/ball.png");
    //game.load.image("target", "assets/sprites/target.png");
    //game.load.image("arm", "assets/sprites/arm.png");
    game.load.image("homebutton", "assets/sprites/homebutton.png");
    //game.load.image("tap", "assets/sprites/tap.png");
    //game.load.image("fog", "assets/sprites/fog.png");
    game.load.image("box", "assets/sprites/box.png");
    game.load.bitmapFont("font", "assets/fonts/font.png", "assets/fonts/font.fnt");
    game.load.bitmapFont("whitefont", "assets/fonts/whitefont.png", "assets/fonts/whitefont.fnt");
    game.load.audio("failsound", ["assets/sounds/fail.mp3", "assets/sounds/fail.ogg"]);
    game.load.audio("hitsound", ["assets/sounds/hit.mp3", "assets/sounds/hit.mp3"]);
    game.load.audio("hit2sound", ["assets/sounds/hit2.mp3", "assets/sounds/hit2.ogg"]);
  },
  create: function(game) {
    game.state.start("TitleScreen");
  }
}

var titleScreen = {
  create: function(game) {
    game.stage.backgroundColor = 0x9bafb5;
    savedData = localStorage.getItem(gameOptions.localStorageName) == null ? {
      score: 0
    } : JSON.parse(localStorage.getItem(gameOptions.localStorageName));
    var title = game.add.image(game.width / 2, 50, "title");
    title.anchor.set(0.5, 0);
    var playButton = game.add.button(game.width / 2, game.height / 2, "playbutton", this.startGame);
    playButton.anchor.set(0.5);
    var tween = game.add.tween(playButton.scale).to({
      x: 0.8,
      y: 0.8
    }, 500, Phaser.Easing.Linear.None, true, 0, -1);
    tween.yoyo(true);
    game.add.bitmapText(game.width / 2, game.height - 50, "whitefont", savedData.score.toString(), 60).anchor.set(0.5, 1);
    game.add.bitmapText(game.width / 2, game.height - 110, "font", "BEST SCORE", 48).anchor.set(0.5, 1);
  },
  startGame: function() {
    game.state.start("PlayGame");
  }
}

var playGame = {
  create: function(game) {
    this.failSound = game.add.audio("failsound");
    this.stopSound = [game.add.audio("hitsound"), game.add.audio("hit2sound")];
    this.isRunning = false;
    this.score = 0;
    this.level = 0;
    this.speed = gameOptions.startingSpeed;
    this.staticGroups = game.add.group();
    this.activeGroup = game.add.group();

    // set the initial static and active blocks...
    // create the right number of active blocks
    var bottomRow = game.add.group();
    bottomRow.x = game.width / 2 - (gameOptions.startingBlocks * gameOptions.boxSize / 2);
    bottomRow.y = game.height - 192;
    for (var i = 0; i < gameOptions.startingBlocks; i++) {
      bottomRow.create(i * gameOptions.boxSize, 0, "box");
    }
    this.staticGroups.add(bottomRow);

    // listen for user input
    this.homeButton = game.add.button(game.width / 2, game.height, "homebutton", function() {
      this.isRunning = false;
      game.state.start("TitleScreen");
    });
    this.homeButton.anchor.set(0.5, 1);

    // add the score
    this.scoreText = game.add.bitmapText(20, 20, "whitefont", "0", 60);

    // start the game
    this.startRow();
  },

  update: function(game) {
    if (this.isRunning) {
      var movex = this.speed * game.width * game.time.physicsElapsed;

      if (this.speed > 0 && this.activeGroup.x + this.activeGroup.width < game.width) {
        this.activeGroup.x = Math.min(game.width - this.activeGroup.width, this.activeGroup.x + movex);
      } else if (this.speed < 0 && this.activeGroup.x > 0) {
        this.activeGroup.x = Math.max(0, this.activeGroup.x + movex);
      } else {
        this.speed = -this.speed;
      }

    }
  },

  startRow: function() {
    // find the top most static row
    var topRow = this.staticGroups.getTop();

    // create a new active row above this one
    this.activeGroup = game.add.group();
    this.activeGroup.x = topRow.x;
    this.activeGroup.y = topRow.y - gameOptions.boxSize;
    for (var i = 0; i < topRow.countLiving(); i++) {
      this.activeGroup.create(i * gameOptions.boxSize, 0, "box");
    }

    // and resume play...
    this.level++;
    this.speed *= 1.1;
    this.isRunning = true;
    game.input.onDown.add(this.stop, this);
  },

  stop: function(e) {
    game.input.onDown.remove(this.stop, this);
    this.isRunning = false;
    this.stopSound[this.level % 2].play();

    // run through the active group and deal with each box...
    var topBounds = this.staticGroups.getTop().getBounds();
    this.activeGroup.forEach(this.checkAlive, this, false, topBounds.x, topBounds.x + topBounds.width, gameOptions.boxMargin);
    this.activeGroup.forEachDead(this.dropBox, this, this.activeGroup);

    // add some score
    this.score += this.level * this.activeGroup.countLiving();
    this.scoreText.text = this.score.toString();

    if (this.activeGroup.countLiving() == 0) {
      // if there are no blocks left, then game over
      this.gameOver();
    } else {
      // make the stopped group a new static row
      this.staticGroups.subAll('alpha', 0.1);
      this.staticGroups.add(this.activeGroup);

      // scroll down the static groups?
      if (this.staticGroups.length + 1 > gameOptions.maxRows) {
        this.staticGroups.forEach(this.dropRow, this, false, gameOptions.boxSize * gameOptions.shiftRows);
        this.staticGroups.removeBetween(0, gameOptions.shiftRows - 1, true);
      } else {
        this.startRow();
      }
    }
  },

  checkAlive: function(item, left, right, margin) {
    if (item.worldPosition.x + margin < left ||
      item.worldPosition.x + margin > right
    ) {
      item.alive = false;
    }
  },

  dropBox: function(item, group) {
    // add some animation
    // TODO: make tge block rotate away from the missed edge
    var tween = game.add.tween(item)
      .to({
        y: item.y + gameOptions.boxSize,
        alpha: 0
      }, 150);
    tween.onComplete.add(function() {
        group.removeChild(item);
        item.destroy();
      },
      this
    );
    tween.start();
  },

  dropRow: function(item, dy) {
    var tween = game.add.tween(item)
      .to({
        y: item.y + dy
      }, 250);

    if (this.staticGroups.getIndex(item) == 0) {
      tween.onComplete.addOnce(function() {
        this.startRow();
      }, this);
    }
    tween.start();
  },

  gameOver: function() {
    this.failSound.play();
    localStorage.setItem(gameOptions.localStorageName, JSON.stringify({
      score: Math.max(savedData.score, this.score)
    }));
    this.isRunning = false;
    game.input.onDown.remove(this.stop, this);
    this.speed = 0;

    //TODO: Make each block drop separately!
    var gameOverTween = game.add.tween(this.staticGroups)
      .to({
        y: 200,
        alpha: 0
      }, 1500, Phaser.Easing.Cubic.Out, true, 1000);

    gameOverTween.onComplete.add(function() {
      game.state.start("PlayGame");
    }, this);
  }
}
