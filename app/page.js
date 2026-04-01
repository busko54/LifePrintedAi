'use client'
import { useState } from 'react'

function extractAndFilterMessages(content, filename) {
  const personalKeywords = [
    'i feel', 'i felt', 'i think', 'i am', "i'm", 'im ',
    'anxiety', 'anxious', 'depressed', 'stressed', 'overwhelmed', 'lonely',
    'i hate', 'i love', 'i want', 'i need', 'i wish',
    'scared', 'worried', 'nervous', 'excited', 'happy', 'sad', 'angry',
    'career', 'job', 'quit', 'fired', 'salary', 'money', 'debt', 'broke',
    'relationship', 'girlfriend', 'boyfriend', 'wife', 'husband',
    'family', 'parents', 'mom', 'dad', 'friend', 'alone',
    'future', 'goal', 'dream', 'purpose', 'meaning', 'life',
    'should i', 'help me', 'what if', 'advice', 'not sure',
    'startup', 'business', 'idea', 'build', 'launch',
    'therapy', 'mental health', 'confidence', 'self',
    'regret', 'mistake', 'failed', 'success', 'proud',
    'change', 'stuck', 'lost', 'confused', 'direction',
    'tired', 'exhausted', 'burned out', 'motivated', 'inspired',
    'identity', 'who am i', 'worth', 'value', 'deserve'
  ]

  const technicalIndicators = [
    'function(', 'const ', 'let ', 'var ', 'return ',
    'console.log', 'import ', 'export ', 'async ',
    '```', 'SELECT ', 'FROM ', 'WHERE ',
    'npm ', 'pip ', 'git ', 'docker',
    'error:', 'exception', 'undefined', 'null',
    'chmod', 'sudo', 'bash', 'python', 'javascript'
  ]

  let allPersonalMessages = []
  let totalMessages = 0
  let totalConversations = 0

  try {
    if (filename.endsWith('.json')) {
      const data = JSON.parse(content)
      const items = Array.isArray(data) ? data : [data]
      totalConversations = items.length

      for (const convo of items) {
        const title = convo.title || convo.name || 'Untitled'
        const convoMessages = []

        // Extract all user messages from this conversation
        if (convo.mapping) {
          for (const node of Object.values(convo.mapping)) {
            if (node.message?.content?.parts && node.message.author?.role === 'user') {
              const text = node.message.content.parts.join(' ').trim()
              if (text.length > 30) {
                totalMessages++
                convoMessages.push({ title, text })
              }
            }
          }
        }

        if (convo.messages && Array.isArray(convo.messages)) {
          for (const msg of convo.messages) {
            if (msg.role === 'user' || msg.author === 'user') {
              const text = (msg.content || msg.text || '').trim()
              if (text.length > 30) {
                totalMessages++
                convoMessages.push({ title, text })
              }
            }
          }
        }

        // Score each message — keep only personal ones
        for (const msg of convoMessages) {
          const lower = msg.text.toLowerCase()
          const personalScore = personalKeywords.filter(k => lower.includes(k)).length
          const techScore = technicalIndicators.filter(k => lower.includes(k)).length

          // Only keep if personal and not too technical
          if (personalScore >= 1 && techScore < 3) {
            allPersonalMessages.push({
              ...msg,
              personalScore,
              techScore
            })
          }
        }
      }
    }
  } catch (e) {
    console.error('Parse error:', e)
  }

  // Sort by most personal first
  allPersonalMessages.sort((a, b) => b.personalScore - a.personalScore)

  console.log(`Total messages in file: ${totalMessages}`)
  console.log(`Personal messages found: ${allPersonalMessages.length}`)

  // Take top 200 most personal messages
  const top200 = allPersonalMessages.slice(0, 200)

  // Group back into conversation-like chunks for the API
  const grouped = {}
  for (const msg of top200) {
    if (!grouped[msg.title]) grouped[msg.title] = []
    grouped[msg.title].push(msg.text)
  }

  const conversations = Object.entries(grouped).map(([title, messages]) => ({
    title,
    messages
  }))

  return {
    conversations,
    totalMessages,
    totalConversations,
    personalMessagesFound: allPersonalMessages.length
  }
}

export default function Home() {
  const [files, setFiles] = useState([])
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

  const handleFiles = (newFiles) => {
    const valid = Array.from(newFiles).filter(f =>
      f.name.endsWith('.json') || f.name.endsWith('.html')
    )
    if (valid.length === 0) return alert('Please upload .json or .html files')
    setFiles(prev => [...prev, ...valid])
  }

  const handleGenerate = async () => {
    if (!platform) return alert('Please select which AI platform your export is from')
    if (files.length === 0) return alert('Please upload at least one export file')

    setLoading(true)
    try {
      let allConversations = []
      let grandTotalMessages = 0
      let grandTotalConversations = 0
      let totalPersonalFound = 0

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setLoadingMsg(`Reading file ${i + 1} of ${files.length}: ${file.name}...`)

        const text = await file.text()

        setLoadingMsg(`Scanning every message in ${file.name}...`)
        const result = extractAndFilterMessages(text, file.name)

        allConversations.push(...result.conversations)
        grandTotalMessages += result.totalMessages
        grandTotalConversations += result.totalConversations
        totalPersonalFound += result.personalMessagesFound

        console.log(`File ${i + 1}: ${result.totalMessages} total messages, ${result.personalMessagesFound} personal`)
      }

      setLoadingMsg(`Found ${totalPersonalFound} personal messages across ${grandTotalMessages} total. Selecting the best 200...`)

      if (allConversations.length === 0) {
        alert('No personal conversations found. Try a different file.')
        setLoading(false)
        return
      }

      // Limit total messages sent to API to stay under 60s timeout
      // Take top messages across all files — already sorted by personal score
      const limitedConversations = []
      let messageCount = 0
      for (const convo of allConversations) {
        if (messageCount >= 200) break
        const msgs = convo.messages.slice(0, Math.min(convo.messages.length, 20))
        limitedConversations.push({ ...convo, messages: msgs })
        messageCount += msgs.length
      }

      setLoadingMsg(`Analyzing your ${messageCount} most personal messages...`)

      console.log(`Sending ${messageCount} messages across ${limitedConversations.length} conversations to API`)

      const payload = {
        conversations: limitedConversations,
        totalCount: grandTotalConversations,
        totalMessages: grandTotalMessages,
        platform
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errText = await res.text()
        console.error('API error:', errText)
        alert('Something went wrong. Please try again.')
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
          <p style={{ fontSize: 13, color: 'rgba(245,240,232,0.4)', letterSpacing: '0.06em', textAlign: 'center', maxWidth: 400, padding: '0 20px' }}>{loadingMsg}</p>
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
            Upload your ChatGPT, Claude, Gemini, or Grok export. We scan every single message and find what actually mattered.
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
            <p style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>
              Step 2 — Upload your export file
              {files.length > 0 && <span style={{ color: 'var(--accent)', marginLeft: 8 }}>({files.length} file{files.length > 1 ? 's' : ''} ready)</span>}
            </p>
            <div
              id="upload"
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
              onClick={() => document.getElementById('fileInput').click()}
              style={{ border: `1.5px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 4, padding: '28px 32px', background: dragOver ? '#f0ead8' : 'var(--cream)', cursor: 'pointer', transition: 'all 0.2s', maxWidth: 440 }}
            >
              <input id="fileInput" type="file" accept=".json,.html" multiple style={{ display: 'none' }} onChange={(e) => handleFiles(e.target.files)} />
              <p style={{ fontSize: 28, marginBottom: 10 }}>📂</p>
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                {files.length > 0 ? `✓ ${files.length} file${files.length > 1 ? 's' : ''} selected` : 'Drop your export file here'}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', wordBreak: 'break-all' }}>
                {files.length > 0 ? files.map(f => f.name).join(', ') : 'Click to browse · .json or .html'}
              </p>
            </div>
            {files.length > 0 && (
              <button onClick={() => setFiles([])} style={{ fontSize: 12, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 8, textDecoration: 'underline' }}>
                Clear files
              </button>
            )}
          </div>

          <button onClick={handleGenerate} style={{ maxWidth: 440, width: '100%', background: 'var(--ink)', color: 'var(--paper)', border: 'none', padding: '18px 32px', fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer', borderRadius: 2, marginBottom: 12, marginTop: 16 }}>
            Generate My Life Book — $10 →
          </button>
          <p style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 440 }}>
            🔒 Every message is scanned locally. Nothing stored. One-time payment.
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
            ['2', 'Upload Your File', 'Drop your export in. We scan every single message locally.', 'var(--accent)'],
            ['3', 'Deep Analysis', 'AI reads your most personal messages and finds what actually mattered.', '#b8922a'],
            ['4', 'Get Your Book', 'Chapters, insights, patterns — your life decoded for $10.', 'var(--ink)'],
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
  body { background: #0f0d0a !important; color: #f5f0e8 !important; }
  main { background: #0f0d0a !important; }
`}</style>
    </main>
  )
}
