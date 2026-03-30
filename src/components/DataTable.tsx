import { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface DataTableProps {
    data: any[];
}

export default function DataTableComponent({ data }: DataTableProps) {
    const [filterText, setFilterText] = useState('');

    const columns = useMemo(() => {
        if (data.length === 0) return [];

        // Collect all unique keys from top-level objects
        const keySet = new Set<string>();
        const rowsToInspect = Math.min(data.length, 1000);
        for (let i = 0; i < rowsToInspect; i++) {
            if (typeof data[i] === 'object' && data[i] !== null) {
                Object.keys(data[i]).forEach(k => keySet.add(k));
            }
        }
        return Array.from(keySet);
    }, [data]);

    const filteredData = useMemo(() => {
        if (!filterText) return data;
        const lowerFilter = filterText.toLowerCase();

        return data.filter(row => {
            return Object.values(row).some(
                val => val !== null && val !== undefined && val.toString().toLowerCase().includes(lowerFilter)
            );
        });
    }, [data, filterText]);

    if (data.length === 0) {
        return <div className="p-8 text-center text-muted-foreground">No data available.</div>;
    }

    // To prevent freezing on strictly huge arrays rendering directly to DOM, we truncate the view
    const displayData = filteredData.slice(0, 500);

    const handleExportCsv = () => {
        if (columns.length === 0 || displayData.length === 0) return;

        const escapeCsvValue = (value: unknown) => {
            let normalized = '';
            if (value !== null && value !== undefined) {
                normalized = typeof value === 'object' ? JSON.stringify(value) : String(value);
            }

            if (/[,"\n\r]/.test(normalized)) {
                return `"${normalized.replace(/"/g, '""')}"`;
            }

            return normalized;
        };

        const headerRow = columns.map(escapeCsvValue).join(',');
        const dataRows = displayData.map((row) =>
            columns.map((col) => escapeCsvValue(row[col])).join(',')
        );
        const csv = [headerRow, ...dataRows].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'raw-table-export.csv';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="flex items-center justify-between p-4 border-b bg-card gap-4">
                <div className="relative w-full max-w-sm flex items-center">
                    <Search className="absolute left-3 text-muted-foreground" size={16} />
                    <Input
                        placeholder="Filter all columns..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="pl-9 w-full bg-background"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                        Showing <span className="font-medium text-foreground">{displayData.length}</span> of <span className="font-medium text-foreground">{filteredData.length}</span> rows
                        {filteredData.length > 500 && " (Limit 500 max rendered)"}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={handleExportCsv}
                        disabled={displayData.length === 0 || columns.length === 0}
                    >
                        <Download size={14} /> Export CSV
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <Table>
                    <TableHeader className="sticky top-0 bg-secondary/80 backdrop-blur shadow-sm z-10">
                        <TableRow className="hover:bg-transparent border-border">
                            {columns.map(col => (
                                <TableHead key={col} className="font-semibold text-foreground whitespace-nowrap border-r border-border/50 last:border-r-0">
                                    {col}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {displayData.map((row, idx) => (
                            <TableRow key={idx} className="border-border hover:bg-muted/50 transition-colors">
                                {columns.map(col => {
                                    let val = row[col];
                                    if (typeof val === 'object' && val !== null) {
                                        val = JSON.stringify(val);
                                    }
                                    return (
                                        <TableCell key={col} className="whitespace-nowrap max-w-[300px] truncate border-r border-border/50 last:border-r-0 text-muted-foreground">
                                            {val?.toString() || ''}
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        ))}
                        {displayData.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                                    No matching results found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
