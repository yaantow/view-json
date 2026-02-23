import { useState, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { SplitSquareHorizontal } from 'lucide-react';

interface TransformDialogProps {
    data: any[];
    onTransformData: (newData: any[]) => void;
}

export default function TransformDialog({ data, onTransformData }: TransformDialogProps) {
    const [open, setOpen] = useState(false);
    const [selectedColumn, setSelectedColumn] = useState('');
    const [delimiter, setDelimiter] = useState('-');
    const [partIndex, setPartIndex] = useState('0');
    const [newColumnName, setNewColumnName] = useState('');

    // Extract string columns that can reasonably be split
    const availableColumns = useMemo(() => {
        if (!data || data.length === 0) return [];

        const keySet = new Set<string>();
        const rowsToInspect = Math.min(data.length, 500);
        for (let i = 0; i < rowsToInspect; i++) {
            if (typeof data[i] === 'object' && data[i] !== null) {
                Object.keys(data[i]).forEach(k => {
                    // We only suggest columns that have at least some string values
                    if (typeof data[i][k] === 'string') {
                        keySet.add(k);
                    }
                });
            }
        }
        return Array.from(keySet).sort();
    }, [data]);

    const handleTransform = () => {
        if (!selectedColumn || !delimiter || !newColumnName) return;

        const idx = parseInt(partIndex, 10);
        if (isNaN(idx) || idx < 0) return;

        // Create a new data array with the transformed column
        const transformedData = data.map(row => {
            const val = row[selectedColumn];
            let newPart = '';

            if (typeof val === 'string') {
                const parts = val.split(delimiter);
                // If the requested index exists, take it, otherwise default to empty or the whole string based on preference
                if (idx < parts.length) {
                    newPart = parts[idx].trim();
                }
            }

            return {
                ...row,
                [newColumnName]: newPart
            };
        });

        onTransformData(transformedData);
        setOpen(false);

        // Reset form
        setSelectedColumn('');
        setDelimiter('-');
        setPartIndex('0');
        setNewColumnName('');
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <SplitSquareHorizontal size={14} /> Transform Column
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Transform Column Data</DialogTitle>
                    <DialogDescription>
                        Split an existing string column by a delimiter and extract a part to create a new grouped column.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="target-col" className="text-right">
                            Column
                        </Label>
                        <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                            <SelectTrigger className="col-span-3" id="target-col">
                                <SelectValue placeholder="Select column to split..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableColumns.map(col => (
                                    <SelectItem key={col} value={col}>{col}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="delimiter" className="text-right">
                            Delimiter
                        </Label>
                        <Input
                            id="delimiter"
                            value={delimiter}
                            onChange={(e) => setDelimiter(e.target.value)}
                            className="col-span-3 font-mono"
                            placeholder="e.g. -"
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="part-index" className="text-right">
                            Part Index
                        </Label>
                        <div className="col-span-3">
                            <Input
                                id="part-index"
                                type="number"
                                min="0"
                                value={partIndex}
                                onChange={(e) => setPartIndex(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                0 = first part, 1 = second part, etc.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="new-col" className="text-right">
                            New Name
                        </Label>
                        <Input
                            id="new-col"
                            value={newColumnName}
                            onChange={(e) => setNewColumnName(e.target.value)}
                            className="col-span-3"
                            placeholder="e.g. location_group"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" onClick={handleTransform} disabled={!selectedColumn || !delimiter || !newColumnName}>
                        Apply Transformation
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
