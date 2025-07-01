// src/components/DatabaseSaveTest.tsx
"use client"
import { useState } from 'react';
import { ChatStorageService } from '@/lib/supabase/chatStorage';

export function DatabaseSaveTest() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (message: string) => {
    console.log(message);
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testFullFlow = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    try {
      addResult("🧪 Testing full chat flow...");
      
      // 1. Create session
      addResult("1️⃣ Creating session...");
      const session = await ChatStorageService.createChatSession({
        source: "test_flow",
        timestamp: new Date().toISOString()
      });
      
      if (!session) {
        addResult("❌ Session creation failed");
        return;
      }
      
      addResult(`✅ Session created: ${session.id}`);
      
      // 2. Save user message
      addResult("2️⃣ Saving user message...");
      const userMessage = await ChatStorageService.saveMessage(
        session.id,
        'user',
        'Hello, this is a test message from the user',
        {
          isVoiceInput: false,
          metadata: { test: true }
        }
      );
      
      if (userMessage) {
        addResult(`✅ User message saved: ${userMessage.id}`);
      } else {
        addResult("❌ User message save failed");
      }
      
      // 3. Save bot message
      addResult("3️⃣ Saving bot message...");
      const botMessage = await ChatStorageService.saveMessage(
        session.id,
        'connie',
        'Hello! This is a test response from Connie.',
        {
          selectedVoice: 'shimmer',
          metadata: { test: true, provider: 'test' }
        }
      );
      
      if (botMessage) {
        addResult(`✅ Bot message saved: ${botMessage.id}`);
      } else {
        addResult("❌ Bot message save failed");
      }
      
      // 4. Verify messages exist
      addResult("4️⃣ Checking saved messages...");
      const messages = await ChatStorageService.getSessionMessages(session.id);
      addResult(`📝 Found ${messages.length} messages in database`);
      
      messages.forEach((msg, index) => {
        addResult(`  ${index + 1}. ${msg.sender}: ${msg.message_text.substring(0, 30)}...`);
      });
      
      // 5. Log analytics
      addResult("5️⃣ Testing analytics...");
      await ChatStorageService.logAnalyticsEvent(session.id, 'test_event', {
        test: true,
        timestamp: new Date().toISOString()
      });
      addResult("✅ Analytics logged");
      
      // 6. Clean up
      addResult("6️⃣ Cleaning up test session...");
      const endResult = await ChatStorageService.endChatSession(session.id);
      addResult(`Session cleanup: ${endResult ? '✅ SUCCESS' : '❌ FAILED'}`);
      
      addResult("🏁 Full flow test complete!");
      
    } catch (error) {
      addResult(`❌ Test error: ${error instanceof Error ? error.message : 'Unknown'}`);
      console.error("Full flow test error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const testJustMessageSave = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    try {
      // First create a fresh session for this test
      addResult("🔧 Creating session for message test...");
      const session = await ChatStorageService.createChatSession({
        source: "message_test",
        timestamp: new Date().toISOString()
      });
      
      if (!session) {
        addResult("❌ Session creation failed");
        return;
      }
      
      addResult(`✅ Session created: ${session.id}`);
      
      addResult("📝 Testing message save...");
      const message = await ChatStorageService.saveMessage(
        session.id,
        'user',
        'Test message to verify database saving',
        {
          isVoiceInput: false,
          metadata: { directTest: true }
        }
      );
      
      if (message) {
        addResult(`✅ Message saved: ${message.id}`);
        addResult(`Message content: ${message.message_text}`);
        addResult(`Timestamp: ${message.message_timestamp}`);
      } else {
        addResult("❌ Message save returned null");
      }
      
      // Clean up
      await ChatStorageService.endChatSession(session.id);
      addResult("🧹 Test session cleaned up");
      
    } catch (error) {
      addResult(`❌ Message save error: ${error instanceof Error ? error.message : 'Unknown'}`);
      console.error("Message save error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed top-16 left-4 w-96 max-h-96 bg-black/90 text-white p-4 rounded-lg border border-gray-600 z-50 overflow-hidden flex flex-col">
      <h3 className="text-lg font-bold mb-2">💾 Database Save Test</h3>
      
      <div className="flex flex-wrap gap-1 mb-4">
        <button
          onClick={testFullFlow}
          disabled={isLoading}
          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-xs"
        >
          {isLoading ? "Testing..." : "Full Flow"}
        </button>
        
        <button
          onClick={testJustMessageSave}
          disabled={isLoading}
          className="px-2 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded text-xs"
        >
          Message Only
        </button>

        <button
          onClick={() => setTestResults([])}
          className="px-2 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs"
        >
          Clear
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-900 p-2 rounded text-xs font-mono">
        {testResults.length === 0 ? (
          <div className="text-gray-400">Click a button to test database saves...</div>
        ) : (
          testResults.map((result, index) => (
            <div key={index} className="mb-1 whitespace-pre-wrap break-all">
              {result}
            </div>
          ))
        )}
      </div>
    </div>
  );
}