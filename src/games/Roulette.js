/**
 * Roulette - Roulette game module
 * Classic roulette wheel with multiple bet types
 */
import { GameModule } from '../core/GameModule.js'

export class Roulette extends GameModule {
  constructor() {
    super({
      id: 'roulette',
      name: 'Roulette',
      icon: '🎡',
      description: 'Classic roulette. Bet on red/black, odd/even, or numbers!',
      baseCost: 30,
      baseReward: 50,
      unlockLevel: 20,
    })

    this.number = 0
    this.lastResult = null
    this.totalWins = 0
    this.history = []
    this.spinning = false
  }

  // --- Play Logic ---

  play(bet = null, betType = 'red') {
    if (this.spinning) return { won: false, amount: 0, message: 'Spinning...' }
    if (!this.economy) return { won: false, amount: 0, message: 'No economy' }

    const cost = bet || this.cost
    if (!this.economy.spendCoins(cost)) {
      return { won: false, amount: 0, message: 'Not enough coins!' }
    }

    this.spinning = true
    this.totalPlays++

    // Generate random number (0-36)
    this.number = Math.floor(Math.random() * 37)

    // Determine color
    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]
    const isRed = redNumbers.includes(this.number)
    const isBlack = this.number !== 0 && !isRed
    const isEven = this.number !== 0 && this.number % 2 === 0
    const isOdd = this.number !== 0 && !isEven

    let won = false
    let multiplier = 0

    switch (betType) {
      case 'red':
        won = isRed
        multiplier = won ? 2 : 0
        break
      case 'black':
        won = isBlack
        multiplier = won ? 2 : 0
        break
      case 'odd':
        won = isOdd
        multiplier = won ? 2 : 0
        break
      case 'even':
        won = isEven
        multiplier = won ? 2 : 0
        break
      case 'zero':
        won = this.number === 0
        multiplier = won ? 35 : 0
        break
      case 'number':
        // Bet on specific number (35x payout)
        won = this.number === 17 // Example: bet on 17
        multiplier = won ? 35 : 0
        break
    }

    if (won) {
      const winnings = Math.floor(cost * multiplier)
      this.economy.addCoins(winnings)
      this.totalEarned += winnings
      this.economy.addXP(won ? 15 : 3)
      this.totalWins++

      this.lastResult = {
        won: true,
        amount: winnings,
        multiplier,
        number: this.number,
        color: isRed ? 'red' : isBlack ? 'black' : 'green',
        message: `🎡 ${this.number} ${isRed ? '🔴' : isBlack ? '⚫' : '🟢'} - Won ${winnings} coins!`,
      }
    } else {
      this.lastResult = {
        won: false,
        amount: 0,
        multiplier: 0,
        number: this.number,
        color: isRed ? 'red' : isBlack ? 'black' : 'green',
        message: `🎡 ${this.number} ${isRed ? '🔴' : isBlack ? '⚫' : '🟢'} - No match`,
      }
    }

    this.history.push({
      number: this.number,
      color: this.lastResult.color,
      betType,
      won,
      multiplier,
    })

    this.spinning = false
    this._emit()
    return this.lastResult
  }

  // --- Stats Override ---

  getStats() {
    return {
      ...super.getStats(),
      number: this.number,
      spinning: this.spinning,
      lastResult: this.lastResult,
      totalWins: this.totalWins,
      history: this.history.slice(-10), // Last 10 games
    }
  }

  save() {
    return {
      ...super.save(),
      number: this.number,
      totalWins: this.totalWins,
      history: this.history.slice(-50), // Keep last 50 games
    }
  }

  load(data) {
    super.load(data)
    if (data.number) this.number = data.number
    if (data.totalWins) this.totalWins = data.totalWins
    if (data.history) this.history = data.history
  }
}
