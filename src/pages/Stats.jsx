import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ReferenceLine, CartesianGrid,
} from 'recharts'
import {
  loadData, getDayRecord, getDayStatus, getToday, timeToMinutes, minutesToTime,
} from '../lib/storage'
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

const STATUS_COLOR = { full: '#22c55e', partial: '#fbbf24', empty: '#e2e8f0' }
const STATUS_LABEL = { full: '全達成', partial: '部分達成', empty: '未記錄' }

// 格式化分鐘數為時間字串（用於圖表 tooltip）
function fmtMin(m) {
  if (m == null) return '—'
  return minutesToTime(m)
}

export default function Stats() {
  const today = getToday()
  const now = new Date(today + 'T00:00:00')
  const [viewMonth, setViewMonth] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [selected, setSelected] = useState(null)
  const [statsTab, setStatsTab] = useState('meal') // 'meal' | 'sleep'
  const data = useMemo(() => loadData(), [])

  // 近 60 天
  const last60 = useMemo(() => {
    const arr = []
    for (let i = 59; i >= 0; i--) {
      const d = new Date(today + 'T00:00:00')
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const rec = data[key]
      const label = `${d.getMonth()+1}/${d.getDate()}`
      if (!rec) { arr.push({ date: key, label }); continue }
      arr.push({
        date: key, label,
        breakfast: timeToMinutes(rec.meals?.breakfast),
        lunch:     timeToMinutes(rec.meals?.lunch),
        dinner:    timeToMinutes(rec.meals?.dinner),
        sleepAt:   timeToMinutes(rec.sleep?.sleepAt),
        wakeAt:    timeToMinutes(rec.sleep?.wakeAt),
        hours:     rec.sleep?.hours,
        exercise:  !!rec.exercise,
      })
    }
    return arr
  }, [data, today])

  const last14 = last60.slice(-14)

  // 完成率（近60天有紀錄的天）
  const recorded = last60.filter(d => data[d.date])
  const total = recorded.length || 1
  const mealRate = Math.round(recorded.filter(d => data[d.date]?.meals?.breakfast && data[d.date]?.meals?.lunch && data[d.date]?.meals?.dinner).length / total * 100)
  const sleepRate = Math.round(recorded.filter(d => (data[d.date]?.sleep?.hours || 0) >= 7).length / total * 100)
  const exRate = Math.round(recorded.filter(d => data[d.date]?.exercise).length / total * 100)

  // 平均用餐時間
  function avg(arr) {
    const vals = arr.filter(v => v != null)
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null
  }
  const avgBreakfast = avg(last60.map(d => d.breakfast))
  const avgLunch     = avg(last60.map(d => d.lunch))
  const avgDinner    = avg(last60.map(d => d.dinner))
  const avgSleep     = avg(last60.map(d => d.sleepAt != null ? (d.sleepAt < 720 ? d.sleepAt + 1440 : d.sleepAt) : null))
  const avgWake      = avg(last60.map(d => d.wakeAt))

  // 日曆
  const monthDates = useMemo(() => getMonthDates(viewMonth.year, viewMonth.month), [viewMonth])
  const firstWeekday = new Date(viewMonth.year, viewMonth.month, 1).getDay()
  const todayMonth = { year: now.getFullYear(), month: now.getMonth() }
  const isCurrentMonth = viewMonth.year === todayMonth.year && viewMonth.month === todayMonth.month

  function prevMonth() { setViewMonth(({ year, month }) => month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }); setSelected(null) }
  function nextMonth() {
    if (isCurrentMonth) return
    setViewMonth(({ year, month }) => month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 })
    setSelected(null)
  }

  const selectedRec = selected ? getDayRecord(data, selected) : null

  // 用餐時間散佈圖資料（近14天）
  const mealScatter = {
    breakfast: last14.filter(d => d.breakfast != null).map(d => ({ x: d.label, y: d.breakfast })),
    lunch:     last14.filter(d => d.lunch != null).map(d => ({ x: d.label, y: d.lunch })),
    dinner:    last14.filter(d => d.dinner != null).map(d => ({ x: d.label, y: d.dinner })),
  }

  // 睡眠時間折線（近14天）
  const sleepBars = last14.map(d => ({
    label: d.label,
    睡眠時數: d.hours,
  }))

  // Y 軸格式：分鐘 → 時間
  const timeTickFormatter = (m) => {
    if (m == null) return ''
    const h = Math.floor(((m % 1440) + 1440) % 1440 / 60)
    return `${h}:00`
  }

  return (
    <div className="stats">
      <header className="stats-header">
        <div className="stats-title">統計</div>
      </header>

      {/* 完成率 */}
      <section className="card">
        <div className="card-title">近兩個月完成率</div>
        <div className="rate-row">
          <div className="rate-item"><div className="rate-num" style={{color:'#22c55e'}}>{mealRate}%</div><div className="rate-label">🍽️ 三餐達標</div></div>
          <div className="rate-item"><div className="rate-num" style={{color:'#818cf8'}}>{sleepRate}%</div><div className="rate-label">😴 睡眠達標</div></div>
          <div className="rate-item"><div className="rate-num" style={{color:'#fb923c'}}>{exRate}%</div><div className="rate-label">💪 有運動</div></div>
        </div>
      </section>

      {/* 用餐 / 睡眠切換 */}
      <section className="card">
        <div className="tab-row">
          <button className={`tab-btn ${statsTab==='meal' ? 'active' : ''}`} onClick={() => setStatsTab('meal')}>🍽️ 用餐時間</button>
          <button className={`tab-btn ${statsTab==='sleep' ? 'active' : ''}`} onClick={() => setStatsTab('sleep')}>😴 睡眠紀錄</button>
        </div>

        {statsTab === 'meal' && (
          <>
            <div className="avg-row">
              <div className="avg-item"><span>平均早餐</span><strong>{fmtMin(avgBreakfast)}</strong></div>
              <div className="avg-item"><span>平均午餐</span><strong>{fmtMin(avgLunch)}</strong></div>
              <div className="avg-item"><span>平均晚餐</span><strong>{fmtMin(avgDinner)}</strong></div>
            </div>
            <div className="chart-label">近 14 天用餐時間分佈</div>
            <ResponsiveContainer width="100%" height={200}>
              <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="x" type="category" allowDuplicatedCategory={false} tick={{ fontSize: 9 }} />
                <YAxis
                  dataKey="y" type="number"
                  domain={[300, 1320]}
                  tickFormatter={timeTickFormatter}
                  ticks={[360,480,600,720,840,960,1080,1200]}
                  tick={{ fontSize: 10 }} width={36}
                />
                <Tooltip formatter={(v) => fmtMin(v)} cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="早餐" data={mealScatter.breakfast} fill="#f59e0b" />
                <Scatter name="午餐" data={mealScatter.lunch}     fill="#22c55e" />
                <Scatter name="晚餐" data={mealScatter.dinner}    fill="#6366f1" />
              </ScatterChart>
            </ResponsiveContainer>
            <div className="scatter-legend">
              <span style={{color:'#f59e0b'}}>● 早餐</span>
              <span style={{color:'#22c55e'}}>● 午餐</span>
              <span style={{color:'#6366f1'}}>● 晚餐</span>
            </div>
          </>
        )}

        {statsTab === 'sleep' && (
          <>
            <div className="avg-row">
              <div className="avg-item"><span>平均入睡</span><strong>{fmtMin(avgSleep != null ? ((avgSleep % 1440) + 1440) % 1440 : null)}</strong></div>
              <div className="avg-item"><span>平均起床</span><strong>{fmtMin(avgWake)}</strong></div>
            </div>
            <div className="chart-label">近 14 天睡眠時數</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={sleepBars} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                <YAxis domain={[0, 12]} tick={{ fontSize: 10 }} width={24} />
                <Tooltip formatter={(v) => v != null ? `${v} 小時` : '未記錄'} />
                <ReferenceLine y={7} stroke="#22c55e" strokeDasharray="4 2" label={{ value:'目標', position:'insideTopRight', fontSize:10, fill:'#22c55e' }} />
                <Bar dataKey="睡眠時數" fill="#818cf8" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </section>

      {/* 日曆 */}
      <section className="card">
        <div className="cal-nav">
          <button onClick={prevMonth}>‹</button>
          <span>{viewMonth.year} 年 {viewMonth.month + 1} 月</span>
          <button onClick={nextMonth} disabled={isCurrentMonth} style={{ opacity: isCurrentMonth ? 0.3 : 1 }}>›</button>
        </div>
        <div className="cal-week-header">
          {['日','一','二','三','四','五','六'].map(d => <div key={d} className="cal-weekday">{d}</div>)}
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

      {/* 點日期詳情 */}
      {selected && selectedRec && (
        <section className="card detail-card">
          <div className="card-title">{selected.slice(5).replace('-', ' / ')} 詳情</div>
          {[['早餐', selectedRec.meals.breakfast], ['午餐', selectedRec.meals.lunch], ['晚餐', selectedRec.meals.dinner]].map(([label, val]) => (
            <div key={label} className="detail-row">
              <span>{label}</span>
              <span>{val ? `✅ ${val}` : '❌'}</span>
            </div>
          ))}
          <div className="detail-row"><span>入睡</span><span>{selectedRec.sleep.sleepAt || '—'}</span></div>
          <div className="detail-row"><span>起床</span><span>{selectedRec.sleep.wakeAt || '—'}</span></div>
          <div className="detail-row"><span>睡眠時數</span><span>{selectedRec.sleep.hours != null ? `${selectedRec.sleep.hours} 小時` : '—'}</span></div>
          <div className="detail-row"><span>運動</span><span>{selectedRec.exercise ? `✅ ${selectedRec.exercise}` : '❌'}</span></div>
        </section>
      )}
    </div>
  )
}
