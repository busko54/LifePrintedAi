// app/api/generate/route.js
export const maxDuration = 300; // Increased for large histories

// Improved callGemini with retry logic
async function callGemini(prompt, retryCount = 0) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('GEMINI_API_KEY is not set');
    throw new Error('Gemini API key is missing');
  }

  const model = 'gemini-2.5-flash'; // Better model with improved quotas

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { 
            temperature: 0.75, 
            maxOutputTokens: 4000 
          }
        })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error(`Gemini API error status: ${res.status}`);
      console.error('Gemini API error body:', JSON.stringify(data));

      // Handle rate limit with retry
      if (res.status === 429 && retryCount < 6) {
        const delay = Math.pow(2, retryCount) * 1200 + Math.random() * 800; // 1.2s → ~40s backoff
        console.log(`Rate limit hit. Retrying in ${Math.round(delay/1000)} seconds... (Attempt ${retryCount + 1})`);
        await new Promise(r => setTimeout(r, delay));
        return callGemini(prompt, retryCount + 1);
      }

      throw new Error(`Gemini API error: ${res.status}`);
    }

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Gemini no candidates:', JSON.stringify(data));
      return '';
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    if (retryCount < 6) {
      const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
      console.log(`Error occurred. Retrying in ${Math.round(delay/1000)}s...`);
      await new Promise(r => setTimeout(r, delay));
      return callGemini(prompt, retryCount + 1);
    }
    console.error('Final Gemini call failed after retries:', error.message);
    throw error;
  }
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function POST(req) {
  try {
    const { conversations, totalCount, platform } = await req.json();

    console.log('Received conversations:', conversations?.length);
    console.log('Platform:', platform);

    if (!conversations || conversations.length < 3) {
      return Response.json({ error: 'Not enough meaningful conversations found.' }, { status: 400 });
    }

    // === HIERARCHICAL SUMMARIZATION (Best for 100s of conversations) ===

    console.log('Starting Level 1: Individual conversation summaries...');
    const convSummaries = [];

    for (let i = 0; i < conversations.length; i++) {
      const convo = conversations[i];
      console.log(`Summarizing conversation ${i + 1}/${conversations.length}`);

      const convText = `[Title: ${convo.title || 'Untitled'}]\nMessages:\n${convo.messages.join('\n')}`;

      const summaryPrompt = `Summarize this personal AI conversation in 1-2 concise sentences. 
Focus on the underlying emotions, struggles, goals, fears, decisions, or personal insights.
Skip purely technical or factual questions.
Return ONLY the summary sentence(s), no numbering, no extra text.`;

      const summary = await callGemini(summaryPrompt);
      if (summary && summary.trim().length > 10) {
        convSummaries.push(summary.trim());
      }
    }

    if (convSummaries.length === 0) {
      return Response.json({ error: 'Failed to summarize conversations. Please try again.' }, { status: 500 });
    }

    console.log(`Level 1 complete: ${convSummaries.length} conversation summaries created.`);

    // Level 2: Batch the short summaries (much more efficient)
    const summaryChunks = chunkArray(convSummaries, 25); // Safe batch size
    console.log(`Total summary chunks: ${summaryChunks.length}`);

    const batchSummaries = [];
    for (let i = 0; i < summaryChunks.length; i++) {
      console.log(`Processing summary batch ${i + 1} of ${summaryChunks.length}`);

      const batchText = summaryChunks[i].map((s, idx) => `${idx + 1}. ${s}`).join('\n');

      const batchPrompt = `Here are summaries of many personal AI conversations:
${batchText}

Extract the key emotional and personal themes from this batch. 
Return ONLY a numbered list of 4-8 insightful observations. Focus on recurring feelings, life patterns, and personal growth/struggles.`;

      const batchSummary = await callGemini(batchPrompt);
      if (batchSummary) batchSummaries.push(batchSummary);
    }

    const allSummaries = batchSummaries.join('\n\n');

    // Final Analysis - Create the Life Book
    console.log('Starting final Life Book analysis...');

    const analysisPrompt = `You are an insightful biographer writing a deeply personal and honest "Life Book" based on someone's AI conversation history.

Here are the analyzed conversation summaries:
${allSummaries}

Create a brutally honest, specific, and slightly uncomfortable analysis. The reader should feel "this really knows me."

Respond **ONLY** with valid JSON (no markdown, no extra text):

{
  "chapters": [
    {
      "number": "I",
      "title": "Evocative chapter title",
      "summary": "2-3 detailed paragraphs..."
    }
    // Create between 2 and 5 chapters total
  ],
  "insights": [
    "Specific, stinging honest insight about this person",
    "Another deep observation..."
  ],
  "patterns": [
    "Recurring behavioral pattern",
    "Emotional cycle or trigger..."
  ],
  "stats": {
    "conversations_analyzed": ${conversations.length},
    "total_conversations": ${totalCount},
    "dominant_theme": "One short, punchy dominant theme of their life"
  }
}`;

    const analysisResponse = await callGemini(analysisPrompt);

    if (!analysisResponse) {
      return Response.json({ error: 'Failed to generate the final Life Book. Please try again.' }, { status: 500 });
    }

    // Clean and parse JSON
    const cleanJson = analysisResponse
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    let result;
    try {
      result = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return Response.json({ error: 'Failed to parse AI response. Please try again.' }, { status: 500 });
    }

    console.log('Life Book generation completed successfully.');
    return Response.json(result);

  } catch (error) {
    console.error('Top level error:', error.message);
    console.error('Stack:', error.stack);

    return Response.json({ 
      error: error.message.includes('429') 
        ? 'Rate limit reached. Please wait a minute and try again.' 
        : 'Something went wrong while generating your Life Book. Please try again.' 
    }, { status: 500 });
  }
}
