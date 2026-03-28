'use client'
import { useState } from 'react'

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
      alert(data.error)
      setLoading(false)
      return
    }
    localStorage.setItem('lifebook_result', JSON.stringify(data))
    window.location.href = '/result'
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--paper)', fontFamily: 'DM Sans, sans-serif' }}>

      {loading && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--ink)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, zIndex: 9999 }}>
          <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 32, color: 'var(--paper)', fontWeight: 700 }}>Writing your life book...</p>
          <div style={{ width: 240, height: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--accent)', animation: 'loadBar 2.4s ease-in-out infinite' }} />
          </div>
          <p style={{ fontSize: 13, color: 'rgba(245,240,232,0.4)', letterSpacing: '0.06em' }}>Finding signal in the noise — this takes 30–60 seconds</p>
        </div>
      )}

      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 60px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 700 }}>
          Life<span style={{ color: 'var(--accent)' }}>Book</span>
        </span>
        <div style={{ display: 'flex', gap: 36, alignItems: 'center' }}>
          <a href="#how" style={{ fontSize: 14, color: 'var(--muted)', textDecoration: 'none' }}>How it works</a>
          <a href="#upload" style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '10px 22px', borderRadius: 2, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>Try it free</a>
        </div>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '88vh' }}>

        <div style={{ padding: '80px 60px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'block', width: 32, height: 1, background: 'var(--accent)' }} />
            Turn your ChatGPT history into
          </p>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(44px, 5vw, 72px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-1.5px', marginBottom: 28 }}>
            A book<br />about <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>you.</em>
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--muted)', maxWidth: 420, marginBottom: 48 }}>
            Upload your ChatGPT export. We strip the noise, find what actually mattered, and turn it into chapters, insights, and patterns.
          </p>

          <div
            id="upload"
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
            onClick={() => document.getElementById('fileInput').click()}
            style={{ border: `1.5px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 4, padding: '36px 32px', background: dragOver ? '#f0ead8' : 'var(--cream)', cursor: 'pointer', transition: 'all 0.2s', maxWidth: 440, marginBottom: 16 }}
          >
            <input id="fileInput" type="file" accept=".json,.html" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
            <p style={{ fontSize: 32, marginBottom: 12 }}>📂</p>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
              {file ? `✓ ${file.name}` : 'Drop your ChatGPT export here'}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              {file ? 'Ready to generate' : 'Click to browse · .json or .html'}
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              {['JSON', 'HTML'].map(t => (
                <span key={t} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'var(--border)', padding: '4px 10px', borderRadius: 2, color: 'var(--muted)' }}>{t}</span>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            style={{ maxWidth: 440, width: '100%', background: 'var(--ink)', color: 'var(--paper)', border: 'none', padding: '18px 32px', fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer', borderRadius: 2, marginBottom: 12 }}
          >
            Generate My Life Book →
          </button>
          <p style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 440 }}>
            Your file is never stored or shared. Processed and deleted instantly.
          </p>
        </div>

        <div style={{ background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 50px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.05)', top: -80, right: -80 }} />
          <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.04)', bottom: -200, left: -200 }} />
          <div style={{ width: '100%', maxWidth: 340, background: 'var(--paper)', borderRadius: 3, boxShadow: '-8px 8px 40px rgba(0,0,0,0.6)', animation: 'float 6s ease-in-out infinite', overflow: 'hidden' }}>
            <div style={{ background: 'var(--ink)', padding: '28px 28px 24px' }}>
              <p style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>2023 – 2025</p>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 900, color: 'var(--paper)', lineHeight: 1.1, marginBottom: 6 }}>Your<br />Life Book</h2>
              <p style={{ fontSize: 12, color: 'rgba(245,240,232,0.4)' }}>847 conversations · 3 chapters</p>
            </div>
            <div style={{ padding: '24px 28px' }}>
              <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>Chapters</p>
                {[['I', 'The Career Spiral', '14 months of doubt and pivoting'], ['II', 'Money & Fear', 'It was never really about money']].map(([num, title, desc]) => (
                  <div key={num} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                    <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: 'var(--border)', fontWeight: 700, minWidth: 20 }}>{num}</span>
                    <div>
                      <h4 style={{ fontFamily: 'Playfair Display, serif', fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{title}</h4>
                      <p style={{ fontSize: 11, color: 'var(--muted)' }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>Key Insights</p>
                {['"You ask for options when you want permission."', '"You start strong, then find reasons to stop."'].map((ins, i) => (
                  <div key={i} style={{ background: 'var(--cream)', borderLeft: '2px solid var(--accent)', padding: '8px 12px', marginBottom: 8, fontSize: 11, fontStyle: 'italic', fontFamily: 'Playfair Display, serif', lineHeight: 1.4 }}>{ins}</div>
                ))}
              </div>
              <div>
                <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>Patterns</p>
                {['🔁 Start → Quit → Restart', '😟 Anxiety spikes in Q4', '💡 Ideas without follow-through'].map((p, i) => (
                  <span key={i} style={{ display: 'inline-flex', fontSize: 10, background: 'var(--ink)', color: 'var(--paper)', padding: '4px 10px', borderRadius: 2, margin: '0 4px 6px 0' }}>{p}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="how" style={{ padding: '100px 60px', background: 'var(--cream)', borderTop: '1px solid var(--border)' }}>
        <div style={{ textAlign: 'center', marginBottom: 72 }}>
          <p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 14 }}>The process</p>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 48, fontWeight: 900, letterSpacing: '-1px' }}>Four steps.<br />One honest book.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, maxWidth: 960, margin: '0 auto' }}>
          {[
            ['1', 'Upload', 'Export your ChatGPT history as JSON or HTML and drop it in. No account needed.', 'var(--ink)'],
            ['2', 'Filter', 'We cut the noise — random questions, small talk, junk. Only meaningful conversations stay.', 'var(--accent)'],
            ['3', 'Analyze', 'AI clusters your chats into themes: career, money, relationships, identity, goals.', '#b8922a'],
            ['4', 'Download', 'Get a clean PDF with your chapters, insights, and patterns. Yours to keep.', 'var(--ink)'],
          ].map(([num, title, desc, bg]) => (
            <div key={num} style={{ textAlign: 'center', padding: '0 16px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: bg, color: 'var(--paper)', fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>{num}</div>
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700, marginBottom: 10 }}>{title}</h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--ink)', padding: '100px 60px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 900, color: 'var(--paper)', letterSpacing: '-1.5px', lineHeight: 1.05, maxWidth: 640, margin: '0 auto 24px' }}>
          Your chats have been trying to tell you <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>something.</em>
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(245,240,232,0.5)', marginBottom: 48 }}>It takes 60 seconds to find out what.</p>
        <a href="#upload" style={{ display: 'inline-block', background: 'var(--accent)', color: 'var(--paper)', padding: '20px 48px', fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, borderRadius: 2, textDecoration: 'none' }}>
          Upload your history — it is free
        </a>
        <p style={{ display: 'block', marginTop: 18, fontSize: 12, color: 'rgba(245,240,232,0.3)' }}>No account. No storage. Your file stays private.</p>
      </div>

      <footer style={{ padding: '32px 60px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)' }}>
        <span>© 2025 LifeBook</span>
        <span>Your data is never stored or shared.</span>
      </footer>

      <style>{`
        @keyframes loadBar { 0% { width: 0% } 50% { width: 80% } 100% { width: 100% } }
        @keyframes float { 0%, 100% { transform: rotate(-2deg) translateY(0px); } 50% { transform: rotate(-2deg) translateY(-12px); } }
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns: '1fr 1fr'"] { grid-template-columns: 1fr !important; }
          div[style*="gridTemplateColumns: 'repeat(4"] { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </main>
  )
}
