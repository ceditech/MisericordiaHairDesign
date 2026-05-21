/**
 * Simple client-side ICS generator
 */
interface IcsOptions {
    title: string;
    description: string;
    location: string;
    startISO: string; // ISO string for the appointment date/time
    durationMins: number;
}

export function buildIcs({ title, description, location, startISO, durationMins }: IcsOptions): string {
    const startDate = new Date(startISO);
    const endDate = new Date(startDate.getTime() + durationMins * 60 * 1000);

    const formatDate = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const stamp = formatDate(new Date());
    const start = formatDate(startDate);
    const end = formatDate(endDate);

    // Escape basic chars for ICS
    const escape = (str: string) => str.replace(/[,;]/g, '\\$&').replace(/\n/g, '\\n');

    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Dedes Braids//Booking System//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `DTSTAMP:${stamp}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${escape(title)}`,
        `DESCRIPTION:${escape(description)}`,
        `LOCATION:${escape(location)}`,
        `UID:${stamp}-${Math.random().toString(36).substring(2)}@dedesbraids.com`,
        'STATUS:CONFIRMED',
        'SEQUENCE:0',
        'BEGIN:VALARM',
        'TRIGGER:-PT24H',
        'ACTION:DISPLAY',
        'DESCRIPTION:Remainder: Braiding Appointment tomorrow',
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');
}

export function downloadIcs(filename: string, content: string) {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
