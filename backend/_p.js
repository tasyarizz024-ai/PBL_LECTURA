
require('dotenv').config();const {pool}=require('./src/config/db');
(async()=>{
for(const t of ['jurusan','prodi']){const [r]=await pool.query("SHOW INDEX FROM "+t+" WHERE Non_unique=0");console.log(t, r.map(x=>x.Key_name+':'+x.Column_name).join(', '));}
process.exit(0);})();
