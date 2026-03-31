export const maxDuration = 60

async function callOpenAI(prompt) {
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
      max_tokens: 2500,
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

    console.log(`Received ${conversations.length} conversations`)

    // Chunk into groups of 15 and summarize each chunk in one call
    const chunks = chunkArray(conversations, 15)
    const summaries = []

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      console.log(`Summarizing chunk ${i + 1} of ${chunks.length}`)

      const chunkText = chunk.map((c, idx) =>
        `[${idx + 1}] Title: ${c.title}\nMessages: ${c.messages.slice(0, 5).join(' | ')}`
      ).join('\n\n')

      const prompt = `You are analyzing someone's personal AI conversation history.

Here are ${chunk.length} conversations:

${chunkText}

For each conversation that reveals something personal — emotions, struggles, goals, fears, decisions, relationships, career, money, identity — write one honest sentence about what the person was really feeling or asking underneath the surface.

Skip technical, coding, or purely factual conversations entirely.

Return ONLY a numbered list, nothing else:
1. [summary]
2. [summary]
etc.`

      const summary = await callOpenAI(prompt)
      if (summary) summaries.push(summary)
    }

    if (summaries.length === 0) {
      return Response.json({ error: 'Could not analyze conversations. Check your API key.' }, { status: 500 })
    }

    const allSummaries = summaries.join('\n')

    console.log('Generating final Life Book...')

    const finalPrompt = `You are writing someone's personal Life Book based on summaries of their entire AI conversation history.

Here are the conversation summaries:
${allSummaries}

Create a deeply personal, brutally honest Life Book. Be specific to this person. Make it feel like someone who truly knows them wrote it. The person reading this should feel "how did it know that about me?" — not "this is generic."

Respond ONLY with valid JSON, no markdown, no backticks:
{
  "chapters": [
    {
      "number": "I",
      "title": "Specific evocative title",
      "summary": "2-3 paragraphs written like a biographer who read everything. What were they really going through? What did they keep circling back to? What were they afraid to say directly? Be specific and narrative."
    },
    {
      "number": "II",
      "title": "Specific evocative title",
      "summary": "2-3 paragraphs about another major theme."
    },
    {
      "number": "III",
      "title": "Specific evocative title",
      "summary": "2-3 paragraphs about a third theme."
    }
  ],
  "insights": [
    "Brutally honest insight that stings a little — specific to this person",
    "Another uncomfortable truth about how they think",
    "Insight about how they make decisions",
    "Insight about what they avoid or run from",
    "Insight about gap between what they say they want and what they actually want"
  ],
  "patterns": [
    "Specific recurring behavioral pattern",
    "Recurring emotional cycle or trigger",
    "Pattern in how they approach problems",
    "Something they keep returning to",
    "Pattern in their relationship with themselves"
  ],
  "stats": {
    "conversations_analyzed": ${conversations.length},
    "total_conversations": ${totalCount},
    "dominant_theme": "Single most dominant theme in one punchy phrase"
  }
}`

    const resultText = await callOpenAI(finalPrompt)

    if (!resultText) {
      return Response.json({ error: 'AI did not return a response. Try again.' }, { status: 500 })
    }

    const cleanJson = resultText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const result = JSON.parse(cleanJson)

    return Response.json(result)

  } catch (error) {
    console.error('Error:', error.message)
    return Response.json({ error: error.message || 'Something went wrong.' }, { status: 500 })
  }
}
