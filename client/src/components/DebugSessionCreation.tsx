// src/components/DebugSessionCreation.tsx - IMPROVED VERSION
"use client"
import { useState } from 'react';
import { ChatStorageService, supabase } from '@/lib/supabase/chatStorage';

export function DebugSessionCreation() {
  const [debugResults, setDebugResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addDebugResult = (message: string) => {
    console.log(message);
    setDebugResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Better environment check that works in the browser
  const checkEnvironment = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    addDebugResult(`NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ Present' : '❌ Missing'}`);
    addDebugResult(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseKey ? '✅ Present' : '❌ Missing'}`);
    
    if (supabaseUrl) {
      addDebugResult(`URL Preview: ${supabaseUrl.substring(0, 30)}...`);
    }
    if (supabaseKey) {
      addDebugResult(`Key Preview: ${supabaseKey.substring(0, 30)}...`);
    }
    
    return !!(supabaseUrl && supabaseKey);
  };

  const testSupabaseConnection = async () => {
    try {
      addDebugResult("🔌 Testing direct Supabase connection...");
      
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('count(*)')
        .limit(1);

      if (error) {
        addDebugResult(`❌ Connection error: ${error.message}`);
        addDebugResult(`❌ Error code: ${error.code}`);
        addDebugResult(`❌ Error details: ${error.details}`);
        return false;
      }

      addDebugResult("✅ Supabase connection successful!");
      return true;
    } catch (error) {
      addDebugResult(`❌ Connection exception: ${error instanceof Error ? error.message : 'Unknown'}`);
      return false;
    }
  };

  const runFullDiagnostic = async () => {
    setIsLoading(true);
    setDebugResults([]);
    
    try {
      addDebugResult("🚀 Starting full diagnostic...");

      // 1. Check environment variables
      addDebugResult("1️⃣ Checking environment variables...");
      const envOk = checkEnvironment();
      addDebugResult(`Environment check: ${envOk ? '✅ PASS' : '❌ FAIL'}`);

      if (!envOk) {
        addDebugResult("❌ Environment variables missing - stopping diagnostic");
        return;
      }

      // 2. Test basic Supabase connection
      addDebugResult("2️⃣ Testing Supabase connection...");
      const connectionOk = await testSupabaseConnection();
      addDebugResult(`Connection test: ${connectionOk ? '✅ PASS' : '❌ FAIL'}`);

      if (!connectionOk) {
        addDebugResult("❌ Database connection failed - stopping diagnostic");
        return;
      }

      // 3. Check if tables exist
      addDebugResult("3️⃣ Checking database tables...");
      
      try {
        const { data: tables, error: tableError } = await supabase
          .from('chat_sessions')
          .select('id')
          .limit(1);
          
        if (tableError) {
          addDebugResult(`❌ chat_sessions table error: ${tableError.message}`);
          addDebugResult(`❌ This might be a permissions or table structure issue`);
        } else {
          addDebugResult("✅ chat_sessions table accessible");
        }
      } catch (tableErr) {
        addDebugResult(`❌ Table check failed: ${tableErr instanceof Error ? tableErr.message : 'Unknown'}`);
      }

      // 4. Test session creation with detailed logging
      addDebugResult("4️⃣ Testing session creation...");
      
      try {
        const testSession = await ChatStorageService.createChatSession({
          test: true,
          debug: true,
          timestamp: new Date().toISOString()
        });

        if (testSession) {
          addDebugResult(`✅ Session created successfully: ${testSession.id}`);
          addDebugResult(`Session active: ${testSession.is_active}`);
          
          // 5. Test ending the session
          addDebugResult("5️⃣ Testing session cleanup...");
          const endResult = await ChatStorageService.endChatSession(testSession.id);
          addDebugResult(`Session cleanup: ${endResult ? '✅ PASS' : '❌ FAIL'}`);

        } else {
          addDebugResult("❌ Session creation returned null");
          addDebugResult("❌ Check the console for detailed error messages");
        }
      } catch (sessionError) {
        addDebugResult(`❌ Session creation failed: ${sessionError instanceof Error ? sessionError.message : 'Unknown'}`);
      }

      addDebugResult("🏁 Diagnostic complete!");

    } catch (error) {
      addDebugResult(`❌ Diagnostic error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error("Full diagnostic error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const testQuickSessionCreation = async () => {
    setIsLoading(true);
    try {
      addDebugResult("🔧 Quick session creation test...");
      
      const session = await ChatStorageService.createChatSession({
        source: "debug_test",
        timestamp: new Date().toISOString()
      });

      if (session) {
        addDebugResult(`✅ Quick test SUCCESS: ${session.id}`);
        // Clean up
        await ChatStorageService.endChatSession(session.id);
        addDebugResult("🧹 Test session cleaned up");
      } else {
        addDebugResult("❌ Quick test FAILED: No session returned");
      }
    } catch (error) {
      addDebugResult(`❌ Quick test ERROR: ${error instanceof Error ? error.message : 'Unknown'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testBasicSupabaseQuery = async () => {
    setIsLoading(true);
    try {
      addDebugResult("🧪 Testing basic Supabase query...");
      
      // Test a simple select query
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('id, created_at')
        .limit(5);

      if (error) {
        addDebugResult(`❌ Query failed: ${error.message}`);
        addDebugResult(`❌ Error code: ${error.code}`);
        addDebugResult(`❌ Error hint: ${error.hint || 'None'}`);
      } else {
        addDebugResult(`✅ Query successful! Found ${data?.length || 0} records`);
        if (data && data.length > 0) {
          addDebugResult(`Latest session: ${data[0].id}`);
        }
      }
    } catch (error) {
      addDebugResult(`❌ Query exception: ${error instanceof Error ? error.message : 'Unknown'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed top-16 right-4 w-96 max-h-96 bg-black/90 text-white p-4 rounded-lg border border-gray-600 z-50 overflow-hidden flex flex-col">
      <h3 className="text-lg font-bold mb-2">🐛 Session Debug</h3>
      
      <div className="flex flex-wrap gap-1 mb-4">
        <button
          onClick={runFullDiagnostic}
          disabled={isLoading}
          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-xs"
        >
          {isLoading ? "Running..." : "Full Test"}
        </button>
        
        <button
          onClick={testQuickSessionCreation}
          disabled={isLoading}
          className="px-2 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded text-xs"
        >
          Quick Test
        </button>

        <button
          onClick={testBasicSupabaseQuery}
          disabled={isLoading}
          className="px-2 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded text-xs"
        >
          Query Test
        </button>

        <button
          onClick={() => setDebugResults([])}
          className="px-2 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs"
        >
          Clear
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-900 p-2 rounded text-xs font-mono">
        {debugResults.length === 0 ? (
          <div className="text-gray-400">Click a button to start debugging...</div>
        ) : (
          debugResults.map((result, index) => (
            <div key={index} className="mb-1 whitespace-pre-wrap break-all">
              {result}
            </div>
          ))
        )}
      </div>
    </div>
  );
}