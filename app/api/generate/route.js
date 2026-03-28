import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function parseConversations(content, filename, platform) {
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
        if (messages.length > 0) {
          conversations.push({
            title: convo.title || 'Untitled',
            messages: messages.slice(0, 5)
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

  return conversations.slice(0, 200)
}

function filterMeaningful(conversations) {
  const keywords = [
    'should i', 'how do i', 'i feel', 'i want', 'i need', 'i am', "i'm",
    'career', 'job', 'money', 'relationship', 'anxiety', 'depressed', 'happy',
    'goal', 'dream', 'fear', 'afraid', 'help me', 'what if', 'i hate',
    'i love', 'i wish', 'struggle', 'problem', 'advice', 'future', 'life',
    'business', 'startup', 'idea', 'health', 'family', 'friend'
  ]

  return conversations.filter(convo => {
    const text = convo.messages.join(' ').toLowerCase()
    const score = keywords.filter(k => text.includes(k)).length
    return score >= 1 && text.length > 50
  }).slice(0, 80)
}

export async function POST(req) {
  try {
    const { content, filename } = await req.json()

    if (!content || content.length < 100) {
      return Response.json({ error: 'File too small or empty' }, { status: 400 })
    }

    const allConvos = parseConversations(content, filename)
    const meaningful = filterMeaningful(allConvos)

    if (meaningful.length < 3) {
      return Response.json({ error: 'Not enough meaningful conversations found. Make sure you uploaded the right file.' }, { status: 400 })
    }

    const convoText = meaningful.map((c, i) =>
      `[${i + 1}] ${c.title}\n${c.messages.join('\n')}`
    ).join('\n\n---\n\n')

    const prompt = `You are analyzing someone's ChatGPT conversation history to create their personal "Life Book". 

Here are their most meaningful conversations:

${convoText}

Based on these conversations, create a deeply personal and honest analysis. Be specific, insightful, and slightly uncomfortable — not generic. If someone reads this, they should feel "how did it know that about me?"

Respond ONLY with a valid JSON object in this exact format:
{
  "chapters": [
    {
      "number": "I",
      "title": "Chapter title here",
      "summary": "2-3 paragraph narrative about what this person was going through in this area of their life. Be specific and personal, not generic."
    },
    {
      "number": "II", 
      "title": "Chapter title here",
      "summary": "2-3 paragraph narrative."
    },
    {
      "number": "III",
      "title": "Chapter title here", 
      "summary": "2-3 paragraph narrative."
    }
  ],
  "insights": [
    "Brutally honest, specific insight about this person. Not 'you value growth' but something that stings a little.",
    "Another uncomfortable truth about their patterns.",
    "A specific insight about how they make decisions.",
    "An insight about what they avoid.",
    "An insight about what they really want vs what they say they want."
  ],
  "patterns": [
    "Specific behavioral pattern you noticed across conversations",
    "A recurring emotional trigger or cycle",
    "A pattern in how they approach problems",
    "Something they keep coming back to",
    "A pattern in their relationship with themselves"
  ],
  "stats": {
    "conversations_analyzed": ${meaningful.length},
    "total_conversations": ${allConvos.length},
    "dominant_theme": "The single most dominant theme in one phrase"
  }
}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    })

    const responseText = message.content[0].text
    const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const result = JSON.parse(cleanJson)

    return Response.json(result)
  } catch (error) {
    console.error('Error:', error)
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
