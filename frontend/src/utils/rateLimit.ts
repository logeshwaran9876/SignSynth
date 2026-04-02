export function checkRateLimit(): boolean {
  const maxVideosPerHour = parseInt(import.meta.env.VITE_MAX_VIDEOS_PER_HOUR || "5", 10);
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  let requestLogs: number[] = [];

  const storedLogs = localStorage.getItem("signsynth_rate_limit");
  if (storedLogs) {
    try {
      requestLogs = JSON.parse(storedLogs);
    } catch (e) {
      requestLogs = [];
    }
  }

  // Filter out timestamps older than 1 hour
  requestLogs = requestLogs.filter((timestamp) => now - timestamp < oneHour);

  if (requestLogs.length >= maxVideosPerHour) {
    return false; // Rate limit exceeded
  }

  return true; // OK
}

export function logVideoGeneration() {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  let requestLogs: number[] = [];

  const storedLogs = localStorage.getItem("signsynth_rate_limit");
  if (storedLogs) {
    try {
      requestLogs = JSON.parse(storedLogs);
    } catch (e) {
      requestLogs = [];
    }
  }

  requestLogs = requestLogs.filter((timestamp) => now - timestamp < oneHour);
  requestLogs.push(now);

  localStorage.setItem("signsynth_rate_limit", JSON.stringify(requestLogs));
}
