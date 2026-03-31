'use client'
import { useState } from 'react'

function extractConversations(content, filename) {
  let conversations = []
  try {
    if (filename.endsWith('.json')) {
      const data = JSON.parse(content)
      const items = Array.isArray(data) ? data : [data]
      for (const convo of items) {
        const messages = []
        if (convo.mapping) {
          for (const node of Object.values(convo.mapping)) {
            if (node.message?.content?.parts && node.message.author?.role === 'user') {
              const text = node.message.content.parts.join(' ').trim()
              if (text.length > 20) messages.push(text)
            }
          }
        }
        if (convo.messages && Array.isArray(convo.messages)) {
          for (const msg of convo.messages) {
            if (msg.role === 'user' || msg.author === 'user') {
              const text = (msg.content || msg.text || '').trim()
              if (text.length > 20) messages.push(text)
            }
          }
        }
        if (messages.length > 0) {
          conversations.push({
            title: convo.title || convo.name || 'Untitled',
            messages: messages.slice(0, 5)
          })
        }
      }
    }
  } catch (e) {
    console.error('Parse error:', e)
  }
  return conversations
}

function filterMeaningful(conversations) {
  const keywords = [
    'should i', 'how do i', 'i feel', 'i want', 'i need', 'i am', "i'm",
    'career', 'job', 'money', 'relationship', 'anxiety', 'depressed', 'happy',
    'goal', 'dream', 'fear', 'afraid', 'help me', 'what if', 'i hate',
    'i love', 'i wish', 'struggle', 'problem', 'advice', 'future', 'life',
    'business', 'startup', 'idea', 'health', 'family', 'friend', 'stress',
    'motivation', 'confidence', 'lonely', 'purpose', 'meaning', 'change'
  ]
  return conversations.filter(convo => {
    const text = convo.messages.join(' ').toLowerCase()
    const score = keywords.filter(k => text.includes(k)).length
    return score >= 1 && text.length > 50
  }).slice(0, 150)
}

export default function Home() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('Reading your conversations...')
  const [dragOver, setDragOver] = useState(false)
  const [platform, setPlatform] = useState(null)

  const platforms = [
    { id: 'chatgpt', label: 'ChatGPT', icon: '🤖', color: '#10a37f', instructions: 'chatgpt.com → Settings → Data Controls → Export' },
    { id: 'claude', label: 'Claude', icon: '✦', color: '#c94f2a', instructions: 'claude.ai → Settings → Privacy → Export Data' },
    { id: 'gemini', label: 'Gemini', icon: '♊', color: '#4285f4', instructions: 'myactivity.google.com → Export → Gemini' },
    { id: 'grok', label: 'Grok', icon: '𝕏', color: '#000000', instructions: 'x.com → Settings → Privacy → Export Data' },
  ]

  const handleFile = (f) => {
    if (f && (f.name.endsWith('.json') || f.name.endsWith('.html'))) {
      setFile(f)
    } else {
      alert('Please upload a .json or .html file from your AI export')
    }
  }

  const handleGenerate = async () => {
    if (!platform) return alert('Please select which AI platform your export is from')
    if (!file) return alert('Please upload your export file first')
    setLoading(true)

    try {
      setLoadingMsg('Reading your conversations...')
      const text = await file.text()

      setLoadingMsg('Filtering what matters...')
      const allConvos = extractConversations(text, file.name)
      const meaningful = filterMeaningful(allConvos)

      if (meaningful.length < 3) {
        alert('Not enough meaningful conversations found. Try a different file.')
        setLoading(false)
        return
      }

      setLoadingMsg(`Analyzing ${meaningful.length} conversations...`)

      const payload = {
        conversations: meaningful,
        totalCount: allConvos.length,
        platform: platform
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.text()
        console.error('API error:', err)
        alert('Something went wrong. Please try again.')
        setLoading(false)
        return
      }

      setLoadingMsg('Writing your life book...')
      const data = await res.json()

      if (data.error) {
        alert(data.error)
        setLoading(false)
        return
      }

      localStorage.setItem('lifebook_result', JSON.stringify(data))
      window.location.href = '/result'

    } catch (err) {
      console.error(err)
      alert('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--paper)', fontFamily: 'DM Sans, sans-serif' }}>

      {loading && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--ink)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, zIndex: 9999 }}>
          <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 32, color: 'var(--paper)', fontWeight: 700 }}>Writing your life book...</p>
          <div style={{ width: 240, height: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--accent)', animation: 'loadBar 2.4s ease-in-out infinite' }} />
          </div>
          <p style={{ fontSize: 13, color: 'rgba(245,240,232,0.4)', letterSpacing: '0.06em' }}>{loadingMsg}</p>
        </div>
      )}

      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 60px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 700 }}>
          Life<span style={{ color: 'var(--accent)' }}>Book</span>
        </span>
        <div style={{ display: 'flex', gap: 36, alignItems: 'center' }}>
          <a href="#how" style={{ fontSize: 14, color: 'var(--muted)', textDecoration: 'none' }}>How it works</a>
          <a href="#upload" style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '10px 22px', borderRadius: 2, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>Try it — $10</a>
        </div>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '88vh' }}>
        <div style={{ padding: '80px 60px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'block', width: 32, height: 1, background: 'var(--accent)' }} />
            Turn your AI history into
          </p>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(44px, 5vw, 72px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-1.5px', marginBottom: 28 }}>
            A book<br />about <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>you.</em>
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--muted)', maxWidth: 420, marginBottom: 40 }}>
            Upload your ChatGPT, Claude, Gemini, or Grok export. We find what actually mattered and turn it into chapters, insights, and patterns.
          </p>

          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>Step 1 — Select your platform</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 440 }}>
              {platforms.map(p => (
                <button key={p.id} onClick={() => setPlatform(p.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderRadius: 4, cursor: 'pointer', border: platform === p.id ? `2px solid ${p.color}` : '2px solid var(--border)', background: platform === p.id ? `${p.color}15` : 'var(--cream)', transition: 'all 0.2s', textAlign: 'left' }}>
                  <span style={{ fontSize: 20 }}>{p.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{p.label}</span>
                </button>
              ))}
            </div>
            {platform && (
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10, padding: '8px 12px', background: 'var(--cream)', borderRadius: 4, maxWidth: 440 }}>
                📥 {platforms.find(p => p.id === platform)?.instructions}
              </p>
            )}
          </div>

          <div style={{ marginBottom: 8 }}>
            <p style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>Step 2 — Upload your export file</p>
            <div
              id="upload"
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
              onClick={() => document.getElementById('fileInput').click()}
              style={{ border: `1.5px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 4, padding: '28px 32px', background: dragOver ? '#f0ead8' : 'var(--cream)', cursor: 'pointer', transition: 'all 0.2s', maxWidth: 440 }}
            >
              <input id="fileInput" type="file" accept=".json,.html" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
              <p style={{ fontSize: 28, marginBottom: 10 }}>📂</p>
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                {file ? `✓ ${file.name}` : 'Drop your export file here'}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                {file ? 'Ready to generate' : 'Click to browse · .json or .html'}
              </p>
            </div>
          </div>

          <button onClick={handleGenerate} style={{ maxWidth: 440, width: '100%', background: 'var(--ink)', color: 'var(--paper)', border: 'none', padding: '18px 32px', fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer', borderRadius: 2, marginBottom: 12, marginTop: 16 }}>
            Generate My Life Book — $10 →
          </button>
          <p style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 440 }}>
            🔒 Your file is never stored. One-time payment, instant delivery.
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
                <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>Platforms</p>
                {['🤖 ChatGPT', '✦ Claude', '♊ Gemini', '𝕏 Grok'].map((p, i) => (
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
            ['1', 'Choose Platform', 'Select ChatGPT, Claude, Gemini, or Grok and export your history.', 'var(--ink)'],
            ['2', 'Upload', 'Drop your export file in. We filter out noise and keep what matters.', 'var(--accent)'],
            ['3', 'Analyze', 'AI finds your patterns, themes, struggles, and growth across all your chats.', '#b8922a'],
            ['4', 'Get Your Book', 'Chapters, insights, patterns — delivered as a beautiful PDF for $10.', 'var(--ink)'],
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
          Your AI chats have been trying to tell you <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>something.</em>
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(245,240,232,0.5)', marginBottom: 12 }}>It takes 60 seconds to find out what.</p>
        <p style={{ fontSize: 14, color: 'var(--accent)', marginBottom: 48, fontWeight: 500 }}>Works with ChatGPT · Claude · Gemini · Grok</p>
        <a href="#upload" style={{ display: 'inline-block', background: 'var(--accent)', color: 'var(--paper)', padding: '20px 48px', fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, borderRadius: 2, textDecoration: 'none' }}>
          Get My Life Book — $10
        </a>
        <p style={{ display: 'block', marginTop: 18, fontSize: 12, color: 'rgba(245,240,232,0.3)' }}>One-time payment. No account. Your file stays private.</p>
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
