import { useState, useEffect } from 'react';
import { LayoutDashboard, Table as TableIcon, RefreshCw, Map as MapIcon } from 'lucide-react';
import { get, set, del } from 'idb-keyval';
import FileUploader from './components/FileUploader';
import DataTableComponent from './components/DataTable';
import PivotView from './components/PivotView';
import TransformDialog from './components/TransformDialog';
import MapView from './components/MapView';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function App() {
  const [data, setData] = useState<any[] | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const saved = await get('json_viewer_data');
        if (saved) {
          setData(saved);
        }
      } catch (e) {
        console.error("Failed to load saved data from IndexedDB", e);
      } finally {
        setIsDataLoaded(true);
      }
    }
    loadData();
  }, []);

  const [mapboxToken, setMapboxToken] = useState<string | null>(() => {
    return localStorage.getItem('mapbox_token') || null;
  });
  const [tempToken, setTempToken] = useState('');

  const hasCoordinates = data?.some(
    (item) => item.latitude && item.longitude && !isNaN(Number(item.latitude)) && !isNaN(Number(item.longitude))
  );

  const handleDataLoaded = async (parsedData: any[]) => {
    setData(parsedData);
    try {
      await set('json_viewer_data', parsedData);
    } catch (e) {
      console.warn("Could not save to IndexedDB", e);
    }
  };

  const handleReset = () => {
    setData(null);
  };

  const handleClearLocalData = async () => {
    try {
      await del('json_viewer_data');
    } catch (e) {
      console.error("Failed to clear IndexedDB", e);
    }
    localStorage.removeItem('mapbox_token');
    setData(null);
    setMapboxToken(null);
  };

  const handleSaveToken = () => {
    if (tempToken.trim()) {
      localStorage.setItem('mapbox_token', tempToken.trim());
      setMapboxToken(tempToken.trim());
    }
  };

  if (!isDataLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-muted-foreground">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="animate-spin w-8 h-8 text-primary" />
          <p className="font-medium animate-pulse">Loading saved data...</p>
        </div>
      </div>
    );
  }

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
            <Button variant="destructive" onClick={handleClearLocalData} size="sm" className="gap-2">
              Clear Local Data
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
                {hasCoordinates && (
                  <TabsTrigger value="map" className="gap-2 data-[state=active]:bg-background data-[state=active]:text-primary">
                    <MapIcon size={14} />Map View
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <TabsContent value="raw" className="flex-1 min-h-0 m-0 data-[state=active]:flex flex-col">
              <DataTableComponent data={data} />
            </TabsContent>

            <TabsContent value="pivot" className="flex-1 min-h-0 m-0 data-[state=active]:block overflow-auto relative">
              <PivotView data={data} />
            </TabsContent>

            {hasCoordinates && (
              <TabsContent value="map" className="flex-1 min-h-0 m-0 data-[state=active]:block relative h-full bg-muted/10">
                {mapboxToken ? (
                  <MapView data={data} token={mapboxToken} />
                ) : (
                  <div className="flex items-center justify-center p-8 h-full">
                    <div className="bg-card p-8 rounded-xl border shadow-sm max-w-md w-full text-center">
                      <MapIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">Mapbox Access Token Required</h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        To protect your quota, please provide your own Mapbox public access token. It will be securely saved in your browser.
                      </p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="pk.ey..."
                          value={tempToken}
                          onChange={(e) => setTempToken(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveToken()}
                        />
                        <Button onClick={handleSaveToken}>Save</Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-4">
                        Don't have one? Get a free token at <a href="https://mapbox.com" target="_blank" rel="noreferrer" className="text-primary hover:underline">mapbox.com</a>
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </main>
      )}
    </div>
  );
}
