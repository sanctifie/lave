import { VideoProvider, VideoRoomParams, VideoRoomResult } from './index';

export class StubVideoProvider implements VideoProvider {
  async createRoom(params: VideoRoomParams): Promise<VideoRoomResult> {
    const roomName = `mbolo-${params.consultationId}`;
    console.log(`[StubVideo] createRoom ${roomName} expires ${params.expiresAt.toISOString()}`);
    return {
      roomName,
      roomUrl:    `https://mbolo.daily.co/${roomName}`,
      hostToken:  `stub_host_${Date.now()}`,
      guestToken: `stub_guest_${Date.now()}`,
    };
  }

  async closeRoom(roomName: string): Promise<void> {
    console.log(`[StubVideo] closeRoom ${roomName}`);
  }
}
