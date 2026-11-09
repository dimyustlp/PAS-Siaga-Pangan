// Dihasilkan dari skema Supabase (proyek PAS-SIAGA Pangan). Jangan diubah manual.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      activities: {
        Row: {
          akses_warga: string | null;
          batas_area: string | null;
          created_at: string;
          created_by: string;
          id: string;
          jenis_kegiatan: Database["public"]["Enums"]["activity_type"];
          kode_kegiatan: string;
          kode_upt: string | null;
          lokasi_id: string;
          luas_lahan_ha: number | null;
          nomor_persetujuan: string | null;
          nomor_surat_perintah: string | null;
          rencana_berakhir: string | null;
          rute: string | null;
          tanggal_mulai: string;
          titik_komunikasi: string | null;
          updated_at: string;
        };
        Insert: {
          akses_warga?: string | null;
          batas_area?: string | null;
          created_at?: string;
          created_by?: string;
          id?: string;
          jenis_kegiatan: Database["public"]["Enums"]["activity_type"];
          kode_kegiatan: string;
          kode_upt?: string | null;
          lokasi_id: string;
          luas_lahan_ha?: number | null;
          nomor_persetujuan?: string | null;
          nomor_surat_perintah?: string | null;
          rencana_berakhir?: string | null;
          rute?: string | null;
          tanggal_mulai: string;
          titik_komunikasi?: string | null;
          updated_at?: string;
        };
        Update: {
          akses_warga?: string | null;
          batas_area?: string | null;
          created_at?: string;
          created_by?: string;
          id?: string;
          jenis_kegiatan?: Database["public"]["Enums"]["activity_type"];
          kode_kegiatan?: string;
          kode_upt?: string | null;
          lokasi_id?: string;
          luas_lahan_ha?: number | null;
          nomor_persetujuan?: string | null;
          nomor_surat_perintah?: string | null;
          rencana_berakhir?: string | null;
          rute?: string | null;
          tanggal_mulai?: string;
          titik_komunikasi?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      audit_events: {
        Row: {
          aksi: string;
          aktor_id: string | null;
          aktor_nama: string | null;
          detail: Json;
          id: string;
          sasaran_id: string | null;
          sasaran_nama: string | null;
          waktu: string;
        };
        Insert: {
          aksi: string;
          aktor_id?: string | null;
          aktor_nama?: string | null;
          detail?: Json;
          id?: string;
          sasaran_id?: string | null;
          sasaran_nama?: string | null;
          waktu?: string;
        };
        Update: {
          aksi?: string;
          aktor_id?: string | null;
          aktor_nama?: string | null;
          detail?: Json;
          id?: string;
          sasaran_id?: string | null;
          sasaran_nama?: string | null;
          waktu?: string;
        };
        Relationships: [];
      };
      daily_sessions: {
        Row: {
          activity_id: string;
          bimker_penanggung_jawab: string | null;
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
          petugas_blok: string | null;
          petugas_ids: string[];
          petugas_p2u: string | null;
          rincian_alat: string | null;
          status_keamanan: Database["public"]["Enums"]["security_status"];
          status_kesiapan: Database["public"]["Enums"]["readiness_status"];
          tanggal_sesi: string;
          updated_at: string;
        };
        Insert: {
          activity_id: string;
          bimker_penanggung_jawab?: string | null;
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
          petugas_blok?: string | null;
          petugas_ids?: string[];
          petugas_p2u?: string | null;
          rincian_alat?: string | null;
          status_keamanan?: Database["public"]["Enums"]["security_status"];
          status_kesiapan?: Database["public"]["Enums"]["readiness_status"];
          tanggal_sesi: string;
          updated_at?: string;
        };
        Update: {
          activity_id?: string;
          bimker_penanggung_jawab?: string | null;
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
          petugas_blok?: string | null;
          petugas_ids?: string[];
          petugas_p2u?: string | null;
          rincian_alat?: string | null;
          status_keamanan?: Database["public"]["Enums"]["security_status"];
          status_kesiapan?: Database["public"]["Enums"]["readiness_status"];
          tanggal_sesi?: string;
          updated_at?: string;
        };
        Relationships: [];
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
          status_baru: Database["public"]["Enums"]["security_status"] | null;
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
          status_baru?: Database["public"]["Enums"]["security_status"] | null;
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
          status_baru?: Database["public"]["Enums"]["security_status"] | null;
        };
        Relationships: [];
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
          susulan: boolean;
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
          susulan?: boolean;
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
          susulan?: boolean;
          waktu_kejadian?: string;
        };
        Relationships: [];
      };
      follow_ups: {
        Row: {
          bukti_url: string | null;
          catatan_selesai: string | null;
          created_at: string;
          dibuat_oleh: string;
          diverifikasi_at: string | null;
          diverifikasi_oleh: string | null;
          id: string;
          incident_id: string | null;
          pemeriksaan_ulang_at: string | null;
          penanggung_jawab_id: string | null;
          penanggung_jawab_nama: string;
          selesai_at: string | null;
          session_id: string;
          status: string;
          sumber: string;
          tenggat: string;
          updated_at: string;
          uraian: string;
        };
        Insert: {
          bukti_url?: string | null;
          catatan_selesai?: string | null;
          created_at?: string;
          dibuat_oleh?: string;
          diverifikasi_at?: string | null;
          diverifikasi_oleh?: string | null;
          id?: string;
          incident_id?: string | null;
          pemeriksaan_ulang_at?: string | null;
          penanggung_jawab_id?: string | null;
          penanggung_jawab_nama: string;
          selesai_at?: string | null;
          session_id: string;
          status?: string;
          sumber: string;
          tenggat: string;
          updated_at?: string;
          uraian: string;
        };
        Update: {
          bukti_url?: string | null;
          catatan_selesai?: string | null;
          created_at?: string;
          dibuat_oleh?: string;
          diverifikasi_at?: string | null;
          diverifikasi_oleh?: string | null;
          id?: string;
          incident_id?: string | null;
          pemeriksaan_ulang_at?: string | null;
          penanggung_jawab_id?: string | null;
          penanggung_jawab_nama?: string;
          selesai_at?: string | null;
          session_id?: string;
          status?: string;
          sumber?: string;
          tenggat?: string;
          updated_at?: string;
          uraian?: string;
        };
        Relationships: [];
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
        Relationships: [];
      };
      master_inmates: {
        Row: {
          aktif: boolean;
          created_at: string;
          id: string;
          kode_upt: string;
          nama: string;
          nomor_registrasi: string;
        };
        Insert: {
          aktif?: boolean;
          created_at?: string;
          id?: string;
          kode_upt?: string;
          nama: string;
          nomor_registrasi: string;
        };
        Update: {
          aktif?: boolean;
          created_at?: string;
          id?: string;
          kode_upt?: string;
          nama?: string;
          nomor_registrasi?: string;
        };
        Relationships: [];
      };
      master_kanwil: {
        Row: {
          id: string;
          kode: string;
          nama: string;
        };
        Insert: {
          id?: string;
          kode: string;
          nama: string;
        };
        Update: {
          id?: string;
          kode?: string;
          nama?: string;
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
          kode_upt: string;
          latitude: number | null;
          longitude: number | null;
          luas_ha: number | null;
          nama: string;
        };
        Insert: {
          aktif?: boolean;
          created_at?: string;
          id?: string;
          keterangan?: string | null;
          kode?: string | null;
          kode_upt?: string;
          latitude?: number | null;
          longitude?: number | null;
          luas_ha?: number | null;
          nama: string;
        };
        Update: {
          aktif?: boolean;
          created_at?: string;
          id?: string;
          keterangan?: string | null;
          kode?: string | null;
          kode_upt?: string;
          latitude?: number | null;
          longitude?: number | null;
          luas_ha?: number | null;
          nama?: string;
        };
        Relationships: [];
      };
      master_upt: {
        Row: {
          id: string;
          jenis: string | null;
          kanwil_id: string | null;
          kode: string;
          nama: string;
        };
        Insert: {
          id?: string;
          jenis?: string | null;
          kanwil_id?: string | null;
          kode: string;
          nama: string;
        };
        Update: {
          id?: string;
          jenis?: string | null;
          kanwil_id?: string | null;
          kode?: string;
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
          kanwil_id: string | null;
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
          kanwil_id?: string | null;
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
          kanwil_id?: string | null;
          kode_upt?: string | null;
          nip?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      risk_register: {
        Row: {
          catatan: string | null;
          diperbarui_oleh: string | null;
          id: string;
          mitigasi: string;
          nomor: number;
          risiko: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          catatan?: string | null;
          diperbarui_oleh?: string | null;
          id?: string;
          mitigasi: string;
          nomor: number;
          risiko: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          catatan?: string | null;
          diperbarui_oleh?: string | null;
          id?: string;
          mitigasi?: string;
          nomor?: number;
          risiko?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      session_inmates: {
        Row: {
          inmate_id: string;
          session_id: string;
        };
        Insert: {
          inmate_id: string;
          session_id: string;
        };
        Update: {
          inmate_id?: string;
          session_id?: string;
        };
        Relationships: [];
      };
      session_readiness: {
        Row: {
          catatan: string | null;
          diperiksa_at: string | null;
          diperiksa_oleh: string | null;
          kode: string;
          session_id: string;
          terpenuhi: boolean;
        };
        Insert: {
          catatan?: string | null;
          diperiksa_at?: string | null;
          diperiksa_oleh?: string | null;
          kode: string;
          session_id: string;
          terpenuhi?: boolean;
        };
        Update: {
          catatan?: string | null;
          diperiksa_at?: string | null;
          diperiksa_oleh?: string | null;
          kode?: string;
          session_id?: string;
          terpenuhi?: boolean;
        };
        Relationships: [];
      };
      status_history: {
        Row: {
          alasan: string;
          dari: Database["public"]["Enums"]["security_status"];
          decision_id: string | null;
          id: string;
          ke: Database["public"]["Enums"]["security_status"];
          log_id: string | null;
          oleh: string | null;
          session_id: string;
          sumber: string;
          waktu: string;
        };
        Insert: {
          alasan: string;
          dari: Database["public"]["Enums"]["security_status"];
          decision_id?: string | null;
          id?: string;
          ke: Database["public"]["Enums"]["security_status"];
          log_id?: string | null;
          oleh?: string | null;
          session_id: string;
          sumber: string;
          waktu?: string;
        };
        Update: {
          alasan?: string;
          dari?: Database["public"]["Enums"]["security_status"];
          decision_id?: string | null;
          id?: string;
          ke?: Database["public"]["Enums"]["security_status"];
          log_id?: string | null;
          oleh?: string | null;
          session_id?: string;
          sumber?: string;
          waktu?: string;
        };
        Relationships: [];
      };
      trainings: {
        Row: {
          created_at: string;
          dibuat_oleh: string;
          id: string;
          judul: string;
          jumlah_peserta: number;
          keterangan: string | null;
          kode_upt: string;
          metode: string | null;
          sasaran: string | null;
          tanggal: string;
        };
        Insert: {
          created_at?: string;
          dibuat_oleh?: string;
          id?: string;
          judul: string;
          jumlah_peserta: number;
          keterangan?: string | null;
          kode_upt?: string;
          metode?: string | null;
          sasaran?: string | null;
          tanggal: string;
        };
        Update: {
          created_at?: string;
          dibuat_oleh?: string;
          id?: string;
          judul?: string;
          jumlah_peserta?: number;
          keterangan?: string | null;
          kode_upt?: string;
          metode?: string | null;
          sasaran?: string | null;
          tanggal?: string;
        };
        Relationships: [];
      };
      weekly_notes: {
        Row: {
          created_at: string;
          ditulis_oleh: string;
          id: string;
          kendala: string;
          kode_upt: string;
          minggu_mulai: string;
          tindak_lanjut: string | null;
        };
        Insert: {
          created_at?: string;
          ditulis_oleh?: string;
          id?: string;
          kendala: string;
          kode_upt?: string;
          minggu_mulai: string;
          tindak_lanjut?: string | null;
        };
        Update: {
          created_at?: string;
          ditulis_oleh?: string;
          id?: string;
          kendala?: string;
          kode_upt?: string;
          minggu_mulai?: string;
          tindak_lanjut?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      v_session_overview: {
        Row: {
          activity_id: string | null;
          batas_periksa_berikut: string | null;
          diperbarui_at: string | null;
          ditutup_at: string | null;
          fase: string | null;
          gangguan_terbuka: number | null;
          hitung_terakhir_at: string | null;
          interval_pemeriksaan: number | null;
          jenis_kegiatan: Database["public"]["Enums"]["activity_type"] | null;
          jumlah_alat_kerja: number | null;
          jumlah_narapidana: number | null;
          jumlah_petugas: number | null;
          keluar_at: string | null;
          kembali_at: string | null;
          kode_kegiatan: string | null;
          kode_upt: string | null;
          lokasi_id: string | null;
          lokasi_nama: string | null;
          luas_lahan_ha: number | null;
          pakai_gelang_monitor: boolean | null;
          session_id: string | null;
          status_keamanan: Database["public"]["Enums"]["security_status"] | null;
          status_kesiapan: Database["public"]["Enums"]["readiness_status"] | null;
          tanggal_sesi: string | null;
          terlambat_periksa: boolean | null;
          tiba_at: string | null;
          tindak_lanjut_terbuka: number | null;
          tindak_lanjut_terlambat: number | null;
          upt_nama: string | null;
          wbp_keluar: number | null;
          wbp_kembali: number | null;
          wbp_terakhir_dihitung: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      admin_atur_kata_sandi: { Args: { p_password: string; p_user: string }; Returns: undefined };
      admin_buat_akun: {
        Args: { p_email: string; p_kanwil: string | null; p_kode_upt: string | null; p_nama: string; p_nip: string | null; p_password: string; p_role: Database["public"]["Enums"]["user_role"] };
        Returns: string;
      };
      daftar_nominatif: { Args: { p_session: string }; Returns: { inmate_id: string; nama: string; nomor_registrasi: string }[] };
      indikator_evaluasi: { Args: { p_dari: string; p_sampai: string }; Returns: Json };
      rekonsiliasi_sesi: { Args: { p_session: string }; Returns: Json };
      tren_mingguan: { Args: { p_dari: string; p_sampai: string }; Returns: Json };
    };
    Enums: {
      activity_type: "Pertanian" | "Peternakan" | "Perikanan";
      log_type:
        | "Serah terima di blok" | "P2U keluar atau masuk" | "Tiba di lokasi" | "Pemeriksaan berkala"
        | "Pindah area atau ganti pengawal" | "Pihak luar dan kendaraan" | "Pengembalian sebagian"
        | "Alarm gelang" | "Gangguan" | "Naikkan status" | "Pemeriksaan gelang";
      readiness_status: "Menunggu" | "Dapat Dimulai" | "Perbaiki Dulu" | "Ditunda";
      security_status: "HIJAU" | "KUNING" | "MERAH" | "KRITIS";
      user_role: "operator" | "pengawal" | "kepala_pengamanan" | "administrator" | "pemantau_kanwil" | "pemantau_pusat";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];
export type Tables<N extends keyof (PublicSchema["Tables"] & PublicSchema["Views"])> = (PublicSchema["Tables"] & PublicSchema["Views"])[N] extends { Row: infer R } ? R : never;
export type TablesInsert<N extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][N] extends { Insert: infer I } ? I : never;
export type TablesUpdate<N extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][N] extends { Update: infer U } ? U : never;
export type Enums<N extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][N];
