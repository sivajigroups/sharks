export const getNextMidnightTimestamp = () => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0); // Set to next midnight (00:00:00 of tomorrow)
  return midnight.getTime();
};
