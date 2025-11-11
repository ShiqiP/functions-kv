'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

interface EROption {
  key: string;
  value: string;
  label: string;
}

export default function KVManager() {
  const [namespace, setNamespace] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [originalJsonInput, setOriginalJsonInput] = useState(''); // Track original value
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // const [preview, setPreview] = useState<Array<{ key: string; value: RedirectRule; path: string }>>([]);
  const [erOptions, setErOptions] = useState<EROption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [policies, setPolicies] = useState<RedirectRule[]>([]);
  const [hasPolicy, setHasPolicy] = useState(false);

  // Check if there are unsaved changes
  const hasChanges = jsonInput !== originalJsonInput && jsonInput.trim() !== '';

  useEffect(() => {
    // Fetch ER_lookup options on component mount
    fetchEROptions();
  }, []);

  useEffect(() => {
    // Load policies when namespace changes
    if (namespace) {
      loadPolicies(namespace);
    } else {
      setPolicies([]);
      setHasPolicy(false);
    }
  }, [namespace]);

  const fetchEROptions = async () => {
    try {
      const response = await fetch('/er-lookup');
      const data = await response.json();
      
      if (data.success && data.options) {
        setErOptions(data.options);
      } else {
        setMessage({ type: 'error', text: 'Failed to load ER options' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Error loading ER options: ${(error as Error).message}` });
    } finally {
      setLoadingOptions(false);
    }
  };

  const loadPolicies = async (ns: string) => {
    setLoadingPolicies(true);
    setMessage(null);
    
    try {
      const response = await fetch(`/kv-manager?namespace=${ns}`);
      const data = await response.json();
      
      if (data.success) {
        setPolicies(data.policies || []);
        setHasPolicy(data.hasPolicy || false);
        
        // Populate JSON input with loaded policies
        if (data.policies && data.policies.length > 0) {
          const formattedJson = JSON.stringify(data.policies, null, 2);
          setJsonInput(formattedJson);
          setOriginalJsonInput(formattedJson); // Store original value
          setMessage({ 
            type: 'success', 
            text: `Loaded ${data.count} policies from ER_${ns}${data.hasPolicy ? ' (from policy key)' : ' (generated from individual entries)'}` 
          });
        } else {
          setJsonInput('');
          setOriginalJsonInput('');
          setMessage({ 
            type: 'success', 
            text: `No policies found in ER_${ns}` 
          });
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to load policies' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Error loading policies: ${(error as Error).message}` });
    } finally {
      setLoadingPolicies(false);
    }
  };

  // const handlePreview = () => {
  //   try {
  //     const rules: RedirectRule[] = JSON.parse(jsonInput);
  //     
  //     if (!Array.isArray(rules)) {
  //       setMessage({ type: 'error', text: 'JSON must be an array of rules' });
  //       return;
  //     }
  //
  //     // Check if rules have path field
  //     const hasPath = rules.length > 0 && rules[0].path;
  //
  //     if (hasPath) {
  //       // Mode 1: Individual rules with path
  //       const previewData = rules.map(rule => {
  //         if (!rule.path) {
  //           throw new Error('Each rule must have a "path" field');
  //         }
  //         return {
  //           key: hexEncode(rule.path),
  //           value: rule,
  //           path: rule.path
  //         };
  //       });
  //
  //       setPreview(previewData);
  //       setMessage({ type: 'success', text: `Preview generated for ${previewData.length} rules (individual keys mode)` });
  //     } else {
  //       // Mode 2: Policy array without path - store in policy key
  //       const previewData = rules.map((rule, index) => ({
  //         key: 'policy',
  //         value: rule,
  //         path: `Rule ${index + 1}`
  //       }));
  //
  //       setPreview(previewData);
  //       setMessage({ type: 'success', text: `Preview generated for ${previewData.length} rules (policy array mode)` });
  //     }
  //   } catch (error) {
  //     setMessage({ type: 'error', text: `Invalid JSON: ${(error as Error).message}` });
  //     setPreview([]);
  //   }
  // };

  const handleSubmit = async () => {
    if (!namespace.trim()) {
      setMessage({ type: 'error', text: 'Please select a namespace' });
      return;
    }

    if (!jsonInput.trim()) {
      setMessage({ type: 'error', text: 'Please enter JSON data' });
      return;
    }

    // Parse and validate JSON
    let rules: RedirectRule[];
    try {
      rules = JSON.parse(jsonInput);
      if (!Array.isArray(rules)) {
        setMessage({ type: 'error', text: 'JSON must be an array of rules' });
        return;
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Invalid JSON: ${(error as Error).message}` });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Check if rules have path field
      const hasPath = rules.length > 0 && rules[0].path;

      if (hasPath) {
        // Mode 1: Store individual rules with hex-encoded keys
        const entries = rules.map(rule => {
          if (!rule.path) {
            throw new Error('Each rule must have a "path" field');
          }
          return {
            key: hexEncode(rule.path),
            value: JSON.stringify(rule)
          };
        });

        const response = await fetch('/kv-manager', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            namespace: namespace.trim(),
            entries
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setMessage({ 
            type: 'success', 
            text: `Successfully added ${rules.length} individual rules to ER_${namespace}` 
          });
          // Reload policies and update original
          await loadPolicies(namespace);
        } else {
          setMessage({ type: 'error', text: data.error || 'Failed to add entries' });
        }
      } else {
        // Mode 2: Store entire array in policy key
        const response = await fetch('/kv-manager', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            namespace: namespace.trim(),
            policies: rules
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setMessage({ 
            type: 'success', 
            text: `Successfully stored policy array in ER_${namespace}` 
          });
          // Reload policies and update original
          await loadPolicies(namespace);
        } else {
          setMessage({ type: 'error', text: data.error || 'Failed to store policy' });
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Error: ${(error as Error).message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>EdgeRedirector Policy Manager</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Namespace Select */}
        <div className="space-y-2">
          <Label htmlFor="namespace">KV Namespace</Label>
          <Select value={namespace} onValueChange={setNamespace} disabled={loadingOptions}>
            <SelectTrigger id="namespace">
              <SelectValue placeholder={loadingOptions ? "Loading..." : "Select a namespace"} />
            </SelectTrigger>
            <SelectContent>
              {erOptions.map((option) => (
                <SelectItem key={option.key} value={option.key}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* JSON Input */}
        <div className="space-y-2">
          <Label htmlFor="json">Redirect Rules (JSON Array)</Label>
          <Textarea
            id="json"
            placeholder={`With path field (individual keys):\n[\n  {\n    "path": "/reservation/lookupReservation.mi",\n    "redirectURL": "/reservation/findReservationDetail.mi",\n    "statusCode": 302\n  }\n]\n\nWithout path field (policy array):\n[\n  {\n    "ruleName": "rule1",\n    "redirectURL": "/page1",\n    "statusCode": 302\n  }\n]`}
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            rows={20}
            className="font-mono text-sm"
          />
          {hasChanges && (
            <p className="text-sm text-orange-600 font-medium">
              ⚠️ You have unsaved changes
            </p>
          )}
        </div>

        {/* Message Alert */}
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <Button 
          onClick={handleSubmit} 
          disabled={loading || !hasChanges}
          className="w-full"
        >
          {loading ? 'Saving...' : hasChanges ? 'Save Changes' : 'No Changes to Save'}
        </Button>
      </CardContent>
    </Card>
  );
}
