/**
 * Maps a UI timeframe string to its corresponding API enum value.
 * @param {string} tf - The timeframe string from the UI (e.g., 'Daily').
 * @returns {string} The API timeframe enum value (e.g., 'DAILY').
 */
export function mapTimeframeToApi(tf) {
  const mapping = {
    Hourly: 'HOURLY',
    Daily: 'DAILY',
    Weekly: 'WEEKLY',
    Monthly: 'MONTHLY',
  };
  return mapping[tf] || 'DAILY';
}
