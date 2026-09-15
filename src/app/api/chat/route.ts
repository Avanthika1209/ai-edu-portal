import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const apiKey = process.env.GROQ_API_KEY;
const groq = new Groq({ apiKey });

export async function POST(req: NextRequest) {
  try {
    if (!apiKey) {
      return NextResponse.json({ error: 'Server config error: GROQ_API_KEY is missing.' }, { status: 500 });
    }

    const body = await req.json();
    const { mode, content, level, messages, lengthInstruction, difficulty, questionCount } = body;
    let systemPrompt = '';
    let chatMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];

    if (mode === 'tutor') {
      systemPrompt = `You are an expert AI tutor with broad knowledge. Answer at ${level || 'Beginner'} level with clear explanations and examples. You have full memory of the conversation — always use context from previous messages to answer follow-up questions accurately. For example if user asks "who is the youngest among them", refer back to the group mentioned earlier. For general knowledge (people, places, current affairs, Tamil Nadu officials, sports, politics, K-pop, movies, etc.), provide accurate and detailed answers. Use bullet points for lists. Keep answers clear, educational, and accurate.`;
      chatMessages = [
        { role: 'system', content: systemPrompt },
        ...(messages || []).map((m: { role: string; content: string }) => ({
          role: (m.role === 'assistant' || m.role === 'ai' ? 'assistant' : 'user') as 'user' | 'assistant',
          content: m.content
        }))
      ];
    } else if (mode === 'summarize') {
      const lengthInst = lengthInstruction || 'Create a medium-length summary (about 250 words) with Key Points, Main Concepts, and Important Details.';
      systemPrompt = `You are an expert summarizer. ${lengthInst} Use **bold** for key terms. Structure with clear sections.`;
      chatMessages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Summarize this text:\n\n${content}` }
      ];
    } else if (mode === 'quiz') {
      const count = Math.max(1, Math.min(20, Number(questionCount) || 5));
      systemPrompt = `You are a quiz generator. Generate exactly ${count} meaningful MCQ questions based on the actual CONTENT and CONCEPTS provided — not trivial or generic questions. Questions should test understanding of the specific topic. Match the requested difficulty level. Return ONLY valid JSON with no extra text:
{"questions":[{"q":"specific question about the content","options":["A) option1","B) option2","C) option3","D) option4"],"answer":"A"}]}`;
      chatMessages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate ${count} ${difficulty || 'medium'}-level MCQ questions about: ${content}` }
      ];
    } else if (mode === 'title') {
      systemPrompt = `Generate a short, descriptive conversation title (max 50 chars) that summarizes what the user asked about. Like ChatGPT does — e.g. "Binary Search Tree Explanation", "BTS Members and Ages", "Python List Comprehension". Return ONLY the title, nothing else.`;
      chatMessages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate title for conversation about: ${content}` }
      ];
    }

    if (!chatMessages.length) {
      return NextResponse.json({ error: 'Invalid request: unsupported mode or missing input.' }, { status: 400 });
    }

    const models = [
      'qwen/qwen3.8-27b',
      'groq/compound-mini',
      'qwen/qwen3.6-27b',
      'groq/compound',
    ];
    let response: Awaited<ReturnType<typeof groq.chat.completions.create>> | null = null;
    let lastErr: unknown = null;
    for (const model of models) {
      try {
        response = await groq.chat.completions.create({
          model,
          messages: chatMessages,
          max_tokens: mode === 'title' ? 40 : 1500,
          temperature: mode === 'title' ? 0.3 : 0.7,
        });
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (!response) throw lastErr || new Error('No response from Groq API');

    let text = response.choices[0]?.message?.content || '';
    text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    if (!text.trim()) {
      return NextResponse.json({ error: 'AI returned an empty response. Please retry.' }, { status: 502 });
    }
    return NextResponse.json({ reply: text });

  } catch (error: unknown) {
    const err = error as { message?: string; status?: number; error?: { message?: string } };
    const msg = err?.error?.message || err?.message || String(error);
    const status = typeof err?.status === 'number' ? err.status : 500;
    console.error('API Error:', msg);
    return NextResponse.json({ error: msg }, { status });
  }
}
