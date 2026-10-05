"""
train_model.py — Training model prediksi lokasi dosen dari location_logs.

Alur:
  1. Baca location_logs dari MySQL (lectura_db).
  2. Fitur: hari (0=Senin..6=Minggu), jam (slot 1 jam: 0-23), dosen_id.
  3. Target: gedung_id.
  4. Train 1 DecisionTreeClassifier per dosen (min 5 baris data).
  5. Untuk tiap kombinasi (hari, jam) yang punya >= 2 baris, hitung
     predict_proba, ambil gedung dengan probabilitas tertinggi.
  6. UPSERT ke tabel habit_summary.

Jalankan manual:  python train_model.py
"""

import os
import sys
import pandas as pd
import mysql.connector
from sklearn.tree import DecisionTreeClassifier

# --- Konfigurasi koneksi (bisa dioverride via env) ---
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "lectura_db"),
    "port": int(os.getenv("DB_PORT", "3306")),
}

HARI_ENUM = ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"]
MIN_ROWS_PER_DOSEN = 5
MIN_ROWS_PER_SLOT = 2


def load_data() -> pd.DataFrame:
    conn = mysql.connector.connect(**DB_CONFIG)
    try:
        df = pd.read_sql(
            "SELECT dosen_id, gedung_id, recorded_at FROM location_logs", conn
        )
    finally:
        conn.close()

    df["recorded_at"] = pd.to_datetime(df["recorded_at"])
    df["hari"] = df["recorded_at"].dt.dayofweek          # 0=Senin .. 6=Minggu
    df["jam"] = df["recorded_at"].dt.hour                 # slot 1 jam
    return df


def train_and_summarize(df: pd.DataFrame) -> list[dict]:
    results = []
    for dosen_id, g in df.groupby("dosen_id"):
        if len(g) < MIN_ROWS_PER_DOSEN:
            print(f"[skip] dosen {dosen_id}: hanya {len(g)} baris (< {MIN_ROWS_PER_DOSEN})")
            continue

        X = g[["hari", "jam", "dosen_id"]]
        y = g["gedung_id"]
        model = DecisionTreeClassifier(max_depth=6, random_state=42)
        model.fit(X, y)
        print(f"[train] dosen {dosen_id}: {len(g)} baris, akurasi train "
              f"{model.score(X, y):.2f}, {y.nunique()} gedung")

        for (hari, jam), slot in g.groupby(["hari", "jam"]):
            if len(slot) < MIN_ROWS_PER_SLOT:
                continue
            proba = model.predict_proba(pd.DataFrame([[hari, jam, dosen_id]], columns=X.columns))[0]
            best_idx = proba.argmax()
            results.append({
                "dosen_id": int(dosen_id),
                "hari": HARI_ENUM[hari],
                "jam_mulai": f"{jam:02d}:00:00",
                "jam_selesai": f"{(jam + 1) % 24:02d}:00:00",
                "gedung_id": int(model.classes_[best_idx]),
                "probabilitas": round(float(proba[best_idx]) * 100, 2),
            })
    return results


def upsert_habit_summary(rows: list[dict]) -> None:
    if not rows:
        print("Tidak ada hasil untuk di-upsert.")
        return
    conn = mysql.connector.connect(**DB_CONFIG)
    try:
        cur = conn.cursor()
        sql = """
            INSERT INTO habit_summary
              (dosen_id, hari, jam_mulai, jam_selesai, gedung_id, probabilitas)
            VALUES (%(dosen_id)s, %(hari)s, %(jam_mulai)s, %(jam_selesai)s,
                    %(gedung_id)s, %(probabilitas)s)
            ON DUPLICATE KEY UPDATE
              jam_selesai = VALUES(jam_selesai),
              gedung_id   = VALUES(gedung_id),
              probabilitas = VALUES(probabilitas)
        """
        cur.executemany(sql, rows)
        conn.commit()
        print(f"UPSERT {cur.rowcount} baris ke habit_summary.")
    finally:
        conn.close()


def main():
    df = load_data()
    print(f"Total data location_logs: {len(df)} baris, {df['dosen_id'].nunique()} dosen")
    rows = train_and_summarize(df)
    print(f"Total slot kebiasaan terdeteksi: {len(rows)}")
    upsert_habit_summary(rows)


if __name__ == "__main__":
    main()
