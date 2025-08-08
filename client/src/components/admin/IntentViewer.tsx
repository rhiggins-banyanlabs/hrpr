'use client';

import { useState, useEffect } from 'react';
import { Brain, Copy, Check, Search, Filter } from 'lucide-react';

interface IntentData {
  description: string;
  examples: string[];
  embeddings?: number[][];
}

export function IntentViewer() {
  const [intents, setIntents] = useState<Record<string, IntentData>>({});
  const [selectedIntent, setSelectedIntent] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadIntents();
  }, []);

  const loadIntents = async () => {
    try {
      setIsLoading(true);
      // Load the intent embeddings file
      const response = await fetch('/intent-embeddings.min.json');
      if (!response.ok) {
        throw new Error('Failed to load intent embeddings');
      }
      const data = await response.json();
      setIntents(data.intents || {});
      
      // Set first intent as selected
      const intentKeys = Object.keys(data.intents || {});
      if (intentKeys.length > 0) {
        setSelectedIntent(intentKeys[0]);
      }
    } catch (err) {
      console.error('Error loading intents:', err);
      setError('Failed to load intent data. Make sure intent-embeddings.min.json is in public folder.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const generateAddExampleScript = (intent: string, example: string) => {
    return `// Add this to scripts/add-intent-example.js
const { generateEmbedding } = require('./generate-intent-embeddings-local.js');

async function addExample() {
  const intent = '${intent}';
  const example = '${example}';
  
  // Load existing embeddings
  const data = require('../src/data/intent-embeddings.json');
  
  // Generate embedding for new example
  const embedding = await generateEmbedding(example);
  
  // Add to intent
  data.intents[intent].examples.push(example);
  data.intents[intent].embeddings.push(embedding);
  
  // Save back to file
  fs.writeFileSync(
    'src/data/intent-embeddings.json',
    JSON.stringify(data, null, 2)
  );
  
  console.log('✅ Added example to', intent);
}

addExample();`;
  };

  const filteredExamples = selectedIntent && intents[selectedIntent] 
    ? intents[selectedIntent].examples.filter(example => 
        example.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const stats = {
    totalIntents: Object.keys(intents).length,
    totalExamples: Object.values(intents).reduce((sum, intent) => sum + intent.examples.length, 0),
    currentIntentExamples: selectedIntent && intents[selectedIntent] ? intents[selectedIntent].examples.length : 0
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="bg-red-800/20 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
          <div className="mt-4 p-3 bg-gray-800 rounded">
            <p className="text-gray-400 text-sm mb-2">To fix this, copy intent-embeddings.min.json to public folder:</p>
            <code className="text-green-400 text-xs">cp src/data/intent-embeddings.min.json public/</code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <Brain className="h-6 w-6 text-green-400" />
        <h2 className="text-xl font-bold text-green-400">Intent Training Viewer</h2>
        <span className="text-gray-500 text-sm">(Read-Only)</span>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{stats.totalIntents}</p>
          <p className="text-xs text-gray-500">Intent Types</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{stats.totalExamples}</p>
          <p className="text-xs text-gray-500">Total Examples</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{stats.currentIntentExamples}</p>
          <p className="text-xs text-gray-500">In {selectedIntent}</p>
        </div>
      </div>

      {/* Intent Selector */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-2">Select Intent Type</label>
        <div className="grid grid-cols-4 gap-2">
          {Object.keys(intents).map(intent => (
            <button
              key={intent}
              onClick={() => setSelectedIntent(intent)}
              className={`px-3 py-2 rounded transition-colors ${
                selectedIntent === intent
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {intent}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search examples..."
            className="w-full bg-gray-800 text-gray-100 pl-10 pr-4 py-2 rounded"
          />
        </div>
      </div>

      {/* Examples List */}
      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-green-300">
            Examples for "{selectedIntent}"
          </h3>
          <span className="text-gray-500 text-sm">
            {filteredExamples.length} of {stats.currentIntentExamples} shown
          </span>
        </div>
        
        <div className="max-h-96 overflow-y-auto space-y-2">
          {filteredExamples.length === 0 ? (
            <p className="text-gray-500">No examples found</p>
          ) : (
            filteredExamples.map((example, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-700 rounded hover:bg-gray-600 transition-colors group"
              >
                <p className="text-gray-200 flex-1">{example}</p>
                <button
                  onClick={() => copyToClipboard(example, `example-${index}`)}
                  className="ml-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Copy example"
                >
                  {copiedText === `example-${index}` ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-400 hover:text-gray-200" />
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* How to Add New Examples */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <h3 className="text-blue-400 font-semibold mb-3">How to Add New Examples</h3>
        
        <div className="space-y-3">
          <div>
            <p className="text-gray-300 text-sm mb-2">1. Create a new example locally:</p>
            <div className="bg-gray-800 rounded p-3">
              <code className="text-green-400 text-xs">
                node scripts/add-intent-example.js "{selectedIntent}" "your new example here"
              </code>
              <button
                onClick={() => copyToClipboard(
                  `node scripts/add-intent-example.js "${selectedIntent}" "your new example here"`,
                  'command'
                )}
                className="ml-2 inline-flex items-center"
              >
                {copiedText === 'command' ? (
                  <Check className="h-3 w-3 text-green-400" />
                ) : (
                  <Copy className="h-3 w-3 text-gray-400 hover:text-gray-200" />
                )}
              </button>
            </div>
          </div>

          <div>
            <p className="text-gray-300 text-sm mb-2">2. Or use this script template:</p>
            <div className="bg-gray-800 rounded p-3 relative">
              <pre className="text-green-400 text-xs overflow-x-auto">
{generateAddExampleScript(selectedIntent, 'your example here')}
              </pre>
              <button
                onClick={() => copyToClipboard(
                  generateAddExampleScript(selectedIntent, 'your example here'),
                  'script'
                )}
                className="absolute top-2 right-2"
              >
                {copiedText === 'script' ? (
                  <Check className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-400 hover:text-gray-200" />
                )}
              </button>
            </div>
          </div>

          <div>
            <p className="text-gray-300 text-sm mb-2">3. After adding examples, regenerate the minified version:</p>
            <div className="bg-gray-800 rounded p-3">
              <code className="text-green-400 text-xs">
                node scripts/minify-embeddings.js
              </code>
            </div>
          </div>

          <div>
            <p className="text-gray-300 text-sm mb-2">4. Commit and push the changes:</p>
            <div className="bg-gray-800 rounded p-3">
              <code className="text-green-400 text-xs">
                git add src/data/intent-embeddings*.json && git commit -m "Add new intent examples" && git push
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}