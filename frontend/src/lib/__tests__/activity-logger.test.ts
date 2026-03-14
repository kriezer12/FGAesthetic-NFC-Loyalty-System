import { calculateChanges } from "../activity-logger"

describe("calculateChanges", () => {
  it("returns empty object when nothing changed", () => {
    const before = { a: 1, b: { x: 2 } }
    const after = { a: 1, b: { x: 2 } }
    expect(calculateChanges(before, after)).toEqual({})
  })

  it("detects primitive changes", () => {
    const before = { a: 1 }
    const after = { a: 2 }
    expect(calculateChanges(before, after)).toEqual({
      a: { before: 1, after: 2 },
    })
  })

  it("detects added and removed keys", () => {
    const before = { foo: "bar" }
    const after = { foo: "bar", baz: 123 }
    expect(calculateChanges(before, after)).toEqual({
      baz: { before: undefined, after: 123 },
    })
  })
})