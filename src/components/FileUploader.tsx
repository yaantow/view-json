import React, { useCallback, useState } from 'react';
import { UploadCloud, FileJson, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface FileUploaderProps {
    onDataLoaded: (data: any[]) => void;
}

export default function FileUploader({ onDataLoaded }: FileUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const processFile = (file: File) => {
        if (!file.name.endsWith('.json')) {
            setError('Please upload a valid JSON file.');
            return;
        }

        setError(null);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const parsed = JSON.parse(content);

                let flattenedData: any[] = [];
                if (Array.isArray(parsed)) {
                    flattenedData = parsed;
                } else if (typeof parsed === 'object' && parsed !== null) {
                    const arrays = Object.values(parsed).filter(val => Array.isArray(val));
                    if (arrays.length > 0) {
                        flattenedData = arrays[0] as any[];
                    } else {
                        flattenedData = [parsed];
                    }
                } else {
                    throw new Error("JSON must contain an object or array of objects.");
                }

                onDataLoaded(flattenedData);
            } catch (err) {
                setError('Error parsing JSON. Check console for details.');
                console.error(err);
            }
        };
        reader.readAsText(file);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFile(e.dataTransfer.files[0]);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processFile(e.target.files[0]);
        }
    };

    return (
        <Card className="w-full max-w-2xl border-dashed border-2 bg-card transition-all duration-300 hover:border-primary/50 group">
            <CardContent className="p-0">
                <label
                    className={`flex flex-col items-center justify-center w-full h-80 rounded-xl cursor-pointer transition-colors ${isDragging ? 'bg-primary/5 border-primary' : 'bg-card'}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                        <div className={`p-4 rounded-full mb-4 transition-colors ${isDragging ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}`}>
                            <UploadCloud size={48} />
                        </div>
                        <h2 className="mb-2 text-2xl font-semibold text-foreground tracking-tight">
                            Drop your JSON file here
                        </h2>
                        <p className="mb-6-8 text-sm text-muted-foreground max-w-sm">
                            Drag & drop a `.json` file containing an array of objects or click to browse from your computer
                        </p>

                        {error && (
                            <div className="mt-4 flex items-center gap-2 text-destructive bg-destructive/10 px-4 py-2 rounded-md font-medium text-sm">
                                <AlertCircle size={16} /> {error}
                            </div>
                        )}

                        <div className="mt-8 flex items-center gap-2 text-muted-foreground text-xs font-medium bg-muted px-3 py-1.5 rounded-full">
                            <FileJson size={14} className="text-primary" />
                            Supports large arrays and nested object arrays
                        </div>
                    </div>
                    <input
                        type="file"
                        accept=".json,application/json"
                        onChange={handleFileInput}
                        className="hidden"
                    />
                </label>
            </CardContent>
        </Card>
    );
}
