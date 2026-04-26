/**
 * UnlockManager - Manages game progression and unlocks
 */
export class UnlockManager {
  constructor(economy) {
    this.economy = economy
    this.unlocks = new Set()
    this.definitions = {
      // Games unlock at certain levels
      slots: { type: 'game', name: 'Slot Machine', level: 1, icon: '🎰' },
      dice: { type: 'game', name: 'Dice Roll', level: 5, icon: '🎲' },
      crash: { type: 'game', name: 'Crash', level: 10, icon: '📈' },
      mines: { type: 'game', name: 'Mines', level: 15, icon: '💣' },
      roulette: { type: 'game', name: 'Roulette', level: 20, icon: '🎡' },
      // Features
      autoSave: { type: 'feature', name: 'Auto Save', level: 2 },
      stats: { type: 'feature', name: 'Statistics', level: 3 },
      prestige: { type: 'feature', name: 'Prestige System', level: 8 },
      achievements: { type: 'feature', name: 'Achievements', level: 12 },
      vip: { type: 'feature', name: 'VIP Tier', level: 20 },
    }
  }

  checkAll() {
    const newUnlocks = []
    for (const [key, def] of Object.entries(this.definitions)) {
      if (!this.unlocks.has(key) && this.economy.level >= def.level) {
        this.unlocks.add(key)
        newUnlocks.push({ key, ...def })
      }
    }
    return newUnlocks
  }

  isUnlocked(key) {
    return this.unlocks.has(key)
  }

  getLocked(key) {
    const def = this.definitions[key]
    if (!def) return null
    return {
      ...def,
      remaining: Math.max(0, def.level - this.economy.level),
    }
  }

  getGameUnlocks() {
    return Object.entries(this.definitions)
      .filter(([_, def]) => def.type === 'game')
      .map(([key, def]) => ({
        key,
        ...def,
        unlocked: this.unlocks.has(key),
      }))
  }

  getFeatureUnlocks() {
    return Object.entries(this.definitions)
      .filter(([_, def]) => def.type === 'feature')
      .map(([key, def]) => ({
        key,
        ...def,
        unlocked: this.unlocks.has(key),
      }))
  }
}
