'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = (f) => {
    if (f && (f.name.endsWith('.json') || f.name.endsWith('.html'))) {
      setFile(f)
    } else {
      alert('Please upload a .json or .html file from ChatGPT export')
    }
  }

  const handleGenerate = async () => {
    if (!file) return alert('Please upload your ChatGPT export first')
    setLoading(true)
    const text = await file.text()
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text, filename: file.name }),
    })
    const data = await res.json()
    if (data.error) {
      alert('Something went wrong. Try again.')
      setLoading(false)
      return
    }
    localStorage.setItem('lifebook_result', JSON.stringify(data))
    window.location.href = '/result'
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      {loading && (
        <div style={{
          position: 'fixed', inset: 0, background: 'var(--ink)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 24, zIndex: 9999
        }}>
          <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 32, color: 'var(--paper)', fontWeight: 700 }}>
            Writing your life book…
          </p>
          <div style={{ width: 240, height: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', background: 'var(--accent)',
              animation: 'loadBar 2s ease-in-out infinite',
              width: '60%'
            }} />
          </div>
          <p style={{ fontSize: 13, color: 'rgba(245,240,232,0.4)', letterSpacing: '0.06em' }}>
            Finding signal in the noise — this takes 30–60 seconds
          </p>
        </div>
      )}

      {/* Nav */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '24px 60px', borderBottom: '1px solid var(--border)'
      }}>
        <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 700 }}>
          Life<span style={{ color: 'var(--accent)' }}>Book</span>
        </span>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '100px 24px 60px' }}>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 20 }}>
          — Turn your ChatGPT history into
        </p>
        <h1 style={{
          fontFamily: 'Playfair Display, serif', fontSize: 'clamp(48px, 7vw, 80px)',
          fontWeight: 900, lineHeight: 1.05, letterSpacing: '-2px', marginBottom: 24
        }}>
          A book<br />about <em style={{ fontStyle: 'ital
