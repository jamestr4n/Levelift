
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "building_definitions": {
                  Row: {
                    "costs": NonNullable<Json>,"max_level": number,"name": string,"score_by_level": (number)[],"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "costs": NonNullable<Json>,"max_level": number,"name": string,"score_by_level": (number)[],"type": string
                  }
                  Update: {
                    "costs"?: NonNullable<Json>,"max_level"?: number,"name"?: string,"score_by_level"?: (number)[],"type"?: string
                  }
                  Relationships: [
                    
                  ]
                },"characters": {
                  Row: {
                    "outfit": string,"unlocked_outfits": (string)[],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "outfit"?: string,"unlocked_outfits"?: (string)[],"user_id": string
                  }
                  Update: {
                    "outfit"?: string,"unlocked_outfits"?: (string)[],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "characters_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"friendships": {
                  Row: {
                    "addressee_id": string,"created_at": string,"id": string,"requester_id": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "addressee_id": string,"created_at"?: string,"id"?: string,"requester_id": string,"status"?: string
                  }
                  Update: {
                    "addressee_id"?: string,"created_at"?: string,"id"?: string,"requester_id"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "friendships_addressee_id_fkey"
      columns: ["addressee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "friendships_requester_id_fkey"
      columns: ["requester_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"kingdom_score_events": {
                  Row: {
                    "created_at": string,"delta": number,"id": number,"owned_building_id": string | null,"reason": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"delta": number,"id"?: never,"owned_building_id"?: string | null,"reason": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"delta"?: number,"id"?: never,"owned_building_id"?: string | null,"reason"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "kingdom_score_events_owned_building_id_fkey"
      columns: ["owned_building_id"]
isOneToOne: false
      referencedRelation: "owned_buildings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "kingdom_score_events_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"kingdoms": {
                  Row: {
                    "created_at": string,"grid_height": number,"grid_width": number,"kingdom_score": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"grid_height"?: number,"grid_width"?: number,"kingdom_score"?: number,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"grid_height"?: number,"grid_width"?: number,"kingdom_score"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "kingdoms_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"owned_buildings": {
                  Row: {
                    "created_at": string,"id": string,"level": number,"type": string,"user_id": string,"x": number,"y": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"level"?: number,"type": string,"user_id": string,"x": number,"y": number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"level"?: number,"type"?: string,"user_id"?: string,"x"?: number,"y"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "owned_buildings_type_fkey"
      columns: ["type"]
isOneToOne: false
      referencedRelation: "building_definitions"
      referencedColumns: ["type"]
    },{
      foreignKeyName: "owned_buildings_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string,"id": string,"level": number,"username": string,"xp": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name": string,"id": string,"level"?: number,"username": string,"xp"?: number
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"id"?: string,"level"?: number,"username"?: string,"xp"?: number
                  }
                  Relationships: [
                    
                  ]
                },"resource_transactions": {
                  Row: {
                    "created_at": string,"gold_delta": number,"id": number,"materials_delta": number,"owned_building_id": string | null,"reason": string,"user_id": string,"workout_id": string | null,"xp_delta": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"gold_delta"?: number,"id"?: never,"materials_delta"?: number,"owned_building_id"?: string | null,"reason": string,"user_id": string,"workout_id"?: string | null,"xp_delta"?: number
                  }
                  Update: {
                    "created_at"?: string,"gold_delta"?: number,"id"?: never,"materials_delta"?: number,"owned_building_id"?: string | null,"reason"?: string,"user_id"?: string,"workout_id"?: string | null,"xp_delta"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "resource_transactions_owned_building_id_fkey"
      columns: ["owned_building_id"]
isOneToOne: false
      referencedRelation: "owned_buildings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "resource_transactions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "resource_transactions_workout_id_fkey"
      columns: ["workout_id"]
isOneToOne: false
      referencedRelation: "workouts"
      referencedColumns: ["id"]
    }
                  ]
                },"wallets": {
                  Row: {
                    "gold": number,"materials": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "gold"?: number,"materials"?: number,"user_id": string
                  }
                  Update: {
                    "gold"?: number,"materials"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "wallets_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"workouts": {
                  Row: {
                    "client_request_id": string,"created_at": string,"distance_km": number | null,"duration_minutes": number,"gold_awarded": number,"id": string,"materials_awarded": number,"reward_capped": boolean,"sets": number | null,"started_at": string,"type": string,"user_id": string,"xp_awarded": number
                  }
                  ComputedFields: never
                  Insert: {
                    "client_request_id": string,"created_at"?: string,"distance_km"?: number | null,"duration_minutes": number,"gold_awarded"?: number,"id"?: string,"materials_awarded"?: number,"reward_capped"?: boolean,"sets"?: number | null,"started_at": string,"type": string,"user_id": string,"xp_awarded"?: number
                  }
                  Update: {
                    "client_request_id"?: string,"created_at"?: string,"distance_km"?: number | null,"duration_minutes"?: number,"gold_awarded"?: number,"id"?: string,"materials_awarded"?: number,"reward_capped"?: boolean,"sets"?: number | null,"started_at"?: string,"type"?: string,"user_id"?: string,"xp_awarded"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "workouts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "is_username_available":
{ Args: { "name": string }; Returns: boolean
                           },
"log_workout":
{ Args: { "p_client_request_id": string,"p_distance_km"?: number,"p_duration_minutes": number,"p_sets"?: number,"p_started_at": string,"p_type": string }; Returns: Json
                           },
"purchase_building":
{ Args: { "p_type": string,"p_x": number,"p_y": number }; Returns: Json
                           },
"upgrade_building":
{ Args: { "p_building_id": string }; Returns: Json
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
