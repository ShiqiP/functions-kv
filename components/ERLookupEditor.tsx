'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface EREntry {
  key: string;
  value: string;
  originalValue: string;
}

export default function ERLookupEditor() {
  const [entries, setEntries] = useState<EREntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchERLookup();
  }, []);

  const fetchERLookup = async () => {
    try {
      const response = await fetch('/er-lookup');
      const data = await response.json();

      if (data.success && data.options) {
        const erEntries = data.options.map((opt: { key: string; value: string }) => ({
          key: opt.key,
          value: opt.value,
          originalValue: opt.value,
        }));
        setEntries(erEntries);
      } else {
        setMessage({ type: 'error', text: 'Failed to load ER lookup data' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Error loading data: ${(error as Error).message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (key: string, newValue: string) => {
    setEntries(entries.map(entry =>
      entry.key === key ? { ...entry, value: newValue } : entry
    ));
  };

  const handleUpdate = async () => {
    const changedEntries = entries.filter(entry => entry.value !== entry.originalValue);

    if (changedEntries.length === 0) {
      setMessage({ type: 'error', text: 'No changes to update' });
      return;
    }

    setUpdating(true);
    setMessage(null);

    try {
      const response = await fetch('/er-lookup', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entries: changedEntries.map(e => ({ key: e.key, value: e.value }))
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `Successfully updated ${changedEntries.length} entries`
        });
        // Update originalValue to match new value
        setEntries(entries.map(entry => ({
          ...entry,
          originalValue: entry.value
        })));
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update entries' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Error: ${(error as Error).message}` });
    } finally {
      setUpdating(false);
    }
  };

  const hasChanges = entries.some(entry => entry.value !== entry.originalValue);

  return (
    <Card>
      <CardHeader>
        <CardTitle>ER Lookup Editor</CardTitle>
        <CardDescription>
          Edit the ER lookup mappings. The key column is read-only, you can only modify the values.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : (
          <>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Key</TableHead>
                    <TableHead>Value (Policy ID)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.key}>
                      <TableCell className="font-mono text-sm font-medium">
                        {entry.key}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={entry.value}
                          onChange={(e) => handleValueChange(entry.key, e.target.value)}
                          className="max-w-md"
                          placeholder="Enter policy ID"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {message && (
              <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleUpdate}
              disabled={updating || !hasChanges}
              className="w-full"
            >
              {updating ? 'Updating...' : `Update ${entries.filter(e => e.value !== e.originalValue).length > 0 ? entries.filter(e => e.value !== e.originalValue).length + ' ' : ''}Changes`}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
