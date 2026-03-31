export const maxDuration = 300

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function callGemini(prompt, retryCount = 0) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is missing')

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2500 }
      })
    }
  )

  const data = await res.json()

  if (!res.ok) {
    if (res.status === 429 && retryCount < 5) {
      const delay = Math.pow(2, retryCount) * 3000 + Math.random() * 1000
      console.log(`Rate limit. Waiting ${Math.round(delay/1000)}s before retry ${retryCount + 1}`)
      await sleep(delay)
      return callGemini(prompt, retryCount + 1)
    }
    throw new Error(`Gemini error: ${res.status} - ${JSON.stringify(data)}`)
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

export async function POST(req) {
  try {
    const { conversations, totalCount } = await req.json()

    if (!conversations || conversations.length === 0) {
      return Response.json({ error: 'No conversations received.' }, { status: 400 })
    }

    console.log(`Received ${conversations.length} conversations`)

    // Only process top 20 to stay well within free tier limits
    const toProcess = conversations.slice(0, 20)
    const allSummaries = []

    for (let i = 0; i < toProcess.length; i++) {
      const convo = toProcess[i]
      console.log(`Processing ${i + 1}/${toProcess.length}: ${convo.title}`)

      const messages = convo.messages.slice(0, 8).join('\n')
      const convoText = `Title: ${convo.title}\n${messages}`

      const prompt = `Summarize this personal conversation in 1-2 sentences.
Focus only on emotions, struggles, goals, fears, decisions, or life insights.
Ignore technical help or random facts.
Return ONLY the summary, nothing else.

Conversation:
${convoText}`

      try {
        const summary = await callGemini(prompt)
        if (summary && summary.length > 10) {
          allSummaries.push(summary.trim())
        }
      } catch (err) {
        console.log(`Skipping conversation ${i + 1} due to error:`, err.message)
      }

      // 2 second delay between every request — key fix
      if (i < toProcess.length - 1) {
        await sleep(2000)
      }
    }

    console.log(`Got ${allSummaries.length} summaries`)

    if (allSummaries.length === 0) {
      return Response.json({ 
        error: 'Gemini quota exhausted for today. Please try again tomorrow or add billing at console.cloud.google.com.' 
      }, { status: 500 })
    }

    // Wait 3 seconds before the final analysis call
    await sleep(3000)

    const finalPrompt = `You are writing a personal Life Book based on someone's AI conversation history.

Here are summaries of their most personal conversations:
${allSummaries.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Write a deeply personal and honest Life Book. Be specific. Make it feel like someone who truly knows them wrote it.

Return ONLY valid JSON, no markdown, no backticks:
{
  "chapters": [
    {"number": "I", "title": "Specific chapter title", "summary": "2-3 paragraphs narrative about what this person was really going through in this area of their life. Be specific, not generic."},
    {"number": "II", "title": "Specific chapter title", "summary": "2-3 paragraphs."},
    {"number": "III", "title": "Specific chapter title", "summary": "2-3 paragraphs."}
  ],
  "insights": [
    "Brutally honest insight that stings a little",
    "Another uncomfortable truth about their patterns",
    "Insight about how they make decisions",
    "Insight about what they avoid",
    "Insight about what they really want vs what they say they want"
  ],
  "patterns": [
    "Specific recurring behavioral pattern",
    "Recurring emotional cycle or trigger",
    "Pattern in how they approach problems",
    "Something they keep returning to",
    "Pattern in their relationship with themselves"
  ],
  "stats": {
    "conversations_analyzed": ${allSummaries.length},
    "total_conversations": ${totalCount},
    "dominant_theme": "Single most dominant theme in one punchy phrase"
  }
}`

    const resultText = await callGemini(finalPrompt)

    if (!resultText) {
      return Response.json({ error: 'Failed to generate Life Book. Try again.' }, { status: 500 })
    }

    const cleanJson = resultText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const result = JSON.parse(cleanJson)

    return Response.json(result)

  } catch (error) {
    console.error('Fatal error:', error.message)
    return Response.json({ 
      error: 'Something went wrong. If this keeps happening, Gemini free quota may be exhausted for today. Try again tomorrow.' 
    }, { status: 500 })
  }
}
