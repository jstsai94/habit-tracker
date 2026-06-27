import { useState, useEffect, useCallback } from 'react'
import {
  loadData, saveData, getToday, getDayRecord, setDayRecord,
  loadPendingSleep, savePendingSleep, clearPendingSleep,
  calcSleepHours, nowTime, emptyRecord,
} from '../lib/storage'
import './Today.css'

const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六']
const MEALS = [
  { key: 'breakfast', label: '早餐', icon: '🌅' },
  { key: 'lunch',     label: '午餐', icon: '☀️' },
  { key: 'dinner',    label: '晚餐', icon: '🌙' },
]

export default function Today() {
  const today = getToday()
  const [data, setData] = useState(loadData)
  const [pending, setPending] = useState(loadPendingSleep)
  // { key, field } — which item is showing time picker
  const [picker, setPicker] = useState(null)
  const [pickerVal, setPickerVal] = useState('')

  const record = getDayRecord(data, today)

  const save = useCallback((updatedRecord) => {
    const next = setDayRecord(data, today, updatedRecord)
    setData(next)
    saveData(next)
  }, [data, today])

  useEffect(() => {
    const id = setInterval(() => {
      setData(loadData())
      setPending(loadPendingSleep())
    }, 60000)
    return () => clearInterval(id)
  }, [])

  // ── 吃飯 ──
  function toggleMeal(key, time) {
    const t = time || nowTime()
    const current = record.meals[key]
    save({ ...record, meals: { ...record.meals, [key]: current ? null : t } })
  }

  function openMealPicker(key) {
    setPickerVal(record.meals[key] || nowTime())
    setPicker({ type: 'meal', key })
  }

  function confirmPicker() {
    if (!picker) return
    if (picker.type === 'meal') {
      save({ ...record, meals: { ...record.meals, [picker.key]: pickerVal } })
    } else if (picker.type === 'exercise') {
      save({ ...record, exercise: pickerVal })
    }
    setPicker(null)
  }

  // ── 睡覺 ──
  function startSleep() {
    const t = nowTime()
    const obj = { sleepAt: t, date: today }
    savePendingSleep(obj)
    setPending(obj)
  }

  function recordWake(time) {
    const t = time || nowTime()
    const sleepAt = pending?.sleepAt || null
    const hours = calcSleepHours(sleepAt, t)
    // 算在今天（起床日）
    const updated = { ...record, sleep: { sleepAt, wakeAt: t, hours } }
    save(updated)
    clearPendingSleep()
    setPending(null)
  }

  function resetSleep() {
    save({ ...record, sleep: { sleepAt: null, wakeAt: null, hours: null } })
    clearPendingSleep()
    setPending(null)
  }

  // ── 運動 ──
  function toggleExercise(time) {
    const t = time || nowTime()
    save({ ...record, exercise: record.exercise ? null : t })
  }

  function openExPicker() {
    setPickerVal(record.exercise || nowTime())
    setPicker({ type: 'exercise' })
  }

  const dateObj = new Date(today + 'T00:00:00')
  const dateStr = `${dateObj.getMonth() + 1} 月 ${dateObj.getDate()} 日（${WEEK_DAYS[dateObj.getDay()]}）`

  const { sleep } = record
  const sleepOk = sleep.hours != null && sleep.hours >= 7
  const sleeping = !!pending

  return (
    <div className="today">
      <header className="today-header">
        <div className="today-date">{dateStr}</div>
        <div className="today-title">今日習慣</div>
      </header>

      {/* 吃飯 */}
      <section className="card">
        <div className="card-title">🍽️ 吃飯</div>
        <div className="meal-list">
          {MEALS.map(({ key, label, icon }) => {
            const val = record.meals[key]
            return (
              <div key={key} className={`meal-row ${val ? 'checked' : ''}`}>
                <button className="meal-main" onClick={() => toggleMeal(key)}>
                  <span className="meal-icon">{icon}</span>
                  <span className="meal-label">{label}</span>
                  {val
                    ? <span className="meal-time">{val} ✅</span>
                    : <span className="meal-empty">未記錄</span>
                  }
                </button>
                <button className="plus-btn" onClick={() => openMealPicker(key)} title="補登時間">＋</button>
              </div>
            )
          })}
        </div>
      </section>

      {/* 睡覺 */}
      <section className="card">
        <div className="card-title">😴 睡覺</div>

        {/* 有已完成的睡眠紀錄 */}
        {sleep.wakeAt && !sleeping && (
          <div className={`sleep-done ${sleepOk ? 'ok' : 'warn'}`}>
            <div className="sleep-row">
              <div className="sleep-col"><span>入睡</span><strong>{sleep.sleepAt}</strong></div>
              <div className="sleep-col"><span>起床</span><strong>{sleep.wakeAt}</strong></div>
              <div className="sleep-col">
                <span>時數</span>
                <strong className={sleepOk ? 'green' : 'orange'}>{sleep.hours} 小時</strong>
              </div>
            </div>
            <div className="sleep-tag">{sleepOk ? '✅ 達標（≥7小時）' : `⚠️ 未達標（差 ${(7 - sleep.hours).toFixed(1)} 小時）`}</div>
            <button className="reset-btn" onClick={resetSleep}>重置</button>
          </div>
        )}

        {/* 正在睡覺（跨日暫存） */}
        {sleeping && (
          <div className="sleep-ing">
            <div className="sleep-ing-info">🌙 入睡時間：<strong>{pending.sleepAt}</strong>（{pending.date}）</div>
            <button className="action-btn wake-btn" onClick={() => recordWake()}>☀️ 我醒了</button>
            <button className="reset-btn" onClick={resetSleep}>重置</button>
          </div>
        )}

        {/* 還沒睡 */}
        {!sleeping && !sleep.wakeAt && (
          <button className="action-btn sleep-btn" onClick={startSleep}>🌙 開始睡覺</button>
        )}
      </section>

      {/* 運動 */}
      <section className="card">
        <div className="card-title">💪 運動</div>
        <div className={`exercise-row ${record.exercise ? 'checked' : ''}`}>
          <button className="exercise-main" onClick={() => toggleExercise()}>
            {record.exercise
              ? <span>✅ 今天有動！<em>{record.exercise}</em></span>
              : <span>⬜ 今天還沒運動</span>
            }
          </button>
          <button className="plus-btn" onClick={openExPicker} title="補登時間">＋</button>
        </div>
      </section>

      {/* 補登 picker */}
      {picker && (
        <div className="picker-overlay" onClick={() => setPicker(null)}>
          <div className="picker-modal" onClick={e => e.stopPropagation()}>
            <div className="picker-title">
              {picker.type === 'meal'
                ? `補登${MEALS.find(m => m.key === picker.key)?.label}時間`
                : '補登運動時間'}
            </div>
            <input
              type="time"
              className="picker-input"
              value={pickerVal}
              onChange={e => setPickerVal(e.target.value)}
            />
            <div className="picker-btns">
              <button className="picker-cancel" onClick={() => setPicker(null)}>取消</button>
              <button className="picker-confirm" onClick={confirmPicker}>確認</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
