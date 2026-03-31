export const maxDuration = 60

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY
  
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not set')
    return ''
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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
  
  if (!res.ok) {
    console.error('Gemini API error status:', res.status)
    console.error('Gemini API error body:', JSON.stringify(data))
    return ''
  }

  if (!data.candidates) {
    console.error('Gemini no candidates:', JSON.stringify(data))
    return ''
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
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
    const { conversations, totalCount, platform } = await req.json()

    console.log('Received conversations:', conversations?.length)
    console.log('Platform:', platform)

    if (!conversations || conversations.length < 3) {
      return Response.json({ error: 'Not enough meaningful conversations found.' }, { status: 400 })
    }

    const chunks = chunkArray(conversations, 20)
    console.log('Total chunks to summarize:', chunks.length)

    const summaries = []

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      console.log(`Summarizing chunk ${i + 1} of ${chunks.length}`)

      const chunkText = chunk.map((c, idx) =>
        `[${idx + 1}] Title: ${c.title}\nMessages: ${c.messages.join(' | ')}`
      ).join('\n\n')

      const summaryPrompt = `You are summarizing a batch of someone's personal AI conversations.

Here are the conversations:
${chunkText}

For each conversation that reveals something personal — emotions, struggles, goals, fears, decisions, relationships, career thoughts, money worries — write one sentence summarizing what the person was really asking or feeling underneath the surface.

Skip purely technical or factual conversations.

Return ONLY a numbered list of sentences, nothing else. Example:
1. Person is anxious about leaving their job but frames it as a practical question
2. Person is seeking validation for a business idea they are already committed to`

      const summary = await callGemini(summaryPrompt)
      console.log(`Chunk ${i + 1} summary length:`, summary?.length)
      if (summary) summaries.push(summary)
    }

    console.log('Total summaries collected:', summaries.length)

    if (summaries.length === 0) {
      return Response.json({ error: 'Gemini API not responding. Check your API key in Vercel environment variables.' }, { status: 500 })
    }

    const allSummaries = summaries.join('\n\n')

    const analysisPrompt = `You are creating someone's personal Life Book based on summaries of their AI conversations over time.

Here are the conversation summaries:
${allSummaries}

Based on these, create a deeply personal and brutally honest analysis. Be specific. Be slightly uncomfortable. The person reading this should feel "how did it know that about me?" not "this is generic."

Respond ONLY with a valid JSON object, no other text, no markdown backticks:
{
  "chapters": [
    {
      "number": "I",
      "title": "A specific evocative chapter title",
      "summary": "Write 2-3 paragraphs as if you are a biographer who has read everything this person ever asked an AI. What were they really going through? What did they keep circling back to? Be specific and narrative, not generic."
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
    "conversations_analyzed": ${conversations.length},
    "total_conversations": ${totalCount},
    "dominant_theme": "The single most dominant theme of their life in one short punchy phrase"
  }
}`

    const analysisResponse = await callGemini(analysisPrompt)
    console.log('Analysis response length:', analysisResponse?.length)

    if (!analysisResponse) {
      return Response.json({ error: 'AI did not return a response. Try again.' }, { status: 500 })
    }

    const cleanJson = analysisResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const result = JSON.parse(cleanJson)

    return Response.json(result)

  } catch (error) {
    console.error('Top level error:', error.message)
    console.error('Stack:', error.stack)
    return Response.json({ error: error.message || 'Something went wrong.' }, { status: 500 })
  }
}
