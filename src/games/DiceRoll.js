/**
 * DiceRoll - Dice rolling game module
 * Simple dice betting with multiple bet types
 */
import { GameModule } from '../core/GameModule.js'

export class DiceRoll extends GameModule {
  constructor() {
    super({
      id: 'dice',
      name: 'Dice Roll',
      icon: '🎲',
      description: 'Bet on dice outcomes. High, low, or exact number!',
      baseCost: 15,
      baseReward: 20,
      unlockLevel: 5,
    })

    this.dice = [1, 1]
    this.lastBet = 'high'
    this.lastResult = null
    this.totalWins = 0
  }

  // --- Play Logic ---

  play(bet = null, betType = 'high') {
    if (!this.economy) return { won: false, amount: 0, message: 'No economy' }

    const cost = bet || this.cost
    if (!this.economy.spendCoins(cost)) {
      return { won: false, amount: 0, message: 'Not enough coins!' }
    }

    this.totalPlays++
    this.lastBet = betType

    // Roll dice (2-12)
    const die1 = Math.floor(Math.random() * 6) + 1
    const die2 = Math.floor(Math.random() * 6) + 1
    const total = die1 + die2
    this.dice = [die1, die2]

    let won = false
    let multiplier = 0

    switch (betType) {
      case 'high':
        // 7-12 pays 2x
        won = total >= 7
        multiplier = won ? 2 : 0
        break
      case 'low':
        // 2-6 pays 2x
        won = total <= 6
        multiplier = won ? 2 : 0
        break
      case 'exact':
        // Exact number pays 6x
        won = total === 7
        multiplier = won ? 6 : 0
        break
      case 'doubles':
        // Doubles pays 5x
        won = die1 === die2
        multiplier = won ? 5 : 0
        break
    }

    if (won) {
      const winnings = Math.floor(cost * multiplier)
      this.economy.addCoins(winnings)
      this.totalEarned += winnings
      this.economy.addXP(won ? 10 : 2)
      this.totalWins++

      this.lastResult = {
        won: true,
        amount: winnings,
        multiplier,
        dice: this.dice,
        total,
        message: `🎲 ${die1}+${die2}=${total} - Won ${winnings} coins!`,
      }
    } else {
      this.lastResult = {
        won: false,
        amount: 0,
        multiplier: 0,
        dice: this.dice,
        total,
        message: `🎲 ${die1}+${die2}=${total} - No match`,
      }
    }

    this._emit()
    return this.lastResult
  }

  // --- Stats Override ---

  getStats() {
    return {
      ...super.getStats(),
      dice: [...this.dice],
      lastBet: this.lastBet,
      lastResult: this.lastResult,
      totalWins: this.totalWins,
    }
  }

  save() {
    return {
      ...super.save(),
      dice: this.dice,
      lastBet: this.lastBet,
      totalWins: this.totalWins,
    }
  }

  load(data) {
    super.load(data)
    if (data.dice) this.dice = data.dice
    if (data.lastBet) this.lastBet = data.lastBet
    if (data.totalWins) this.totalWins = data.totalWins
  }
}
