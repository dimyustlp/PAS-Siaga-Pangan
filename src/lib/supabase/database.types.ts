// Tipe dibuat otomatis dari skema Supabase (proyek PAS-Siaga Pangan), lalu diringkas.
// Perbarui bila skema berubah: minta Claude menjalankan ulang pembuatan tipe, atau
// `npx supabase gen types typescript --project-id <ref>`.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      activities: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          jenis_kegiatan: Database["public"]["Enums"]["activity_type"];
          kode_kegiatan: string;
          kode_upt: string | null;
          lokasi_id: string;
          rencana_berakhir: string | null;
          tanggal_mulai: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string;
          id?: string;
          jenis_kegiatan: Database["public"]["Enums"]["activity_type"];
          kode_kegiatan: string;
          kode_upt?: string | null;
          lokasi_id: string;
          rencana_berakhir?: string | null;
          tanggal_mulai: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          jenis_kegiatan?: Database["public"]["Enums"]["activity_type"];
          kode_kegiatan?: string;
          kode_upt?: string | null;
          lokasi_id?: string;
          rencana_berakhir?: string | null;
          tanggal_mulai?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activities_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_lokasi_id_fkey";
            columns: ["lokasi_id"];
            isOneToOne: false;
            referencedRelation: "master_locations";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_sessions: {
        Row: {
          activity_id: string;
          created_at: string;
          created_by: string;
          ditutup_at: string | null;
          ditutup_oleh: string | null;
          dokumen_rencana_pengamanan: string | null;
          dokumen_surat_perintah: string | null;
          id: string;
          interval_pemeriksaan: number;
          jumlah_alat_kerja: number;
          jumlah_narapidana: number;
          pakai_gelang_monitor: boolean;
          petugas_ids: string[];
          rincian_alat: string | null;
          status_keamanan: Database["public"]["Enums"]["security_status"];
          status_kesiapan: Database["public"]["Enums"]["readiness_status"];
          tanggal_sesi: string;
          updated_at: string;
        };
        Insert: {
          activity_id: string;
          created_at?: string;
          created_by?: string;
          ditutup_at?: string | null;
          ditutup_oleh?: string | null;
          dokumen_rencana_pengamanan?: string | null;
          dokumen_surat_perintah?: string | null;
          id?: string;
          interval_pemeriksaan?: number;
          jumlah_alat_kerja?: number;
          jumlah_narapidana: number;
          pakai_gelang_monitor?: boolean;
          petugas_ids?: string[];
          rincian_alat?: string | null;
          status_keamanan?: Database["public"]["Enums"]["security_status"];
          status_kesiapan?: Database["public"]["Enums"]["readiness_status"];
          tanggal_sesi: string;
          updated_at?: string;
        };
        Update: {
          activity_id?: string;
          created_at?: string;
          created_by?: string;
          ditutup_at?: string | null;
          ditutup_oleh?: string | null;
          dokumen_rencana_pengamanan?: string | null;
          dokumen_surat_perintah?: string | null;
          id?: string;
          interval_pemeriksaan?: number;
          jumlah_alat_kerja?: number;
          jumlah_narapidana?: number;
          pakai_gelang_monitor?: boolean;
          petugas_ids?: string[];
          rincian_alat?: string | null;
          status_keamanan?: Database["public"]["Enums"]["security_status"];
          status_kesiapan?: Database["public"]["Enums"]["readiness_status"];
          tanggal_sesi?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_sessions_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_sessions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_sessions_ditutup_oleh_fkey";
            columns: ["ditutup_oleh"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      decisions: {
        Row: {
          bukti_url: string | null;
          catatan_keputusan: string | null;
          created_at: string;
          id: string;
          incident_id: string | null;
          jenis_keputusan: string;
          pejabat_id: string;
          session_id: string;
        };
        Insert: {
          bukti_url?: string | null;
          catatan_keputusan?: string | null;
          created_at?: string;
          id?: string;
          incident_id?: string | null;
          jenis_keputusan: string;
          pejabat_id?: string;
          session_id: string;
        };
        Update: {
          bukti_url?: string | null;
          catatan_keputusan?: string | null;
          created_at?: string;
          id?: string;
          incident_id?: string | null;
          jenis_keputusan?: string;
          pejabat_id?: string;
          session_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "decisions_incident_id_fkey";
            columns: ["incident_id"];
            isOneToOne: false;
            referencedRelation: "incidents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "decisions_pejabat_id_fkey";
            columns: ["pejabat_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "decisions_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "daily_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      field_logs: {
        Row: {
          bukti_url: string | null;
          client_id: string | null;
          dikirim_at: string;
          id: string;
          jenis_entri: Database["public"]["Enums"]["log_type"];
          payload: Json;
          pengawal_id: string;
          session_id: string;
          waktu_kejadian: string;
        };
        Insert: {
          bukti_url?: string | null;
          client_id?: string | null;
          dikirim_at?: string;
          id?: string;
          jenis_entri: Database["public"]["Enums"]["log_type"];
          payload?: Json;
          pengawal_id?: string;
          session_id: string;
          waktu_kejadian: string;
        };
        Update: {
          bukti_url?: string | null;
          client_id?: string | null;
          dikirim_at?: string;
          id?: string;
          jenis_entri?: Database["public"]["Enums"]["log_type"];
          payload?: Json;
          pengawal_id?: string;
          session_id?: string;
          waktu_kejadian?: string;
        };
        Relationships: [
          {
            foreignKeyName: "field_logs_pengawal_id_fkey";
            columns: ["pengawal_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "field_logs_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "daily_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      incidents: {
        Row: {
          created_at: string;
          diverifikasi_at: string | null;
          diverifikasi_oleh: string | null;
          id: string;
          kategori_gangguan: string;
          log_id: string;
          penanggung_jawab_tindak_lanjut: string | null;
          session_id: string;
          status_penyelesaian: boolean;
          tindakan_awal: string | null;
        };
        Insert: {
          created_at?: string;
          diverifikasi_at?: string | null;
          diverifikasi_oleh?: string | null;
          id?: string;
          kategori_gangguan: string;
          log_id: string;
          penanggung_jawab_tindak_lanjut?: string | null;
          session_id: string;
          status_penyelesaian?: boolean;
          tindakan_awal?: string | null;
        };
        Update: {
          created_at?: string;
          diverifikasi_at?: string | null;
          diverifikasi_oleh?: string | null;
          id?: string;
          kategori_gangguan?: string;
          log_id?: string;
          penanggung_jawab_tindak_lanjut?: string | null;
          session_id?: string;
          status_penyelesaian?: boolean;
          tindakan_awal?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "incidents_diverifikasi_oleh_fkey";
            columns: ["diverifikasi_oleh"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incidents_log_id_fkey";
            columns: ["log_id"];
            isOneToOne: true;
            referencedRelation: "field_logs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incidents_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "daily_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      master_inmates: {
        Row: {
          aktif: boolean;
          created_at: string;
          id: string;
          nama: string;
          nomor_registrasi: string;
        };
        Insert: {
          aktif?: boolean;
          created_at?: string;
          id?: string;
          nama: string;
          nomor_registrasi: string;
        };
        Update: {
          aktif?: boolean;
          created_at?: string;
          id?: string;
          nama?: string;
          nomor_registrasi?: string;
        };
        Relationships: [];
      };
      master_locations: {
        Row: {
          aktif: boolean;
          created_at: string;
          id: string;
          keterangan: string | null;
          kode: string | null;
          latitude: number | null;
          longitude: number | null;
          nama: string;
        };
        Insert: {
          aktif?: boolean;
          created_at?: string;
          id?: string;
          keterangan?: string | null;
          kode?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          nama: string;
        };
        Update: {
          aktif?: boolean;
          created_at?: string;
          id?: string;
          keterangan?: string | null;
          kode?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          nama?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string;
          id: string;
          is_active: boolean;
          kode_upt: string | null;
          nip: string | null;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          full_name: string;
          id: string;
          is_active?: boolean;
          kode_upt?: string | null;
          nip?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          full_name?: string;
          id?: string;
          is_active?: boolean;
          kode_upt?: string | null;
          nip?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      rekonsiliasi_sesi: { Args: { p_session: string }; Returns: Json };
    };
    Enums: {
      activity_type: "Pertanian" | "Peternakan" | "Perikanan";
      log_type:
        | "Serah terima di blok"
        | "P2U keluar atau masuk"
        | "Tiba di lokasi"
        | "Pemeriksaan berkala"
        | "Pindah area atau ganti pengawal"
        | "Pihak luar dan kendaraan"
        | "Pengembalian sebagian"
        | "Alarm gelang"
        | "Gangguan"
        | "Naikkan status";
      readiness_status: "Menunggu" | "Dapat Dimulai" | "Perbaiki Dulu" | "Ditunda";
      security_status: "HIJAU" | "KUNING" | "MERAH" | "KRITIS";
      user_role: "administrator" | "operator" | "pengawal" | "kepala_pengamanan";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
