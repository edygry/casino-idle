/**
 * Mines - Mines game module
 * Grid of tiles with hidden mines, cash out anytime
 */
import { GameModule } from '../core/GameModule.js'

export class Mines extends GameModule {
  constructor() {
    super({
      id: 'mines',
      name: 'Mines',
      icon: '💣',
      description: 'Reveal tiles to increase multiplier. Hit a mine and lose!',
      baseCost: 25,
      baseReward: 40,
      unlockLevel: 15,
    })

    this.gridSize = 5
    this.mineCount = 5
    this.grid = []
    this.revealed = []
    this.isPlaying = false
    this.multiplier = 1.0
    this.currentBet = 0
    this.lastResult = null
    this.totalWins = 0
  }

  // --- Initialize Grid ---

  _initGrid() {
    this.grid = Array(this.gridSize * this.gridSize).fill(false)
    this.revealed = Array(this.gridSize * this.gridSize).fill(false)

    // Place mines randomly
    let minesPlaced = 0
    while (minesPlaced < this.mineCount) {
      const pos = Math.floor(Math.random() * this.grid.length)
      if (!this.grid[pos]) {
        this.grid[pos] = true
        minesPlaced++
      }
    }
  }

  // --- Play Logic ---

  play(bet = null) {
    if (this.isPlaying) return { won: false, amount: 0, message: 'Game in progress' }
    if (!this.economy) return { won: false, amount: 0, message: 'No economy' }

    const cost = bet || this.cost
    if (!this.economy.spendCoins(cost)) {
      return { won: false, amount: 0, message: 'Not enough coins!' }
    }

    this.isPlaying = true
    this.totalPlays++
    this.currentBet = cost
    this.multiplier = 1.0
    this._initGrid()

    return {
      won: false,
      amount: 0,
      message: `💣 Game started! ${this.mineCount} mines hidden in ${this.gridSize}x${this.gridSize} grid`,
      gridSize: this.gridSize,
      mineCount: this.mineCount,
      multiplier: this.multiplier,
    }
  }

  // --- Reveal Tile ---

  revealTile(index) {
    if (!this.isPlaying) return null
    if (this.revealed[index]) return null

    this.revealed[index] = true

    if (this.grid[index]) {
      // Hit a mine!
      this.isPlaying = false
      this.lastResult = {
        won: false,
        amount: 0,
        multiplier: 0,
        message: `💣 BOOM! Hit a mine at position ${index}!`,
      }

      this._emit()
      return this.lastResult
    }

    // Safe tile!
    const safeTiles = this.revealed.filter(r => r).length
    const totalTiles = this.grid.length
    const safeTotal = totalTiles - this.mineCount

    // Calculate multiplier based on probability
    const probability = this._calculateProbability(safeTiles)
    this.multiplier = Math.floor(probability * 100) / 100

    // Check if all safe tiles revealed
    if (safeTiles >= safeTotal) {
      return this.cashOut()
    }

    this._emit()
    return {
      won: false,
      amount: 0,
      multiplier: this.multiplier,
      message: `💣 Safe! Multiplier: ${this.multiplier.toFixed(2)}x`,
    }
  }

  // --- Cash Out ---

  cashOut() {
    if (!this.isPlaying) return null

    this.isPlaying = false
    const winnings = Math.floor(this.currentBet * this.multiplier)
    this.economy.addCoins(winnings)
    this.totalEarned += winnings
    this.economy.addXP(20)
    this.totalWins++

    this.lastResult = {
      won: true,
      amount: winnings,
      multiplier: this.multiplier,
      message: `💣 Cashed out at ${this.multiplier.toFixed(2)}x - Won ${winnings} coins!`,
    }

    this._emit()
    return this.lastResult
  }

  // --- Probability Calculation ---

  _calculateProbability(safeTiles) {
    // Hypergeometric distribution approximation
    let prob = 1.0
    const totalTiles = this.grid.length
    const safeTotal = totalTiles - this.mineCount

    for (let i = 0; i < safeTiles; i++) {
      prob *= (safeTotal - i) / (totalTiles - i)
    }

    return 1 / prob
  }

  // --- Stats Override ---

  getStats() {
    return {
      ...super.getStats(),
      gridSize: this.gridSize,
      mineCount: this.mineCount,
      grid: [...this.grid],
      revealed: [...this.revealed],
      isPlaying: this.isPlaying,
      multiplier: this.multiplier,
      lastResult: this.lastResult,
      totalWins: this.totalWins,
    }
  }

  save() {
    return {
      ...super.save(),
      gridSize: this.gridSize,
      mineCount: this.mineCount,
      multiplier: this.multiplier,
      totalWins: this.totalWins,
    }
  }

  load(data) {
    super.load(data)
    if (data.gridSize) this.gridSize = data.gridSize
    if (data.mineCount) this.mineCount = data.mineCount
    if (data.multiplier) this.multiplier = data.multiplier
    if (data.totalWins) this.totalWins = data.totalWins
  }
}
