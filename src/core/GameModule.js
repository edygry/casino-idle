/**
 * GameModule - Base class for all casino games
 * Each game extends this and implements its own logic
 */
export class GameModule {
  constructor(config) {
    this.id = config.id
    this.name = config.name
    this.icon = config.icon || '🎰'
    this.description = config.description || ''
    this.baseCost = config.baseCost || 10
    this.baseReward = config.baseReward || 5
    this.unlockLevel = config.unlockLevel || 1
    this.level = 0
    this.totalPlays = 0
    this.totalEarned = 0
    this.economy = null
    this.onUpdate = null
    this._intervalId = null
  }

  // --- Core ---

  setEconomy(economy) {
    this.economy = economy
  }

  get cost() {
    return Math.floor(this.baseCost * Math.pow(1.15, this.level))
  }

  get reward() {
    return Math.floor(this.baseReward * Math.pow(1.12, this.level))
  }

  get isUnlocked() {
    return this.economy ? this.economy.level >= this.unlockLevel : false
  }

  // --- Upgrade ---

  upgrade() {
    if (!this.economy) return false
    if (!this.economy.spendCoins(this.cost)) return false
    this.level++
    this.economy.addXP(10 + this.level * 5)
    this._emit()
    return true
  }

  // --- Play ---

  play(bet = null) {
    // Override in subclass
    return { won: false, amount: 0, message: 'Not implemented' }
  }

  // --- Auto Income ---

  get autoIncomePerSecond() {
    if (this.level === 0) return 0
    return this.reward * this.level * 0.1 * (this.economy?.prestigeMultiplier || 1)
  }

  startAutoTick() {
    if (this._intervalId) return
    this._intervalId = setInterval(() => {
      const income = this.autoIncomePerSecond
      if (income > 0 && this.economy) {
        this.economy.addCoins(income)
        this.totalEarned += income
        this._emit()
      }
    }, 1000)
  }

  stopAutoTick() {
    if (this._intervalId) {
      clearInterval(this._intervalId)
      this._intervalId = null
    }
  }

  // --- Stats ---

  getStats() {
    return {
      id: this.id,
      name: this.name,
      icon: this.icon,
      level: this.level,
      cost: this.cost,
      reward: this.reward,
      totalPlays: this.totalPlays,
      totalEarned: this.totalEarned,
      autoIncomePerSecond: this.autoIncomePerSecond,
      isUnlocked: this.isUnlocked,
      unlockLevel: this.unlockLevel,
    }
  }

  // --- Persistence ---

  save() {
    return {
      level: this.level,
      totalPlays: this.totalPlays,
      totalEarned: this.totalEarned,
    }
  }

  load(data) {
    if (!data) return
    this.level = data.level || 0
    this.totalPlays = data.totalPlays || 0
    this.totalEarned = data.totalEarned || 0
  }

  // --- Internal ---

  _emit() {
    if (this.onUpdate) this.onUpdate(this.id)
  }

  destroy() {
    this.stopAutoTick()
  }
}
