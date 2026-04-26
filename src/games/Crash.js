/**
 * Crash - Crash game module
 * Multiplier increases over time, cash out before crash
 */
import { GameModule } from '../core/GameModule.js'

export class Crash extends GameModule {
  constructor() {
    super({
      id: 'crash',
      name: 'Crash',
      icon: '📈',
      description: 'Cash out before the crash! Multiplier increases over time.',
      baseCost: 20,
      baseReward: 30,
      unlockLevel: 10,
    })

    this.multiplier = 1.0
    this.crashPoint = 0
    this.isPlaying = false
    this.lastResult = null
    this.totalWins = 0
    this.history = []
  }

  // --- Generate Crash Point ---

  generateCrashPoint() {
    // Provably fair crash point generation
    // Uses exponential distribution with house edge
    const e = 2.718281828459045
    const houseEdge = 0.04 // 4% house edge
    const random = Math.random()
    
    // Inverse CDF of exponential distribution
    const crashPoint = Math.max(1.0, Math.log(1 / (1 - random * (1 - houseEdge))) / Math.log(e))
    
    return Math.floor(crashPoint * 100) / 100
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
    this.multiplier = 1.0
    this.crashPoint = this.generateCrashPoint()
    this.currentBet = cost

    // Start game loop
    this._startGame()

    return {
      won: false,
      amount: 0,
      message: `📈 Game started! Crash at ${this.crashPoint.toFixed(2)}x`,
      multiplier: this.multiplier,
      crashPoint: this.crashPoint,
    }
  }

  // --- Cash Out ---

  cashOut() {
    if (!this.isPlaying) return null

    this.isPlaying = false
    const winnings = Math.floor(this.currentBet * this.multiplier)
    this.economy.addCoins(winnings)
    this.totalEarned += winnings
    this.economy.addXP(15)
    this.totalWins++

    this.lastResult = {
      won: true,
      amount: winnings,
      multiplier: this.multiplier,
      message: `📈 Cashed out at ${this.multiplier.toFixed(2)}x - Won ${winnings} coins!`,
    }

    this.history.push({
      multiplier: this.multiplier,
      crashPoint: this.crashPoint,
      bet: this.currentBet,
      won: true,
    })

    this._emit()
    return this.lastResult
  }

  // --- Game Loop ---

  _startGame() {
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000
      // Exponential growth: multiplier = e^(0.1 * t)
      this.multiplier = Math.exp(0.1 * elapsed)
      this.multiplier = Math.floor(this.multiplier * 100) / 100

      if (this.multiplier >= this.crashPoint) {
        // Crashed!
        clearInterval(interval)
        this.isPlaying = false
        this.multiplier = this.crashPoint

        this.lastResult = {
          won: false,
          amount: 0,
          multiplier: this.crashPoint,
          message: `📈 Crashed at ${this.crashPoint.toFixed(2)}x!`,
        }

        this.history.push({
          multiplier: this.crashPoint,
          crashPoint: this.crashPoint,
          bet: this.currentBet,
          won: false,
        })

        this._emit()
      }
    }, 100)

    this._intervalId = interval
  }

  // --- Stats Override ---

  getStats() {
    return {
      ...super.getStats(),
      multiplier: this.multiplier,
      crashPoint: this.crashPoint,
      isPlaying: this.isPlaying,
      lastResult: this.lastResult,
      totalWins: this.totalWins,
      history: this.history.slice(-10), // Last 10 games
    }
  }

  save() {
    return {
      ...super.save(),
      multiplier: this.multiplier,
      crashPoint: this.crashPoint,
      totalWins: this.totalWins,
      history: this.history.slice(-50), // Keep last 50 games
    }
  }

  load(data) {
    super.load(data)
    if (data.multiplier) this.multiplier = data.multiplier
    if (data.crashPoint) this.crashPoint = data.crashPoint
    if (data.totalWins) this.totalWins = data.totalWins
    if (data.history) this.history = data.history
  }

  destroy() {
    if (this._intervalId) {
      clearInterval(this._intervalId)
      this._intervalId = null
    }
    super.destroy()
  }
}
