'use client'
import { useEffect, useState } from 'react'

export default function Result() {
  const [data, setData] = useState(null)
  const [activeTab, setActiveTab] = useState('chapters')

  useEffect(() => {
    const stored = localStorage.getItem('lifebook_result')
    if (stored) setData(JSON.parse(stored))
    else window.location.href = '/'
  }, [])

  if (!data) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0d0a' }}>
      <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, color: '#f5f0e8' }}>Loading your life book...</p>
    </div>
  )

  const tabs = ['chapters', 'insights', 'patterns']

  return (
    <main style={{ minHeight: '100vh', background: '#0f0d0a', color: '#f5f0e8' }}>

      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '24px 60px', borderBottom: '1px solid #2a2520'
      }}>
        <a href="/" style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 700, textDecoration: 'none', color: '#f5f0e8' }}>
          Life<span style={{ color: '#c94f2a' }}>Book</span>
        </a>
        <button
          onClick={() => window.print()}
          style={{
            background: '#c94f2a', color: '#f5f0e8', border: 'none',
            padding: '10px 24px', fontSize: 12, letterSpacing: '0.1em',
            textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2,
            fontFamily: 'DM Sans, sans-serif', fontWeight: 500
          }}
        >
          Download PDF ↓
        </button>
      </nav>

      <div style={{ background: '#161310', padding: '80px 60px', textAlign: 'center', borderBottom: '1px solid #2a2520', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', border: '1px solid rgba(201,79,42,0.08)', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
        <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c94f2a', marginBottom: 20, position: 'relative' }}>
          Your Personal Life Book
        </p>
        <h1 style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: 'clamp(32px, 5vw, 60px)',
          fontWeight: 900, color: '#f5f0e8',
          letterSpacing: '-1.5px', lineHeight: 1.05,
          marginBottom: 32, position: 'relative',
          maxWidth: 700, margin: '0 auto 32px'
        }}>
          {data.stats && data.stats.dominant_theme ? `"${data.stats.dominant_theme}"` : 'Your Life, Decoded'}
        </h1>
        <div style={{ display: 'flex', gap: 48, justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
          {[
            [data.stats?.conversations_analyzed || 0, 'Conversations'],
            [data.chapters?.length || 0, 'Chapters'],
            [data.insights?.length || 0, 'Insights'],
            [data.patterns?.length || 0, 'Patterns'],
          ].map(([num, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 40, fontWeight: 900, color: '#f5f0e8', fontFamily: 'Playfair Display, serif', lineHeight: 1 }}>{num}</p>
              <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8a8070', marginTop: 6 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderBottom: '1px solid #2a2520', display: 'flex', justifyContent: 'center' }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '20px 40px', border: 'none', background: 'none',
              fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase',
              fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
              color: activeTab === tab ? '#c94f2a' : '#8a8070',
              borderBottom: activeTab === tab ? '2px solid #c94f2a' : '2px solid transparent',
              fontWeight: activeTab === tab ? 500 : 300,
              transition: 'all 0.2s'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '72px 24px' }}>

        {activeTab === 'chapters' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 64 }}>
            {data.chapters && data.chapters.map((chapter, i) => (
              <div key={i}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, marginBottom: 28 }}>
                  <span style={{
                    fontFamily: 'Playfair Display, serif', fontSize: 64,
                    color: '#2a2520', fontWeight: 900, lineHeight: 0.8,
                    flexShrink: 0, marginTop: 8
                  }}>
                    {chapter.number}
                  </span>
                  <div>
                    {chapter.period && (
                      <p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c94f2a', marginBottom: 8 }}>
                        {chapter.period}
                      </p>
                    )}
                    <h2 style={{
                      fontFamily: 'Playfair Display, serif', fontSize: 28,
                      fontWeight: 900, color: '#f5f0e8', letterSpacing: '-0.5px',
                      lineHeight: 1.2
                    }}>
                      {chapter.title}
                    </h2>
                  </div>
                </div>
                <div style={{ borderLeft: '2px solid #2a2520', paddingLeft: 32, marginLeft: 12 }}>
                  <p style={{ fontSize: 17, lineHeight: 2, color: '#8a8070', whiteSpace: 'pre-line', fontWeight: 300 }}>
                    {chapter.summary}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'insights' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <p style={{ fontSize: 14, color: '#8a8070', marginBottom: 16, lineHeight: 1.8, fontStyle: 'italic', borderLeft: '2px solid #2a2520', paddingLeft: 20 }}>
              These are patterns found across your entire conversation history. They are meant to be uncomfortable. That is the point.
            </p>
            {data.insights && data.insights.map((insight, i) => (
              <div key={i} style={{
                background: '#161310',
                border: '1px solid #2a2520',
                borderLeft: '3px solid #c94f2a',
                padding: '28px 32px',
                borderRadius: '0 3px 3px 0',
                position: 'relative'
              }}>
                <span style={{
                  position: 'absolute', top: 16, right: 20,
                  fontFamily: 'Playfair Display, serif', fontSize: 48,
                  color: '#2a2520', fontWeight: 900, lineHeight: 1
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p style={{
                  fontFamily: 'Playfair Display, serif', fontSize: 19,
                  fontStyle: 'italic', lineHeight: 1.7, color: '#f5f0e8',
                  paddingRight: 48
                }}>
                  "{insight}"
                </p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'patterns' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <p style={{ fontSize: 14, color: '#8a8070', marginBottom: 32, lineHeight: 1.8, fontStyle: 'italic', borderLeft: '2px solid #2a2520', paddingLeft: 20 }}>
              Recurring behaviors and cycles identified across your entire history.
            </p>
            {data.patterns && data.patterns.map((pattern, i) => (
              <div key={i} style={{
                display: 'flex', gap: 24, alignItems: 'flex-start',
                padding: '28px 0', borderBottom: '1px solid #2a2520'
              }}>
                <span style={{
                  fontFamily: 'Playfair Display, serif', fontSize: 32,
                  color: '#2a2520', fontWeight: 900, minWidth: 48,
                  lineHeight: 1, flexShrink: 0
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p style={{ fontSize: 16, lineHeight: 1.8, color: '#f5f0e8', paddingTop: 4 }}>
                  {pattern}
                </p>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 80, textAlign: 'center', paddingTop: 48, borderTop: '1px solid #2a2520' }}>
          <a href="/" style={{
            fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#8a8070', textDecoration: 'none', fontFamily: 'DM Sans, sans-serif'
          }}>
            ← Generate Another
          </a>
        </div>
      </div>

      <style>{`
        @media print {
          nav { display: none; }
          button { display: none; }
        }
      `}</style>
    </main>
  )
}
