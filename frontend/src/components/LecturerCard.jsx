import React from 'react';
import theme from '../styles/theme';

export default function LecturerCard({ lecturer, onSelect }) {
  const {
    dosen_id,
    nip,
    nama,
    jabatan,
    foto,
    nama_prodi,
    nama_jurusan,
    status_type,
    nama_gedung,
    probabilitas,
  } = lecturer;

  // Status mapping
  const statusConfig = theme.colors.status[status_type] || theme.colors.status.tidak_diketahui;

  return (
    <article
      style={{
        backgroundColor: theme.colors.surfaceContainerLowest,
        borderRadius: theme.borderRadius.default,
        border: `1px solid ${theme.colors.surfaceContainer}`,
        boxShadow: theme.shadows.cardSm,
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      <div>
        {/* Top Header: Avatar & Status Badge */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          {/* Avatar with Status Dot */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: theme.colors.surfaceContainerLow,
                border: `2px solid ${theme.colors.surfaceContainerHigh}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                color: theme.colors.primary,
                fontWeight: 700,
                fontSize: '18px',
              }}
            >
              {foto ? (
                <img src={foto} alt={nama} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>
                  person
                </span>
              )}
            </div>
            {/* Status indicator dot */}
            <span
              style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: statusConfig.dot,
                border: '2px solid #ffffff',
              }}
            />
          </div>

          {/* Status Badge */}
          <div
            style={{
              padding: '0.25rem 0.65rem',
              borderRadius: theme.borderRadius.full,
              backgroundColor: statusConfig.bg,
              border: `1px solid ${statusConfig.border}`,
              color: statusConfig.text,
              fontSize: '16px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            {status_type === 'prediksi' ? (
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                bolt
              </span>
            ) : (
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: statusConfig.dot,
                }}
              />
            )}
            <span>
              {statusConfig.label}
              {status_type === 'prediksi' && probabilitas ? ` ${Math.round(probabilitas)}%` : ''}
            </span>
          </div>
        </div>

        {/* Lecturer Name & Title */}
        <h3
          style={{
            fontSize: '19px',
            fontWeight: 800,
            color: theme.colors.onSurface,
            margin: '0 0 0.25rem 0',
            lineHeight: 1.3,
          }}
        >
          {nama}
        </h3>

        {/* Prodi / Jurusan */}
        <p
          style={{
            fontSize: '16px',
            color: theme.colors.primary,
            fontWeight: 600,
            margin: '0 0 0.25rem 0',
          }}
        >
          {nama_prodi} {nama_jurusan ? `/ ${nama_jurusan}` : ''}
        </p>

        {/* NIP & Jabatan */}
        <p
          style={{
            fontSize: '16px',
            color: theme.colors.outline,
            margin: '0 0 1rem 0',
          }}
        >
          NIP: {nip} • {jabatan || 'Dosen'}
        </p>

        {/* Location info box */}
        <div
          style={{
            backgroundColor: theme.colors.surfaceContainerLow,
            borderRadius: theme.borderRadius.sm,
            padding: '0.65rem 0.75rem',
            marginBottom: '1rem',
            border: `1px solid ${theme.colors.surfaceContainer}`,
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: theme.colors.onSurfaceVariant,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              marginBottom: '0.2rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              near_me
            </span>
            <span>
              {status_type === 'prediksi'
                ? 'Prediksi Lokasi'
                : status_type === 'realtime'
                ? 'Posisi Terkini'
                : 'Status Lokasi'}
            </span>
          </div>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: nama_gedung ? theme.colors.onSurface : theme.colors.outline,
            }}
          >
            {nama_gedung || 'Lokasi Belum Terlacak'}
          </div>
        </div>
      </div>

      {/* Action Button: Detail Profil */}
      <button
        type="button"
        id={`btn-detail-dosen-${dosen_id}`}
        onClick={() => onSelect(lecturer)}
        style={{
          width: '100%',
          padding: '0.65rem 1rem',
          borderRadius: theme.borderRadius.full,
          backgroundColor: theme.colors.surfaceContainerHigh,
          color: theme.colors.primary,
          border: 'none',
          fontSize: '16px',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.35rem',
          transition: 'background-color 0.2s ease',
        }}
      >
        <span>Lihat Detail & Jadwal</span>
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
          arrow_forward
        </span>
      </button>
    </article>
  );
}
