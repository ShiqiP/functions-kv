import { NextRequest, NextResponse } from 'next/server';

// Mock KV storage for development
const mockKVNamespaces = new Map<string, Map<string, string>>();

export async function POST(request: NextRequest) {
  try {
    const { namespace, entries } = await request.json();

    if (!namespace || typeof namespace !== 'string') {
      return NextResponse.json(
        { error: 'Namespace is required and must be a string' },
        { status: 400 }
      );
    }

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: 'Entries must be a non-empty array' },
        { status: 400 }
      );
    }

    // Validate entries
    for (const entry of entries) {
      if (!entry.key || !entry.value) {
        return NextResponse.json(
          { error: 'Each entry must have a key and value' },
          { status: 400 }
        );
      }
    }

    // Get or create namespace in mock storage
    if (!mockKVNamespaces.has(namespace)) {
      mockKVNamespaces.set(namespace, new Map());
    }
    const kvStore = mockKVNamespaces.get(namespace)!;

    // Add all entries
    let count = 0;
    for (const entry of entries) {
      kvStore.set(entry.key, entry.value);
      count++;
    }

    return NextResponse.json({
      success: true,
      count,
      namespace,
      message: `Successfully added ${count} entries to namespace "${namespace}"`,
      note: 'Using mock KV storage for development. In production, this would write to EdgeOne KV.'
    });

  } catch (error) {
    console.error('KV Manager Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve entries (for debugging)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const namespace = searchParams.get('namespace');

  if (!namespace) {
    // Return all namespaces
    const allNamespaces = Array.from(mockKVNamespaces.keys()).map(ns => ({
      namespace: ns,
      entryCount: mockKVNamespaces.get(ns)?.size || 0
    }));

    return NextResponse.json({
      namespaces: allNamespaces,
      total: allNamespaces.length
    });
  }

  // Return specific namespace
  const kvStore = mockKVNamespaces.get(namespace);
  if (!kvStore) {
    return NextResponse.json(
      { error: `Namespace "${namespace}" not found` },
      { status: 404 }
    );
  }

  const entries = Array.from(kvStore.entries()).map(([key, value]) => ({
    key,
    value: JSON.parse(value)
  }));

  return NextResponse.json({
    namespace,
    entries,
    count: entries.length
  });
}
