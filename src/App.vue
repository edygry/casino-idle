<template>
  <div class="game">
    <!-- Header -->
    <header class="header">
      <div class="header-stats">
        <div class="stat coins">
          <span class="stat-icon">💰</span>
          <div>
            <div class="stat-value">{{ formatNumber(economy.coins) }}</div>
            <div class="stat-label">Coins</div>
          </div>
        </div>
        <div class="stat gems">
          <span class="stat-icon">💎</span>
          <div>
            <div class="stat-value">{{ formatNumber(economy.gems) }}</div>
            <div class="stat-label">Gems</div>
          </div>
        </div>
        <div class="stat level">
          <span class="stat-icon">⭐</span>
          <div>
            <div class="stat-value">Lv. {{ economy.level }}</div>
            <div class="stat-label">{{ formatNumber(economy.xp) }}/{{ formatNumber(economy.xpToNext) }} XP</div>
          </div>
        </div>
      </div>
      <div class="header-multipliers">
        <span v-if="economy.prestigeMultiplier > 1" class="badge prestige">
          ✨ x{{ economy.prestigeMultiplier.toFixed(1) }} Prestige
        </span>
        <span v-if="economy.autoRate > 0" class="badge auto">
          🤖 {{ formatNumber(economy.autoRate) }}/sec
        </span>
      </div>
    </header>

    <!-- XP Bar -->
    <div class="xp-bar">
      <div class="xp-fill" :style="{ width: xpPercent + '%' }"></div>
      <span class="xp-text">{{ formatNumber(economy.xp) }} / {{ formatNumber(economy.xpToNext) }}</span>
    </div>

    <!-- Main Content -->
    <main class="main">
      <!-- Left: Click Area -->
      <section class="click-area">
        <button class="click-btn" @click="handleClick" :disabled="clicking">
          <span class="click-icon" :class="{ animate: clicking }">🎰</span>
          <span class="click-text">+{{ formatNumber(economy.clickPower * economy.globalMultiplier * economy.prestigeMultiplier) }}</span>
        </button>
        <div class="click-info">Click Power: {{ formatNumber(economy.clickPower * economy.globalMultiplier * economy.prestigeMultiplier) }}</div>
      </section>

      <!-- Center: Active Game -->
      <section class="game-panel" v-if="activeGame">
        <div class="panel-header">
          <h2>{{ activeGame.icon }} {{ activeGame.name }}</h2>
          <div class="panel-actions">
            <button class="btn btn-small" @click="upgradeGame" :disabled="!canUpgrade">
              Upgrade ({{ formatNumber(activeGame.cost) }} 💰)
            </button>
            <span class="level-badge">Lv. {{ activeGame.level }}</span>
          </div>
        </div>

        <!-- Slot Machine -->
        <div class="slot-machine" v-if="activeGame.id === 'slots'">
          <div class="reels">
            <div v-for="(symbol, i) in activeGame.reels" :key="i" class="reel" :class="{ spinning: activeGame.spinning }">
              {{ symbol }}
            </div>
          </div>
          <button class="btn btn-play" @click="playGame" :disabled="!canPlay || activeGame.spinning">
            {{ activeGame.spinning ? 'Spinning...' : `Play (${formatNumber(activeGame.cost)} 💰)` }}
          </button>
          <div class="result" v-if="activeGame.lastResult">
            <span :class="{ win: activeGame.lastResult.won, jackpot: activeGame.lastResult.jackpot }">
              {{ activeGame.lastResult.message }}
            </span>
          </div>
          <div class="game-stats">
            <span>Plays: {{ activeGame.totalPlays }}</span>
            <span>Earned: {{ formatNumber(activeGame.totalEarned) }}</span>
            <span v-if="activeGame.jackpotCount">🎉 Jackpots: {{ activeGame.jackpotCount }}</span>
          </div>
        </div>

        <!-- Locked Game -->
        <div class="locked-game" v-else>
          <p>{{ activeGame.name }} is coming soon!</p>
          <p class="unlock-hint">Unlocks at level {{ activeGame.unlockLevel }}</p>
        </div>
      </section>

      <!-- Right: Game Select -->
      <aside class="game-select">
        <h3>Games</h3>
        <div
          v-for="game in games"
          :key="game.id"
          class="game-tab"
          :class="{ active: activeGameId === game.id, locked: !game.isUnlocked }"
          @click="selectGame(game.id)"
        >
          <span class="game-icon">{{ game.icon }}</span>
          <span class="game-name">{{ game.name }}</span>
          <span v-if="!game.isUnlocked" class="lock-icon">🔒</span>
          <span v-if="game.level > 0" class="game-level">Lv.{{ game.level }}</span>
        </div>
      </aside>
    </main>

    <!-- Bottom: Prestige & Features -->
    <footer class="footer">
      <div class="prestige-section" v-if="economy.level >= 8">
        <button class="btn btn-prestige" @click="showPrestige = true">
          ✨ Prestige ({{ prestigeGems }} gems)
        </button>
        <span class="prestige-hint">Reset for permanent multiplier</span>
      </div>

      <div class="actions">
        <button class="btn btn-small" @click="saveGame">💾 Save</button>
        <button class="btn btn-small" @click="exportSave">📤 Export</button>
        <button class="btn btn-small" @click="importSave">📥 Import</button>
      </div>
    </footer>

    <!-- Prestige Modal -->
    <div class="modal-overlay" v-if="showPrestige" @click.self="showPrestige = false">
      <div class="modal">
        <h2>✨ Prestige</h2>
        <p>Reset your progress in exchange for permanent bonuses.</p>
        <div class="prestige-info">
          <div class="prestige-row">
            <span>Gems earned:</span>
            <strong>+{{ prestigeGems }} 💎</strong>
          </div>
          <div class="prestige-row">
            <span>New multiplier:</span>
            <strong>x{{ newPrestigeMultiplier.toFixed(2) }}</strong>
          </div>
          <div class="prestige-row">
            <span>Total gems:</span>
            <strong>{{ economy.totalGemsEarned + prestigeGems }}</strong>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-prestige" @click="doPrestige" :disabled="prestigeGems < 1">
            Confirm Prestige
          </button>
          <button class="btn" @click="showPrestige = false">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Economy } from './core/Economy.js'
import { PrestigeManager } from './core/PrestigeManager.js'
import { UnlockManager } from './core/UnlockManager.js'
import { SlotMachine } from './games/SlotMachine.js'

export default {
  name: 'App',
  setup() {
    // --- Core Systems ---
    const economy = new Economy()
    const prestigeManager = new PrestigeManager(economy)
    const unlockManager = new UnlockManager(economy)

    // --- Games ---
    const slotMachine = new SlotMachine()
    slotMachine.setEconomy(economy)

    const games = ref([slotMachine])
    const activeGameId = ref('slots')
    const activeGame = computed(() => games.value.find(g => g.id === activeGameId.value))

    // --- State ---
    const clicking = ref(false)
    const showPrestige = ref(false)
    const tickInterval = ref(null)
    const autoSaveInterval = ref(null)

    // --- Computed ---
    const xpPercent = computed(() => {
      return Math.min(100, (economy.xp / economy.xpToNext) * 100)
    })

    const canPlay = computed(() => {
      return economy.coins >= (activeGame.value?.cost || 0)
    })

    const canUpgrade = computed(() => {
      return economy.coins >= (activeGame.value?.cost || 0)
    })

    const prestigeGems = computed(() => prestigeManager.getGemsOnPrestige())

    const newPrestigeMultiplier = computed(() => prestigeManager.getNewMultiplier())

    // --- Actions ---
    function handleClick() {
      clicking.value = true
      setTimeout(() => clicking.value = false, 150)
      economy.addCoins(economy.clickPower * economy.globalMultiplier * economy.prestigeMultiplier)
      economy.addXP(1)
    }

    function playGame() {
      if (!activeGame.value || !canPlay.value) return
      activeGame.value.play()
    }

    function upgradeGame() {
      if (!activeGame.value) return
      activeGame.value.upgrade()
      activeGame.value.startAutoTick()
    }

    function selectGame(id) {
      const game = games.value.find(g => g.id === id)
      if (game && game.isUnlocked) {
        activeGameId.value = id
      }
    }

    function doPrestige() {
      const result = prestigeManager.doPrestige()
      if (!result) return

      // Reset all games
      games.value.forEach(game => {
        game.level = 0
        game.totalPlays = 0
        game.totalEarned = 0
        game.stopAutoTick()
      })

      showPrestige.value = false
      saveGame()
    }

    // --- Game Loop ---
    function gameTick() {
      // Auto income from all games
      games.value.forEach(game => {
        if (game.level > 0 && game.isUnlocked) {
          const income = game.autoIncomePerSecond / 10 // tick is 100ms
          economy.addCoins(income)
          game.totalEarned += income
        }
      })

      // Check unlocks
      const newUnlocks = unlockManager.checkAll()
      if (newUnlocks.length > 0) {
        // Could show notification here
      }
    }

    // --- Persistence ---
    function saveGame() {
      const saveData = {
        economy: economy.save(),
        games: {},
        prestige: prestigeManager.history,
        version: 1,
      }

      games.value.forEach(game => {
        saveData.games[game.id] = game.save()
      })

      localStorage.setItem('casino-idle-save', JSON.stringify(saveData))
    }

    function loadGame() {
      try {
        const raw = localStorage.getItem('casino-idle-save')
        if (!raw) return

        const data = JSON.parse(raw)
        if (!data || data.version !== 1) return

        economy.load(data.economy)

        games.value.forEach(game => {
          if (data.games[game.id]) {
            game.load(data.games[game.id])
            game.setEconomy(economy)
            if (game.level > 0) game.startAutoTick()
          }
        })

        prestigeManager.load()
      } catch (e) {
        console.warn('Failed to load save:', e)
      }
    }

    function exportSave() {
      saveGame()
      const raw = localStorage.getItem('casino-idle-save')
      const blob = new Blob([raw], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'casino-idle-save.json'
      a.click()
      URL.revokeObjectURL(url)
    }

    function importSave() {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.onchange = (e) => {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => {
          try {
            localStorage.setItem('casino-idle-save', ev.target.result)
            location.reload()
          } catch (err) {
            alert('Invalid save file!')
          }
        }
        reader.readAsText(file)
      }
      input.click()
    }

    // --- Format ---
    function formatNumber(n) {
      if (n === undefined || n === null) return '0'
      n = Number(n)
      if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T'
      if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
      if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
      if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
      return Math.floor(n).toLocaleString()
    }

    // --- Lifecycle ---
    onMounted(() => {
      loadGame()
      tickInterval.value = setInterval(gameTick, 100)
      autoSaveInterval.value = setInterval(saveGame, 30000) // auto-save every 30s
    })

    onUnmounted(() => {
      clearInterval(tickInterval.value)
      clearInterval(autoSaveInterval.value)
      games.value.forEach(g => g.destroy())
    })

    return {
      economy,
      games,
      activeGameId,
      activeGame,
      clicking,
      showPrestige,
      xpPercent,
      canPlay,
      canUpgrade,
      prestigeGems,
      newPrestigeMultiplier,
      handleClick,
      playGame,
      upgradeGame,
      selectGame,
      doPrestige,
      saveGame,
      exportSave,
      importSave,
      formatNumber,
    }
  },
}
</script>

<style>
/* --- Reset & Base --- */
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  background: #0a0a1a;
  color: #e0e0e0;
  min-height: 100vh;
  overflow-x: hidden;
}

/* --- Game Container --- */
.game {
  max-width: 900px;
  margin: 0 auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 100vh;
}

/* --- Header --- */
.header {
  background: linear-gradient(135deg, #1a1a3e 0%, #0d0d2b 100%);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #2a2a5a;
}

.header-stats {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.stat {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.05);
  padding: 8px 16px;
  border-radius: 8px;
  flex: 1;
  min-width: 120px;
}

.stat-icon { font-size: 24px; }
.stat-value { font-size: 18px; font-weight: bold; }
.stat-label { font-size: 11px; color: #888; }

.header-multipliers {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.badge {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(255,255,255,0.1);
}

.badge.prestige { background: rgba(147, 51, 234, 0.3); color: #c084fc; }
.badge.auto { background: rgba(34, 197, 94, 0.3); color: #4ade80; }

/* --- XP Bar --- */
.xp-bar {
  height: 20px;
  background: #1a1a3e;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  border: 1px solid #2a2a5a;
}

.xp-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  transition: width 0.3s ease;
  border-radius: 10px;
}

.xp-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 11px;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}

/* --- Main Layout --- */
.main {
  display: grid;
  grid-template-columns: 1fr 2fr 160px;
  gap: 12px;
  flex: 1;
}

@media (max-width: 700px) {
  .main {
    grid-template-columns: 1fr;
  }
}

/* --- Click Area --- */
.click-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: linear-gradient(135deg, #1a1a3e 0%, #0d0d2b 100%);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #2a2a5a;
}

.click-btn {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 3px solid #6366f1;
  background: linear-gradient(135deg, #312e81 0%, #1e1b4b 100%);
  color: white;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: transform 0.1s, box-shadow 0.1s;
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
}

.click-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 0 30px rgba(99, 102, 241, 0.5);
}

.click-btn:active {
  transform: scale(0.95);
}

.click-icon { font-size: 48px; }
.click-icon.animate { animation: bounce 0.15s ease; }
.click-text { font-size: 14px; font-weight: bold; }

@keyframes bounce {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.click-info { font-size: 12px; color: #888; }

/* --- Game Panel --- */
.game-panel {
  background: linear-gradient(135deg, #1a1a3e 0%, #0d0d2b 100%);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #2a2a5a;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.panel-header h2 { font-size: 18px; }

.panel-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.level-badge {
  background: rgba(99, 102, 241, 0.3);
  color: #a5b4fc;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

/* --- Slot Machine --- */
.slot-machine {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.reels {
  display: flex;
  gap: 12px;
}

.reel {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  background: #0a0a1a;
  border: 2px solid #2a2a5a;
  border-radius: 12px;
  transition: all 0.2s;
}

.reel.spinning {
  animation: spin 0.1s linear infinite;
}

@keyframes spin {
  0% { transform: translateY(-2px); }
  50% { transform: translateY(2px); }
  100% { transform: translateY(-2px); }
}

.result {
  font-size: 16px;
  font-weight: 600;
  min-height: 24px;
}

.result .win { color: #4ade80; }
.result .jackpot { color: #fbbf24; animation: glow 0.5s ease infinite alternate; }

@keyframes glow {
  from { text-shadow: 0 0 5px #fbbf24; }
  to { text-shadow: 0 0 20px #fbbf24, 0 0 40px #f59e0b; }
}

.game-stats {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #888;
}

/* --- Locked Game --- */
.locked-game {
  text-align: center;
  padding: 40px;
  color: #666;
}

.unlock-hint { font-size: 13px; color: #6366f1; margin-top: 8px; }

/* --- Game Select --- */
.game-select {
  background: linear-gradient(135deg, #1a1a3e 0%, #0d0d2b 100%);
  border-radius: 12px;
  padding: 12px;
  border: 1px solid #2a2a5a;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.game-select h3 {
  font-size: 12px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 4px;
}

.game-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 13px;
}

.game-tab:hover { background: rgba(255,255,255,0.05); }
.game-tab.active { background: rgba(99, 102, 241, 0.2); }
.game-tab.locked { opacity: 0.4; cursor: not-allowed; }

.game-icon { font-size: 18px; }
.game-name { flex: 1; }
.game-level { font-size: 10px; color: #6366f1; }
.lock-icon { font-size: 12px; }

/* --- Footer --- */
.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px;
  background: rgba(255,255,255,0.02);
  border-radius: 12px;
  border: 1px solid #1a1a3e;
}

.prestige-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.prestige-hint { font-size: 11px; color: #888; }

.actions {
  display: flex;
  gap: 6px;
}

/* --- Buttons --- */
.btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid #2a2a5a;
  background: #1a1a3e;
  color: #e0e0e0;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.btn:hover { background: #2a2a5a; }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-small {
  padding: 4px 10px;
  font-size: 11px;
}

.btn-play {
  padding: 12px 32px;
  font-size: 16px;
  font-weight: bold;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  border: none;
  color: white;
}

.btn-play:hover { background: linear-gradient(135deg, #818cf8, #6366f1); }

.btn-prestige {
  background: linear-gradient(135deg, #9333ea, #7c3aed);
  border: none;
  color: white;
  font-weight: bold;
}

.btn-prestige:hover { background: linear-gradient(135deg, #a855f7, #9333ea); }

/* --- Modal --- */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: #1a1a3e;
  border: 1px solid #2a2a5a;
  border-radius: 16px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal h2 { font-size: 22px; }

.prestige-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(0,0,0,0.2);
  padding: 12px;
  border-radius: 8px;
}

.prestige-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
