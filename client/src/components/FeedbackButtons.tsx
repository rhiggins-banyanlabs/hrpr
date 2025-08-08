import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { ChatStorageService } from '@/lib/supabase/chatStorage';

interface FeedbackButtonsProps {
  messageId: string;
  sessionId: string;
  isIntroMessage?: boolean;
}

export const FeedbackButtons = ({ 
  messageId, 
  sessionId,
  isIntroMessage = false
}: FeedbackButtonsProps) => {
  const [feedback, setFeedback] = useState<'thumbs_up' | 'thumbs_down' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Don't render for intro messages
  if (isIntroMessage) {
    return null;
  }

  // Load existing feedback on mount
  useEffect(() => {
    const loadFeedback = async () => {
      const existingFeedback = await ChatStorageService.getMessageFeedback(messageId);
      if (existingFeedback) {
        setFeedback(existingFeedback.feedback_type);
      }
    };
    loadFeedback();
  }, [messageId]);

  const handleFeedback = async (type: 'thumbs_up' | 'thumbs_down') => {
    if (isLoading) return;
  
    // 💡 Runtime guard for sanity
    if (type !== 'thumbs_up' && type !== 'thumbs_down') {
      console.error('❌ Invalid feedback type sent to Supabase:', type);
      return;
    }
  
    setIsLoading(true);
  
    try {
      if (feedback === type) {
        // If clicking the same feedback, remove it
        await ChatStorageService.removeFeedback(messageId);
        setFeedback(null);
      } else {
        // Save new feedback
        await ChatStorageService.saveFeedback(messageId, sessionId, type);
        setFeedback(type);
      }
    } catch (error) {
      console.error('Error handling feedback:', error);
    } finally {
      setIsLoading(false);
    }
  };
  

  return (
    <div className="flex gap-1 mt-2">
        <p className="text-xs text-gray-300">Was this response helpful?</p>
      <button
          onClick={() => {
            console.log("👍 Feedback click: thumbs_up");
            handleFeedback('thumbs_up');
          }}
        disabled={isLoading}
        className={`p-1 rounded transition-all ${
          feedback === 'thumbs_up'
            ? 'text-green-400 bg-green-400/20'
            : 'text-gray-400 hover:text-green-400 hover:bg-green-400/10'
        } disabled:opacity-50`}
        aria-label="Thumbs up"
      >
        <ThumbsUp className="h-3 w-3" fill={feedback === 'thumbs_up' ? 'currentColor' : 'none'} />
      </button>
      <button
        onClick={() => {
            console.log("👎 Feedback click: thumbs_down");
            handleFeedback('thumbs_down');
          }}
        disabled={isLoading}
        className={`p-1 rounded transition-all ${
          feedback === 'thumbs_down'
            ? 'text-red-400 bg-red-400/20'
            : 'text-gray-400 hover:text-red-400 hover:bg-red-400/10'
        } disabled:opacity-50`}
        aria-label="Thumbs down"
      >
        <ThumbsDown className="h-3 w-3" fill={feedback === 'thumbs_down' ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
};