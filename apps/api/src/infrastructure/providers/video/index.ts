export interface VideoRoomParams {
  consultationId: string;
  expiresAt: Date;
}

export interface VideoRoomResult {
  roomName: string;
  roomUrl: string;
  hostToken: string;
  guestToken: string;
}

export interface VideoProvider {
  createRoom(params: VideoRoomParams): Promise<VideoRoomResult>;
  closeRoom(roomName: string): Promise<void>;
}
