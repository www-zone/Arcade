"use strict";
!(function (global) {
  // CONSTANTS
  const MINE = -1;
  const EXPLODED = "💥";
  const UNEXPLODED = "💣";
  const FLAG = "🚩";
  const INFINITY = "♾️";

  const SQUARE_CLASSES = {
    "-1": "mine",
    "0": "empty",
    "1": "one",
    "2": "two",
    "3": "three",
    "4": "four",
    "5": "five",
    "6": "six",
    "7": "seven",
    "8": "eight"
  };

  const GAME_TYPES = {
    BEGINNER: {
      numRows: 8,
      numColumns: 8,
      numMines: 10
    },
    INTERMEDIATE: {
      numRows: 16,
      numColumns: 16,
      numMines: 40
    },
    ADVANCED: {
      numRows: 18,
      numColumns: 32,
      numMines: 99
    }
  };

  const GAME_OVER_CLASSES = {
    WIN: "winner",
    LOSE: "loser"
  };

  // classes
  class Timer {
    constructor() {
      this.timeElapsed = 0;
      this.interval = null;
      this.root = null;
      this.tick = this.tick.bind(this);
    }

    init() {
      // exit if we already have a reference to the root div
      if (this.root) return;
      this.root = document.getElementById("timer");
    }

    start() {
      this.interval = setInterval(this.tick, 1000);
    }

    tick() {
      this.timeElapsed++;
      this.render();
    }

    stop() {
      clearInterval(this.interval);
    }

    reset() {
      this.stop();
      this.timeElapsed = 0;
      this.render();
    }

    static toTimeString(elapsed) {
      const seconds = elapsed % 60;
      const minutes = (elapsed - seconds) / 60;
      const hours = (elapsed - seconds - minutes * 60) / 3600;
      return `${hours ? `${hours}:` : ""}${`0${minutes}`.slice(
        -2
      )}:${`0${seconds}`.slice(-2)}`;
    }

    render() {
      this.root.textContent = Timer.toTimeString(this.timeElapsed);
    }
  }

  class StoredTimes {
    constructor(gameType) {
      this.gameType = gameType;
      this.root = null;
      this.bestTime = "♾️";
    }

    init() {
      this.getBestTimeFromStorage();
      if (this.root) return;
      this.root = document.getElementById(
        `best-time-${this.gameType.toLowerCase()}`
      );
    }

    reset() {
      this.getBestTimeFromStorage();
      this.render();
    }

    getBestTimeFromStorage() {
      let bestTime = Infinity;
      const storedTimes = localStorage.getItem("bestTimes");
      if (storedTimes) {
        const parsed = JSON.parse(storedTimes);
        bestTime = parsed[this.gameType] || Infinity;
      }
      this.bestTime =
        bestTime < Infinity ? Timer.toTimeString(bestTime) : INFINITY;
    }

    setAndStoreBestTime(timeElapsed) {
      const storedTimes = localStorage.getItem("bestTimes");
      if (storedTimes) {
        const parsed = JSON.parse(storedTimes);
        if (!parsed[this.gameType]) {
          parsed[this.gameType] = timeElapsed;
        } else {
          parsed[this.gameType] =
            timeElapsed < parsed[this.gameType]
              ? timeElapsed
              : parsed[this.gameType];
        }
        localStorage.setItem("bestTimes", JSON.stringify(parsed));
        this.bestTime =
          parsed[this.gameType] < Infinity
            ? Timer.toTimeString(parsed[this.gameType])
            : INFINITY;
      } else {
        const bestTimes = {};
        Object.keys(GAME_TYPES).forEach((type) => {
          bestTimes[type] = type === this.gameType ? timeElapsed : Infinity;
        });
        localStorage.setItem("bestTimes", JSON.stringify(bestTimes));
        this.bestTime =
          bestTimes[this.gameType] < Infinity
            ? Timer.toTimeString(bestTimes[this.gameType])
            : INFINITY;
      }
      this.render();
    }

    render() {
      this.root.textContent = this.bestTime;
      this.root.style.display = "block";
    }
  }

  class Game {
    constructor(gameType) {
      this.root = null;
      this.gameType = gameType;
      // pass reference to this object down, so that game controls can respond to events down the chain
      // an alternate approach would be to use the postMessage API or create custom Events
      this.grid = new Grid({ ...GAME_TYPES[gameType], parent: this });
      this.timer = new Timer();
      this.storedTimes = new StoredTimes(gameType);
      this.clicked = false;
      this.gameover = false;
    }

    init() {
      this.storedTimes.init();
      this.grid.init();
      this.timer.init();
      // exit if we already have a reference to the root div
      if (this.root) return;
      this.root = document.getElementById("minesweeper");
      this.root.addEventListener("click", (e) => {
        e.preventDefault();
        if (this.clicked || this.gameover) {
          return;
        }
        this.timer.start();
        this.clicked = true;
        console.log("PLAYING!!!!");
      });
    }

    start() {
      this.init();
      this.render();
    }

    end(className) {
      this.gameover = true;
      this.root.classList.add("game-over", className);
      this.timer.stop();
      console.log(`Time Elapsed: ${this.timer.timeElapsed} seconds.`);
      if (className === GAME_OVER_CLASSES.WIN) {
        this.storedTimes.setAndStoreBestTime(this.timer.timeElapsed);
      }
    }

    reset(gameType) {
      this.gameType = gameType;
      this.grid.numRows = GAME_TYPES[gameType].numRows;
      this.grid.numColumns = GAME_TYPES[gameType].numColumns;
      this.grid.numMines = GAME_TYPES[gameType].numMines;
      this.grid.flags.maxFlags = GAME_TYPES[gameType].numMines;
      this.root.innerHTML = "";
      this.root.classList.remove(
        "game-over",
        GAME_OVER_CLASSES.WIN,
        GAME_OVER_CLASSES.LOSE
      );
      this.storedTimes.gameType = gameType;
      this.gameover = false;
      this.clicked = false;
      this.grid.reset();
      this.storedTimes.reset();
      this.timer.reset();
      this.render();
    }

    render() {
      this.storedTimes.render();
      const grid = this.grid.render();
      grid.forEach((row) => this.root.appendChild(row));
    }
  }

  class Flags {
    constructor(maxFlags) {
      this.flagsUsed = 0;
      this.maxFlags = maxFlags;
      this.root = null;
    }

    init() {
      if (this.root) return;
      this.root = document.getElementById("flags");
    }

    increment() {
      this.flagsUsed++;
      this.render();
    }

    decrement() {
      this.flagsUsed--;
      this.render();
    }

    reset() {
      this.flagsUsed = 0;
    }

    render() {
      this.root.textContent = `${this.maxFlags - this.flagsUsed} ${FLAG}`;
    }
  }

  class Grid {
    constructor({ numRows = 8, numColumns = 8, numMines = 10, parent }) {
      this.grid = [];
      this.numRows = numRows;
      this.numColumns = numColumns;
      this.numMines = numMines;
      this.flags = new Flags(numMines);
      // store reference to parent to call methods related to state
      this.parent = parent;
    }

    init() {
      this.flags.init();
      this.generateGrid();
      this.fillGridWithMines();
    }

    generateGrid() {
      for (let rowCoord = 0; rowCoord < this.numRows; rowCoord++) {
        const row = [];
        for (let colCoord = 0; colCoord < this.numColumns; colCoord++) {
          const square = new Square({ parent: this, rowCoord, colCoord });
          row.push(square);
        }
        this.grid.push(row);
      }
    }

    fillGridWithMines() {
      let mines = 0;
      while (mines < this.numMines) {
        const [rowCoord, colCoord] = this.generateCoordinates();
        if (this.grid[rowCoord][colCoord].value !== MINE) {
          this.grid[rowCoord][colCoord].value = MINE;
          mines++;
          // Check for Edge Cases
          if (rowCoord - 1 >= 0) {
            // Row Above
            this.grid[rowCoord - 1][colCoord].incrementValue();
          }
          if (colCoord - 1 >= 0) {
            // Column to the Left
            this.grid[rowCoord][colCoord - 1].incrementValue();
          }
          if (rowCoord + 1 !== this.numRows && colCoord - 1 >= 0) {
            // Bottom Left Diagonal
            this.grid[rowCoord + 1][colCoord - 1].incrementValue();
          }
          if (rowCoord - 1 >= 0 && colCoord - 1 >= 0) {
            // Top Left Diagonal
            this.grid[rowCoord - 1][colCoord - 1].incrementValue();
          }
          if (rowCoord + 1 !== this.numRows) {
            // Row Below
            this.grid[rowCoord + 1][colCoord].incrementValue();
          }
          if (colCoord + 1 !== this.numColumns) {
            // Column to the Right
            this.grid[rowCoord][colCoord + 1].incrementValue();
          }
          if (
            rowCoord + 1 !== this.numRows &&
            colCoord + 1 !== this.numColumns
          ) {
            // Bottom Right Diagonal
            this.grid[rowCoord + 1][colCoord + 1].incrementValue();
          }
          if (rowCoord - 1 >= 0 && colCoord + 1 !== this.numColumns) {
            // Top Right Diagonal
            this.grid[rowCoord - 1][colCoord + 1].incrementValue();
          }
        }
      }
    }

    generateCoordinates() {
      const rowCoord = Math.floor(Math.random() * this.numRows);
      const colCoord = Math.floor(Math.random() * this.numColumns);
      return [rowCoord, colCoord];
    }

    checkForWin() {
      let win = true;
      for (let row = 0; row < this.numRows; row++) {
        for (let col = 0; col < this.numColumns; col++) {
          if (
            !this.grid[row][col].revealed &&
            this.grid[row][col].value !== MINE
          ) {
            win = false;
            break;
          }
        }
      }
      return win;
    }

    revealAllAndUnMountEvents() {
      this.grid.forEach((row) =>
        row.forEach((square) => {
          square.revealSquare();
          square.removeClickHandler();
        })
      );
    }

    end(className) {
      this.revealAllAndUnMountEvents();
      this.parent.end(className);
    }

    reset() {
      this.grid = [];
      this.flags.reset();
      this.init();
    }

    render() {
      this.flags.render();
      const rows = this.grid.map((row) => {
        const rowEl = document.createElement("div");
        rowEl.classList.add("row");
        row.forEach((square) => {
          rowEl.appendChild(square.render());
        });
        return rowEl;
      });
      return rows;
    }
  }

  class Square {
    constructor({ parent, rowCoord, colCoord }) {
      this.revealed = false;
      this.flagged = false;
      this.value = 0;
      this.rowCoord = rowCoord;
      this.colCoord = colCoord;
      this.root = null;
      // store reference to parent to call methods related to state on parent and parent's parent
      this.parent = parent;
    }

    setValue(value) {
      this.value = value;
    }

    incrementValue() {
      this.value = this.value === MINE ? this.value : this.value + 1;
    }

    handleClick(e) {
      e.preventDefault();
      if (
        e.button === 2 ||
        e.which === 3 ||
        e.ctrlKey ||
        this.root.textContent === FLAG
      ) {
        this.toggleFlag();
        return;
      }
      this.handleReveal();
    }

    handleRightClick(e) {
      e.preventDefault();
      this.toggleFlag();
    }

    handleReveal() {
      if (this.revealed) {
        return;
      }
      // check value
      // respond to value
      switch (this.value) {
        case -1:
          console.log("BOOM!!!!");
          // BOOM
          // Trigger UI
          this.parent.end(GAME_OVER_CLASSES.LOSE);

          this.root.classList.add("boom");
          this.root.textContent = EXPLODED;

          return;
        case 0:
          // trigger UI Update
          this.revealSquare();

          if (this.parent.checkForWin()) {
            console.log("WINNER!!!!");
            this.parent.end(GAME_OVER_CLASSES.WIN);
          } else {
            // reveal neighbors
            this.revealNeighbors();
          }

          break;
        default:
          // trigger UI Update
          this.revealSquare();
          // check for Game Over
          if (this.parent.checkForWin()) {
            console.log("WINNER!!!!");
            this.parent.end(GAME_OVER_CLASSES.WIN);
          }
          break;
      }
    }

    checkForWin() {}

    toggleFlag() {
      // only toggle flag if there are flags remaining
      if (
        ((this.parent.flags.flagsUsed < this.parent.flags.maxFlags &&
          !this.flagged) ||
          this.flagged) &&
        !this.revealed
      ) {
        this.flagged = !this.flagged;
        this.root.textContent = this.flagged ? FLAG : "";
        this.root.classList.toggle("flagged");
        if (this.flagged) {
          this.parent.flags.increment();
        } else {
          this.parent.flags.decrement();
        }
      }
    }

    removeClickHandler() {
      this.root.removeEventListener("click", this.handleClick.bind(this));
      this.root.removeEventListener(
        "contextmenu",
        this.handleRightClick.bind(this)
      );
    }

    revealSquare() {
      this.revealed = true;
      const content = this.value === 0 ? "" : this.value;
      this.root.textContent = this.value === MINE ? UNEXPLODED : content;
      this.root.classList.remove("covered");
      this.root.classList.remove("flagged");
      this.root.classList.add(SQUARE_CLASSES[this.value.toString()]);
    }

    revealNeighbors() {
      const { numColumns, numRows, grid } = this.parent;
      if (this.rowCoord - 1 >= 0) {
        // Row Above
        grid[this.rowCoord - 1][this.colCoord].handleReveal();
      }
      if (this.colCoord - 1 >= 0) {
        // Column to the Left
        grid[this.rowCoord][this.colCoord - 1].handleReveal();
      }
      if (this.rowCoord + 1 !== numRows && this.colCoord - 1 >= 0) {
        // Bottom Left Diagonal
        grid[this.rowCoord + 1][this.colCoord - 1].handleReveal();
      }
      if (this.rowCoord - 1 >= 0 && this.colCoord - 1 >= 0) {
        // Top Left Diagonal
        grid[this.rowCoord - 1][this.colCoord - 1].handleReveal();
      }
      if (this.rowCoord + 1 !== numRows) {
        // Row Below
        grid[this.rowCoord + 1][this.colCoord].handleReveal();
      }
      if (this.colCoord + 1 !== numColumns) {
        // Column to the Right
        grid[this.rowCoord][this.colCoord + 1].handleReveal();
      }
      if (this.rowCoord + 1 !== numRows && this.colCoord + 1 !== numColumns) {
        // Bottom Right Diagonal
        grid[this.rowCoord + 1][this.colCoord + 1].handleReveal();
      }
      if (this.rowCoord - 1 >= 0 && this.colCoord + 1 !== numColumns) {
        // Top Right Diagonal
        grid[this.rowCoord - 1][this.colCoord + 1].handleReveal();
      }
    }

    /**
     * Renders UI for each Square, adds Click event listeners, and returns reference to Element
     * @returns HTMLElement - Square
     */
    render() {
      const square = document.createElement("div");
      square.classList.add("square", "covered");
      square.textContent = "";
      square.addEventListener("click", this.handleClick.bind(this));
      square.addEventListener("contextmenu", this.handleRightClick.bind(this));
      this.root = square;
      return square;
    }
  }

  // append Game to Global Object
  if (typeof global.__MINESWEEPER !== Game) {
    global.__MINESWEEPER = new Game("BEGINNER");
  }

  // check document.readyState to support asynchronous loading of this script
  switch (document.readyState) {
    case "loading":
      document.addEventListener("DOMContentLoaded", initGame);
      break;
    default:
      initGame();
      break;
  }

  /**
   * Will call start to Minesweeper Game
   * Expects the following HTML structure
   *
   * <div class="controls">
   *   <button class="control-btn" id="beginner">Beginner</button>
   *   <button class="control-btn" id="intermediate">Intermediate</button>
   *   <button class="control-btn" id="advanced">Advanced</button>
   *   <div id="timer">00:00</div>
   *   <div id="flags">0 🚩</div>
   * </div>
   * <div class="game-container">
   *   <div id="minesweeper"></div>
   * </div>
   */
  function initGame() {
    global.__MINESWEEPER.start();

    const controlButtons = document.querySelectorAll(".control-btn");
    controlButtons.forEach((button) =>
      button.addEventListener("click", (e) => {
        e.preventDefault();
        const id = e.currentTarget.id.toUpperCase();
        if (Object.keys(GAME_TYPES).includes(id)) {
          global.__MINESWEEPER.reset(id);
        } else {
          global.__MINESWEEPER.reset("BEGINNER");
        }
      })
    );
  }
})(globalThis || window);
