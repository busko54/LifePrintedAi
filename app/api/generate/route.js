export const maxDuration = 300

async function callOpenAI(prompt, maxTokens = 1000) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is missing')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.8
    })
  })

  const data = await res.json()

  if (!res.ok) {
    console.error('OpenAI error:', JSON.stringify(data))
    throw new Error(`OpenAI error: ${res.status}`)
  }

  return data.choices?.[0]?.message?.content || ''
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
    const { conversations, totalCount } = await req.json()

    if (!conversations || conversations.length === 0) {
      return Response.json({ error: 'No conversations received.' }, { status: 400 })
    }

    console.log(`Received ${conversations.length} conversations to analyze deeply`)

    // Step 1 — Collect ALL messages from ALL conversations
    const allMessages = []
    for (const convo of conversations) {
      for (const msg of convo.messages) {
        if (msg && msg.length > 20) {
          allMessages.push({
            title: convo.title,
            text: msg
          })
        }
      }
    }

    console.log(`Total messages to analyze: ${allMessages.length}`)

    // Step 2 — Chunk all messages into groups of 50
    const messageChunks = chunkArray(allMessages, 50)
    console.log(`Split into ${messageChunks.length} chunks`)

    const chunkSummaries = []

    // Step 3 — Summarize each chunk
    for (let i = 0; i < messageChunks.length; i++) {
      const chunk = messageChunks[i]
      console.log(`Summarizing chunk ${i + 1} of ${messageChunks.length}`)

      const chunkText = chunk.map((m, idx) =>
        `[${idx + 1}] (from: ${m.title})\n${m.text.slice(0, 300)}`
      ).join('\n\n')

      const prompt = `You are reading someone's personal AI conversation messages.

Here are ${chunk.length} messages they sent to an AI:

${chunkText}

Find the messages that reveal something real and personal — emotions, struggles, goals, fears, decisions, relationships, career, money, identity, mental health.

Write 2-4 sentences summarizing the most meaningful personal themes you see in this batch. Focus on what the person was really feeling or going through underneath the surface.

If this batch is purely technical or factual with nothing personal, just write "No personal content in this batch."

Return ONLY your summary, nothing else.`

      try {
        const summary = await callOpenAI(prompt, 300)
        if (summary && !summary.includes('No personal content')) {
          chunkSummaries.push(summary.trim())
          console.log(`Chunk ${i + 1} summary: ${summary.slice(0, 80)}...`)
        } else {
          console.log(`Chunk ${i + 1}: no personal content, skipping`)
        }
      } catch (err) {
        console.log(`Chunk ${i + 1} failed:`, err.message)
      }
    }

    console.log(`Got ${chunkSummaries.length} meaningful chunk summaries`)

    if (chunkSummaries.length === 0) {
      return Response.json({
        error: 'No personal content found in your conversations. Try a different file that has more personal discussions.'
      }, { status: 400 })
    }

    // Step 4 — If too many summaries, consolidate them first
    let finalSummaries = chunkSummaries

    if (chunkSummaries.length > 20) {
      console.log('Too many summaries, consolidating...')
      const summaryChunks = chunkArray(chunkSummaries, 10)
      finalSummaries = []

      for (let i = 0; i < summaryChunks.length; i++) {
        const prompt = `Consolidate these summaries of someone's personal AI conversations into 3-4 sentences capturing the most important themes:

${summaryChunks[i].join('\n\n')}

Return ONLY the consolidated summary.`

        try {
          const consolidated = await callOpenAI(prompt, 400)
          if (consolidated) finalSummaries.push(consolidated)
        } catch (err) {
          console.log(`Consolidation chunk ${i + 1} failed:`, err.message)
        }
      }
      console.log(`Consolidated to ${finalSummaries.length} final summaries`)
    }

    // Step 5 — Generate the Life Book
    console.log('Generating Life Book...')

    const allSummariesText = finalSummaries.join('\n\n---\n\n')

    const finalPrompt = `You are writing someone's personal Life Book based on a deep analysis of everything they have ever said to an AI.

Here is the complete analysis of their conversation history:

${allSummariesText}

This represents their real thoughts, fears, goals, struggles, and desires expressed over time to an AI. 

Write a deeply personal, brutally honest Life Book. Be specific to THIS person based on what you read. Make it feel like someone who truly knows them wrote it. The person reading this should feel "how did it know that about me?" not "this is generic."

Respond ONLY with valid JSON, no markdown, no backticks, no extra text:
{
  "chapters": [
    {
      "number": "I",
      "title": "Specific evocative title based on what you actually read",
      "summary": "3-4 paragraphs written like a biographer who read everything. What were they really going through? What did they keep circling back to? What were they afraid to say directly? Reference specific themes you found. Be narrative and personal, not generic."
    },
    {
      "number": "II",
      "title": "Specific evocative title",
      "summary": "3-4 paragraphs about another major theme from their history."
    },
    {
      "number": "III",
      "title": "Specific evocative title",
      "summary": "3-4 paragraphs about a third major theme."
    }
  ],
  "insights": [
    "Brutally honest insight that stings a little — specific to what you read, not generic",
    "Another uncomfortable truth about how they actually think based on their messages",
    "Specific insight about how they make decisions based on patterns you found",
    "Insight about what they consistently avoid or run from",
    "Insight about the gap between what they say they want and what they actually keep doing"
  ],
  "patterns": [
    "Specific recurring behavioral pattern you found across their messages",
    "Recurring emotional cycle or trigger based on what you read",
    "Pattern in how they approach problems — specific to them",
    "Something they keep returning to over and over",
    "Pattern in their relationship with themselves based on their messages"
  ],
  "stats": {
    "conversations_analyzed": ${conversations.length},
    "total_conversations": ${totalCount},
    "dominant_theme": "Single most dominant theme of their life in one punchy specific phrase"
  }
}`

    const resultText = await callOpenAI(finalPrompt, 3000)

    if (!resultText) {
      return Response.json({ error: 'AI did not return a response. Try again.' }, { status: 500 })
    }

    console.log('Life Book generated successfully')

    const cleanJson = resultText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const result = JSON.parse(cleanJson)

    return Response.json(result)

  } catch (error) {
    console.error('Fatal error:', error.message)
    return Response.json({
      error: error.message || 'Something went wrong. Please try again.'
    }, { status: 500 })
  }
}
