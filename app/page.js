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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)' }}>
      <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 24 }}>Loading your life book…</p>
    </div>
  )

  const tabs = ['chapters', 'insights', 'patterns']

  return (
    <main style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      {/* Nav */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '24px 60px', borderBottom: '1px solid var(--border)'
      }}>
        <a href="/" style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 700, textDecoration: 'none', color: 'var(--ink)' }}>
          Life<span style={{ color: 'var(--accent)' }}>Book</span>
        </a>
        <button
          onClick={() => window.print()}
          style={{
            background: 'var(--ink)', color: 'var(--paper)', border: 'none',
            padding: '10px 24px', fontSize: 12, letterSpacing: '0.1em',
            textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2,
            fontFamily: 'DM Sans, sans-serif'
          }}
        >
          Download PDF ↓
        </button>
      </nav>

      {/* Header */}
      <div style={{ background: 'var(--ink)', padding: '60px', textAlign: 'center' }}>
        <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 16 }}>
          Your Personal Life Book
        </p>
        <h1 style={{
          fontFamily: 'Playfair Display, serif', fontSize: 'clamp(36px, 6vw, 64px)',
          fontWeight: 900, color: 'var(--paper)', letterSpacing: '-1.5px',
          lineHeight: 1.05, marginBottom: 20
        }}>
          {data.stats?.dominant_theme || 'Your Life, Decoded'}
        </h1>
        <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 32, fontWeight: 700, color: 'var(--paper)', fontFamily: 'Playfair Display, serif' }}>
              {data.stats?.conversations_analyzed}
            </p>
            <p style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.4)' }}>
              Conversations Analyzed
            </p>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 32, fontWeight: 700, color: 'var(--paper)', fontFamily: 'Playfair Display, serif' }}>
              {data.chapters?.length}
            </p>
            <p style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.4)' }}>
              Chapters
            </p>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 32, fontWeight: 700, color: 'var(--paper)', fontFamily: 'Playfair Display, serif' }}>
              {data.insights?.length}
            </p>
            <p style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.4)' }}>
              Key Insights
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'center', gap: 0 }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '18px 36px', border: 'none', background: 'none',
              fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase',
              fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
              color: activeTab === tab ? 'var(--accent)' : 'var(--muted)',
              borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
              fontWeight: activeTab === tab ? 500 : 300,
              transition: 'all 0.2s'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '60px 24px' }}>

        {/* Chapters */}
        {activeTab === 'chapters' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
            {data.chapters?.map((chapter, i) => (
              <div key={i} style={{ borderLeft: '3px solid var(--accent)', paddingLeft: 32 }}>
                <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>
                  Chapter {chapter.number}
                </p>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 32, fontWeight: 900, marginBottom: 20, letterSpacing: '-0.5px' }}>
                  {chapter.title}
                </h2>
                <p style={{ fontSize: 16, lineHeight: 1.85, color: 'var(--muted)', whiteSpace: 'pre-line' }}>
                  {chapter.summary}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Insights */}
        {activeTab === 'insights' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.7 }}>
              These are patterns found across your conversations. They may be uncomfortable. That's the point.
            </p>
            {data.insights?.map((insight, i) => (
              <div key={i} style={{
                background: 'var(--cream)', borderLeft: '3px solid var(--accent)',
                padding: '24px 28px', borderRadius: '0 3px 3px 0'
              }}>
                <p style={{
                  fontFamily: 'Playfair Display, serif', fontSize: 18,
                  fontStyle: 'italic', lineHeight: 1.6, color: 'var(--ink)'
                }}>
                  "{insight}"
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Patterns */}
        {activeTab === 'patterns' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.7 }}>
              Recurring behaviors and cycles identified across your conversation history.
            </p>
            {data.patterns?.map((pattern, i) => (
              <div key={i} style={{
                display: 'flex', gap: 20, alignItems: 'flex-start',
                padding: '20px 0', borderBottom: '1px solid var(--border)'
              }}>
                <span style={{
                  fontFamily: 'Playfair Display, serif', fontSize: 24,
                  color: 'var(--border)', fontWeight: 700, minWidth: 32, lineHeight: 1
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink)' }}>{pattern}</p>
              </div>
            ))}
          </div>
        )}

        {/* Start Over */}
        <div style={{ marginTop: 64, textAlign: 'center', paddingTop: 40, borderTop: '1px solid var(--border)' }}>
          <a href="/" style={{
            fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--muted)', textDecoration: 'none'
          }}>
            ← Analyze another file
          </a>
        </div>
      </div>

      <style>{`
        @media print {
          nav button { display: none; }
          div[style*="borderBottom: '1px solid var(--border)'"] { display: none; }
        }
      `}</style>
    </main>
  )
}
