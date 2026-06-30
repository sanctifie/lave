import { VideoProvider, VideoRoomParams, VideoRoomResult } from './index';

/**
 * Provider vidéo réel via Daily.co.
 * Doc : https://docs.daily.co/reference/rest-api
 *
 * Variables d'environnement requises :
 *   DAILY_API_KEY — clé API (dashboard Daily.co)
 *   DAILY_DOMAIN  — domaine de l'espace (ex: "mbolo.daily.co")
 */
const API_BASE = 'https://api.daily.co/v1';

export class DailyVideoProvider implements VideoProvider {
  private readonly apiKey: string;
  private readonly domain: string;

  constructor() {
    this.apiKey = process.env.DAILY_API_KEY ?? '';
    this.domain = process.env.DAILY_DOMAIN ?? '';
  }

  private headers() {
    return {
      Authorization:  `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async createRoom(params: VideoRoomParams): Promise<VideoRoomResult> {
    const roomName = `mbolo-${params.consultationId}`;
    const expSeconds = Math.floor(params.expiresAt.getTime() / 1000);

    // Salle privée qui expire automatiquement.
    const resp = await fetch(`${API_BASE}/rooms`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        name: roomName,
        privacy: 'private',
        properties: {
          exp: expSeconds,
          enable_chat: true,
          enable_screenshare: false,
          eject_at_room_exp: true,
        },
      }),
    });

    // 409 = la salle existe déjà (consultation rejointe une 2e fois) → on réutilise.
    if (!resp.ok && resp.status !== 409) {
      const text = await resp.text();
      throw new Error(`Daily createRoom failed ${resp.status}: ${text}`);
    }

    const roomUrl = `https://${this.domain}/${roomName}`;
    const [hostToken, guestToken] = await Promise.all([
      this.createMeetingToken(roomName, expSeconds, true),
      this.createMeetingToken(roomName, expSeconds, false),
    ]);

    return { roomName, roomUrl, hostToken, guestToken };
  }

  private async createMeetingToken(roomName: string, exp: number, isOwner: boolean): Promise<string> {
    const resp = await fetch(`${API_BASE}/meeting-tokens`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        properties: { room_name: roomName, is_owner: isOwner, exp },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Daily meeting-token failed ${resp.status}: ${text}`);
    }

    const data: any = await resp.json();
    return data.token as string;
  }

  async closeRoom(roomName: string): Promise<void> {
    const resp = await fetch(`${API_BASE}/rooms/${roomName}`, {
      method: 'DELETE',
      headers: this.headers(),
    });
    // 404 = déjà supprimée / expirée → on ignore.
    if (!resp.ok && resp.status !== 404) {
      console.warn(`[Daily] closeRoom ${roomName} a renvoyé ${resp.status}`);
    }
  }
}
