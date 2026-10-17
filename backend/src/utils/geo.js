/**
 * Utilitas geolokasi sisi server.
 *
 * Dipakai oleh endpoint kiriman lokasi dari Aplikasi Dosen untuk menentukan
 * gedung terdekat (geofence) dari titik GPS yang dikirim. Aplikasi TIDAK
 * perlu menentukan gedung sendiri — cukup mengirim latitude & longitude.
 *
 * Rumus Haversine dengan jari-jari bumi 6.371.000 meter.
 */

const EARTH_RADIUS_M = 6371000;

/**
 * Jarak dua titik koordinat dalam meter (formula Haversine).
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} jarak dalam meter
 */
const haversine = (lat1, lon1, lat2, lon2) => {
  const toRad = (deg) => (Number(deg) * Math.PI) / 180;

  const dLat = toRad(lat2) - toRad(lat1);
  const dLon = toRad(lon2) - toRad(lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
};

/**
 * Cari gedung terdekat dari sebuah titik, selama berada di dalam radius_meter.
 * @param {Array<{id:number,nama_gedung:string,latitude:number,longitude:number,radius_meter:number}>} gedungs
 * @param {number} latitude
 * @param {number} longitude
 * @returns {{gedung:object|null, jarak_meter:number|null}}
 */
const findNearestGedung = (gedungs, latitude, longitude) => {
  let best = null;
  let bestDistance = null;

  gedungs.forEach((g) => {
    const jarak = haversine(latitude, longitude, g.latitude, g.longitude);
    // Sedekati yang masih di dalam radius geofence gedung tersebut
    if (jarak <= Number(g.radius_meter)) {
      if (best === null || jarak < bestDistance) {
        best = g;
        bestDistance = jarak;
      }
    }
  });

  return { gedung: best, jarak_meter: bestDistance };
};

module.exports = {
  haversine,
  findNearestGedung,
};