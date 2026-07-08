import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { chatService, ChatMessage } from '../../../src/services/chat.service';
import { useAuthStore } from '../../../src/store/auth.store';
import { colors, spacing, radii, typography } from '../../../src/theme';

const POLL_INTERVAL_MS = 4000;

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const router    = useRouter();
  const userId    = useAuthStore((s) => s.user?.id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody]         = useState('');
  const [sending, setSending]   = useState(false);
  const flatRef   = useRef<FlatList>(null);
  const lastSeenRef = useRef<string | undefined>(undefined);

  const loadMessages = useCallback(async (since?: string) => {
    try {
      const fresh = await chatService.listMessages(conversationId, since);
      if (fresh.length > 0) {
        setMessages((prev) => [...prev, ...fresh]);
        lastSeenRef.current = fresh[fresh.length - 1].createdAt;
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch { /* silencieux */ }
  }, [conversationId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Polling léger toutes les 4 secondes
  useEffect(() => {
    const timer = setInterval(() => {
      loadMessages(lastSeenRef.current);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadMessages]);

  const send = async () => {
    const text = body.trim();
    if (!text || sending) return;
    setBody('');
    setSending(true);
    try {
      const msg = await chatService.sendMessage(conversationId, text);
      setMessages((prev) => [...prev, msg]);
      lastSeenRef.current = msg.createdAt;
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      setBody(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Retour</Text>
        </Pressable>
        <Text style={styles.title}>Messagerie</Text>
      </View>

      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        onLayout={() => flatRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Démarrez la conversation</Text>
          </View>
        }
        renderItem={({ item: msg }) => {
          const isMe = msg.senderId === userId;
          return (
            <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
              {!isMe && (
                <Text style={styles.senderName}>{msg.sender.name}</Text>
              )}
              <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{msg.body}</Text>
              <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
                {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          );
        }}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Votre message…"
          placeholderTextColor={colors.textDisabled}
          value={body}
          onChangeText={setBody}
          multiline
          maxLength={2000}
          onSubmitEditing={send}
          blurOnSubmit={false}
        />
        <Pressable
          style={[styles.sendBtn, (!body.trim() || sending) && styles.sendBtnDisabled]}
          onPress={send}
          disabled={!body.trim() || sending}
        >
          <Text style={styles.sendIcon}>➤</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  backText: { ...typography.body, color: colors.primary },
  title:    { ...typography.h3, color: colors.text },

  messageList: { padding: spacing.md, gap: spacing.sm, flexGrow: 1 },

  bubble: {
    maxWidth: '80%',
    borderRadius: radii.lg,
    padding: spacing.sm,
    gap: 2,
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
  },
  bubbleMe: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: radii.sm,
  },
  bubbleThem: {
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: radii.sm,
  },
  senderName:   { ...typography.small, color: colors.textDisabled, marginBottom: 2 },
  bubbleText:   { ...typography.body, color: colors.text },
  bubbleTextMe: { color: colors.textOnDark },
  bubbleTime:   { ...typography.small, color: colors.textDisabled, alignSelf: 'flex-end' },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.7)' },

  emptyBox:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { ...typography.body, color: colors.textDisabled },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 120,
    ...typography.body as any,
    color: colors.text,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.textDisabled },
  sendIcon: { color: colors.textOnDark, fontSize: 16 },
});
