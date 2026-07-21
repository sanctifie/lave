/**
 * Fournisseur d'assistance IA (Claude). L'IA n'est JAMAIS décisionnaire sur un
 * médicament : elle assiste (modération, extraction, pré-contrôle) et sa sortie
 * est toujours relue/validée par un humain (pharmacien, médecin, admin).
 *
 * Chaque capacité est calibrée sur le modèle Claude approprié :
 *  - modération d'avis  → claude-haiku-4-5 (classification courte, volumineuse)
 *  - lecture posologie   → claude-haiku-4-5 (extraction structurée simple)
 *  - pré-contrôle KYC    → claude-opus-4-8 (vision, enjeu de conformité)
 *
 * Implémentations : AnthropicAiProvider (réel) ou StubAiProvider (dev/CI).
 */

export interface ReviewModeration {
  /** true si l'avis semble abusif / injurieux / faux — à revoir par un humain. */
  flagged: boolean;
  reason: string | null;
}

export interface Posology {
  /** Heures de prise au format "HH:MM" (24h). */
  times: string[];
  /** Durée du traitement en jours. */
  durationDays: number;
}

export interface DocumentScreening {
  /** Le document est-il lisible et exploitable ? */
  legible: boolean;
  /** Points d'attention à signaler au valideur humain. */
  concerns: string[];
}

export interface AiProvider {
  /** true si un vrai backend Claude est configuré (sinon stub). */
  readonly enabled: boolean;
  moderateReview(comment: string): Promise<ReviewModeration>;
  parsePosology(instructions: string): Promise<Posology | null>;
  screenDocument(input: { imageBase64: string; mediaType: string; docType: string }): Promise<DocumentScreening>;
}

const API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

// Modèles par capacité (voir en-tête).
const MODEL_MODERATION = 'claude-haiku-4-5';
const MODEL_POSOLOGY   = 'claude-haiku-4-5';
const MODEL_KYC_VISION = 'claude-opus-4-8';

interface ContentBlock {
  type: 'text' | 'image';
  text?: string;
  source?: { type: 'base64'; media_type: string; data: string };
}

/** Provider réel : appels REST directs à l'API Messages (convention fetch du repo). */
export class AnthropicAiProvider implements AiProvider {
  readonly enabled = true;
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY ?? '';
  }

  private async message(model: string, system: string, content: ContentBlock[], maxTokens = 512): Promise<string> {
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content }],
      }),
    });
    if (!resp.ok) throw new Error(`Anthropic API ${resp.status}`);
    const data: any = await resp.json();
    const text = (data.content ?? [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('');
    return text;
  }

  /** Extrait le premier objet JSON d'une réponse (robuste aux préambules). */
  private parseJson<T>(text: string): T | null {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end < start) return null;
    try {
      return JSON.parse(text.slice(start, end + 1)) as T;
    } catch {
      return null;
    }
  }

  async moderateReview(comment: string): Promise<ReviewModeration> {
    const system =
      "Tu es un modérateur d'avis pour une plateforme de santé au Gabon. Signale les " +
      'avis injurieux, diffamatoires, hors-sujet, ou manifestement faux/spam. Réponds ' +
      'UNIQUEMENT en JSON : {"flagged": boolean, "reason": string|null}. reason en français, court.';
    try {
      const out = await this.message(MODEL_MODERATION, system, [{ type: 'text', text: comment }], 256);
      const parsed = this.parseJson<ReviewModeration>(out);
      if (!parsed) return { flagged: false, reason: null };
      return { flagged: !!parsed.flagged, reason: parsed.reason ?? null };
    } catch {
      // En cas d'échec IA, on ne bloque pas : l'avis passe, non signalé.
      return { flagged: false, reason: null };
    }
  }

  async parsePosology(instructions: string): Promise<Posology | null> {
    const system =
      "Tu convertis une posologie en français en horaires de prise. Déduis des heures " +
      'plausibles (matin=08:00, midi=12:00, soir=20:00, coucher=22:00). Réponds UNIQUEMENT ' +
      'en JSON : {"times": ["HH:MM"], "durationDays": number}. Si illisible, {"times": [], "durationDays": 0}.';
    try {
      const out = await this.message(MODEL_POSOLOGY, system, [{ type: 'text', text: instructions }], 256);
      const parsed = this.parseJson<Posology>(out);
      if (!parsed || !Array.isArray(parsed.times) || parsed.times.length === 0) return null;
      const times = parsed.times.filter((t) => /^\d{2}:\d{2}$/.test(t));
      if (times.length === 0) return null;
      return { times, durationDays: Number(parsed.durationDays) || 0 };
    } catch {
      return null;
    }
  }

  async screenDocument(input: { imageBase64: string; mediaType: string; docType: string }): Promise<DocumentScreening> {
    const system =
      "Tu pré-contrôles un document justificatif (KYC) pour une plateforme de santé. Tu " +
      "n'APPROUVES rien — tu signales à un valideur humain la lisibilité et les points " +
      'douteux. Réponds UNIQUEMENT en JSON : {"legible": boolean, "concerns": [string]}. ' +
      'concerns en français, courts.';
    try {
      const out = await this.message(
        MODEL_KYC_VISION,
        system,
        [
          { type: 'image', source: { type: 'base64', media_type: input.mediaType, data: input.imageBase64 } },
          { type: 'text', text: `Type attendu : ${input.docType}. Vérifie lisibilité et cohérence.` },
        ],
        512,
      );
      const parsed = this.parseJson<DocumentScreening>(out);
      if (!parsed) return { legible: false, concerns: ['Analyse IA illisible — vérification manuelle requise'] };
      return {
        legible: !!parsed.legible,
        concerns: Array.isArray(parsed.concerns) ? parsed.concerns.slice(0, 10).map(String) : [],
      };
    } catch {
      return { legible: false, concerns: ['Analyse IA indisponible — vérification manuelle requise'] };
    }
  }
}
