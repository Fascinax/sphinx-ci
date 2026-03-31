import Anthropic from "@anthropic-ai/sdk";

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export type AIProvider = "anthropic" | "openrouter";

export interface QuizConfig {
  numQuestions: number;
  passingScore: number;
  maxAttempts: number;
  language: "fr" | "en";
  keyword: string;
  aiProvider?: AIProvider;
  aiModel?: string;
}

export const ANTHROPIC_MODELS = [
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4 (default)" },
  { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
  { value: "claude-3-opus-20240229", label: "Claude 3 Opus" },
] as const;

export const OPENROUTER_MODELS = [
  { value: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4" },
  { value: "anthropic/claude-3-5-haiku", label: "Claude 3.5 Haiku" },
  { value: "openai/gpt-4o", label: "GPT-4o" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash" },
  { value: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
  { value: "mistralai/mistral-large", label: "Mistral Large" },
] as const;

const ANTHROPIC_DEFAULT_MODEL = "claude-sonnet-4-20250514";
const OPENROUTER_DEFAULT_MODEL = "anthropic/claude-sonnet-4";

export const DEFAULT_QUIZ_CONFIG: QuizConfig = {
  numQuestions: 10,
  passingScore: 70,
  maxAttempts: 3,
  language: "fr",
  keyword: "@sphinx-ci",
  aiProvider: "anthropic",
};

const PROMPTS = {
  fr: (numQuestions: number) => ({
    system: `Tu es un expert code review. Analyse le diff de Pull Request et génère exactement ${numQuestions} questions à choix multiples pour tester la compréhension du développeur sur son propre code.`,
    instructions: `Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans backticks, sans texte avant ou après.

Structure exacte :
{
  "questions": [
    {
      "id": 1,
      "question": "Question précise sur le code",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct": 0,
      "explanation": "Explication courte (1-2 phrases)"
    }
  ]
}

Règles impératives :
- Générer exactement ${numQuestions} questions
- Questions UNIQUEMENT sur le code du diff fourni (pas de questions génériques)
- Couvrir : logique métier, gestion d'erreurs, effets de bord, patterns utilisés, cas limites, impacts potentiels
- "correct" est l'index (0-3) de la bonne réponse dans "options"
- Niveau de difficulté : développeur senior relisant son propre travail
- Varier les types : compréhension, analyse d'impact, détection de bugs potentiels
- Les mauvaises réponses doivent être plausibles (pas triviales)`,
  }),
  en: (numQuestions: number) => ({
    system: `You are a code review expert. Analyze the Pull Request diff and generate exactly ${numQuestions} multiple-choice questions to test the developer's understanding of their own code.`,
    instructions: `Respond ONLY with valid JSON, no markdown, no backticks, no text before or after.

Exact structure:
{
  "questions": [
    {
      "id": 1,
      "question": "Precise question about the code",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct": 0,
      "explanation": "Short explanation (1-2 sentences)"
    }
  ]
}

Mandatory rules:
- Generate exactly ${numQuestions} questions
- Questions ONLY about the code in the provided diff (no generic questions)
- Cover: business logic, error handling, side effects, patterns used, edge cases, potential impacts
- "correct" is the index (0-3) of the correct answer in "options"
- Difficulty level: senior developer reviewing their own work
- Vary types: comprehension, impact analysis, potential bug detection
- Wrong answers must be plausible (not trivial)`,
  }),
};

export async function generateQuizQuestions(
  prTitle: string,
  filesChanged: string[],
  diff: string,
  apiKey: string,
  config: QuizConfig = DEFAULT_QUIZ_CONFIG
): Promise<QuizQuestion[]> {
  const lang = PROMPTS[config.language] || PROMPTS.fr;
  const { system, instructions } = lang(config.numQuestions);

  const prompt = `${instructions}

PR : "${prTitle}"
Fichiers modifiés : ${filesChanged.join(", ")}

DIFF :
${diff}`;

  const provider = config.aiProvider ?? "anthropic";

  if (provider === "openrouter") {
    return generateWithOpenRouter(apiKey, config.aiModel ?? OPENROUTER_DEFAULT_MODEL, system, prompt, config.numQuestions);
  }

  return generateWithAnthropic(apiKey, config.aiModel ?? ANTHROPIC_DEFAULT_MODEL, system, prompt, config.numQuestions);
}

async function generateWithAnthropic(
  apiKey: string,
  model: string,
  system: string,
  prompt: string,
  numQuestions: number
): Promise<QuizQuestion[]> {
  const client = new Anthropic({ apiKey });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const message = await client.messages.create(
      {
        model,
        max_tokens: 4096,
        system,
        messages: [{ role: "user", content: prompt }],
      },
      { signal: controller.signal }
    );

    clearTimeout(timeout);

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    return parseAndValidateQuestions(text, numQuestions);
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

async function generateWithOpenRouter(
  apiKey: string,
  model: string,
  system: string,
  prompt: string,
  numQuestions: number
): Promise<QuizQuestion[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://sphinx-ci.vercel.app",
        "X-Title": "sphinx-ci",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      throw new Error(`OpenRouter error ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    return parseAndValidateQuestions(text, numQuestions);
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

function parseAndValidateQuestions(text: string, numQuestions: number): QuizQuestion[] {
  const parsed = JSON.parse(text);

  if (
    !parsed.questions ||
    !Array.isArray(parsed.questions) ||
    parsed.questions.length !== numQuestions
  ) {
    throw new Error(`AI did not return exactly ${numQuestions} questions`);
  }

  for (const q of parsed.questions) {
    if (
      typeof q.id !== "number" ||
      typeof q.question !== "string" ||
      !Array.isArray(q.options) ||
      q.options.length !== 4 ||
      typeof q.correct !== "number" ||
      q.correct < 0 ||
      q.correct > 3 ||
      typeof q.explanation !== "string"
    ) {
      throw new Error("Invalid question format");
    }
  }

  return parsed.questions as QuizQuestion[];
}
