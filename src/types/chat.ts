export interface ChatMessage {
  id: string;
  conversationId: string; // 'equipe' or 'direct__UserA__UserB'
  senderName: string;
  senderAvatarInitials: string;
  senderAvatarColor?: string;
  recipientName?: string; // null/undefined for 'equipe', or target user's name for direct
  text: string;
  createdAt: string; // ISO string
  readBy: string[]; // array of normalized user names who read this message
  // Anexos de mídia/arquivos
  fileUrl?: string;
  fileName?: string;
  fileType?: 'image' | 'file';
  fileSize?: number;
}

export interface UserPresenceInfo {
  userName: string;
  lastSeen: string; // ISO string
  manualStatus?: 'Online' | 'Offline';
}

export interface ConversationSummary {
  id: string; // 'equipe' or 'direct__UserA__UserB'
  type: 'group' | 'direct';
  title: string;
  subtitle: string;
  targetUser?: {
    name: string;
    cargo: string;
    avatarInitials: string;
    avatarColor: string;
    status: 'Online' | 'Offline';
    email?: string;
  };
  lastMessage?: ChatMessage;
  unreadCount: number;
}
