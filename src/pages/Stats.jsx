import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend
} from 'recharts'
import { loadData, getDayRecord, getDayStatus, getToday } from '../lib/storage'
import './Stats.css'

function getMonthDates(year, month) {
  const days = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    days.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return days
}

function calcRate(records, days, fn) {
  const filled = days.filter(d => records[d] && fn(records[d]))
  return days.length ? Math.round((filled.length / days.length) * 100) : 0
}

const STATUS_COLOR = { full: '#22c55e', partial: '#fbbf24', empty: '#e2e8f0', none: '#e2e8f0' }
const STATUS_LABEL = { full: '全達成', partial: '部分達成', empty: '未記錄' }

export default function Stats() {
  const today = getToday()
  const now = new Date(today + 'T00:00:00')
  const [viewMonth, setViewMonth] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [selected, setSelected] = useState(null)
  const data = useMemo(() => loadData(), [])

  // 近 60 天（圖表用）
  const last60 = useMemo(() => {
    const arr = []
    for (let i = 59; i >= 0; i--) {
      const d = new Date(today + 'T00:00:00')
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const rec = data[key]
      if (!rec) { arr.push({ date: key, label: `${d.getMonth()+1}/${d.getDate()}` }); continue }
      const mealCount = [rec.meals?.breakfast, rec.meals?.lunch, rec.meals?.dinner].filter(Boolean).length
      arr.push({
        date: key,
        label: `${d.getMonth()+1}/${d.getDate()}`,
        吃飯: Math.round((mealCount / 3) * 100),
        睡覺: rec.sleep?.hours != null ? Math.min(Math.round((rec.sleep.hours / 7) * 100), 100) : null,
        運動: rec.exercise ? 100 : 0,
      })
    }
    return arr
  }, [data, today])

  // 月份日曆
  const monthDates = useMemo(() => getMonthDates(viewMonth.year, viewMonth.month), [viewMonth])
  const firstWeekday = new Date(viewMonth.year, viewMonth.month, 1).getDay()

  // 整體完成率（近60天）
  const recentDays = Object.keys(data)
    .filter(d => d >= last60[0]?.date)
  const mealRate = calcRate(data, recentDays, r => r.meals?.breakfast && r.meals?.lunch && r.meals?.dinner)
  const sleepRate = calcRate(data, recentDays, r => r.sleep?.hours >= 7)
  const exRate = calcRate(data, recentDays, r => r.exercise)

  function prevMonth() {
    setViewMonth(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
    )
    setSelected(null)
  }

  function nextMonth() {
    const todayMonth = { year: now.getFullYear(), month: now.getMonth() }
    setViewMonth(cur => {
      if (cur.year === todayMonth.year && cur.month === todayMonth.month) return cur
      return cur.month === 11 ? { year: cur.year + 1, month: 0 } : { year: cur.year, month: cur.month + 1 }
    })
    setSelected(null)
  }

  const selectedRec = selected ? getDayRecord(data, selected) : null

  return (
    <div className="stats">
      <header className="stats-header">
        <div className="stats-title">統計</div>
      </header>

      {/* 完成率卡片 */}
      <section className="card">
        <div className="card-title">近兩個月完成率</div>
        <div className="rate-row">
          <div className="rate-item">
            <div className="rate-num">{mealRate}%</div>
            <div className="rate-label">🍽️ 三餐達標</div>
          </div>
          <div className="rate-item">
            <div className="rate-num">{sleepRate}%</div>
            <div className="rate-label">😴 睡眠達標</div>
          </div>
          <div className="rate-item">
            <div className="rate-num">{exRate}%</div>
            <div className="rate-label">💪 有運動</div>
          </div>
        </div>
      </section>

      {/* 長條圖：近14天 */}
      <section className="card">
        <div className="card-title">近 14 天達成率（%）</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={last60.slice(-14)} barCategoryGap="30%">
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={28} />
            <Tooltip formatter={(v) => v != null ? `${v}%` : '未記錄'} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="吃飯" fill="#22c55e" radius={[3,3,0,0]} />
            <Bar dataKey="睡覺" fill="#818cf8" radius={[3,3,0,0]} />
            <Bar dataKey="運動" fill="#fb923c" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* 折線圖：近60天睡眠時數 */}
      <section className="card">
        <div className="card-title">近 60 天睡眠時數</div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={last60}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={6} />
            <YAxis domain={[0, 12]} tick={{ fontSize: 10 }} width={24} />
            <Tooltip formatter={(v) => v != null ? `${(v/100*7).toFixed(1)} 小時` : '未記錄'} />
            <Line type="monotone" dataKey="睡覺" stroke="#818cf8" dot={false} strokeWidth={2} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* 日曆 */}
      <section className="card">
        <div className="cal-nav">
          <button onClick={prevMonth}>‹</button>
          <span>{viewMonth.year} 年 {viewMonth.month + 1} 月</span>
          <button onClick={nextMonth}>›</button>
        </div>
        <div className="cal-week-header">
          {['日','一','二','三','四','五','六'].map(d => (
            <div key={d} className="cal-weekday">{d}</div>
          ))}
        </div>
        <div className="cal-grid">
          {Array(firstWeekday).fill(null).map((_, i) => <div key={`e${i}`} />)}
          {monthDates.map(date => {
            const rec = data[date]
            const status = getDayStatus(rec)
            const isToday = date === today
            const isFuture = date > today
            return (
              <button
                key={date}
                className={`cal-day ${isToday ? 'today' : ''} ${selected === date ? 'sel' : ''}`}
                style={{ background: isFuture ? 'transparent' : STATUS_COLOR[status] }}
                onClick={() => setSelected(selected === date ? null : date)}
                disabled={isFuture}
              >
                <span className="cal-day-num">{new Date(date + 'T00:00:00').getDate()}</span>
              </button>
            )
          })}
        </div>
        <div className="cal-legend">
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <div key={k} className="legend-item">
              <div className="legend-dot" style={{ background: STATUS_COLOR[k] }} />
              <span>{v}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 當天詳情 */}
      {selected && selectedRec && (
        <section className="card detail-card">
          <div className="card-title">
            {selected.slice(5).replace('-', ' / ')} 詳情
          </div>
          <div className="detail-row">
            <span>早餐</span><span>{selectedRec.meals.breakfast ? '✅' : '❌'}</span>
          </div>
          <div className="detail-row">
            <span>午餐</span><span>{selectedRec.meals.lunch ? '✅' : '❌'}</span>
          </div>
          <div className="detail-row">
            <span>晚餐</span><span>{selectedRec.meals.dinner ? '✅' : '❌'}</span>
          </div>
          <div className="detail-row">
            <span>入睡</span>
            <span>{selectedRec.sleep.sleepAt || '—'}</span>
          </div>
          <div className="detail-row">
            <span>起床</span>
            <span>{selectedRec.sleep.wakeAt || '—'}</span>
          </div>
          <div className="detail-row">
            <span>睡眠時數</span>
            <span>{selectedRec.sleep.hours != null ? `${selectedRec.sleep.hours} 小時` : '—'}</span>
          </div>
          <div className="detail-row">
            <span>運動</span><span>{selectedRec.exercise ? '✅' : '❌'}</span>
          </div>
        </section>
      )}
    </div>
  )
}
