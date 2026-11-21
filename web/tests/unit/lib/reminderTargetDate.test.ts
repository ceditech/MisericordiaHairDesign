import { describe, it, expect } from "vitest";
import { reminderTargetDate, dateInTimeZone, BUSINESS_TIME_ZONE } from "@/src/lib/reminders/targetDate";

describe("reminderTargetDate (America/Chicago)", () => {
    it("uses the salon's date, not the server's: 8 pm Central is already the next day in UTC", () => {
        // 2026-06-10 20:00 CDT = 2026-06-11 01:00 UTC. In UTC, "tomorrow" would be the 12th.
        expect(reminderTargetDate(new Date("2026-06-11T01:00:00Z"))).toBe("2026-06-11");
    });

    it("is the next day in the morning", () => {
        // 2026-06-10 08:00 CDT = 13:00 UTC
        expect(reminderTargetDate(new Date("2026-06-10T13:00:00Z"))).toBe("2026-06-11");
    });

    it("rolls over month and year ends", () => {
        expect(reminderTargetDate(new Date("2026-12-31T18:00:00Z"))).toBe("2027-01-01");
        expect(reminderTargetDate(new Date("2026-02-28T18:00:00Z"))).toBe("2026-03-01");
    });

    it("is correct the evening before the spring-forward day (2026-03-08)", () => {
        // 2026-03-07 23:30 CST = 2026-03-08 05:30 UTC; tomorrow is the 8th, not the 9th.
        expect(reminderTargetDate(new Date("2026-03-08T05:30:00Z"))).toBe("2026-03-08");
    });

    it("is correct the evening before the fall-back day (2026-11-01)", () => {
        // 2026-10-31 23:30 CDT = 2026-11-01 04:30 UTC
        expect(reminderTargetDate(new Date("2026-11-01T04:30:00Z"))).toBe("2026-11-01");
    });

    it("honors another time zone", () => {
        expect(reminderTargetDate(new Date("2026-06-11T01:00:00Z"), "UTC")).toBe("2026-06-12");
    });
});

describe("dateInTimeZone", () => {
    it("formats yyyy-MM-dd in the business zone", () => {
        expect(BUSINESS_TIME_ZONE).toBe("America/Chicago");
        expect(dateInTimeZone(new Date("2026-06-11T01:00:00Z"))).toBe("2026-06-10");
    });
});
