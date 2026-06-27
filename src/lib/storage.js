const KEY = 'habit-tracker-data'
const SLEEP_KEY = 'habit-tracker-pending-sleep'

export function loadData() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} }
}

export function saveData(data) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

// 跨日睡眠暫存
export function loadPendingSleep() {
  try { return JSON.parse(localStorage.getItem(SLEEP_KEY)) } catch { return null }
}

export function savePendingSleep(obj) {
  localStorage.setItem(SLEEP_KEY, JSON.stringify(obj))
}

export function clearPendingSleep() {
  localStorage.removeItem(SLEEP_KEY)
}

export function getToday() {
  return new Date().toISOString().slice(0, 10)
}

export function nowTime() {
  return new Date().toTimeString().slice(0, 5)
}

export function getDayRecord(data, date) {
  return data[date] || emptyRecord()
}

export function emptyRecord() {
  return {
    meals: { breakfast: null, lunch: null, dinner: null },
    sleep: { sleepAt: null, wakeAt: null, hours: null },
    exercise: null,
  }
}

export function setDayRecord(data, date, record) {
  return { ...data, [date]: record }
}

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
  if (minutes < 0) minutes += 24 * 60
  return Math.round((minutes / 60) * 10) / 10
}

export function getDayStatus(record) {
  if (!record) return 'empty'
  const { meals, sleep, exercise } = record
  const mealScore = [meals.breakfast, meals.lunch, meals.dinner].filter(Boolean).length
  const sleepOk = sleep.hours != null && sleep.hours >= 7
  const exOk = !!exercise
  const hasAny = mealScore > 0 || sleep.sleepAt || sleep.wakeAt || exercise
  if (!hasAny) return 'empty'
  if (mealScore === 3 && sleepOk && exOk) return 'full'
  return 'partial'
}

// 時間字串轉分鐘數（方便計算平均）
export function timeToMinutes(t) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function minutesToTime(m) {
  if (m == null) return null
  const h = Math.floor(((m % 1440) + 1440) % 1440 / 60)
  const min = Math.round(((m % 1440) + 1440) % 1440 % 60)
  return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`
}
