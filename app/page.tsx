'use client';

import KVManager from '@/components/KVManager';
import ERLookupEditor from '@/components/ERLookupEditor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Home() {
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Tabs defaultValue="kv-manager" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="kv-manager">EdgeRedirector Policy Manager</TabsTrigger>
          <TabsTrigger value="er-lookup">ER Lookup Editor</TabsTrigger>
        </TabsList>
        
        <TabsContent value="kv-manager">
          <KVManager />
        </TabsContent>
        
        <TabsContent value="er-lookup">
          <ERLookupEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
}
