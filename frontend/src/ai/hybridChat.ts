import { localGreeting, localReply } from './localChat';
import { buildCompactSummary } from './summary';
import { apiFetch } from '../utils/api';

export interface CloudChatResponse { text: string; }
export interface CloudChatRequest {
  mode: 'greeting' | 'chat';
  language: 'de' | 'en' | 'pl';
  model?: string;
  summary?: Record<string, any>;
  messages?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  const opts: RequestInit = { ...init, signal: controller.signal };
  try {
    return await fetch(input as any, opts);
  } finally {
    clearTimeout(id);
  }
}

export async function testCloudConnection(): Promise<boolean> {
  try {
    const res = await apiFetch('/');
    return (res as any)?.ok === true;
  } catch {
    return false;
  }
}

export async function callCloudLLM(request: CloudChatRequest): Promise<string> {
  try {
    const res = await apiFetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...request,
        model: request.model || 'gemini-1.5-flash'
      })
    });
    if (!(res as any)?.ok) {
      const txt = await (res as any).text?.();
      throw new Error(`Backend responded ${ (res as any)?.status }: ${ txt }`);
    }
    const data = await (res as any).json();
    const text = (data as CloudChatResponse)?.text || '';
    if (!text.trim()) throw new Error('Empty response from backend');
    return text.trim();
  } catch (error) {
    console.warn('Backend chat failed:', error);
    throw error;
  }
}

export async function hybridGreeting(state: any): Promise<string> {
  try {
    const isConnected = await testCloudConnection();
    if (!isConnected) throw new Error('Backend not reachable');

    const summary = buildCompactSummary(state);
    const request: CloudChatRequest = {
      mode: 'greeting',
      language: state.language || 'de',
      model: 'gemini-1.5-flash',
      summary
    };
    const result = await callCloudLLM(request);
    if (result && result.trim()) return result.trim();
    throw new Error('Empty response');
  } catch (error) {
    console.log('🔄 Backend failed, falling back to local greeting:', error);
    return await localGreeting(state);
  }
}

export async function hybridReply(state: any, userMessage: string): Promise<string> {
  try {
    const isConnected = await testCloudConnection();
    if (!isConnected) throw new Error('Backend not reachable');

    const summary = buildCompactSummary(state);
    const recentChat = (state.chat || []).slice(-6).map((msg: any) => ({
      role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.text
    }));
    recentChat.push({ role: 'user', content: userMessage });

    const request: CloudChatRequest = {
      mode: 'chat',
      language: state.language || 'de',
      model: 'gemini-1.5-flash',
      summary,
      messages: recentChat
    };

    const result = await callCloudLLM(request);
    if (result && result.trim()) return result.trim();
    throw new Error('Empty response');
  } catch (error) {
    console.log('🔄 Backend failed, falling back to local reply:', error);
    return await localReply(state, userMessage);
  }
}

export async function getAIStatus(): Promise<'cloud' | 'local' | 'offline'> {
  try {
    const ok = await testCloudConnection();
    return ok ? 'cloud' : 'local';
  } catch {
    return 'local';
  }
}