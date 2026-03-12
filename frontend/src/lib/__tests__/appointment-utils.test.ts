import { deriveLabelFromOptions } from "../appointment-utils"

describe("deriveLabelFromOptions", () => {
  const opts = [
    { value: "a", label: "Alpha" },
    { value: "b", label: "Beta" },
  ]

  it("returns undefined for empty or missing value", () => {
    expect(deriveLabelFromOptions(opts, "")).toBeUndefined()
    expect(deriveLabelFromOptions(opts, undefined)).toBeUndefined()
  })

  it("looks up the matching label", () => {
    expect(deriveLabelFromOptions(opts, "a")).toBe("Alpha")
    expect(deriveLabelFromOptions(opts, "b")).toBe("Beta")
  })

  it("returns undefined when value not in options", () => {
    expect(deriveLabelFromOptions(opts, "z")).toBeUndefined()
  })
})
