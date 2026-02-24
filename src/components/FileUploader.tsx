import React, { useCallback, useState } from 'react';
import { UploadCloud, FileJson, AlertCircle, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface FileUploaderProps {
    onDataLoaded: (data: any[]) => void;
}

export default function FileUploader({ onDataLoaded }: FileUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pasteContent, setPasteContent] = useState('');

    const processJSONContent = (content: string) => {
        try {
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

            setError(null);

            try {
                localStorage.setItem('json_viewer_data', JSON.stringify(flattenedData));
            } catch (storageErr) {
                console.warn("Could not save to localStorage (likely exceeded quota), but data is loaded.", storageErr);
            }

            onDataLoaded(flattenedData);
        } catch (err: any) {
            let errorMessage = 'Error parsing JSON. Check console for details.';
            if (err instanceof Error) {
                errorMessage = `Error parsing JSON: ${err.message}`;

                // Try to extract line number from position (e.g., Chrome/Node "position 123")
                const match = err.message.match(/position (\d+)/);
                if (match) {
                    const position = parseInt(match[1], 10);
                    const lines = content.slice(0, position).split('\n');
                    const lineNumber = lines.length;
                    errorMessage = `Error parsing JSON: ${err.message} (Around Line ${lineNumber})`;
                }
            }
            setError(errorMessage);
            console.error(err);
        }
    };

    const processFile = (file: File) => {
        if (!file.name.endsWith('.json')) {
            setError('Please upload a valid JSON file.');
            return;
        }

        setError(null);
        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target?.result) {
                processJSONContent(e.target.result as string);
            }
        };
        reader.readAsText(file);
    };

    const handlePasteSubmit = () => {
        if (!pasteContent.trim()) {
            setError('Please paste some JSON content.');
            return;
        }
        processJSONContent(pasteContent);
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
        <Card className="w-full max-w-2xl bg-card shadow-sm border transition-all duration-300">
            <CardContent className="p-6">
                <Tabs defaultValue="upload" className="w-full" onValueChange={() => setError(null)}>
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="upload" className="gap-2"><UploadCloud size={16} /> Upload File</TabsTrigger>
                        <TabsTrigger value="paste" className="gap-2"><FileText size={16} /> Paste JSON</TabsTrigger>
                    </TabsList>

                    <TabsContent value="upload" className="m-0">
                        <label
                            className={`flex flex-col items-center justify-center w-full h-72 rounded-xl cursor-pointer transition-colors border-2 border-dashed ${isDragging ? 'bg-primary/5 border-primary' : 'bg-muted/30 hover:bg-muted/50 border-border hover:border-primary/50'}`}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                        >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                                <div className={`p-4 rounded-full mb-4 transition-colors ${isDragging ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
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
                    </TabsContent>

                    <TabsContent value="paste" className="m-0 flex flex-col gap-4">
                        <div className="relative">
                            <Textarea
                                placeholder="Paste your JSON array or object here..."
                                className="min-h-[288px] font-mono text-sm resize-none focus-visible:ring-1"
                                value={pasteContent}
                                onChange={(e) => setPasteContent(e.target.value)}
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-destructive bg-destructive/10 px-4 py-2 rounded-md font-medium text-sm">
                                <AlertCircle size={16} /> {error}
                            </div>
                        )}

                        <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium bg-muted px-3 py-1.5 rounded-full">
                                <FileJson size={14} className="text-primary" />
                                Validates and formats on load
                            </div>
                            <Button onClick={handlePasteSubmit} className="gap-2">
                                <FileText size={16} /> Load JSON
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
