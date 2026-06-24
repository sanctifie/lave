export interface PushMessage {
  title: string;
  body:  string;
  data?: Record<string, string>;
}

export interface PushProvider {
  send(expoPushToken: string, message: PushMessage): Promise<void>;
}
