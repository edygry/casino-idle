/**
 * Economy - Central game economy manager
 * Handles currency, multipliers, and prestige state
 */
export class Economy {
  constructor() {
    this.coins = 0
    this.totalCoinsEarned = 0
    this.totalCoinsEarnedAllTime = 0
    this.gems = 0
    this.totalGemsEarned = 0
    this.level = 1
    this.xp = 0
    this.xpToNext = 100
    this.clickPower = 1
    this.autoRate = 0 // coins per second from idle income
    this.globalMultiplier = 1
    this.prestigeMultiplier = 1
    this.prestigeCount = 0
    this.listeners = []
  }

  // --- Currency ---

  addCoins(amount) {
    const adjusted = amount * this.globalMultiplier * this.prestigeMultiplier
    this.coins += adjusted
    this.totalCoinsEarned += adjusted
    this.totalCoinsEarnedAllTime += adjusted
    this._notify()
    return adjusted
  }

  spendCoins(amount) {
    if (this.coins < amount) return false
    this.coins -= amount
    this._notify()
    return true
  }

  addGems(amount) {
    this.gems += amount
    this.totalGemsEarned += amount
    this._notify()
  }

  // --- Leveling ---

  addXP(amount) {
    this.xp += amount
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext
      this.level++
      this.xpToNext = Math.floor(100 * Math.pow(1.5, this.level - 1))
      this.clickPower = 1 + Math.floor(this.level / 5)
      this._notify('levelUp', { level: this.level })
    }
    this._notify()
  }

  // --- Multipliers ---

  setGlobalMultiplier(val) {
    this.globalMultiplier = val
    this._notify()
  }

  setPrestigeMultiplier(val) {
    this.prestigeMultiplier = val
    this._notify()
  }

  // --- Auto Income ---

  setAutoRate(rate) {
    this.autoRate = rate
    this._notify()
  }

  // --- Prestige ---

  getPrestigeGems() {
    // Gems on prestige = floor(totalCoinsEarned / 1000) + prestigeCount * 5
    return Math.floor(this.totalCoinsEarned / 1000) + this.prestigeCount * 5
  }

  doPrestige() {
    const gems = this.getPrestigeGems()
    if (gems < 1) return null

    this.prestigeCount++
    this.gems += gems
    this.totalGemsEarned += gems

    // Calculate new prestige multiplier: 1 + 0.1 * totalGems
    this.prestigeMultiplier = 1 + 0.1 * this.totalGemsEarned

    // Reset economy but keep gems and prestige stats
    const state = {
      gems: this.gems,
      prestigeCount: this.prestigeCount,
      prestigeMultiplier: this.prestigeMultiplier,
      totalGemsEarned: this.totalGemsEarned,
      totalCoinsEarnedAllTime: this.totalCoinsEarnedAllTime,
    }

    this.coins = 0
    this.totalCoinsEarned = 0
    this.level = 1
    this.xp = 0
    this.xpToNext = 100
    this.clickPower = 1
    this.autoRate = 0
    this.globalMultiplier = 1

    this._notify('prestige', { gems, multiplier: this.prestigeMultiplier })
    return state
  }

  // --- Persistence ---

  save() {
    return {
      coins: this.coins,
      totalCoinsEarned: this.totalCoinsEarned,
      totalCoinsEarnedAllTime: this.totalCoinsEarnedAllTime,
      gems: this.gems,
      totalGemsEarned: this.totalGemsEarned,
      level: this.level,
      xp: this.xp,
      xpToNext: this.xpToNext,
      clickPower: this.clickPower,
      autoRate: this.autoRate,
      globalMultiplier: this.globalMultiplier,
      prestigeMultiplier: this.prestigeMultiplier,
      prestigeCount: this.prestigeCount,
    }
  }

  load(state) {
    if (!state) return
    Object.assign(this, state)
    this.listeners = []
    this._notify()
  }

  // --- Observer ---

  onChange(fn) {
    this.listeners.push(fn)
  }

  _notify(event = 'change', data = {}) {
    this.listeners.forEach(fn => fn(event, data))
  }
}
