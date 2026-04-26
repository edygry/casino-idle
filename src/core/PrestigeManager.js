/**
 * PrestigeManager - Handles prestige (reset) mechanics
 * Inspired by Adventure Capitalist, Antimatter Dimensions, Paperclip Simulator
 */
export class PrestigeManager {
  constructor(economy) {
    this.economy = economy
    this.history = []
  }

  // --- Calculate ---

  getGemsOnPrestige() {
    return this.economy.getPrestigeGems()
  }

  getNewMultiplier() {
    const gems = this.getGemsOnPrestige()
    const newTotal = this.economy.totalGemsEarned + gems
    return 1 + 0.1 * newTotal
  }

  canPrestige() {
    return this.getGemsOnPrestige() >= 1
  }

  // --- Execute ---

  doPrestige() {
    const gems = this.getGemsOnPrestige()
    if (gems < 1) return null

    const snapshot = {
      timestamp: Date.now(),
      coinsBefore: this.economy.totalCoinsEarned,
      levelBefore: this.economy.level,
      gemsEarned: gems,
      newMultiplier: 1 + 0.1 * (this.economy.totalGemsEarned + gems),
      prestigeCount: this.economy.prestigeCount + 1,
    }

    this.economy.doPrestige()
    this.history.push(snapshot)
    this._save()
    return snapshot
  }

  // --- Bonus System ---

  // Gem bonuses that permanently boost things
  buyBonus(type) {
    const costs = {
      clickBoost: 5,
      xpBoost: 10,
      slotLuck: 15,
      autoBoost: 20,
    }

    const cost = costs[type]
    if (!cost || this.economy.gems < cost) return false

    this.economy.gems -= cost

    switch (type) {
      case 'clickBoost':
        this.economy.clickPower += 2
        break
      case 'xpBoost':
        this.economy.setGlobalMultiplier(this.economy.globalMultiplier + 0.25)
        break
      case 'slotLuck':
        // Handled in slot machine logic
        break
      case 'autoBoost':
        this.economy.setAutoRate(this.economy.autoRate + 5)
        break
    }

    this._save()
    return true
  }

  // --- Persistence ---

  _save() {
    const data = {
      history: this.history,
    }
    localStorage.setItem('casino-idle-prestige', JSON.stringify(data))
  }

  load() {
    try {
      const raw = localStorage.getItem('casino-idle-prestige')
      if (raw) {
        const data = JSON.parse(raw)
        this.history = data.history || []
      }
    } catch (e) {
      console.warn('Failed to load prestige data:', e)
    }
  }
}
