const MORNING_END = 12
const AFTERNOON_END = 18

export function timeOfDayGreeting(now: Date = new Date()): string {
  const hour = now.getHours()
  if (hour < MORNING_END) return "Good morning"
  if (hour < AFTERNOON_END) return "Good afternoon"
  return "Good evening"
}

export function greetingFor(
  username: string | null | undefined,
  now: Date = new Date()
): string {
  const greeting = timeOfDayGreeting(now)
  const firstName = (username ?? "").trim().split(/\s+/)[0] ?? ""
  return firstName === "" ? greeting : `${greeting}, ${firstName}`
}
