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
        let title = convo.title || convo.name || 'Untitled Conversation'

        // Handle ChatGPT export format
        if (convo.mapping) {
          for (const node of Object.values(convo.mapping)) {
            if (node.message?.content?.parts && node.message.author?.role === 'user') {
              const text = node.message.content.parts.join(' ').trim()
              if (text.length > 30) messages.push(text)
            }
          }
        } 
        // Handle other possible formats
        else if (convo.messages && Array.isArray(convo.messages)) {
          for (const msg of convo.messages) {
            if (msg.role === 'user' || msg.author === 'user') {
              const text = (msg.content || msg.text || '').trim()
              if (text.length > 30) messages.push(text)
            }
          }
        }

        if (messages.length > 0) {
          conversations.push({
            title: title,
            messages: messages.slice(0, 8)   // Limit to 8 messages per conversation
          })
        }
      }
    }
  } catch (e) {
    console.error('Parse error:', e)
  }
  return conversations
}

// Strong filtering to remove code, garbage, and low-value conversations
function filterMeaningful(conversations) {
  const strongPersonalKeywords = [
    'i feel', 'i felt', 'i think', 'im anxious', 'anxiety', 'ocd', 'adhd', 'narcolepsy',
    'i hate', 'i love', 'i want', 'i need', 'i wish', 'im scared', 'im worried', 'overwhelmed',
    'depressed', 'lonely', 'motivation', 'confidence', 'purpose', 'should i', 'what if',
    'career', 'job', 'quit', 'future', 'relationship', 'family', 'parents', 'money', 'debt',
    'broke', 'startup', 'business idea', 'regret', 'proud', 'change', 'who am i', 'self',
    'identity', 'therapy', 'mental health', 'speech issues', 'cluttering', 'dog', 'walk'
  ]

  const garbageIndicators = [
    'password', 'vm', 'tryhackme', 'dishwasher', 'function ', 'const ', 'let ', 'var ',
    'console.log', 'print(', 'return ', 'if (', 'for (', 'while (', 'await ', 'api/',
    'endpoint', 'json', 'error:', 'exception', '```', 'http', 'select ', 'how much',
    'is ... bad', 'is there a', 'what is the best', 'can you help me with'
  ]

  return conversations
    .filter(convo => {
      const fullText = (convo.title + ' ' + convo.messages.join(' ')).toLowerCase().trim()

      if (fullText.length < 100) return false

      // Reject technical/garbage conversations
      const garbageScore = garbageIndicators.filter(ind => fullText.includes(ind)).length
      if (garbageScore >= 2) return false

      // Must contain real personal content
      const personalScore = strongPersonalKeywords.filter(k => fullText.includes(k)).length
      if (personalScore < 2) return false

      return true
    })
    .slice(0, 160)   // Hard limit - safe for Gemini free tier
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

      setLoadingMsg('Filtering out code and low-value conversations...')
      const allConvos = extractConversations(text, file.name)
      
      const meaningful = filterMeaningful(allConvos)

      console.log(`Total conversations found: ${allConvos.length}`)
      console.log(`After filtering: ${meaningful.length} meaningful conversations`)

      if (meaningful.length < 8) {
        alert('Not enough personal conversations found after filtering. Your export may contain mostly technical content. Try using an older export or contact support.')
        setLoading(false)
        return
      }

      // Friendly message for large files
      if (allConvos.length > 300) {
        setLoadingMsg(`Large export (${allConvos.length} conversations). Using the ${meaningful.length} most personal ones...`)
      } else {
        setLoadingMsg(`Analyzing ${meaningful.length} meaningful conversations...`)
      }

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
        const errText = await res.text()
        console.error('API error:', errText)
        alert('Something went wrong with generation. Please try again.')
        setLoading(false)
        return
      }

      setLoadingMsg('Writing your Life Book...')
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
                <button 
                  key={p.id} 
                  onClick={() => setPlatform(p.id)} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 10, 
                    padding: '14px 16px', 
                    borderRadius: 4, 
                    cursor: 'pointer', 
                    border: platform === p.id ? `2px solid ${p.color}` : '2px solid var(--border)', 
                    background: platform === p.id ? `${p.color}15` : 'var(--cream)', 
                    transition: 'all 0.2s', 
                    textAlign: 'left' 
                  }}
                >
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
              style={{ 
                border: `1.5px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`, 
                borderRadius: 4, 
                padding: '28px 32px', 
                background: dragOver ? '#f0ead8' : 'var(--cream)', 
                cursor: 'pointer', 
                transition: 'all 0.2s', 
                maxWidth: 440 
              }}
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

          <button 
            onClick={handleGenerate} 
            style={{ 
              maxWidth: 440, 
              width: '100%', 
              background: 'var(--ink)', 
              color: 'var(--paper)', 
              border: 'none', 
              padding: '18px 32px', 
              fontSize: 13, 
              letterSpacing: '0.12em', 
              textTransform: 'uppercase', 
              fontFamily: 'DM Sans, sans-serif', 
              fontWeight: 500, 
              cursor: 'pointer', 
              borderRadius: 2, 
              marginBottom: 12, 
              marginTop: 16 
            }}
          >
            Generate My Life Book — $10 →
          </button>
          <p style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 440 }}>
            🔒 Your file is never stored. One-time payment, instant delivery.
          </p>
        </div>

        {/* Right side preview */}
        <div style={{ background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 50px', position: 'relative', overflow: 'hidden' }}>
          {/* Your existing preview UI code goes here - keep it as is */}
          <div style={{ width: '100%', maxWidth: 340, background: 'var(--paper)', borderRadius: 3, boxShadow: '-8px 8px 40px rgba(0,0,0,0.6)', animation: 'float 6s ease-in-out infinite', overflow: 'hidden' }}>
            {/* ... keep your original preview card content ... */}
          </div>
        </div>
      </div>

      {/* Keep the rest of your page (How it works section, footer, etc.) as they were */}
      {/* For space, I omitted repeating the long sections - just copy them from your original file if needed */}

      <style>{`
        @keyframes loadBar { 0% { width: 0% } 50% { width: 80% } 100% { width: 100% } }
        @keyframes float { 0%, 100% { transform: rotate(-2deg) translateY(0px); } 50% { transform: rotate(-2deg) translateY(-12px); } }
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns: '1fr 1fr'"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  )
}
