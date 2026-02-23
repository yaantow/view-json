import { useState } from 'react';
import { LayoutDashboard, Table as TableIcon, RefreshCw } from 'lucide-react';
import FileUploader from './components/FileUploader';
import DataTableComponent from './components/DataTable';
import PivotView from './components/PivotView';
import TransformDialog from './components/TransformDialog';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

export default function App() {
  const [data, setData] = useState<any[] | null>(null);

  const handleDataLoaded = (parsedData: any[]) => {
    setData(parsedData);
  };

  const handleReset = () => {
    setData(null);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <header className="flex items-center justify-between px-6 py-4 border-b bg-card z-10">
        <div className="flex items-center gap-3 text-xl font-bold font-['Outfit']">
          <LayoutDashboard className="text-primary" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
            JSON Viewer
          </span>
        </div>
        {data && (
          <div className="flex items-center gap-3">
            <TransformDialog data={data} onTransformData={setData} />
            <Button variant="outline" onClick={handleReset} size="sm" className="gap-2">
              <RefreshCw size={14} /> Load New File
            </Button>
          </div>
        )}
      </header>

      {!data ? (
        <main className="flex-1 flex items-center justify-center p-6 bg-muted/20">
          <FileUploader onDataLoaded={handleDataLoaded} />
        </main>
      ) : (
        <main className="flex-1 flex flex-col min-h-0 relative">
          <Tabs defaultValue="raw" className="flex flex-col h-full w-full">
            <div className="px-6 py-2 border-b bg-card">
              <TabsList className="bg-muted">
                <TabsTrigger value="raw" className="gap-2 data-[state=active]:bg-background data-[state=active]:text-primary">
                  <TableIcon size={14} />Raw Data Table
                </TabsTrigger>
                <TabsTrigger value="pivot" className="gap-2 data-[state=active]:bg-background data-[state=active]:text-primary">
                  <LayoutDashboard size={14} />Pivot Table
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="raw" className="flex-1 min-h-0 m-0 data-[state=active]:flex flex-col">
              <DataTableComponent data={data} />
            </TabsContent>

            <TabsContent value="pivot" className="flex-1 min-h-0 m-0 data-[state=active]:block overflow-auto relative">
              <PivotView data={data} />
            </TabsContent>
          </Tabs>
        </main>
      )}
    </div>
  );
}
