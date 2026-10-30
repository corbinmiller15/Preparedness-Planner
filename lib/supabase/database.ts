export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type HomeType = "apartment_renter" | "house_owner" | "house_renter" | "mobile_home" | "other";
type BudgetLevel = "minimal" | "moderate" | "comfortable";
type StorageSpace = "very_limited" | "some" | "plenty";
type PlanTier = "go_bag" | "72_hour" | "1_month" | "3_month" | "6_month" | "12_month";
type ActivityLevel = "sedentary" | "moderate" | "active";
type UnitSystem = "imperial" | "metric";
type Sex = "female" | "male" | "unspecified";
type PregnancyStatus =
  | "none"
  | "pregnant_t1"
  | "pregnant_t2"
  | "pregnant_t3"
  | "pregnant_unspecified"
  | "breastfeeding_0_6"
  | "breastfeeding_6_12"
  | "breastfeeding_unspecified";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          home_type: HomeType | null;
          budget_level: BudgetLevel | null;
          storage_space: StorageSpace | null;
          unit_system: UnitSystem;
          locale: "en-US" | "en-GB";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          home_type?: HomeType | null;
          budget_level?: BudgetLevel | null;
          storage_space?: StorageSpace | null;
          unit_system?: UnitSystem;
          locale?: "en-US" | "en-GB";
        };
        Update: {
          display_name?: string | null;
          home_type?: HomeType | null;
          budget_level?: BudgetLevel | null;
          storage_space?: StorageSpace | null;
          unit_system?: UnitSystem;
          locale?: "en-US" | "en-GB";
        };
        Relationships: [];
      };
      household_members: {
        Row: {
          id: string;
          account_id: string;
          label: string;
          age: number | null;
          birth_year: number | null;
          sex: Sex | null;
          pregnancy_status: PregnancyStatus | null;
          is_child: boolean;
          special_needs: string | null;
          activity_level: ActivityLevel | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          label: string;
          age?: number | null;
          birth_year?: number | null;
          sex?: Sex | null;
          pregnancy_status?: PregnancyStatus | null;
          is_child?: boolean;
          special_needs?: string | null;
          activity_level?: ActivityLevel | null;
        };
        Update: {
          label?: string;
          age?: number | null;
          birth_year?: number | null;
          sex?: Sex | null;
          pregnancy_status?: PregnancyStatus | null;
          is_child?: boolean;
          special_needs?: string | null;
          activity_level?: ActivityLevel | null;
        };
        Relationships: [];
      };
      plans: {
        Row: {
          id: string;
          account_id: string;
          country_code: string;
          postal_code: string;
          home_type: HomeType;
          budget_level: BudgetLevel;
          storage_space: StorageSpace;
          unit_system: UnitSystem;
          locale: "en-US" | "en-GB";
          tier: PlanTier;
          generated: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          country_code?: string;
          postal_code: string;
          home_type: HomeType;
          budget_level: BudgetLevel;
          storage_space: StorageSpace;
          unit_system?: UnitSystem;
          locale?: "en-US" | "en-GB";
          tier: PlanTier;
          generated: Json;
        };
        Update: {
          country_code?: string;
          postal_code?: string;
          home_type?: HomeType;
          budget_level?: BudgetLevel;
          storage_space?: StorageSpace;
          unit_system?: UnitSystem;
          locale?: "en-US" | "en-GB";
          tier?: PlanTier;
          generated?: Json;
        };
        Relationships: [];
      };
      reminders: {
        Row: {
          id: string;
          account_id: string;
          kind: string;
          next_due: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          kind: string;
          next_due: string;
        };
        Update: {
          kind?: string;
          next_due?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      home_type: HomeType;
      budget_level: BudgetLevel;
      storage_space: StorageSpace;
      plan_tier: PlanTier;
      unit_system: UnitSystem;
    };
    CompositeTypes: Record<string, never>;
  };
};
