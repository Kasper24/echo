export type TimeUnit = "s" | "m" | "h" | "d" | "w" | "mo" | "y";
export type TimeSpan = `${number}${TimeUnit}`;

const parseTimeSpan = (timeSpan: TimeSpan) => {
  const units: Record<string, number> = {
    s: 1, // seconds
    m: 60, // minutes
    h: 3600, // hours
    d: 86400, // days
    w: 604800, // weeks
  };

  const regex = /(\d+)([smhdw])/g;
  let totalSeconds = 0;
  let match;

  while ((match = regex.exec(timeSpan)) !== null) {
    const value = parseInt(match[1], 10);
    const unit = match[2];

    if (units[unit]) {
      totalSeconds += value * units[unit];
    }
  }

  return totalSeconds;
};

export { parseTimeSpan };
