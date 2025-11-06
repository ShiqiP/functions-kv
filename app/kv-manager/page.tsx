'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Helper function to hex encode a string (same as in the API)
function hexEncode(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

interface RedirectRule {
  ruleName: string;
  header: string;
  path: string;
  query: string;
  regex: string;
  useIncomingQueryString: number;
  useRelativeUrl: string;
  redirectURL: string;
  statusCode: number;
}

export default function KVManager() {
  const [namespace, setNamespace] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [preview, setPreview] = useState<Array<{ key: string; value: RedirectRule; path: string }>>([]);

  const handlePreview = () => {
    try {
      const rules: RedirectRule[] = JSON.parse(jsonInput);
      
      if (!Array.isArray(rules)) {
        setMessage({ type: 'error', text: 'JSON must be an array of rules' });
        return;
      }

      const previewData = rules.map(rule => {
        if (!rule.path) {
          throw new Error('Each rule must have a "path" field');
        }
        return {
          key: hexEncode(rule.path),
          value: rule,
          path: rule.path
        };
      });

      setPreview(previewData);
      setMessage({ type: 'success', text: `Preview generated for ${previewData.length} rules` });
    } catch (error) {
      setMessage({ type: 'error', text: `Invalid JSON: ${(error as Error).message}` });
      setPreview([]);
    }
  };

  const handleSubmit = async () => {
    if (!namespace.trim()) {
      setMessage({ type: 'error', text: 'Please enter a namespace (e.g., ER_278664)' });
      return;
    }

    if (preview.length === 0) {
      setMessage({ type: 'error', text: 'Please preview the rules first' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/kv-manager', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          namespace: namespace.trim(),
          entries: preview.map(p => ({
            key: p.key,
            value: JSON.stringify(p.value)
          }))
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: `Successfully added ${data.count} entries to namespace "${namespace}"` 
        });
        // Clear form on success
        setJsonInput('');
        setPreview([]);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to add entries' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Error: ${(error as Error).message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>KV Storage Manager</CardTitle>
          <CardDescription>
            Add redirect rules to KV storage. Each rule will be stored with its hex-encoded path as the key.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Namespace Input */}
          <div className="space-y-2">
            <Label htmlFor="namespace">KV Namespace</Label>
            <Input
              id="namespace"
              placeholder="e.g., ER_278664"
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Enter the namespace identifier (e.g., ER_278664, ER_279622)
            </p>
          </div>

          {/* JSON Input */}
          <div className="space-y-2">
            <Label htmlFor="json">Redirect Rules (JSON Array)</Label>
            <Textarea
              id="json"
              placeholder={`[\n  {\n    "ruleName": "/reservation/findReservationDetail.mi",\n    "header": "",\n    "path": "/reservation/lookupReservation.mi",\n    "query": "r=*",\n    "regex": "",\n    "useIncomingQueryString": 1,\n    "useRelativeUrl": "relative_url",\n    "redirectURL": "/reservation/findReservationDetail.mi",\n    "statusCode": 302\n  }\n]`}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">
              Paste a JSON array of redirect rules. Each rule must have a &quot;path&quot; field.
            </p>
          </div>

          {/* Preview Button */}
          <Button onClick={handlePreview} variant="outline" className="w-full">
            Preview Rules
          </Button>

          {/* Preview Section */}
          {preview.length > 0 && (
            <div className="space-y-2">
              <Label>Preview ({preview.length} rules)</Label>
              <div className="border rounded-lg p-4 max-h-64 overflow-y-auto bg-muted/50">
                {preview.map((item, index) => (
                  <div key={index} className="mb-3 pb-3 border-b last:border-b-0">
                    <div className="text-sm font-mono">
                      <div className="text-muted-foreground">Path: {item.path}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Key: {item.key}
                      </div>
                      <div className="text-xs mt-1">
                        → {item.value.redirectURL} ({item.value.statusCode})
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Message Alert */}
          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button 
            onClick={handleSubmit} 
            disabled={loading || preview.length === 0}
            className="w-full"
          >
            {loading ? 'Adding to KV Storage...' : `Add ${preview.length} Rules to KV Storage`}
          </Button>

          {/* Example */}
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Example JSON:</h3>
            <pre className="text-xs overflow-x-auto">
{`[
  {
    "ruleName": "/reservation/findReservationDetail.mi",
    "header": "",
    "path": "/reservation/lookupReservation.mi",
    "query": "r=*",
    "regex": "",
    "useIncomingQueryString": 1,
    "useRelativeUrl": "relative_url",
    "redirectURL": "/reservation/findReservationDetail.mi",
    "statusCode": 302
  },
  {
    "ruleName": "/search/findHotels.mi",
    "header": "",
    "path": "/search/submitSearch.mi",
    "query": "",
    "regex": "",
    "useIncomingQueryString": 1,
    "useRelativeUrl": "relative_url",
    "redirectURL": "/search/findHotels.mi",
    "statusCode": 302
  }
]`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
