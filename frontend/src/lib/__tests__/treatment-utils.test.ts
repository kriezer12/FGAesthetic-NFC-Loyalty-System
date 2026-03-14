import { validateTreatments } from "../treatment-utils"

describe("validateTreatments", () => {
  const base = (id: string, total: number, used: number) => ({
    id,
    name: "foo",
    total_sessions: total,
    used_sessions: used,
    remaining_sessions: total - used,
  })

  it("passes valid data", () => {
    const { valid, errors } = validateTreatments([base("1", 5, 2)])
    expect(valid).toBe(true)
    expect(errors).toEqual({})
  })

  it("detects negative remaining", () => {
    const t = { ...base("1", 5, 2), remaining_sessions: -1 }
    const { valid, errors } = validateTreatments([t])
    expect(valid).toBe(false)
    expect(errors["1"]).toMatch(/negative/)
  })

  it("detects remaining greater than total", () => {
    const t = { ...base("1", 5, 2), remaining_sessions: 6 }
    const { valid, errors } = validateTreatments([t])
    expect(valid).toBe(false)
    expect(errors["1"]).toMatch(/exceed total/)
  })
})