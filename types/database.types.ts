export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          nickname: string
          created_at: string
        }
        Insert: {
          id: string
          nickname: string
          created_at?: string
        }
        Update: {
          id?: string
          nickname?: string
          created_at?: string
        }
      }
      rooms: {
        Row: {
          id: string
          name: string
          host_id: string
          game_type: 'liar' | 'mafia'
          status: 'waiting' | 'playing' | 'finished'
          max_players: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          host_id: string
          game_type: 'liar' | 'mafia'
          status?: 'waiting' | 'playing' | 'finished'
          max_players?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          host_id?: string
          game_type?: 'liar' | 'mafia'
          status?: 'waiting' | 'playing' | 'finished'
          max_players?: number
          created_at?: string
        }
      }
      room_players: {
        Row: {
          id: string
          room_id: string
          user_id: string
          is_ready: boolean
          joined_at: string
        }
        Insert: {
          id?: string
          room_id: string
          user_id: string
          is_ready?: boolean
          joined_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          user_id?: string
          is_ready?: boolean
          joined_at?: string
        }
      }
      game_sessions: {
        Row: {
          id: string
          room_id: string
          game_type: string
          game_state: Json
          current_phase: string
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          game_type: string
          game_state?: Json
          current_phase: string
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          game_type?: string
          game_state?: Json
          current_phase?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      game_type: 'liar' | 'mafia'
      game_status: 'waiting' | 'playing' | 'finished'
    }
  }
}

