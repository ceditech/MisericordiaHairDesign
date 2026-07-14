function parseMaxDurationHours(duration) {
    if (!duration) return 4; // default
    
    // Extract largest number. E.g. "4-5 hours" -> 5. "90 mins" -> 90.
    const match = duration.match(/\d+(\.\d+)?/g);
    if (!match) return 4;
    let val = parseFloat(match[match.length - 1]);
    
    // Check if it's in minutes
    if (duration.toLowerCase().includes("min")) {
        return val / 60;
    }
    
    return val;
}

function generateSlots(maxDurationHours, selectedDateStr, existingBookings = [], allStyles = []) {
    const OPEN_HOUR = 9;   // 9:00 AM
    const CLOSE_HOUR = 21; // 9:00 PM

    const startMinutes = OPEN_HOUR * 60;
    const endMinutes = CLOSE_HOUR * 60;
    const lastPossibleStartMinutes = endMinutes - (maxDurationHours * 60);

    const slots = [];
    const now = new Date();
    // Simulate isToday = false
    const isToday = false; 

    const timeToMinutes = (timeStr) => {
        if (!timeStr) return 0;
        const [time, period] = timeStr.split(" ");
        let [hStr, mStr] = time.split(":");
        let h = parseInt(hStr, 10);
        let m = parseInt(mStr, 10);
        if (period === "PM" && h < 12) h += 12;
        if (period === "AM" && h === 12) h = 0;
        return h * 60 + m;
    };

    const occupiedRanges = (existingBookings || []).map(b => {
        if (!b.time) return null;
        const start = timeToMinutes(b.time);
        const style = allStyles.find(s => s.id === b.styleId || s.name === b.styleName);
        const durationHours = style ? parseMaxDurationHours(style.duration) : 4;
        return { start, end: start + (durationHours * 60) };
    }).filter(Boolean);

    for (let current = startMinutes; current <= lastPossibleStartMinutes; current += 30) {
        if (isToday) {
            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            if (current <= nowMinutes) continue;
        }

        const slotEnd = current + (maxDurationHours * 60);
        const hasOverlap = occupiedRanges.some(range => {
            return Math.max(current, range.start) < Math.min(slotEnd, range.end);
        });

        if (hasOverlap) continue;

        const h = Math.floor(current / 60);
        const m = current % 60;
        const suffix = h < 12 ? "AM" : "PM";
        const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
        const displayMin = m === 0 ? "00" : "30";
        slots.push(`${displayHour}:${displayMin} ${suffix}`);
    }

    return slots;
}

console.log("Slots for 4 hours:", generateSlots(4, "2026-10-10"));
console.log("Slots for 6 hours:", generateSlots(6, "2026-10-10"));
console.log("Slots for 12 hours:", generateSlots(12, "2026-10-10"));
