import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, content, level, messages, lengthInstruction } = body;
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
      systemPrompt = `You are a quiz generator. Generate exactly 5 meaningful MCQ questions based on the actual CONTENT and CONCEPTS provided — not trivial or generic questions. Questions should test understanding of the specific topic. Return ONLY valid JSON with no extra text:
{"questions":[{"q":"specific question about the content","options":["A) option1","B) option2","C) option3","D) option4"],"answer":"A"}]}`;
      chatMessages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate 5 MCQ questions about: ${content}` }
      ];
    } else if (mode === 'title') {
      systemPrompt = `Generate a short, descriptive conversation title (max 50 chars) that summarizes what the user asked about. Like ChatGPT does — e.g. "Binary Search Tree Explanation", "BTS Members and Ages", "Python List Comprehension". Return ONLY the title, nothing else.`;
      chatMessages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate title for conversation about: ${content}` }
      ];
    }

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: chatMessages,
      max_tokens: mode === 'title' ? 20 : 1500,
      temperature: mode === 'title' ? 0.3 : 0.7,
    });

    const text = response.choices[0]?.message?.content || '';
    return NextResponse.json({ reply: text });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('API Error:', msg);
    return NextResponse.json({ reply: `Error: ${msg}` }, { status: 500 });
  }
}
