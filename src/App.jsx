import { useState } from 'react'
import Today from './pages/Today'
import Stats from './pages/Stats'
import './App.css'

export default function App() {
  const [tab, setTab] = useState('today')

  return (
    <div className="app">
      <div className="page">{tab === 'today' ? <Today /> : <Stats />}</div>
      <nav className="bottom-nav">
        <button
          className={tab === 'today' ? 'active' : ''}
          onClick={() => setTab('today')}
        >
          <span className="nav-icon">📋</span>
          <span>今日</span>
        </button>
        <button
          className={tab === 'stats' ? 'active' : ''}
          onClick={() => setTab('stats')}
        >
          <span className="nav-icon">📊</span>
          <span>統計</span>
        </button>
      </nav>
    </div>
  )
}
