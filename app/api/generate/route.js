export const maxDuration = 60

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

function getTimePeriod(timestamp) {
  if (!timestamp) return null
  const date = new Date(timestamp * 1000)
  const year = date.getFullYear()
  const month = date.getMonth()
  if (month < 3) return `Early ${year}`
  if (month < 6) return `Spring ${year}`
  if (month < 9) return `Summer ${year}`
  if (month < 12) return `Late ${year}`
  return `${year}`
}

export async function POST(req) {
  try {
    const { conversations, totalCount, totalMessages } = await req.json()

    if (!conversations || conversations.length === 0) {
      return Response.json({ error: 'No conversations received.' }, { status: 400 })
    }

    console.log(`Received ${conversations.length} conversations`)

    // Step 1 — Collect all messages with time context
    const allMessages = []
    const timePeriods = new Set()

    for (const convo of conversations) {
      const period = getTimePeriod(convo.timestamp)
      if (period) timePeriods.add(period)

      for (const msg of convo.messages) {
        if (msg && msg.length > 20) {
          allMessages.push({
            title: convo.title,
            text: msg,
            period: period || 'Unknown period'
          })
        }
      }
    }

    const sortedPeriods = Array.from(timePeriods).sort()
    console.log(`Time periods found: ${sortedPeriods.join(', ')}`)
    console.log(`Total messages: ${allMessages.length}`)

    // Step 2 — Chunk messages into groups of 40
    const messageChunks = chunkArray(allMessages, 40)
    console.log(`Split into ${messageChunks.length} chunks`)

    const chunkSummaries = []

    // Step 3 — Summarize each chunk
    for (let i = 0; i < messageChunks.length; i++) {
      const chunk = messageChunks[i]
      console.log(`Summarizing chunk ${i + 1} of ${messageChunks.length}`)

      const chunkText = chunk.map((m, idx) =>
        `[${idx + 1}] ${m.period ? `(${m.period})` : ''} ${m.title}\n${m.text.slice(0, 250)}`
      ).join('\n\n')

      const prompt = `You are reading someone's personal AI conversation messages.

Here are ${chunk.length} messages they sent to an AI:

${chunkText}

Find the messages that reveal something real and personal — emotions, struggles, goals, fears, decisions, relationships, career, money, identity, mental health.

Note any time periods mentioned (like "Early 2023" or "Summer 2024") as they help build a timeline.

Write 2-4 sentences summarizing the most meaningful personal themes in this batch. Include the time period if available.

If purely technical, write "No personal content."

Return ONLY your summary.`

      try {
        const summary = await callOpenAI(prompt, 300)
        if (summary && !summary.includes('No personal content')) {
          chunkSummaries.push(summary.trim())
        }
      } catch (err) {
        console.log(`Chunk ${i + 1} failed:`, err.message)
      }
    }

    console.log(`Got ${chunkSummaries.length} summaries`)

    if (chunkSummaries.length === 0) {
      return Response.json({
        error: 'No personal content found. Try a file with more personal conversations.'
      }, { status: 400 })
    }

    // Step 4 — Consolidate if too many summaries
    let finalSummaries = chunkSummaries

    if (chunkSummaries.length > 15) {
      console.log('Consolidating summaries...')
      const summaryChunks = chunkArray(chunkSummaries, 8)
      finalSummaries = []

      for (let i = 0; i < summaryChunks.length; i++) {
        const prompt = `Consolidate these summaries into 3-4 sentences. Preserve any time periods or dates mentioned:

${summaryChunks[i].join('\n\n')}

Return ONLY the consolidated summary.`

        try {
          const consolidated = await callOpenAI(prompt, 400)
          if (consolidated) finalSummaries.push(consolidated)
        } catch (err) {
          console.log(`Consolidation ${i + 1} failed:`, err.message)
        }
      }
    }

    // Step 5 — Generate the Life Book
    console.log('Generating Life Book...')

    const allSummariesText = finalSummaries.join('\n\n---\n\n')
    const timelineContext = sortedPeriods.length > 0
      ? `The conversations span these time periods: ${sortedPeriods.join(', ')}.`
      : 'No specific dates were found in the data.'

    const finalPrompt = `You are writing someone's personal Life Book — a brutally honest autobiography based on everything they have ever said to an AI.

${timelineContext}

Here is the complete analysis of their conversation history:

${allSummariesText}

CRITICAL RULES:
1. Write in SECOND PERSON — use "you" and "your" throughout. NEVER say "they" or "this individual" or "the person." Talk directly TO them.
2. Write like a close friend who read everything — direct, warm, uncomfortably accurate
3. Each chapter should cover a SPECIFIC TIME PERIOD if dates are available — like "In the spring of 2023..." or "By late 2024..."
4. Make it read like a BOOK — narrative, flowing, emotional — not a report or bullet points
5. Be specific to what you actually read — no generic statements
6. The person reading should feel "how did it know that about me?"

Example of good tone: "You spent most of early 2023 asking the same question in different ways. Not about your career — about whether you were capable of having one."

Example of bad tone: "This individual struggled with career uncertainty during this period."

Respond ONLY with valid JSON, no markdown, no backticks:
{
  "chapters": [
    {
      "number": "I",
      "title": "Specific evocative title with time period if available — e.g. 'Early 2023: The Question You Kept Asking'",
      "period": "Early 2023",
      "summary": "3-4 paragraphs written directly TO the person using 'you' and 'your'. Written like a book — narrative, flowing, personal. What were YOU really going through? What did YOU keep circling back to? Reference specific themes found. Start with something like 'You were...' or 'In the spring of 2023, you...'"
    },
    {
      "number": "II",
      "title": "Specific title with time period",
      "period": "Mid 2024",
      "summary": "3-4 paragraphs in second person about another major theme or time period."
    },
    {
      "number": "III",
      "title": "Specific title with time period",
      "period": "Late 2024",
      "summary": "3-4 paragraphs in second person about a third theme or time period."
    }
  ],
  "insights": [
    "Brutally honest insight written to them directly — starts with 'You...' — specific to what you read",
    "Another uncomfortable truth — starts with 'You...'",
    "Specific insight about how YOU make decisions",
    "Insight about what YOU consistently avoid",
    "The gap between what you say you want and what you actually keep doing"
  ],
  "patterns": [
    "Specific recurring pattern — written as 'You do X when Y happens'",
    "Recurring emotional cycle — specific to what you found",
    "Pattern in how YOU approach problems",
    "Something YOU keep returning to over and over",
    "Pattern in YOUR relationship with yourself"
  ],
  "stats": {
    "conversations_analyzed": ${conversations.length},
    "total_conversations": ${totalCount},
    "dominant_theme": "Single most dominant theme in one punchy phrase"
  }
}`

    const resultText = await callOpenAI(finalPrompt, 3000)

    if (!resultText) {
      return Response.json({ error: 'AI did not return a response. Try again.' }, { status: 500 })
    }

    console.log('Life Book generated')

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
