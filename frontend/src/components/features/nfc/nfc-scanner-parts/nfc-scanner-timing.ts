export function getAverageKeystrokeInterval(timestamps: number[]) {
  if (timestamps.length < 2) {
    return 0
  }

  const intervals: number[] = []
  for (let index = 1; index < timestamps.length; index++) {
    intervals.push(timestamps[index] - timestamps[index - 1])
  }

  return intervals.reduce((total, interval) => total + interval, 0) / intervals.length
}
