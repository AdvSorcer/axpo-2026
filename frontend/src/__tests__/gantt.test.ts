import { describe, expect, it } from 'bun:test'

// Core Functions directly extracted for unit testing
function extractDateOnly(str?: string): string {
  if (!str) return ''
  return str.slice(0, 10)
}

function getIssueStartDate(issue: any, todayStr: string): string {
  if (issue.start_date) return extractDateOnly(issue.start_date)
  if (issue.due_date) return extractDateOnly(issue.due_date)
  if (issue.created_at) return extractDateOnly(issue.created_at)
  return todayStr
}

function getIssueEndDate(issue: any, todayStr: string): string {
  if (issue.due_date) return extractDateOnly(issue.due_date)
  return getIssueStartDate(issue, todayStr)
}

function isIssueVisibleInMonth(issue: any, monthStart: string, monthEnd: string, todayStr: string): boolean {
  const issueStart = getIssueStartDate(issue, todayStr)
  const issueEnd = getIssueEndDate(issue, todayStr)
  return issueStart <= monthEnd && issueEnd >= monthStart
}

function calcBarStyle(issue: any, days: { dateStr: string }[], todayStr: string) {
  const totalDays = days.length
  if (totalDays === 0) return { left: '0%', width: '0%' }

  const monthStart = days[0].dateStr
  const monthEnd = days[totalDays - 1].dateStr

  const issueStart = getIssueStartDate(issue, todayStr)
  const issueEnd = getIssueEndDate(issue, todayStr)

  let startIndex = days.findIndex(d => d.dateStr === issueStart)
  let endIndex = days.findIndex(d => d.dateStr === issueEnd)

  if (startIndex === -1) {
    if (issueStart < monthStart) startIndex = 0
    else startIndex = totalDays - 1
  }
  if (endIndex === -1) {
    if (issueEnd > monthEnd) endIndex = totalDays - 1
    else endIndex = startIndex
  }
  if (endIndex < startIndex) endIndex = startIndex

  const leftPercent = (startIndex / totalDays) * 100
  const widthPercent = Math.max(((endIndex - startIndex + 1) / totalDays) * 100, (1 / totalDays) * 100)

  return {
    left: `${leftPercent}%`,
    width: `${widthPercent}%`
  }
}

describe("Frontend Gantt & Timeline Utility Unit Tests", () => {
  const todayStr = '2026-07-25'

  it("extractDateOnly safely strips timestamp and formats YYYY-MM-DD", () => {
    expect(extractDateOnly("2026-07-25 14:30:00")).toBe("2026-07-25")
    expect(extractDateOnly("2026-07-25T14:30:00.000Z")).toBe("2026-07-25")
    expect(extractDateOnly(undefined)).toBe("")
  })

  it("getIssueStartDate correctly resolves fallback order without falling to last day", () => {
    // Explicit start_date
    expect(getIssueStartDate({ start_date: "2026-07-10", due_date: "2026-07-15" }, todayStr)).toBe("2026-07-10")
    
    // No start_date, fallback to due_date
    expect(getIssueStartDate({ due_date: "2026-07-20" }, todayStr)).toBe("2026-07-20")

    // No start_date & due_date, fallback to created_at
    expect(getIssueStartDate({ created_at: "2026-07-22 09:00:00" }, todayStr)).toBe("2026-07-22")

    // No dates at all, fallback to todayStr
    expect(getIssueStartDate({}, todayStr)).toBe(todayStr)
  })

  it("isIssueVisibleInMonth determines month overlap accurately", () => {
    const monthStart = "2026-07-01"
    const monthEnd = "2026-07-31"

    // Inside July
    expect(isIssueVisibleInMonth({ start_date: "2026-07-10", due_date: "2026-07-15" }, monthStart, monthEnd, todayStr)).toBe(true)

    // Overlapping into July
    expect(isIssueVisibleInMonth({ start_date: "2026-06-25", due_date: "2026-07-05" }, monthStart, monthEnd, todayStr)).toBe(true)

    // Entirely in August (Outside July)
    expect(isIssueVisibleInMonth({ start_date: "2026-08-01", due_date: "2026-08-10" }, monthStart, monthEnd, todayStr)).toBe(false)
  })

  it("calcBarStyle computes correct percentage widths for 31-day month grid", () => {
    const mockDays = Array.from({ length: 31 }, (_, i) => {
      const d = String(i + 1).padStart(2, '0')
      return { dateStr: `2026-07-${d}` }
    })

    const issue = { start_date: "2026-07-01", due_date: "2026-07-31" }
    const style = calcBarStyle(issue, mockDays, todayStr)

    expect(style.left).toBe("0%")
    expect(style.width).toBe("100%")
  })
})
