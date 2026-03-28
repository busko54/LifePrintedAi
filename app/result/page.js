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
