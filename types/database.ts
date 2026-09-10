export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          created_at: string
          id: string
          postId: string
          userId: string
        }
        Insert: {
          created_at?: string
          id?: string
          postId: string
          userId: string
        }
        Update: {
          created_at?: string
          id?: string
          postId?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_postId_fkey"
            columns: ["postId"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          commentId: string
          created_at: string
          id: string
          userId: string
        }
        Insert: {
          commentId: string
          created_at?: string
          id?: string
          userId: string
        }
        Update: {
          commentId?: string
          created_at?: string
          id?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_commentId_fkey"
            columns: ["commentId"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_likes_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          created_at: string
          id: string
          parentId: string | null
          postId: string
          text: string
          updated_at: string
          userId: string
        }
        Insert: {
          created_at?: string
          id?: string
          parentId?: string | null
          postId: string
          text: string
          updated_at?: string
          userId: string
        }
        Update: {
          created_at?: string
          id?: string
          parentId?: string | null
          postId?: string
          text?: string
          updated_at?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parentId_postId_fkey"
            columns: ["parentId", "postId"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id", "postId"]
          },
          {
            foreignKeyName: "comments_postId_fkey"
            columns: ["postId"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          created_at: string
          last_delivered_at: string | null
          last_read_at: string | null
          userId: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          last_delivered_at?: string | null
          last_read_at?: string | null
          userId: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          last_delivered_at?: string | null
          last_read_at?: string | null
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_high: string
          user_low: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_high: string
          user_low: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_high?: string
          user_low?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_user_high_fkey"
            columns: ["user_high"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_low_fkey"
            columns: ["user_low"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      hashtags: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      mentions: {
        Row: {
          commentId: string | null
          created_at: string
          id: string
          postId: string
          userId: string
        }
        Insert: {
          commentId?: string | null
          created_at?: string
          id?: string
          postId: string
          userId: string
        }
        Update: {
          commentId?: string | null
          created_at?: string
          id?: string
          postId?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentions_commentId_fkey"
            columns: ["commentId"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_postId_fkey"
            columns: ["postId"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          client_id: string | null
          conversation_id: string
          created_at: string
          deleted_at: string | null
          deleted_by_sender: boolean
          id: string
          media_path: string | null
          message_type: string
          mime_type: string | null
          reply_to_message_id: string | null
          text: string
          userId: string
        }
        Insert: {
          client_id?: string | null
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          deleted_by_sender?: boolean
          id?: string
          media_path?: string | null
          message_type?: string
          mime_type?: string | null
          reply_to_message_id?: string | null
          text?: string
          userId: string
        }
        Update: {
          client_id?: string | null
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by_sender?: boolean
          id?: string
          media_path?: string | null
          message_type?: string
          mime_type?: string | null
          reply_to_message_id?: string | null
          text?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_in_same_conversation"
            columns: ["reply_to_message_id", "conversation_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id", "conversation_id"]
          },
        ]
      }
      message_hidden_for_users: {
        Row: {
          created_at: string
          message_id: string
          userId: string
        }
        Insert: {
          created_at?: string
          message_id: string
          userId: string
        }
        Update: {
          created_at?: string
          message_id?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_hidden_for_users_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_hidden_for_users_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          message_id: string
          reaction: string
          userId: string
        }
        Insert: {
          created_at?: string
          message_id: string
          reaction: string
          userId: string
        }
        Update: {
          created_at?: string
          message_id?: string
          reaction?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mutes: {
        Row: {
          created_at: string
          id: string
          muted_id: string
          userId: string
        }
        Insert: {
          created_at?: string
          id?: string
          muted_id: string
          userId: string
        }
        Update: {
          created_at?: string
          id?: string
          muted_id?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "mutes_muted_id_fkey"
            columns: ["muted_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutes_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          comments: boolean
          follow_requests: boolean
          follows: boolean
          likes: boolean
          mentions: boolean
          messages: boolean
          message_previews: boolean
          push_enabled: boolean
          replies: boolean
          updated_at: string
          userId: string
        }
        Insert: {
          comments?: boolean
          follow_requests?: boolean
          follows?: boolean
          likes?: boolean
          mentions?: boolean
          messages?: boolean
          message_previews?: boolean
          push_enabled?: boolean
          replies?: boolean
          updated_at?: string
          userId: string
        }
        Update: {
          comments?: boolean
          follow_requests?: boolean
          follows?: boolean
          likes?: boolean
          mentions?: boolean
          messages?: boolean
          message_previews?: boolean
          push_enabled?: boolean
          replies?: boolean
          updated_at?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_userId_fkey"
            columns: ["userId"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json
          dedupe_key: string
          id: string
          read_at: string | null
          receiverId: string
          senderId: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          data?: Json
          dedupe_key: string
          id?: string
          read_at?: string | null
          receiverId: string
          senderId?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          data?: Json
          dedupe_key?: string
          id?: string
          read_at?: string | null
          receiverId?: string
          senderId?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_receiverId_fkey"
            columns: ["receiverId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_senderId_fkey"
            columns: ["senderId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      post_hashtags: {
        Row: {
          hashtag_id: string
          postId: string
        }
        Insert: {
          hashtag_id: string
          postId: string
        }
        Update: {
          hashtag_id?: string
          postId?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_hashtags_hashtag_id_fkey"
            columns: ["hashtag_id"]
            isOneToOne: false
            referencedRelation: "hashtags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_hashtags_postId_fkey"
            columns: ["postId"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_media: {
        Row: {
          created_at: string
          duration: number | null
          height: number
          id: string
          mime_type: string
          path: string
          postId: string
          size_bytes: number
          sort_order: number
          thumbnail_path: string | null
          type: string
          userId: string
          width: number
        }
        Insert: {
          created_at?: string
          duration?: number | null
          height: number
          id?: string
          mime_type: string
          path: string
          postId: string
          size_bytes: number
          sort_order: number
          thumbnail_path?: string | null
          type: string
          userId: string
          width: number
        }
        Update: {
          created_at?: string
          duration?: number | null
          height?: number
          id?: string
          mime_type?: string
          path?: string
          postId?: string
          size_bytes?: number
          sort_order?: number
          thumbnail_path?: string | null
          type?: string
          userId?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_media_postId_fkey"
            columns: ["postId"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_media_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      postLikes: {
        Row: {
          created_at: string
          id: string
          postId: string
          reaction: string
          userId: string
        }
        Insert: {
          created_at?: string
          id?: string
          postId: string
          reaction?: string
          userId: string
        }
        Update: {
          created_at?: string
          id?: string
          postId?: string
          reaction?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "postLikes_postId_fkey"
            columns: ["postId"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postLikes_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          body: string
          created_at: string
          file: string | null
          id: string
          search_document: unknown
          status: string
          updated_at: string
          userId: string
          visibility: string
        }
        Insert: {
          body?: string
          created_at?: string
          file?: string | null
          id?: string
          search_document?: unknown
          status?: string
          updated_at?: string
          userId: string
          visibility?: string
        }
        Update: {
          body?: string
          created_at?: string
          file?: string | null
          id?: string
          search_document?: unknown
          status?: string
          updated_at?: string
          userId?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          created_at: string
          device_id: string
          disabled_at: string | null
          failure_count: number
          id: string
          last_used_at: string
          platform: string
          token: string
          updated_at: string
          userId: string
        }
        Insert: {
          created_at?: string
          device_id: string
          disabled_at?: string | null
          failure_count?: number
          id?: string
          last_used_at?: string
          platform: string
          token: string
          updated_at?: string
          userId: string
        }
        Update: {
          created_at?: string
          device_id?: string
          disabled_at?: string | null
          failure_count?: number
          id?: string
          last_used_at?: string
          platform?: string
          token?: string
          updated_at?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          details: string
          id: string
          reason: string
          reporter_id: string
          resolution: string | null
          reviewed_by: string | null
          status: string
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string
          id?: string
          reason: string
          reporter_id: string
          resolution?: string | null
          reviewed_by?: string | null
          status?: string
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string
          id?: string
          reason?: string
          reporter_id?: string
          resolution?: string | null
          reviewed_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_private: {
        Row: {
          address: string
          allow_messages: boolean
          created_at: string
          id: string
          language: string
          phoneNumber: string
          updated_at: string
        }
        Insert: {
          address?: string
          allow_messages?: boolean
          created_at?: string
          id: string
          language?: string
          phoneNumber?: string
          updated_at?: string
        }
        Update: {
          address?: string
          allow_messages?: boolean
          created_at?: string
          id?: string
          language?: string
          phoneNumber?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_private_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          bio: string
          created_at: string
          id: string
          image: string | null
          is_private: boolean
          location: string
          name: string
          updated_at: string
          username: string | null
        }
        Insert: {
          bio?: string
          created_at?: string
          id: string
          image?: string | null
          is_private?: boolean
          location?: string
          name: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          bio?: string
          created_at?: string
          id?: string
          image?: string | null
          is_private?: boolean
          location?: string
          name?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_post: {
        Args: {
          p_body: string
          p_id: string
          p_media: Json
          p_status: string
          p_visibility: string
        }
        Returns: string
      }
      delete_message_for_everyone: { Args: { p_message_id: string }; Returns: Json }
      get_conversation: { Args: { p_conversation_id: string }; Returns: Json }
      get_message: { Args: { p_message_id: string }; Returns: Json }
      get_comments: {
        Args: {
          p_before_id?: string
          p_before_time?: string
          p_limit?: number
          p_post_id: string
        }
        Returns: Json[]
      }
      get_messages: {
        Args: { p_before_id?: string; p_before_time?: string; p_conversation_id: string; p_limit?: number }
        Returns: Json[]
      }
      get_conversations: {
        Args: { p_before_id?: string; p_before_time?: string; p_limit?: number }
        Returns: Json[]
      }
      get_feed: {
        Args: {
          p_before_id?: string
          p_before_time?: string
          p_hashtag?: string
          p_limit?: number
          p_mode?: string
          p_query?: string
          p_user_id?: string
        }
        Returns: Json[]
      }
      get_notifications: {
        Args: { p_before_id?: string; p_before_time?: string; p_limit?: number }
        Returns: Json[]
      }
      get_post: { Args: { p_id: string }; Returns: Json }
      get_profile: { Args: { p_id: string }; Returns: Json }
      get_relationships: {
        Args: {
          p_before_id?: string
          p_before_time?: string
          p_id: string
          p_kind: string
          p_limit?: number
        }
        Returns: Json[]
      }
      is_moderator: { Args: never; Returns: boolean }
      mark_conversation_read: {
        Args: { target: string; through_message: string }
        Returns: undefined
      }
      mark_conversation_delivered: {
        Args: { target: string; through_message: string }
        Returns: undefined
      }
      message_unread_count: { Args: never; Returns: number }
      hide_message_for_me: { Args: { p_message_id: string }; Returns: undefined }
      post_document: {
        Args: { p: Database["public"]["Tables"]["posts"]["Row"] }
        Returns: Json
      }
      search_hashtags: {
        Args: { p_after_name?: string; p_limit?: number; p_query?: string }
        Returns: {
          id: string
          name: string
          post_count: number
        }[]
      }
      search_users: {
        Args: {
          p_after_id?: string
          p_limit?: number
          p_query?: string
          p_suggestions?: boolean
        }
        Returns: {
          bio: string
          created_at: string
          id: string
          image: string | null
          is_private: boolean
          location: string
          name: string
          updated_at: string
          username: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "users"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      send_message: {
        Args: { p_client_id: string; p_conversation_id: string; p_media_path?: string | null; p_mime_type?: string | null; p_reply_to_message_id?: string | null; p_text?: string }
        Returns: Json
      }
      set_message_reaction: { Args: { p_message_id: string; p_reaction: string }; Returns: Json }
      start_conversation: { Args: { other_user: string }; Returns: string }
      register_push_token: { Args: { p_device_id: string; p_platform: string; p_token: string }; Returns: undefined }
      unregister_push_token: { Args: { p_device_id: string }; Returns: undefined }
      trending_hashtags: {
        Args: never
        Returns: {
          id: string
          name: string
          post_count: number
        }[]
      }
      update_post: {
        Args: {
          p_body: string
          p_id: string
          p_media: Json
          p_status: string
          p_visibility: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

