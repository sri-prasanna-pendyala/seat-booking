const pool = require('../db/pool');

const getShowById = async (showId) => {
  const result = await pool.query(
    'SELECT id, movie_name AS "movieName", show_time AS "showTime" FROM shows WHERE id = $1',
    [showId]
  );
  return result.rows[0] || null;
};

module.exports = { getShowById };
