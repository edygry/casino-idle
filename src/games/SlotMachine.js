/**
 * SlotMachine - Slot machine game module
 * Classic 3-reel slots with symbol matching
 */
import { GameModule } from '../core/GameModule.js'

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣', '🍀']
const PAYOUTS = {
  '🍒': 2,    // 3 cherries = 2x
  '🍋': 3,    // 3 lemons = 3x
  '🍊': 4,    // 3 oranges = 4x
  '🍇': 5,    // 3 grapes = 5x
  '💎': 10,   // 3 diamonds = 10x
  '7️⃣': 25,   // 3 sevens = 25x
  '🍀': 50,   // 3 clovers = 50x (jackpot!)
}

// Weighted probabilities - rarer symbols pay more
const WEIGHTS = {
  '🍒': 30,
  '🍋': 25,
  '🍊': 20,
  '🍇': 12,
  '💎': 8,
  '7️⃣': 3,
  '🍀': 2,
}

export class SlotMachine extends GameModule {
  constructor() {
    super({
      id: 'slots',
      name: 'Slot Machine',
      icon: '🎰',
      description: 'Classic 3-reel slots. Match symbols to win big!',
      baseCost: 10,
      baseReward: 15,
      unlockLevel: 1,
    })

    this.reels = ['🍒', '🍒', '🍒']
    this.spinning = false
    this.lastResult = null
    this.jackpotCount = 0
    this.bigWinCount = 0
  }

  // --- Spin Logic ---

  play(bet = null) {
    if (this.spinning) return { won: false, amount: 0, message: 'Spinning...' }

    const cost = bet || this.cost
    if (!this.economy || !this.economy.spendCoins(cost)) {
      return { won: false, amount: 0, message: 'Not enough coins!' }
    }

    this.spinning = true
    this.totalPlays++

    // Generate random reels
    this.reels = this._generateReels()

    // Calculate payout
    const result = this._calculatePayout(cost)
    this.lastResult = result

    if (result.won) {
      const adjustedReward = Math.floor(result.amount * (this.economy.prestigeMultiplier || 1))
      this.economy.addCoins(adjustedReward)
      this.totalEarned += adjustedReward
      this.economy.addXP(result.jackpot ? 50 : result.bigWin ? 20 : 5)

      if (result.jackpot) this.jackpotCount++
      if (result.bigWin) this.bigWinCount++
    }

    this.spinning = false
    this._emit()
    return result
  }

  _generateReels() {
    const reels = []
    for (let i = 0; i < 3; i++) {
      reels.push(this._weightedRandom())
    }
    return reels
  }

  _weightedRandom() {
    const totalWeight = Object.values(WEIGHTS).reduce((a, b) => a + b, 0)
    let rand = Math.random() * totalWeight
    for (const [symbol, weight] of Object.entries(WEIGHTS)) {
      rand -= weight
      if (rand <= 0) return symbol
    }
    return SYMBOLS[0]
  }

  _calculatePayout(bet) {
    const [a, b, c] = this.reels

    // Three of a kind
    if (a === b && b === c) {
      const multiplier = PAYOUTS[a] || 2
      const amount = Math.floor(bet * multiplier)
      const isJackpot = a === '🍀'
      const isBigWin = multiplier >= 10

      return {
        won: true,
        amount,
        multiplier,
        jackpot: isJackpot,
        bigWin: isBigWin,
        message: isJackpot
          ? `🎉 JACKPOT! ${a}${a}${a} — ${multiplier}x!`
          : isBigWin
          ? `🔥 BIG WIN! ${a}${a}${a} — ${multiplier}x!`
          : `✅ ${a}${a}${a} — ${multiplier}x`,
      }
    }

    // Two of a kind (small consolation)
    if (a === b || b === c || a === c) {
      const amount = Math.floor(bet * 1.2)
      return {
        won: true,
        amount,
        multiplier: 1.2,
        jackpot: false,
        bigWin: false,
        message: `✨ Pair! ${a}${b}${c} — 1.2x back`,
      }
    }

    return {
      won: false,
      amount: 0,
      multiplier: 0,
      jackpot: false,
      bigWin: false,
      message: `💨 ${a}${b}${c} — No match`,
    }
  }

  // --- Stats Override ---

  getStats() {
    return {
      ...super.getStats(),
      reels: [...this.reels],
      spinning: this.spinning,
      lastResult: this.lastResult,
      jackpotCount: this.jackpotCount,
      bigWinCount: this.bigWinCount,
    }
  }

  save() {
    return {
      ...super.save(),
      reels: this.reels,
      jackpotCount: this.jackpotCount,
      bigWinCount: this.bigWinCount,
    }
  }

  load(data) {
    super.load(data)
    if (data.reels) this.reels = data.reels
    if (data.jackpotCount) this.jackpotCount = data.jackpotCount
    if (data.bigWinCount) this.bigWinCount = data.bigWinCount
  }
}
