const KEY = 'habit-tracker-data'

export function loadData() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    return {}
  }
}

export function saveData(data) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

export function getToday() {
  return new Date().toISOString().slice(0, 10)
}

export function getDayRecord(data, date) {
  return data[date] || {
    meals: { breakfast: false, lunch: false, dinner: false },
    sleep: { sleepAt: null, wakeAt: null, hours: null },
    exercise: false,
  }
}

export function setDayRecord(data, date, record) {
  return { ...data, [date]: record }
}

// 回傳近 N 天的日期字串陣列（含今天）
export function getRecentDates(days) {
  const result = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    result.push(d.toISOString().slice(0, 10))
  }
  return result
}

export function calcSleepHours(sleepAt, wakeAt) {
  if (!sleepAt || !wakeAt) return null
  const [sh, sm] = sleepAt.split(':').map(Number)
  const [wh, wm] = wakeAt.split(':').map(Number)
  let minutes = (wh * 60 + wm) - (sh * 60 + sm)
  if (minutes < 0) minutes += 24 * 60 // 跨午夜
  return Math.round((minutes / 60) * 10) / 10
}

// 每日達成狀況：'full' | 'partial' | 'none' | 'empty'
export function getDayStatus(record) {
  if (!record) return 'empty'
  const { meals, sleep, exercise } = record
  const mealScore = [meals.breakfast, meals.lunch, meals.dinner].filter(Boolean).length
  const sleepOk = sleep.hours !== null && sleep.hours >= 7
  const exOk = exercise
  const total = mealScore + (sleepOk ? 1 : 0) + (exOk ? 1 : 0)
  const hasAny = mealScore > 0 || sleep.sleepAt || sleep.wakeAt || exercise
  if (!hasAny) return 'empty'
  if (mealScore === 3 && sleepOk && exOk) return 'full'
  return 'partial'
}
