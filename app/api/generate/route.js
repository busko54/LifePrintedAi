// app/api/generate/route.js - MVP Version (Better for long single chats)
export const maxDuration = 300;

async function callGemini(prompt, retryCount = 0) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is missing');

  const model = 'gemini-2.5-flash';

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2500 }
        })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 429 && retryCount < 4) {
        const delay = Math.pow(2, retryCount) * 2500;
        console.log(`Rate limit hit. Waiting ${Math.round(delay/1000)} seconds...`);
        await new Promise(r => setTimeout(r, delay));
        return callGemini(prompt, retryCount + 1);
      }
      throw new Error(`Gemini error: ${res.status}`);
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (error) {
    if (retryCount < 4) {
      await new Promise(r => setTimeout(r, 3000));
      return callGemini(prompt, retryCount + 1);
    }
    throw error;
  }
}

export async function POST(req) {
  try {
    const { conversations, totalCount } = await req.json();

    if (!conversations || conversations.length === 0) {
      return Response.json({ error: 'No conversations received.' }, { status: 400 });
    }

    console.log(`Received ${conversations.length} conversations. Total original: ${totalCount}`);

    // Take max 60 conversations for MVP (to respect quota)
    const toProcess = conversations.slice(0, 60);

    const allSummaries = [];

    for (let i = 0; i < toProcess.length; i++) {
      const convo = toProcess[i];
      console.log(`Processing conversation ${i + 1}/${toProcess.length}: ${convo.title}`);

      // If the conversation is very long, take only the most recent messages
      let messagesToUse = convo.messages;
      if (messagesToUse.length > 15) {
        messagesToUse = messagesToUse.slice(-15); // take last 15 messages
      }

      const convoText = `Title: ${convo.title}\n\n${messagesToUse.join('\n')}`;

      const prompt = `Summarize this personal conversation in 1-2 sentences. 
Focus only on emotions, personal struggles, goals, fears, decisions, or life insights.
Ignore code, technical help, or random facts.
Return ONLY the summary.`;

      const summary = await callGemini(prompt);
      if (summary && summary.length > 10) {
        allSummaries.push(summary.trim());
      }
    }

    if (allSummaries.length === 0) {
      return Response.json({ error: 'Could not generate summaries. Gemini quota may be exhausted for today.' }, { status: 500 });
    }

    // Final Life Book
    const finalPrompt = `You are writing a short honest Life Book.

Here are summaries of the user's personal conversations:
${allSummaries.join('\n\n')}

Create 2 to 4 chapters. Be specific and personal.

Return ONLY valid JSON:
{
  "chapters": [
    {"number": "I", "title": "Title here", "summary": "2-3 paragraphs..."}
  ],
  "insights": ["insight 1", "insight 2"],
  "patterns": ["pattern 1"],
  "stats": {
    "conversations_analyzed": ${allSummaries.length},
    "total_conversations": ${totalCount},
    "dominant_theme": "One short dominant theme"
  }
}`;

    const resultText = await callGemini(finalPrompt);

    if (!resultText) {
      return Response.json({ error: 'Failed to create Life Book. Try again tomorrow.' }, { status: 500 });
    }

    const cleanJson = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanJson);

    return Response.json(result);

  } catch (error) {
    console.error(error);
    return Response.json({ 
      error: "Gemini daily quota reached or error occurred. Please try again tomorrow." 
    }, { status: 500 });
  }
}
