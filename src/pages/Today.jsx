import { useState, useEffect, useCallback } from 'react'
import { loadData, saveData, getToday, getDayRecord, setDayRecord, calcSleepHours } from '../lib/storage'
import './Today.css'

const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六']
const MEALS = [
  { key: 'breakfast', label: '早餐' },
  { key: 'lunch', label: '午餐' },
  { key: 'dinner', label: '晚餐' },
]

export default function Today() {
  const today = getToday()
  const [data, setData] = useState(loadData)
  const record = getDayRecord(data, today)

  const save = useCallback((updatedRecord) => {
    const next = setDayRecord(data, today, updatedRecord)
    setData(next)
    saveData(next)
  }, [data, today])

  // 每分鐘重新渲染，確保日期正確
  useEffect(() => {
    const id = setInterval(() => setData(loadData()), 60000)
    return () => clearInterval(id)
  }, [])

  function toggleMeal(key) {
    save({ ...record, meals: { ...record.meals, [key]: !record.meals[key] } })
  }

  function toggleExercise() {
    save({ ...record, exercise: !record.exercise })
  }

  function recordSleep() {
    const now = new Date().toTimeString().slice(0, 5)
    save({ ...record, sleep: { ...record.sleep, sleepAt: now, wakeAt: null, hours: null } })
  }

  function recordWake() {
    const now = new Date().toTimeString().slice(0, 5)
    const hours = calcSleepHours(record.sleep.sleepAt, now)
    save({ ...record, sleep: { ...record.sleep, wakeAt: now, hours } })
  }

  function resetSleep() {
    save({ ...record, sleep: { sleepAt: null, wakeAt: null, hours: null } })
  }

  const dateObj = new Date(today + 'T00:00:00')
  const dateStr = `${dateObj.getMonth() + 1} 月 ${dateObj.getDate()} 日（${WEEK_DAYS[dateObj.getDay()]}）`

  const { sleep } = record
  const sleepDone = sleep.hours !== null && sleep.hours >= 7
  const sleeping = sleep.sleepAt && !sleep.wakeAt

  return (
    <div className="today">
      <header className="today-header">
        <div className="today-date">{dateStr}</div>
        <div className="today-title">今日習慣</div>
      </header>

      {/* 吃飯 */}
      <section className="card">
        <div className="card-title">🍽️ 吃飯</div>
        <div className="meal-row">
          {MEALS.map(({ key, label }) => (
            <button
              key={key}
              className={`meal-btn ${record.meals[key] ? 'checked' : ''}`}
              onClick={() => toggleMeal(key)}
            >
              <span className="check-icon">{record.meals[key] ? '✅' : '⬜'}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 睡覺 */}
      <section className="card">
        <div className="card-title">😴 睡覺</div>
        {!sleep.sleepAt ? (
          <button className="action-btn sleep-btn" onClick={recordSleep}>
            🌙 開始睡覺
          </button>
        ) : sleeping ? (
          <div className="sleep-status sleeping">
            <div className="sleep-info">
              <span>入睡時間</span>
              <strong>{sleep.sleepAt}</strong>
            </div>
            <button className="action-btn wake-btn" onClick={recordWake}>
              ☀️ 我醒了
            </button>
            <button className="reset-btn" onClick={resetSleep}>重置</button>
          </div>
        ) : (
          <div className={`sleep-status ${sleepDone ? 'done' : 'partial'}`}>
            <div className="sleep-row">
              <div className="sleep-info">
                <span>入睡</span>
                <strong>{sleep.sleepAt}</strong>
              </div>
              <div className="sleep-info">
                <span>起床</span>
                <strong>{sleep.wakeAt}</strong>
              </div>
              <div className="sleep-info">
                <span>時數</span>
                <strong className={sleepDone ? 'green' : 'orange'}>{sleep.hours} 小時</strong>
              </div>
            </div>
            <div className="sleep-target">{sleepDone ? '✅ 達標（≥7小時）' : `⚠️ 未達標（差 ${(7 - sleep.hours).toFixed(1)} 小時）`}</div>
            <button className="reset-btn" onClick={resetSleep}>重置</button>
          </div>
        )}
      </section>

      {/* 運動 */}
      <section className="card">
        <div className="card-title">💪 運動</div>
        <button
          className={`exercise-btn ${record.exercise ? 'checked' : ''}`}
          onClick={toggleExercise}
        >
          {record.exercise ? '✅ 今天有動！' : '⬜ 今天還沒運動'}
        </button>
      </section>
    </div>
  )
}
