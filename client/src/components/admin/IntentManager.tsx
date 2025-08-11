'use client';

import { useState, useEffect } from 'react';
import { semanticRouterSupabase } from '@/services/semantic-router-supabase.service';
import { embeddingService } from '@/services/embedding.service';

interface IntentExample {
  id: string;
  intent: string;
  example_text: string;
  created_at: string;
}

export function IntentManager() {
  const [selectedIntent, setSelectedIntent] = useState<string>('venue');
  const [newExample, setNewExample] = useState('');
  const [examples, setExamples] = useState<IntentExample[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingExamples, setIsLoadingExamples] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Available intent types with descriptions
  const intentTypes = [
    { value: 'venue', label: 'Venue', description: 'Restaurants, hotels, parking, nearby places' },
    { value: 'conference', label: 'Conference', description: 'Schedule, sessions, speakers, events' },
    { value: 'location', label: 'Location', description: 'Directions, rooms, navigation' },
    { value: 'exhibitor', label: 'Exhibitor', description: 'Vendors, booths, sponsors, companies' },
    { value: 'workshop', label: 'Workshop', description: 'Training sessions, CE credits, topics' },
    { value: 'meeting', label: 'Meeting', description: 'Committee meetings, councils, boards' },
    { value: 'info', label: 'Info', description: 'General conference info, policies, help' },
    { value: 'general', label: 'General', description: 'Other queries' }
  ];

  useEffect(() => {
    if (selectedIntent) {
      loadExamples(selectedIntent);
    }
  }, [selectedIntent]);

  const loadExamples = async (intent: string) => {
    try {
      setIsLoadingExamples(true);
      const intentExamples = await semanticRouterSupabase.getIntentExamples(intent);
      // Map IntentEmbedding to IntentExample format, handling the type difference
      const mappedExamples: IntentExample[] = intentExamples.map((item: any) => ({
        id: item.id,
        intent: item.intent,
        example_text: item.example_text,
        created_at: item.created_at || new Date().toISOString() // Use created_at if available, otherwise current date
      }));
      setExamples(mappedExamples);
    } catch (error) {
      console.error('Error loading examples:', error);
      setExamples([]);
    } finally {
      setIsLoadingExamples(false);
    }
  };

  const handleAddExample = async () => {
    if (!newExample.trim()) {
      setMessage({ type: 'error', text: 'Please enter an example text' });
      return;
    }

    if (!selectedIntent) {
      setMessage({ type: 'error', text: 'Please select an intent category' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      // Generate embedding for the example
      const embedding = await embeddingService.generateEmbedding(newExample);
      
      // Add to database
      const success = await semanticRouterSupabase.addIntentExample(
        selectedIntent,
        newExample,
        embedding
      );

      if (success) {
        setMessage({ type: 'success', text: 'Example added successfully!' });
        setNewExample('');
        
        // Reload examples for current intent
        await loadExamples(selectedIntent);
      } else {
        setMessage({ type: 'error', text: 'Failed to add example' });
      }
    } catch (error) {
      console.error('Error adding example:', error);
      setMessage({ type: 'error', text: 'Error generating embedding' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteExample = async (id: string) => {
    if (!confirm('Are you sure you want to delete this example?')) return;

    setIsDeleting(id);
    try {
      const success = await semanticRouterSupabase.deleteIntentExample(id);
      if (success) {
        setMessage({ type: 'success', text: 'Example deleted successfully' });
        await loadExamples(selectedIntent);
      } else {
        setMessage({ type: 'error', text: 'Failed to delete example' });
      }
    } catch (error) {
      console.error('Error deleting example:', error);
      setMessage({ type: 'error', text: 'Error deleting example' });
    } finally {
      setIsDeleting(null);
    }
  };

  // Filter examples based on search term
  const filteredExamples = examples.filter(example =>
    example.example_text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-gray-900 rounded-lg p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-2">
        <h2 className="text-lg lg:text-xl font-bold text-green-400">Intent Training</h2>
        <div className="text-xs sm:text-sm text-gray-400">
          Train Harper to understand user questions better
        </div>
      </div>
      
      {/* Message */}
      {message && (
        <div className={`mb-4 p-3 rounded flex items-center justify-between ${
          message.type === 'success' ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'
        }`}>
          <span>{message.text}</span>
          <button 
            onClick={() => setMessage(null)}
            className="text-white hover:text-gray-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* Add New Example */}
      <div className="mb-6 p-3 sm:p-4 bg-gray-800 rounded">
        <h3 className="text-base lg:text-lg font-semibold text-green-300 mb-3">Add New Training Example</h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-xs sm:text-sm text-gray-400 mb-1">Intent Category</label>
            <div className="relative">
              <select
                value={selectedIntent}
                onChange={(e) => setSelectedIntent(e.target.value)}
                disabled={isLoadingExamples}
                className={`w-full bg-gray-700 text-gray-100 px-3 py-2 rounded text-sm ${
                  isLoadingExamples ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {intentTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </select>
              {isLoadingExamples && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-400"></div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm text-gray-400 mb-1">Example Query</label>
            <input
              type="text"
              value={newExample}
              onChange={(e) => setNewExample(e.target.value)}
              placeholder="e.g., 'Where can I find coffee?'"
              className="w-full bg-gray-700 text-gray-100 px-3 py-2 rounded text-sm"
              onKeyPress={(e) => e.key === 'Enter' && handleAddExample()}
            />
            <div className="mt-2 text-xs text-gray-500 hidden sm:block">
              {selectedIntent === 'venue' && "Examples: 'Where is the nearest Starbucks?', 'Hotels near convention center'"}
              {selectedIntent === 'conference' && "Examples: 'What's the schedule for Monday?', 'When is the keynote?'"}
              {selectedIntent === 'exhibitor' && "Examples: 'Where is AIDA demo booth?', 'List of sponsors'"}
              {selectedIntent === 'workshop' && "Examples: 'Mental health workshops', 'Sessions with CE credits'"}
              {selectedIntent === 'meeting' && "Examples: 'Healthcare committee meeting time', 'Council meetings on Friday'"}
              {selectedIntent === 'location' && "Examples: 'How do I get to room 201?', 'Directions to the venue'"}
              {selectedIntent === 'info' && "Examples: 'Lost badge procedure', 'Parking information'"}
            </div>
          </div>

          <button
            onClick={handleAddExample}
            disabled={isLoading}
            className={`w-full sm:w-auto px-4 py-2 rounded font-medium text-sm ${
              isLoading 
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isLoading ? 'Adding...' : 'Add Example'}
          </button>
        </div>
      </div>

      {/* View Existing Examples */}
      <div className="p-3 sm:p-4 bg-gray-800 rounded">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-1">
          <h3 className="text-base lg:text-lg font-semibold text-green-300">
            Existing Examples
          </h3>
          <span className="text-xs sm:text-sm text-gray-400">
            {filteredExamples.length} of {examples.length} examples
          </span>
        </div>
        
        {/* Search bar */}
        <div className="mb-3 relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isLoadingExamples ? "Loading examples..." : "Search examples..."}
            disabled={isLoadingExamples}
            className={`w-full bg-gray-700 text-gray-100 px-3 py-2 rounded text-sm ${
              isLoadingExamples ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          />
          {isLoadingExamples && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
            </div>
          )}
        </div>
        
        <div className="max-h-64 sm:max-h-96 overflow-y-auto space-y-2">
          {isLoadingExamples ? (
            // Loading skeleton
            <>
              {[...Array(5)].map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-700 rounded animate-pulse gap-2"
                >
                  <div className="flex-1">
                    <div className="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-600 rounded w-1/4"></div>
                  </div>
                  <div className="w-full sm:w-20 h-8 bg-gray-600 rounded"></div>
                </div>
              ))}
            </>
          ) : filteredExamples.length === 0 ? (
            <p className="text-gray-500 text-sm">
              {searchTerm ? 'No matching examples found' : 'No examples found'}
            </p>
          ) : (
            filteredExamples.map((example) => (
              <div
                key={example.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-700 rounded hover:bg-gray-600 transition-colors gap-2"
              >
                <div className="flex-1">
                  <p className="text-gray-200 text-sm">{example.example_text}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(example.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteExample(example.id)}
                  disabled={isDeleting === example.id}
                  className={`w-full sm:w-auto px-3 py-1 rounded text-xs sm:text-sm ${
                    isDeleting === example.id 
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {isDeleting === example.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="mt-4 p-3 bg-gray-800 rounded">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            {isLoadingExamples ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-700 rounded w-16 mx-auto mb-1"></div>
                <div className="h-3 bg-gray-700 rounded w-24 mx-auto"></div>
              </div>
            ) : (
              <>
                <p className="text-2xl font-bold text-green-400">{examples.length}</p>
                <p className="text-xs text-gray-500">Examples in {selectedIntent}</p>
              </>
            )}
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400">{intentTypes.length}</p>
            <p className="text-xs text-gray-500">Intent Categories</p>
          </div>
        </div>
      </div>
    </div>
  );
}