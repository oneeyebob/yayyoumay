export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      keyword_blacklist: {
        Row: {
          id: string
          user_id: string
          keyword: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          keyword: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          keyword?: string
          created_at?: string
        }
        Relationships: []
      }
      channel_cache: {
        Row: {
          channel_id: string
          last_fetched_at: string
        }
        Insert: {
          channel_id: string
          last_fetched_at?: string
        }
        Update: {
          channel_id?: string
          last_fetched_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_cache_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: true
            referencedRelation: "channels"
            referencedColumns: ["id"]
          }
        ]
      }
      channels: {
        Row: {
          id: string
          lang: string | null
          last_synced: string | null
          name: string
          thumbnail_url: string | null
          yt_channel_id: string
        }
        Insert: {
          id?: string
          lang?: string | null
          last_synced?: string | null
          name: string
          thumbnail_url?: string | null
          yt_channel_id: string
        }
        Update: {
          id?: string
          lang?: string | null
          last_synced?: string | null
          name?: string
          thumbnail_url?: string | null
          yt_channel_id?: string
        }
        Relationships: []
      }
      community_votes: {
        Row: {
          created_at: string
          id: string
          list_id: string
          vote: string
          voter_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          list_id: string
          vote: string
          voter_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          list_id?: string
          vote?: string
          voter_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_votes_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
      list_follows: {
        Row: {
          created_at: string
          follower_user_id: string
          id: string
          list_id: string
        }
        Insert: {
          created_at?: string
          follower_user_id: string
          id?: string
          list_id: string
        }
        Update: {
          created_at?: string
          follower_user_id?: string
          id?: string
          list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_follows_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
      list_item_tags: {
        Row: {
          id: string
          list_item_id: string
          tag_id: string
        }
        Insert: {
          id?: string
          list_item_id: string
          tag_id: string
        }
        Update: {
          id?: string
          list_item_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_item_tags_list_item_id_fkey"
            columns: ["list_item_id"]
            isOneToOne: false
            referencedRelation: "list_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_item_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      list_items: {
        Row: {
          channel_id: string | null
          created_at: string
          id: string
          list_id: string
          notes: string | null
          status: string
          video_id: string | null
        }
        Insert: {
          channel_id?: string | null
          created_at?: string
          id?: string
          list_id: string
          notes?: string | null
          status: string
          video_id?: string | null
        }
        Update: {
          channel_id?: string | null
          created_at?: string
          id?: string
          list_id?: string
          notes?: string | null
          status?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "list_items_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_items_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      lists: {
        Row: {
          age_filter: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          lang_filter: string | null
          name: string
          profile_id: string
        }
        Insert: {
          age_filter?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          lang_filter?: string | null
          name: string
          profile_id: string
        }
        Update: {
          age_filter?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          lang_filter?: string | null
          name?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lists_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_color: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          avatar_color?: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          avatar_color?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          category: string | null
          id: string
          label_da: string | null
          label_en: string | null
          slug: string
        }
        Insert: {
          category?: string | null
          id?: string
          label_da?: string | null
          label_en?: string | null
          slug: string
        }
        Update: {
          category?: string | null
          id?: string
          label_da?: string | null
          label_en?: string | null
          slug?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          curator_pin_hash: string | null
          hotkey_hash: string | null
          id: string
          user_id: string
          username: string | null
          youtube_premium: boolean
        }
        Insert: {
          created_at?: string
          curator_pin_hash?: string | null
          hotkey_hash?: string | null
          id?: string
          user_id: string
          username?: string | null
          youtube_premium?: boolean
        }
        Update: {
          created_at?: string
          curator_pin_hash?: string | null
          hotkey_hash?: string | null
          id?: string
          user_id?: string
          username?: string | null
          youtube_premium?: boolean
        }
        Relationships: []
      }
      videos: {
        Row: {
          channel_id: string
          duration_seconds: number | null
          id: string
          published_at: string | null
          thumbnail_url: string | null
          title: string
          yt_video_id: string
        }
        Insert: {
          channel_id: string
          duration_seconds?: number | null
          id?: string
          published_at?: string | null
          thumbnail_url?: string | null
          title: string
          yt_video_id: string
        }
        Update: {
          channel_id?: string
          duration_seconds?: number | null
          id?: string
          published_at?: string | null
          thumbnail_url?: string | null
          title?: string
          yt_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
