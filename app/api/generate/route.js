export const maxDuration = 60

async function callGemini(prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 2000 }
      })
    }
  )
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

function parseConversations(content, filename) {
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
            messages: messages.slice(0, 8)
          })
        }
      }
    } else {
      const matches = content.match(/(?:Human|You|User):\s*(.+?)(?=\n(?:Human|You|User|Assistant|AI):|$)/gis) || []
      for (const match of matches) {
        const text = match.replace(/^(?:Human|You|User):\s*/i, '').trim()
        if (text.length > 20) conversations.push({ title: 'Chat', messages: [text] })
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
  })
}

function chunkArray(arr, size) {
  const chunks = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

export async function POST(req) {
  try {
    const { content, filename, platform } = await req.json()

    if (!content || content.length < 100) {
      return Response.json({ error: 'File too small or empty' }, { status: 400 })
    }

    // Step 1 — Parse all conversations
    const allConvos = parseConversations(content, filename)

    // Step 2 — Filter to meaningful ones only
    const meaningful = filterMeaningful(allConvos)

    if (meaningful.length < 3) {
      return Response.json({ error: 'Not enough meaningful conversations found. Make sure you uploaded the right file.' }, { status: 400 })
    }

    // Step 3 — Chunk into groups of 20 and summarize each chunk
    const chunks = chunkArray(meaningful, 20)
    const summaries = []

    for (const chunk of chunks) {
      const chunkText = chunk.map((c, i) =>
        `[${i + 1}] Title: ${c.title}\nMessages: ${c.messages.join(' | ')}`
      ).join('\n\n')

      const summaryPrompt = `You are summarizing a batch of someone's personal AI conversations.

Here are the conversations:
${chunkText}

For each conversation that reveals something personal — emotions, struggles, goals, fears, decisions, relationships, career thoughts, money worries — write one sentence summarizing what the person was really asking or feeling underneath the surface.

Skip purely technical or factual conversations.

Return ONLY a numbered list of sentences, nothing else. Example:
1. Person is anxious about leaving their job but frames it as a practical question
2. Person is seeking validation for a business idea they are already committed to
3. Person repeatedly asks about productivity but the real issue seems to be motivation and self worth`

      const summary = await callGemini(summaryPrompt)
      if (summary) summaries.push(summary)
    }

    if (summaries.length === 0) {
      return Response.json({ error: 'Could not summarize conversations. Try again.' }, { status: 500 })
    }

    // Step 4 — Analyze all summaries together to generate the life book
    const allSummaries = summaries.join('\n\n')

    const analysisPrompt = `You are creating someone's personal "Life Book" based on summaries of their AI conversations over time.

Here are the conversation summaries:
${allSummaries}

Based on these, create a deeply personal and brutally honest analysis. Be specific. Be slightly uncomfortable. The person reading this should feel "how did it know that about me?" — not "this is generic."

Respond ONLY with a valid JSON object, no other text, no markdown:
{
  "chapters": [
    {
      "number": "I",
      "title": "A specific evocative chapter title",
      "summary": "Write 2-3 paragraphs as if you are a biographer who has read everything this person ever asked an AI. What were they really going through? What did they keep circling back to? What were they afraid to say directly? Be specific and narrative, not generic."
    },
    {
      "number": "II",
      "title": "A specific evocative chapter title",
      "summary": "2-3 paragraphs about another major theme in their life."
    },
    {
      "number": "III",
      "title": "A specific evocative chapter title",
      "summary": "2-3 paragraphs about a third major theme."
    }
  ],
  "insights": [
    "A brutally honest insight that stings a little — specific to this person, not generic",
    "Another uncomfortable truth about how they think or behave",
    "An insight about how they make decisions",
    "An insight about what they avoid or run from",
    "An insight about the gap between what they say they want and what they actually want"
  ],
  "patterns": [
    "A specific recurring behavioral pattern found across their conversations",
    "A recurring emotional cycle or trigger",
    "A pattern in how they approach problems or decisions",
    "Something they keep returning to over and over",
    "A pattern in how they relate to themselves"
  ],
  "stats": {
    "conversations_analyzed": ${meaningful.length},
    "total_conversations": ${allConvos.length},
    "dominant_theme": "The single most dominant theme of their life in one short punchy phrase"
  }
}`

    const analysisResponse = await callGemini(analysisPrompt)

    if (!analysisResponse) {
      return Response.json({ error: 'AI did not return a response. Try again.' }, { status: 500 })
    }

    const cleanJson = analysisResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const result = JSON.parse(cleanJson)

    return Response.json(result)

  } catch (error) {
    console.error('Error:', error)
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
