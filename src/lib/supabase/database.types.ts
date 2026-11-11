// Dihasilkan dari skema Supabase (proyek PAS-SIAGA Pangan) dengan generate_typescript_types. Jangan diubah manual.

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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          akses_warga: string | null
          batas_area: string | null
          created_at: string
          created_by: string
          id: string
          jenis_kegiatan: Database["public"]["Enums"]["activity_type"]
          kode_kegiatan: string
          kode_upt: string | null
          latihan: boolean
          lokasi_id: string
          luas_lahan_ha: number | null
          nomor_persetujuan: string | null
          nomor_surat_perintah: string | null
          rencana_berakhir: string | null
          rute: string | null
          tanggal_mulai: string
          titik_komunikasi: string | null
          updated_at: string
        }
        Insert: {
          akses_warga?: string | null
          batas_area?: string | null
          created_at?: string
          created_by?: string
          id?: string
          jenis_kegiatan: Database["public"]["Enums"]["activity_type"]
          kode_kegiatan: string
          kode_upt?: string | null
          latihan?: boolean
          lokasi_id: string
          luas_lahan_ha?: number | null
          nomor_persetujuan?: string | null
          nomor_surat_perintah?: string | null
          rencana_berakhir?: string | null
          rute?: string | null
          tanggal_mulai: string
          titik_komunikasi?: string | null
          updated_at?: string
        }
        Update: {
          akses_warga?: string | null
          batas_area?: string | null
          created_at?: string
          created_by?: string
          id?: string
          jenis_kegiatan?: Database["public"]["Enums"]["activity_type"]
          kode_kegiatan?: string
          kode_upt?: string | null
          latihan?: boolean
          lokasi_id?: string
          luas_lahan_ha?: number | null
          nomor_persetujuan?: string | null
          nomor_surat_perintah?: string | null
          rencana_berakhir?: string | null
          rute?: string | null
          tanggal_mulai?: string
          titik_komunikasi?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_lokasi_id_fkey"
            columns: ["lokasi_id"]
            isOneToOne: false
            referencedRelation: "master_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          aksi: string
          aktor_id: string | null
          aktor_nama: string | null
          detail: Json
          id: string
          sasaran_id: string | null
          sasaran_nama: string | null
          waktu: string
        }
        Insert: {
          aksi: string
          aktor_id?: string | null
          aktor_nama?: string | null
          detail?: Json
          id?: string
          sasaran_id?: string | null
          sasaran_nama?: string | null
          waktu?: string
        }
        Update: {
          aksi?: string
          aktor_id?: string | null
          aktor_nama?: string | null
          detail?: Json
          id?: string
          sasaran_id?: string | null
          sasaran_nama?: string | null
          waktu?: string
        }
        Relationships: []
      }
      berita_pangan: {
        Row: {
          created_at: string
          diterbitkan: boolean
          foto_path: string | null
          id: string
          isi: string
          judul: string
          kategori: string
          kode_upt: string | null
          penulis: string
          ringkasan: string | null
          tanggal: string
        }
        Insert: {
          created_at?: string
          diterbitkan?: boolean
          foto_path?: string | null
          id?: string
          isi: string
          judul: string
          kategori: string
          kode_upt?: string | null
          penulis?: string
          ringkasan?: string | null
          tanggal?: string
        }
        Update: {
          created_at?: string
          diterbitkan?: boolean
          foto_path?: string | null
          id?: string
          isi?: string
          judul?: string
          kategori?: string
          kode_upt?: string | null
          penulis?: string
          ringkasan?: string | null
          tanggal?: string
        }
        Relationships: [
          {
            foreignKeyName: "berita_pangan_kode_upt_fkey"
            columns: ["kode_upt"]
            isOneToOne: false
            referencedRelation: "master_upt"
            referencedColumns: ["kode"]
          },
          {
            foreignKeyName: "berita_pangan_penulis_fkey"
            columns: ["penulis"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      berkas: {
        Row: {
          created_at: string
          diunggah_oleh: string
          id: string
          judul: string
          kategori: string
          keterangan: string | null
          kode_upt: string
          mime: string | null
          nama_berkas: string | null
          storage_path: string | null
          sumber: string
          tanggal: string
          tautan: string | null
          ukuran_byte: number | null
        }
        Insert: {
          created_at?: string
          diunggah_oleh?: string
          id?: string
          judul: string
          kategori: string
          keterangan?: string | null
          kode_upt: string
          mime?: string | null
          nama_berkas?: string | null
          storage_path?: string | null
          sumber: string
          tanggal?: string
          tautan?: string | null
          ukuran_byte?: number | null
        }
        Update: {
          created_at?: string
          diunggah_oleh?: string
          id?: string
          judul?: string
          kategori?: string
          keterangan?: string | null
          kode_upt?: string
          mime?: string | null
          nama_berkas?: string | null
          storage_path?: string | null
          sumber?: string
          tanggal?: string
          tautan?: string | null
          ukuran_byte?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "berkas_diunggah_oleh_fkey"
            columns: ["diunggah_oleh"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "berkas_kode_upt_fkey"
            columns: ["kode_upt"]
            isOneToOne: false
            referencedRelation: "master_upt"
            referencedColumns: ["kode"]
          },
        ]
      }
      daily_sessions: {
        Row: {
          activity_id: string
          bimker_penanggung_jawab: string | null
          created_at: string
          created_by: string
          ditutup_at: string | null
          ditutup_oleh: string | null
          dokumen_rencana_pengamanan: string | null
          dokumen_surat_perintah: string | null
          id: string
          interval_pemeriksaan: number
          jumlah_alat_kerja: number
          jumlah_narapidana: number
          pakai_gelang_monitor: boolean
          petugas_blok: string | null
          petugas_ids: string[]
          petugas_p2u: string | null
          rincian_alat: string | null
          status_keamanan: Database["public"]["Enums"]["security_status"]
          status_kesiapan: Database["public"]["Enums"]["readiness_status"]
          tanggal_sesi: string
          updated_at: string
        }
        Insert: {
          activity_id: string
          bimker_penanggung_jawab?: string | null
          created_at?: string
          created_by?: string
          ditutup_at?: string | null
          ditutup_oleh?: string | null
          dokumen_rencana_pengamanan?: string | null
          dokumen_surat_perintah?: string | null
          id?: string
          interval_pemeriksaan?: number
          jumlah_alat_kerja?: number
          jumlah_narapidana: number
          pakai_gelang_monitor?: boolean
          petugas_blok?: string | null
          petugas_ids?: string[]
          petugas_p2u?: string | null
          rincian_alat?: string | null
          status_keamanan?: Database["public"]["Enums"]["security_status"]
          status_kesiapan?: Database["public"]["Enums"]["readiness_status"]
          tanggal_sesi: string
          updated_at?: string
        }
        Update: {
          activity_id?: string
          bimker_penanggung_jawab?: string | null
          created_at?: string
          created_by?: string
          ditutup_at?: string | null
          ditutup_oleh?: string | null
          dokumen_rencana_pengamanan?: string | null
          dokumen_surat_perintah?: string | null
          id?: string
          interval_pemeriksaan?: number
          jumlah_alat_kerja?: number
          jumlah_narapidana?: number
          pakai_gelang_monitor?: boolean
          petugas_blok?: string | null
          petugas_ids?: string[]
          petugas_p2u?: string | null
          rincian_alat?: string | null
          status_keamanan?: Database["public"]["Enums"]["security_status"]
          status_kesiapan?: Database["public"]["Enums"]["readiness_status"]
          tanggal_sesi?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_sessions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_sessions_ditutup_oleh_fkey"
            columns: ["ditutup_oleh"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      decisions: {
        Row: {
          bukti_url: string | null
          catatan_keputusan: string | null
          created_at: string
          id: string
          incident_id: string | null
          jenis_keputusan: string
          pejabat_id: string
          session_id: string
          status_baru: Database["public"]["Enums"]["security_status"] | null
        }
        Insert: {
          bukti_url?: string | null
          catatan_keputusan?: string | null
          created_at?: string
          id?: string
          incident_id?: string | null
          jenis_keputusan: string
          pejabat_id?: string
          session_id: string
          status_baru?: Database["public"]["Enums"]["security_status"] | null
        }
        Update: {
          bukti_url?: string | null
          catatan_keputusan?: string | null
          created_at?: string
          id?: string
          incident_id?: string | null
          jenis_keputusan?: string
          pejabat_id?: string
          session_id?: string
          status_baru?: Database["public"]["Enums"]["security_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "decisions_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_pejabat_id_fkey"
            columns: ["pejabat_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "daily_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_overview"
            referencedColumns: ["session_id"]
          },
        ]
      }
      field_logs: {
        Row: {
          bukti_url: string | null
          client_id: string | null
          dikirim_at: string
          id: string
          jenis_entri: Database["public"]["Enums"]["log_type"]
          payload: Json
          pengawal_id: string
          session_id: string
          susulan: boolean
          waktu_kejadian: string
        }
        Insert: {
          bukti_url?: string | null
          client_id?: string | null
          dikirim_at?: string
          id?: string
          jenis_entri: Database["public"]["Enums"]["log_type"]
          payload?: Json
          pengawal_id?: string
          session_id: string
          susulan?: boolean
          waktu_kejadian: string
        }
        Update: {
          bukti_url?: string | null
          client_id?: string | null
          dikirim_at?: string
          id?: string
          jenis_entri?: Database["public"]["Enums"]["log_type"]
          payload?: Json
          pengawal_id?: string
          session_id?: string
          susulan?: boolean
          waktu_kejadian?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_logs_pengawal_id_fkey"
            columns: ["pengawal_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "daily_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_overview"
            referencedColumns: ["session_id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          bukti_url: string | null
          catatan_selesai: string | null
          created_at: string
          dibuat_oleh: string
          diverifikasi_at: string | null
          diverifikasi_oleh: string | null
          id: string
          incident_id: string | null
          pemeriksaan_ulang_at: string | null
          penanggung_jawab_id: string | null
          penanggung_jawab_nama: string
          selesai_at: string | null
          session_id: string
          status: string
          sumber: string
          tenggat: string
          updated_at: string
          uraian: string
        }
        Insert: {
          bukti_url?: string | null
          catatan_selesai?: string | null
          created_at?: string
          dibuat_oleh?: string
          diverifikasi_at?: string | null
          diverifikasi_oleh?: string | null
          id?: string
          incident_id?: string | null
          pemeriksaan_ulang_at?: string | null
          penanggung_jawab_id?: string | null
          penanggung_jawab_nama: string
          selesai_at?: string | null
          session_id: string
          status?: string
          sumber: string
          tenggat: string
          updated_at?: string
          uraian: string
        }
        Update: {
          bukti_url?: string | null
          catatan_selesai?: string | null
          created_at?: string
          dibuat_oleh?: string
          diverifikasi_at?: string | null
          diverifikasi_oleh?: string | null
          id?: string
          incident_id?: string | null
          pemeriksaan_ulang_at?: string | null
          penanggung_jawab_id?: string | null
          penanggung_jawab_nama?: string
          selesai_at?: string | null
          session_id?: string
          status?: string
          sumber?: string
          tenggat?: string
          updated_at?: string
          uraian?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_dibuat_oleh_fkey"
            columns: ["dibuat_oleh"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_diverifikasi_oleh_fkey"
            columns: ["diverifikasi_oleh"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_penanggung_jawab_id_fkey"
            columns: ["penanggung_jawab_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "daily_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_overview"
            referencedColumns: ["session_id"]
          },
        ]
      }
      gelang_alarm: {
        Row: {
          baterai: string | null
          created_at: string
          dikonfirmasi_at: string | null
          dikonfirmasi_oleh: string | null
          id: string
          inmate_id: string | null
          jenis: string
          kode_upt: string | null
          lokasi: string | null
          payload: Json
          session_id: string | null
          status: string
          tindakan: string | null
          unit_kode: string | null
          unit_nama: string
          waktu: string
        }
        Insert: {
          baterai?: string | null
          created_at?: string
          dikonfirmasi_at?: string | null
          dikonfirmasi_oleh?: string | null
          id?: string
          inmate_id?: string | null
          jenis: string
          kode_upt?: string | null
          lokasi?: string | null
          payload?: Json
          session_id?: string | null
          status?: string
          tindakan?: string | null
          unit_kode?: string | null
          unit_nama: string
          waktu?: string
        }
        Update: {
          baterai?: string | null
          created_at?: string
          dikonfirmasi_at?: string | null
          dikonfirmasi_oleh?: string | null
          id?: string
          inmate_id?: string | null
          jenis?: string
          kode_upt?: string | null
          lokasi?: string | null
          payload?: Json
          session_id?: string | null
          status?: string
          tindakan?: string | null
          unit_kode?: string | null
          unit_nama?: string
          waktu?: string
        }
        Relationships: [
          {
            foreignKeyName: "gelang_alarm_dikonfirmasi_oleh_fkey"
            columns: ["dikonfirmasi_oleh"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gelang_alarm_inmate_id_fkey"
            columns: ["inmate_id"]
            isOneToOne: false
            referencedRelation: "master_inmates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gelang_alarm_kode_upt_fkey"
            columns: ["kode_upt"]
            isOneToOne: false
            referencedRelation: "master_upt"
            referencedColumns: ["kode"]
          },
          {
            foreignKeyName: "gelang_alarm_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "daily_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gelang_alarm_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_overview"
            referencedColumns: ["session_id"]
          },
        ]
      }
      gelang_unit: {
        Row: {
          aktif: boolean
          ambang_baterai: number
          created_at: string
          id: string
          inmate_id: string | null
          kode_unit: string
          kode_upt: string
          nama_unit: string | null
          zona_nama: string | null
          zona_radius_m: number | null
        }
        Insert: {
          aktif?: boolean
          ambang_baterai?: number
          created_at?: string
          id?: string
          inmate_id?: string | null
          kode_unit: string
          kode_upt: string
          nama_unit?: string | null
          zona_nama?: string | null
          zona_radius_m?: number | null
        }
        Update: {
          aktif?: boolean
          ambang_baterai?: number
          created_at?: string
          id?: string
          inmate_id?: string | null
          kode_unit?: string
          kode_upt?: string
          nama_unit?: string | null
          zona_nama?: string | null
          zona_radius_m?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gelang_unit_inmate_id_fkey"
            columns: ["inmate_id"]
            isOneToOne: false
            referencedRelation: "master_inmates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gelang_unit_kode_upt_fkey"
            columns: ["kode_upt"]
            isOneToOne: false
            referencedRelation: "master_upt"
            referencedColumns: ["kode"]
          },
        ]
      }
      grup_telegram: {
        Row: {
          aktif: boolean
          chat_id: string
          created_at: string
          id: string
          ikut_latihan: boolean
          kanwil_id: string | null
          kirim_rekap: boolean
          kode_upt: string | null
          minimal_status: Database["public"]["Enums"]["security_status"]
          nama: string
          tingkat: string
        }
        Insert: {
          aktif?: boolean
          chat_id: string
          created_at?: string
          id?: string
          ikut_latihan?: boolean
          kanwil_id?: string | null
          kirim_rekap?: boolean
          kode_upt?: string | null
          minimal_status?: Database["public"]["Enums"]["security_status"]
          nama: string
          tingkat: string
        }
        Update: {
          aktif?: boolean
          chat_id?: string
          created_at?: string
          id?: string
          ikut_latihan?: boolean
          kanwil_id?: string | null
          kirim_rekap?: boolean
          kode_upt?: string | null
          minimal_status?: Database["public"]["Enums"]["security_status"]
          nama?: string
          tingkat?: string
        }
        Relationships: [
          {
            foreignKeyName: "grup_telegram_kanwil_id_fkey"
            columns: ["kanwil_id"]
            isOneToOne: false
            referencedRelation: "master_kanwil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grup_telegram_kanwil_id_fkey"
            columns: ["kanwil_id"]
            isOneToOne: false
            referencedRelation: "v_berkas"
            referencedColumns: ["kanwil_id"]
          },
          {
            foreignKeyName: "grup_telegram_kanwil_id_fkey"
            columns: ["kanwil_id"]
            isOneToOne: false
            referencedRelation: "v_hasil_pangan"
            referencedColumns: ["kanwil_id"]
          },
          {
            foreignKeyName: "grup_telegram_kode_upt_fkey"
            columns: ["kode_upt"]
            isOneToOne: false
            referencedRelation: "master_upt"
            referencedColumns: ["kode"]
          },
        ]
      }
      hasil_pangan: {
        Row: {
          activity_id: string | null
          catatan: string | null
          created_at: string
          dicatat_oleh: string
          id: string
          jenis: Database["public"]["Enums"]["activity_type"]
          kode_upt: string
          komoditas: string
          luas_ha: number | null
          satuan: string
          tanggal: string
          volume: number
        }
        Insert: {
          activity_id?: string | null
          catatan?: string | null
          created_at?: string
          dicatat_oleh?: string
          id?: string
          jenis: Database["public"]["Enums"]["activity_type"]
          kode_upt?: string
          komoditas: string
          luas_ha?: number | null
          satuan: string
          tanggal?: string
          volume: number
        }
        Update: {
          activity_id?: string | null
          catatan?: string | null
          created_at?: string
          dicatat_oleh?: string
          id?: string
          jenis?: Database["public"]["Enums"]["activity_type"]
          kode_upt?: string
          komoditas?: string
          luas_ha?: number | null
          satuan?: string
          tanggal?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "hasil_pangan_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hasil_pangan_dicatat_oleh_fkey"
            columns: ["dicatat_oleh"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hasil_pangan_kode_upt_fkey"
            columns: ["kode_upt"]
            isOneToOne: false
            referencedRelation: "master_upt"
            referencedColumns: ["kode"]
          },
        ]
      }
      incidents: {
        Row: {
          created_at: string
          diverifikasi_at: string | null
          diverifikasi_oleh: string | null
          id: string
          kategori_gangguan: string
          log_id: string
          penanggung_jawab_tindak_lanjut: string | null
          session_id: string
          status_penyelesaian: boolean
          tindakan_awal: string | null
        }
        Insert: {
          created_at?: string
          diverifikasi_at?: string | null
          diverifikasi_oleh?: string | null
          id?: string
          kategori_gangguan: string
          log_id: string
          penanggung_jawab_tindak_lanjut?: string | null
          session_id: string
          status_penyelesaian?: boolean
          tindakan_awal?: string | null
        }
        Update: {
          created_at?: string
          diverifikasi_at?: string | null
          diverifikasi_oleh?: string | null
          id?: string
          kategori_gangguan?: string
          log_id?: string
          penanggung_jawab_tindak_lanjut?: string | null
          session_id?: string
          status_penyelesaian?: boolean
          tindakan_awal?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_diverifikasi_oleh_fkey"
            columns: ["diverifikasi_oleh"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: true
            referencedRelation: "field_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "daily_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_overview"
            referencedColumns: ["session_id"]
          },
        ]
      }
      inventaris_upt: {
        Row: {
          aktif: boolean
          created_at: string
          golongan: string
          id: string
          jumlah: number
          kategori: string | null
          keterangan: string | null
          kode_inventaris: string | null
          kode_upt: string
          kondisi: string
          lokasi_simpan: string | null
          nama: string
        }
        Insert: {
          aktif?: boolean
          created_at?: string
          golongan: string
          id?: string
          jumlah?: number
          kategori?: string | null
          keterangan?: string | null
          kode_inventaris?: string | null
          kode_upt?: string
          kondisi?: string
          lokasi_simpan?: string | null
          nama: string
        }
        Update: {
          aktif?: boolean
          created_at?: string
          golongan?: string
          id?: string
          jumlah?: number
          kategori?: string | null
          keterangan?: string | null
          kode_inventaris?: string | null
          kode_upt?: string
          kondisi?: string
          lokasi_simpan?: string | null
          nama?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventaris_upt_kode_upt_fkey"
            columns: ["kode_upt"]
            isOneToOne: false
            referencedRelation: "master_upt"
            referencedColumns: ["kode"]
          },
        ]
      }
      kelompok_kerja: {
        Row: {
          aktif: boolean
          created_at: string
          id: string
          jenis_kegiatan: Database["public"]["Enums"]["activity_type"] | null
          keterangan: string | null
          kode_upt: string
          lokasi_id: string | null
          nama: string
          pembimbing: string | null
        }
        Insert: {
          aktif?: boolean
          created_at?: string
          id?: string
          jenis_kegiatan?: Database["public"]["Enums"]["activity_type"] | null
          keterangan?: string | null
          kode_upt?: string
          lokasi_id?: string | null
          nama: string
          pembimbing?: string | null
        }
        Update: {
          aktif?: boolean
          created_at?: string
          id?: string
          jenis_kegiatan?: Database["public"]["Enums"]["activity_type"] | null
          keterangan?: string | null
          kode_upt?: string
          lokasi_id?: string | null
          nama?: string
          pembimbing?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kelompok_kerja_kode_upt_fkey"
            columns: ["kode_upt"]
            isOneToOne: false
            referencedRelation: "master_upt"
            referencedColumns: ["kode"]
          },
          {
            foreignKeyName: "kelompok_kerja_lokasi_id_fkey"
            columns: ["lokasi_id"]
            isOneToOne: false
            referencedRelation: "master_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      kelompok_kerja_anggota: {
        Row: {
          inmate_id: string
          kelompok_id: string
        }
        Insert: {
          inmate_id: string
          kelompok_id: string
        }
        Update: {
          inmate_id?: string
          kelompok_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kelompok_kerja_anggota_inmate_id_fkey"
            columns: ["inmate_id"]
            isOneToOne: false
            referencedRelation: "master_inmates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kelompok_kerja_anggota_kelompok_id_fkey"
            columns: ["kelompok_id"]
            isOneToOne: false
            referencedRelation: "kelompok_kerja"
            referencedColumns: ["id"]
          },
        ]
      }
      kondisi_awal: {
        Row: {
          catatan: string | null
          dicatat_oleh: string | null
          gangguan_per_bulan: number | null
          id: string
          kegiatan_per_bulan: number | null
          kode_upt: string
          menit_pelaporan_kejadian: number | null
          pct_catatan_lengkap: number | null
          pct_serah_terima_cocok: number | null
          pct_temuan_tindak_lanjut: number | null
          pct_tindak_lanjut_selesai: number | null
          periode_dari: string | null
          periode_sampai: string | null
          sumber_data: string | null
          updated_at: string
        }
        Insert: {
          catatan?: string | null
          dicatat_oleh?: string | null
          gangguan_per_bulan?: number | null
          id?: string
          kegiatan_per_bulan?: number | null
          kode_upt: string
          menit_pelaporan_kejadian?: number | null
          pct_catatan_lengkap?: number | null
          pct_serah_terima_cocok?: number | null
          pct_temuan_tindak_lanjut?: number | null
          pct_tindak_lanjut_selesai?: number | null
          periode_dari?: string | null
          periode_sampai?: string | null
          sumber_data?: string | null
          updated_at?: string
        }
        Update: {
          catatan?: string | null
          dicatat_oleh?: string | null
          gangguan_per_bulan?: number | null
          id?: string
          kegiatan_per_bulan?: number | null
          kode_upt?: string
          menit_pelaporan_kejadian?: number | null
          pct_catatan_lengkap?: number | null
          pct_serah_terima_cocok?: number | null
          pct_temuan_tindak_lanjut?: number | null
          pct_tindak_lanjut_selesai?: number | null
          periode_dari?: string | null
          periode_sampai?: string | null
          sumber_data?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kondisi_awal_dicatat_oleh_fkey"
            columns: ["dicatat_oleh"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kondisi_awal_kode_upt_fkey"
            columns: ["kode_upt"]
            isOneToOne: true
            referencedRelation: "master_upt"
            referencedColumns: ["kode"]
          },
        ]
      }
      master_inmates: {
        Row: {
          aktif: boolean
          created_at: string
          id: string
          kode_upt: string
          nama: string
          nomor_registrasi: string
        }
        Insert: {
          aktif?: boolean
          created_at?: string
          id?: string
          kode_upt?: string
          nama: string
          nomor_registrasi: string
        }
        Update: {
          aktif?: boolean
          created_at?: string
          id?: string
          kode_upt?: string
          nama?: string
          nomor_registrasi?: string
        }
        Relationships: []
      }
      master_kanwil: {
        Row: {
          id: string
          kode: string
          nama: string
          provinsi: string[] | null
          tautan_folder: string | null
          tautan_form: string | null
          tipe: string | null
          urutan: number | null
          wilayah: string | null
        }
        Insert: {
          id?: string
          kode: string
          nama: string
          provinsi?: string[] | null
          tautan_folder?: string | null
          tautan_form?: string | null
          tipe?: string | null
          urutan?: number | null
          wilayah?: string | null
        }
        Update: {
          id?: string
          kode?: string
          nama?: string
          provinsi?: string[] | null
          tautan_folder?: string | null
          tautan_form?: string | null
          tipe?: string | null
          urutan?: number | null
          wilayah?: string | null
        }
        Relationships: []
      }
      master_locations: {
        Row: {
          aktif: boolean
          created_at: string
          daya_tampung_wbp: number | null
          id: string
          jarak_km: number | null
          jenis_lahan: string | null
          keterangan: string | null
          kode: string | null
          kode_upt: string
          komoditas_utama: string | null
          latitude: number | null
          longitude: number | null
          luas_ha: number | null
          nama: string
          pj_lokasi: string | null
          posisi: string
          status_lahan: string | null
        }
        Insert: {
          aktif?: boolean
          created_at?: string
          daya_tampung_wbp?: number | null
          id?: string
          jarak_km?: number | null
          jenis_lahan?: string | null
          keterangan?: string | null
          kode?: string | null
          kode_upt?: string
          komoditas_utama?: string | null
          latitude?: number | null
          longitude?: number | null
          luas_ha?: number | null
          nama: string
          pj_lokasi?: string | null
          posisi?: string
          status_lahan?: string | null
        }
        Update: {
          aktif?: boolean
          created_at?: string
          daya_tampung_wbp?: number | null
          id?: string
          jarak_km?: number | null
          jenis_lahan?: string | null
          keterangan?: string | null
          kode?: string | null
          kode_upt?: string
          komoditas_utama?: string | null
          latitude?: number | null
          longitude?: number | null
          luas_ha?: number | null
          nama?: string
          pj_lokasi?: string | null
          posisi?: string
          status_lahan?: string | null
        }
        Relationships: []
      }
      master_upt: {
        Row: {
          id: string
          jenis: string | null
          kab_kota: string | null
          kanwil_id: string | null
          kelas: string | null
          kode: string
          latitude: number | null
          longitude: number | null
          nama: string
          provinsi: string | null
          titik_perkiraan: boolean
        }
        Insert: {
          id?: string
          jenis?: string | null
          kab_kota?: string | null
          kanwil_id?: string | null
          kelas?: string | null
          kode: string
          latitude?: number | null
          longitude?: number | null
          nama: string
          provinsi?: string | null
          titik_perkiraan?: boolean
        }
        Update: {
          id?: string
          jenis?: string | null
          kab_kota?: string | null
          kanwil_id?: string | null
          kelas?: string | null
          kode?: string
          latitude?: number | null
          longitude?: number | null
          nama?: string
          provinsi?: string | null
          titik_perkiraan?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "master_upt_kanwil_id_fkey"
            columns: ["kanwil_id"]
            isOneToOne: false
            referencedRelation: "master_kanwil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_upt_kanwil_id_fkey"
            columns: ["kanwil_id"]
            isOneToOne: false
            referencedRelation: "v_berkas"
            referencedColumns: ["kanwil_id"]
          },
          {
            foreignKeyName: "master_upt_kanwil_id_fkey"
            columns: ["kanwil_id"]
            isOneToOne: false
            referencedRelation: "v_hasil_pangan"
            referencedColumns: ["kanwil_id"]
          },
        ]
      }
      notif_log: {
        Row: {
          grup_id: string | null
          grup_nama: string | null
          hasil: string
          id: string
          jenis: string
          pesan: string
          request_id: number | null
          waktu: string
        }
        Insert: {
          grup_id?: string | null
          grup_nama?: string | null
          hasil: string
          id?: string
          jenis: string
          pesan: string
          request_id?: number | null
          waktu?: string
        }
        Update: {
          grup_id?: string | null
          grup_nama?: string | null
          hasil?: string
          id?: string
          jenis?: string
          pesan?: string
          request_id?: number | null
          waktu?: string
        }
        Relationships: [
          {
            foreignKeyName: "notif_log_grup_id_fkey"
            columns: ["grup_id"]
            isOneToOne: false
            referencedRelation: "grup_telegram"
            referencedColumns: ["id"]
          },
        ]
      }
      pengaturan_aplikasi: {
        Row: {
          diubah_at: string
          diubah_oleh: string | null
          id: boolean
          mode_latihan: boolean
          rekap_jam_wib: number
          rekap_terakhir: string | null
          telegram_aktif: boolean
        }
        Insert: {
          diubah_at?: string
          diubah_oleh?: string | null
          id?: boolean
          mode_latihan?: boolean
          rekap_jam_wib?: number
          rekap_terakhir?: string | null
          telegram_aktif?: boolean
        }
        Update: {
          diubah_at?: string
          diubah_oleh?: string | null
          id?: boolean
          mode_latihan?: boolean
          rekap_jam_wib?: number
          rekap_terakhir?: string | null
          telegram_aktif?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "pengaturan_aplikasi_diubah_oleh_fkey"
            columns: ["diubah_oleh"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pengaturan_gelang: {
        Row: {
          diatur_at: string
          diatur_oleh: string | null
          id: boolean
          kunci_hash: string
        }
        Insert: {
          diatur_at?: string
          diatur_oleh?: string | null
          id?: boolean
          kunci_hash: string
        }
        Update: {
          diatur_at?: string
          diatur_oleh?: string | null
          id?: boolean
          kunci_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "pengaturan_gelang_diatur_oleh_fkey"
            columns: ["diatur_oleh"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      petugas_upt: {
        Row: {
          aktif: boolean
          created_at: string
          id: string
          jabatan: string | null
          kode_upt: string
          materi_habituasi: string | null
          nama: string
          nip: string | null
          profile_id: string | null
          regu: string | null
          tanggal_habituasi: string | null
        }
        Insert: {
          aktif?: boolean
          created_at?: string
          id?: string
          jabatan?: string | null
          kode_upt?: string
          materi_habituasi?: string | null
          nama: string
          nip?: string | null
          profile_id?: string | null
          regu?: string | null
          tanggal_habituasi?: string | null
        }
        Update: {
          aktif?: boolean
          created_at?: string
          id?: string
          jabatan?: string | null
          kode_upt?: string
          materi_habituasi?: string | null
          nama?: string
          nip?: string | null
          profile_id?: string | null
          regu?: string | null
          tanggal_habituasi?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "petugas_upt_kode_upt_fkey"
            columns: ["kode_upt"]
            isOneToOne: false
            referencedRelation: "master_upt"
            referencedColumns: ["kode"]
          },
          {
            foreignKeyName: "petugas_upt_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          kanwil_id: string | null
          kode_upt: string | null
          nip: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          is_active?: boolean
          kanwil_id?: string | null
          kode_upt?: string | null
          nip?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          kanwil_id?: string | null
          kode_upt?: string | null
          nip?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_kanwil_id_fkey"
            columns: ["kanwil_id"]
            isOneToOne: false
            referencedRelation: "master_kanwil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_kanwil_id_fkey"
            columns: ["kanwil_id"]
            isOneToOne: false
            referencedRelation: "v_berkas"
            referencedColumns: ["kanwil_id"]
          },
          {
            foreignKeyName: "profiles_kanwil_id_fkey"
            columns: ["kanwil_id"]
            isOneToOne: false
            referencedRelation: "v_hasil_pangan"
            referencedColumns: ["kanwil_id"]
          },
        ]
      }
      risk_register: {
        Row: {
          catatan: string | null
          diperbarui_oleh: string | null
          id: string
          mitigasi: string
          nomor: number
          risiko: string
          status: string
          updated_at: string
        }
        Insert: {
          catatan?: string | null
          diperbarui_oleh?: string | null
          id?: string
          mitigasi: string
          nomor: number
          risiko: string
          status?: string
          updated_at?: string
        }
        Update: {
          catatan?: string | null
          diperbarui_oleh?: string | null
          id?: string
          mitigasi?: string
          nomor?: number
          risiko?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_register_diperbarui_oleh_fkey"
            columns: ["diperbarui_oleh"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_inmates: {
        Row: {
          inmate_id: string
          session_id: string
        }
        Insert: {
          inmate_id: string
          session_id: string
        }
        Update: {
          inmate_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_inmates_inmate_id_fkey"
            columns: ["inmate_id"]
            isOneToOne: false
            referencedRelation: "master_inmates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_inmates_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "daily_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_inmates_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_overview"
            referencedColumns: ["session_id"]
          },
        ]
      }
      session_readiness: {
        Row: {
          catatan: string | null
          diperiksa_at: string | null
          diperiksa_oleh: string | null
          kode: string
          session_id: string
          terpenuhi: boolean
        }
        Insert: {
          catatan?: string | null
          diperiksa_at?: string | null
          diperiksa_oleh?: string | null
          kode: string
          session_id: string
          terpenuhi?: boolean
        }
        Update: {
          catatan?: string | null
          diperiksa_at?: string | null
          diperiksa_oleh?: string | null
          kode?: string
          session_id?: string
          terpenuhi?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "session_readiness_diperiksa_oleh_fkey"
            columns: ["diperiksa_oleh"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_readiness_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "daily_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_readiness_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_overview"
            referencedColumns: ["session_id"]
          },
        ]
      }
      status_history: {
        Row: {
          alasan: string
          dari: Database["public"]["Enums"]["security_status"]
          decision_id: string | null
          id: string
          ke: Database["public"]["Enums"]["security_status"]
          log_id: string | null
          oleh: string | null
          session_id: string
          sumber: string
          waktu: string
        }
        Insert: {
          alasan: string
          dari: Database["public"]["Enums"]["security_status"]
          decision_id?: string | null
          id?: string
          ke: Database["public"]["Enums"]["security_status"]
          log_id?: string | null
          oleh?: string | null
          session_id: string
          sumber: string
          waktu?: string
        }
        Update: {
          alasan?: string
          dari?: Database["public"]["Enums"]["security_status"]
          decision_id?: string | null
          id?: string
          ke?: Database["public"]["Enums"]["security_status"]
          log_id?: string | null
          oleh?: string | null
          session_id?: string
          sumber?: string
          waktu?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_history_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "field_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_history_oleh_fkey"
            columns: ["oleh"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "daily_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_overview"
            referencedColumns: ["session_id"]
          },
        ]
      }
      weekly_notes: {
        Row: {
          created_at: string
          ditulis_oleh: string
          id: string
          kendala: string
          kode_upt: string
          minggu_mulai: string
          tindak_lanjut: string | null
        }
        Insert: {
          created_at?: string
          ditulis_oleh?: string
          id?: string
          kendala: string
          kode_upt?: string
          minggu_mulai: string
          tindak_lanjut?: string | null
        }
        Update: {
          created_at?: string
          ditulis_oleh?: string
          id?: string
          kendala?: string
          kode_upt?: string
          minggu_mulai?: string
          tindak_lanjut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_notes_ditulis_oleh_fkey"
            columns: ["ditulis_oleh"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_berkas: {
        Row: {
          created_at: string | null
          diunggah_oleh: string | null
          id: string | null
          judul: string | null
          kanwil_id: string | null
          kanwil_nama: string | null
          kategori: string | null
          keterangan: string | null
          kode_upt: string | null
          nama_berkas: string | null
          pengunggah: string | null
          sumber: string | null
          tanggal: string | null
          tautan: string | null
          ukuran_byte: number | null
          upt_nama: string | null
        }
        Relationships: [
          {
            foreignKeyName: "berkas_diunggah_oleh_fkey"
            columns: ["diunggah_oleh"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "berkas_kode_upt_fkey"
            columns: ["kode_upt"]
            isOneToOne: false
            referencedRelation: "master_upt"
            referencedColumns: ["kode"]
          },
        ]
      }
      v_gelang_alarm: {
        Row: {
          baterai: string | null
          created_at: string | null
          dikonfirmasi_at: string | null
          dikonfirmasi_nama: string | null
          dikonfirmasi_oleh: string | null
          id: string | null
          inmate_id: string | null
          jenis: string | null
          kode_kegiatan: string | null
          kode_upt: string | null
          lokasi: string | null
          nomor_registrasi: string | null
          session_id: string | null
          status: string | null
          tindakan: string | null
          unit_kode: string | null
          unit_nama: string | null
          upt_nama: string | null
          waktu: string | null
          wb_nama: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gelang_alarm_dikonfirmasi_oleh_fkey"
            columns: ["dikonfirmasi_oleh"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gelang_alarm_inmate_id_fkey"
            columns: ["inmate_id"]
            isOneToOne: false
            referencedRelation: "master_inmates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gelang_alarm_kode_upt_fkey"
            columns: ["kode_upt"]
            isOneToOne: false
            referencedRelation: "master_upt"
            referencedColumns: ["kode"]
          },
          {
            foreignKeyName: "gelang_alarm_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "daily_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gelang_alarm_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_overview"
            referencedColumns: ["session_id"]
          },
        ]
      }
      v_gelang_unit_status: {
        Row: {
          aktif: boolean | null
          alarm_menunggu: number | null
          ambang_baterai: number | null
          baterai_nilai: string | null
          baterai_terakhir_at: string | null
          id: string | null
          inmate_id: string | null
          kode_unit: string | null
          kode_upt: string | null
          nama_unit: string | null
          nomor_registrasi: string | null
          sinyal_status: string | null
          sinyal_terakhir_at: string | null
          upt_nama: string | null
          wb_nama: string | null
          zona_nama: string | null
          zona_radius_m: number | null
          zona_status: string | null
          zona_terakhir_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gelang_unit_inmate_id_fkey"
            columns: ["inmate_id"]
            isOneToOne: false
            referencedRelation: "master_inmates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gelang_unit_kode_upt_fkey"
            columns: ["kode_upt"]
            isOneToOne: false
            referencedRelation: "master_upt"
            referencedColumns: ["kode"]
          },
        ]
      }
      v_hasil_pangan: {
        Row: {
          activity_id: string | null
          catatan: string | null
          created_at: string | null
          id: string | null
          jenis: Database["public"]["Enums"]["activity_type"] | null
          kanwil_id: string | null
          kanwil_nama: string | null
          kode_upt: string | null
          komoditas: string | null
          luas_ha: number | null
          satuan: string | null
          tanggal: string | null
          upt_nama: string | null
          volume: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hasil_pangan_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hasil_pangan_kode_upt_fkey"
            columns: ["kode_upt"]
            isOneToOne: false
            referencedRelation: "master_upt"
            referencedColumns: ["kode"]
          },
        ]
      }
      v_session_overview: {
        Row: {
          activity_id: string | null
          batas_periksa_berikut: string | null
          diperbarui_at: string | null
          ditutup_at: string | null
          fase: string | null
          gangguan_terbuka: number | null
          hitung_terakhir_at: string | null
          interval_pemeriksaan: number | null
          jenis_kegiatan: Database["public"]["Enums"]["activity_type"] | null
          jumlah_alat_kerja: number | null
          jumlah_narapidana: number | null
          jumlah_petugas: number | null
          keluar_at: string | null
          kembali_at: string | null
          kode_kegiatan: string | null
          kode_upt: string | null
          latihan: boolean | null
          lokasi_id: string | null
          lokasi_nama: string | null
          luas_lahan_ha: number | null
          pakai_gelang_monitor: boolean | null
          session_id: string | null
          status_keamanan: Database["public"]["Enums"]["security_status"] | null
          status_kesiapan:
            | Database["public"]["Enums"]["readiness_status"]
            | null
          tanggal_sesi: string | null
          terlambat_periksa: boolean | null
          tiba_at: string | null
          tindak_lanjut_terbuka: number | null
          tindak_lanjut_terlambat: number | null
          upt_nama: string | null
          wbp_keluar: number | null
          wbp_kembali: number | null
          wbp_terakhir_dihitung: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_lokasi_id_fkey"
            columns: ["lokasi_id"]
            isOneToOne: false
            referencedRelation: "master_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_sessions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_atur_kata_sandi: {
        Args: { p_password: string; p_user: string }
        Returns: undefined
      }
      admin_atur_kunci_gelang: { Args: { p_hash: string }; Returns: undefined }
      admin_atur_pengaturan: {
        Args: { p_latihan: boolean; p_rekap_jam: number; p_telegram: boolean }
        Returns: undefined
      }
      admin_buat_akun: {
        Args: {
          p_email: string
          p_kanwil: string | null
          p_kode_upt: string | null
          p_nama: string
          p_nip: string | null
          p_password: string
          p_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: string
      }
      admin_daftar_akun: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          kanwil_id: string
          kode_upt: string
          last_sign_in_at: string
          nip: string
          role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      admin_daftar_notif: {
        Args: { p_limit?: number }
        Returns: {
          galat: string
          grup_nama: string
          hasil: string
          id: string
          jenis: string
          kode_http: number
          pesan: string
          waktu: string
        }[]
      }
      admin_hapus_akun: { Args: { p_id: string }; Returns: undefined }
      admin_kirim_rekap_sekarang: { Args: never; Returns: number }
      admin_simpan_token_telegram: {
        Args: { p_token: string }
        Returns: undefined
      }
      admin_status_kunci_gelang: { Args: never; Returns: string }
      admin_status_telegram: { Args: never; Returns: Json }
      admin_tes_telegram: { Args: { p_grup: string }; Returns: string }
      admin_ubah_akun: {
        Args: { p_email: string; p_id: string; p_nama: string }
        Returns: undefined
      }
      daftar_nominatif: {
        Args: { p_session: string }
        Returns: {
          inmate_id: string
          nama: string
          nomor_registrasi: string
        }[]
      }
      indikator_evaluasi: {
        Args: { p_dari: string; p_sampai: string }
        Returns: Json
      }
      konfirmasi_alarm_gelang: {
        Args: { p_id: string; p_status: string; p_tindakan: string }
        Returns: undefined
      }
      pembanding_sesudah: {
        Args: { p_dari: string; p_sampai: string }
        Returns: Json
      }
      rekonsiliasi_sesi: { Args: { p_session: string }; Returns: Json }
      rekap_pangan: {
        Args: { p_dari: string; p_kanwil?: string | null; p_sampai: string; p_upt?: string | null }
        Returns: {
          jenis: Database["public"]["Enums"]["activity_type"]
          jumlah: number
          kanwil_id: string | null
          kanwil_nama: string | null
          komoditas: string
          kode_upt: string | null
          luas_ha: number
          satuan: string
          upt_nama: string | null
          volume: number
        }[]
      }
      terima_alarm_gelang: {
        Args: {
          p_baterai?: string | null
          p_jenis: string
          p_kunci: string
          p_lokasi?: string | null
          p_payload?: Json
          p_unit: string
          p_waktu?: string | null
        }
        Returns: string
      }
      tren_mingguan: {
        Args: { p_dari: string; p_sampai: string }
        Returns: Json
      }
    }
    Enums: {
      activity_type: "Pertanian" | "Peternakan" | "Perikanan"
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
        | "Naikkan status"
        | "Pemeriksaan gelang"
      readiness_status:
        | "Menunggu"
        | "Dapat Dimulai"
        | "Perbaiki Dulu"
        | "Ditunda"
      security_status: "HIJAU" | "KUNING" | "MERAH" | "KRITIS"
      user_role:
        | "operator"
        | "pengawal"
        | "kepala_pengamanan"
        | "administrator"
        | "pemantau_kanwil"
        | "pemantau_pusat"
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
    Enums: {
      activity_type: ["Pertanian", "Peternakan", "Perikanan"],
      log_type: [
        "Serah terima di blok",
        "P2U keluar atau masuk",
        "Tiba di lokasi",
        "Pemeriksaan berkala",
        "Pindah area atau ganti pengawal",
        "Pihak luar dan kendaraan",
        "Pengembalian sebagian",
        "Alarm gelang",
        "Gangguan",
        "Naikkan status",
        "Pemeriksaan gelang",
      ],
      readiness_status: [
        "Menunggu",
        "Dapat Dimulai",
        "Perbaiki Dulu",
        "Ditunda",
      ],
      security_status: ["HIJAU", "KUNING", "MERAH", "KRITIS"],
      user_role: [
        "operator",
        "pengawal",
        "kepala_pengamanan",
        "administrator",
        "pemantau_kanwil",
        "pemantau_pusat",
      ],
    },
  },
} as const
