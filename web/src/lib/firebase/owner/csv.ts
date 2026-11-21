import { format } from "date-fns";

// --- Export Utility ---

export function exportToCSV(data: Array<Record<string, unknown>>, filename: string) {
    if (!data || !data.length) return;
    
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(obj => 
        Object.values(obj).map(val => 
            typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
        ).join(",")
    );
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
