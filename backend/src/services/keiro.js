const axios = require('axios');

const keiroSearch = async (query, maxResults = 3) => {
  try {
    const response = await axios.post(
      'https://kierolabs.space/api/v2/search/content',
      { query, maxResults },
      {
        headers: {
          Authorization: `Bearer ${process.env.KEIRO_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (err) {
    console.error('Keiro API error:', err.message);
    return null;
  }
};

module.exports = { keiroSearch };
