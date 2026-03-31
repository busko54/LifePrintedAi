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
              onDragOver={(e) => { e.preventDefault(); setDragOv
