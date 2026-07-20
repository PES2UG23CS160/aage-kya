import Groq from 'groq-sdk'

export function createGroqProvider({ apiKey, model = 'llama-3.3-70b-versatile' }) {
  if (!apiKey) return null
  const client = new Groq({ apiKey })

  return {
    name: 'groq',
    async generateStructured({ prompt }) {
      const completion = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.35,
        max_tokens: 2600,
        response_format: { type: 'json_object' },
      })
      const text = completion.choices[0]?.message?.content || ''
      const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
      return {
        data: JSON.parse(cleaned),
        model,
        usage: completion.usage || null,
      }
    },
  }
}
