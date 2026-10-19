const getProdiScope = (user, prodiAlias = 'p', jurusanAlias = 'j') => {
  if (user?.role === 'superadmin') return { sql: '1=1', params: [] };
  if (!user?.campus_id) return { sql: '1=0', params: [] };
  if (user.role === 'admin_prodi' && user.managed_prodi_id) {
    return {
      sql: `${prodiAlias}.id = ? AND ${jurusanAlias}.campus_id = ?`,
      params: [user.managed_prodi_id, user.campus_id],
    };
  }
  if (user.role === 'admin_prodi' && user.managed_jurusan_id) {
    return { sql: `${jurusanAlias}.id = ? AND ${jurusanAlias}.campus_id = ?`, params: [user.managed_jurusan_id, user.campus_id] };
  }
  if (user.role === 'admin_prodi') return { sql: '1=0', params: [] };
  return { sql: `${jurusanAlias}.campus_id = ?`, params: [user.campus_id] };
};

const getCampusScope = (user, alias = 'c') => {
  if (user?.role === 'superadmin') return { sql: '1=1', params: [] };
  if (!user?.campus_id) return { sql: '1=0', params: [] };
  return { sql: `${alias}.campus_id = ?`, params: [user.campus_id] };
};

const getTenantViewScope = (user, alias = '') => {
  const column = (name) => alias ? `${alias}.${name}` : name;
  if (user?.role === 'superadmin') return { sql: '1=1', params: [] };
  if (!user?.campus_id) return { sql: '1=0', params: [] };
  if (user.role === 'admin_prodi' && user.managed_prodi_id) {
    return {
      sql: `${column('prodi_id')} = ? AND ${column('campus_id')} = ?`,
      params: [user.managed_prodi_id, user.campus_id],
    };
  }
  if (user.role === 'admin_prodi' && user.managed_jurusan_id) {
    return {
      sql: `${column('prodi_id')} IN (SELECT id FROM prodi WHERE jurusan_id = ?)
        AND ${column('campus_id')} = ?`,
      params: [user.managed_jurusan_id, user.campus_id],
    };
  }
  if (user.role === 'admin_prodi') return { sql: '1=0', params: [] };
  return { sql: `${column('campus_id')} = ?`, params: [user.campus_id] };
};

module.exports = { getProdiScope, getCampusScope, getTenantViewScope };
