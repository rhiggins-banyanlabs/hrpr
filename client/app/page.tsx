"use client"

import { VoiceOrb } from "@/features/voice"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { useUnifiedVoice } from "@/hooks/useUnifiedVoice"
import { useChatStorage } from "@/hooks/useChatStorage"
import { useAdminAuth } from "@/components/admin/security/AdminAuthContext"
import { useVoiceChat } from "@/hooks/useVoiceChat"
import { useEnhancedOptimizedVoice } from "@/hooks/useEnhancedOptimizedVoice"
import IOSPermissionHelper from "@/components/IOSPermissionHelper"
import { audioConverter } from "@/services/audio-converter.service"
import Waves from "@/components/waves"
import { useState, useRef, useCallback, useEffect } from "react"
import { MorphingText } from "@/components/MorphingText"
import { AdminButton } from "@/components/admin/ui/AdminButton"

export default function Home() {
  const [isVoiceInputActive, setIsVoiceInputActive] = useState(false)
  const [isHarperSpeaking, setIsHarperSpeaking] = useState(false)
  const [isHarperActivated, setIsHarperActivated] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [showIOSHelper, setShowIOSHelper] = useState(false)
  const [iosHelperType, setIOSHelperType] = useState<'microphone' | 'audio' | 'both'>('both')
  const [permissionError, setPermissionError] = useState<string | null>(null)

  const { isSystemLocked } = useAdminAuth()

  // Refs for state management
  const hasPlayedIntroRef = useRef(false)
  const isProcessingVoiceQueryRef = useRef(false)
  const hasSessionRef = useRef(false)

  // Chat storage hook
  const { currentSession, startNewSession, endSession } = useChatStorage()
  
  // Enhanced voice hooks for iOS compatibility
  const { speakText, isSpeaking, unlockAudio, preCacheIntroMessage, isUnlocked, error: voiceError, isIOS } = useEnhancedOptimizedVoice()
  
  // Debug iOS detection
  useEffect(() => {
    console.log('🍎 Main Page iOS Detection:', isIOS)
    console.log('🍎 User Agent:', navigator.userAgent)
    console.log('🍎 Platform:', navigator.platform)
    console.log('🍎 Max Touch Points:', navigator.maxTouchPoints)
  }, [isIOS])
  
  // Sync the voice hook's speaking state with Harper speaking state
  useEffect(() => {
    console.log('🔊 Voice hook isSpeaking changed:', isSpeaking)
    setIsHarperSpeaking(isSpeaking)
    
    // Automatically stop voice input when Harper starts speaking
    if (isSpeaking && isVoiceInputActive) {
      console.log('🔊 Harper started speaking, stopping voice input')
      setIsVoiceInputActive(false)
    }
  }, [isSpeaking, isVoiceInputActive])
  
  // Stable callback for speaking state changes
  const handleSpeakingChange = useCallback((isSpeaking: boolean) => {
    console.log('🔊 handleSpeakingChange called:', isSpeaking)
  }, [])

  // Error handler for unified voice
  const handleVoiceError = useCallback((error: string) => {
    console.error('🎤 Voice error:', error)
    setPermissionError(error)
    
    // Show iOS helper if it's a permission or iOS-specific error
    if (isIOS && (error.includes('microphone') || error.includes('permission') || error.includes('denied'))) {
      setIOSHelperType('microphone')
      setShowIOSHelper(true)
    } else if (isIOS && (error.includes('audio') || error.includes('locked') || error.includes('unlock'))) {
      setIOSHelperType('audio')
      setShowIOSHelper(true)
    }
  }, [isIOS])

  // Create a ref to store the callback
  const handleHarperDetectedRef = useRef<(query: string) => Promise<void>>(() => Promise.resolve())

  // Speech recognition callback wrapper
  const speechRecognitionCallback = useCallback(async (query: string) => {
    console.log('🎤 Unified voice callback called with:', query)
    if (handleHarperDetectedRef.current) {
      await handleHarperDetectedRef.current(query)
    }
  }, [])

  // Initialize unified voice system
  const unifiedVoice = useUnifiedVoice({
    onHarperDetected: speechRecognitionCallback,
    onError: handleVoiceError,
  })

  // Separate function to perform the actual session reset
  const performSessionReset = useCallback(() => {
    console.log('🔄 Performing actual session reset')
    
    // Stop all voice activities first
    unifiedVoice.stopListening()
    unifiedVoice.resetStates()
    
    // Force stop voice input if it's still active
    if (isVoiceInputActive) {
      console.log('🔄 Force stopping voice input during session reset')
      setIsVoiceInputActive(false)
    }
    
    // Reset to initial state
    setIsHarperActivated(false)
    setIsVoiceInputActive(false)
    setIsThinking(false)
    
    // Reset refs
    hasPlayedIntroRef.current = false
    isProcessingVoiceQueryRef.current = false
    hasSessionRef.current = false
    
    // End current session
    if (currentSession) {
      endSession()
    }
    
    console.log('✅ Session reset complete - ready for new user')
  }, [currentSession, endSession, unifiedVoice, isVoiceInputActive])

  // Session reset callback for feedback timeout
  const handleSessionReset = useCallback(() => {
    console.log('🔄 Resetting session to initial state')
    
    // If Harper is still speaking, delay the UI reset
    if (isHarperSpeaking) {
      console.log('🔄 Harper is still speaking - delaying UI reset')
      
      const checkSpeakingInterval = setInterval(() => {
        if (!isSpeaking) {
          console.log('🔄 Harper finished speaking - now resetting UI')
          clearInterval(checkSpeakingInterval)
          performSessionReset()
        }
      }, 100)
      
      // Timeout after 10 seconds to prevent infinite waiting
      setTimeout(() => {
        clearInterval(checkSpeakingInterval)
        performSessionReset()
      }, 10000)
      
      return
    }
    
    // If Harper is not speaking, reset immediately
    performSessionReset()
  }, [isHarperSpeaking, isSpeaking, performSessionReset])
  
  // Voice chat hook
  const { processVoiceQuery, sendIntroMessage, isProcessing } = useVoiceChat({
    sessionId: currentSession?.id || null,
    speakText,
    onSpeakingChange: handleSpeakingChange,
    onSessionReset: handleSessionReset
  })

  // Forward declaration for speech recognition
  const handleHarperDetected = useCallback(async (query: string) => {
    console.log("🏠 HOME: handleHarperDetected called with query:", query || "no query")

    // Prevent multiple activations while processing
    if (isProcessingVoiceQueryRef.current) {
      console.log("🏠 Already processing voice query, ignoring")
      return
    }

    try {
      // Create session if needed for voice processing
      let sessionId = currentSession?.id;
      if (!sessionId) {
        console.log("📝 Creating session for voice query");
        const newSession = await startNewSession({
          source: 'voice',
          timestamp: new Date().toISOString()
        });
        
        if (!newSession) {
          console.error("❌ Failed to create session for voice query");
          return;
        }
        
        sessionId = newSession.id;
        hasSessionRef.current = true;
      }

      // Set Harper as activated
      setIsHarperActivated(true);
      isProcessingVoiceQueryRef.current = true;
      
      // Process the voice query directly (intro already played on first tap)
      console.log("🎤 Processing voice query:", query);
      await processVoiceQuery(query);
    } catch (error) {
      console.error("❌ Error in handleHarperDetected:", error);
    } finally {
      isProcessingVoiceQueryRef.current = false;
    }
  }, [currentSession, startNewSession, processVoiceQuery, sendIntroMessage, isIOS])

  // Update the ref with the callback
  useEffect(() => {
    handleHarperDetectedRef.current = handleHarperDetected
  }, [handleHarperDetected])

  // Handle VoiceOrb interaction
  const handleVoiceOrbInteraction = useCallback(async () => {
    console.log('🎤 VoiceOrb interaction (iOS):', isIOS)
    
    // For iOS, we need to unlock audio first
    if (isIOS && !isUnlocked) {
      console.log('🔓 Unlocking audio for iOS...')
      try {
        const unlocked = await unlockAudio()
        if (!unlocked) {
          setIOSHelperType('audio')
          setShowIOSHelper(true)
          return
        }
      } catch (error) {
        console.error('🔓 Failed to unlock audio:', error)
        handleVoiceError('Failed to unlock audio. Please try again.')
        return
      }
    }

    if (!isHarperActivated) {
      // Initial activation - request permission and play intro
      console.log('🎤 Initial Harper activation')
      setIsHarperActivated(true)
      
      try {
        // Request permission first (only if needed)
        if (isIOS && unifiedVoice.permissionStatus === 'prompt') {
          console.log('🎤 Requesting permission (first time only)')
          const hasPermission = await unifiedVoice.requestPermission()
          if (!hasPermission) {
            setIOSHelperType('microphone')
            setShowIOSHelper(true)
            setIsHarperActivated(false)
            return
          }
        }
        
        // After permission granted, play intro message immediately
        if (!hasPlayedIntroRef.current) {
          console.log('👋 Playing Harper introduction after permission granted')
          
          // Create session for intro
          let sessionId = currentSession?.id
          if (!sessionId) {
            const newSession = await startNewSession({
              source: 'voice',
              timestamp: new Date().toISOString()
            })
            sessionId = newSession?.id || undefined
          }
          
          if (sessionId) {
            hasPlayedIntroRef.current = true
            hasSessionRef.current = true
            await sendIntroMessage(sessionId)
          }
        }
        
        // Don't start recording on first tap - just play intro
        console.log('🎤 Intro complete, ready for questions')
        
      } catch (error) {
        console.error('🎤 Failed during activation:', error)
        handleVoiceError(error instanceof Error ? error.message : 'Failed to activate Harper')
        setIsHarperActivated(false)
      }
    } else {
      // Already activated - start recording for questions
      console.log('🎤 Starting voice recording for question')
      setIsVoiceInputActive(true)
      unifiedVoice.startListening()
    }
  }, [isIOS, isUnlocked, unlockAudio, isHarperActivated, unifiedVoice, currentSession, startNewSession, sendIntroMessage, handleVoiceError])

  // Handle iOS permission helper
  const handleIOSHelperClose = useCallback(() => {
    setShowIOSHelper(false)
    setPermissionError(null)
  }, [])

  const handleIOSHelperRetry = useCallback(async () => {
    console.log('🔄 Retrying iOS setup...')
    setPermissionError(null)
    
    try {
      // Try to unlock audio and request permissions
      await unlockAudio()
      await unifiedVoice.requestPermission()
      setShowIOSHelper(false)
    } catch (error) {
      console.error('🔄 Retry failed:', error)
      setPermissionError(error instanceof Error ? error.message : 'Setup failed')
    }
  }, [unlockAudio, unifiedVoice])

  // Clean up session when page unloads
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentSession?.id) {
        console.log('🔚 Page unloading, ending session:', currentSession.id)
        const url = `/api/end-session`
        const data = JSON.stringify({ sessionId: currentSession.id })
        navigator.sendBeacon(url, data)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (currentSession?.id) {
        console.log('🔚 Component unmounting, ending session:', currentSession.id)
        endSession()
      }
    }
  }, [currentSession, endSession])

  // Pre-cache intro message and preload FFmpeg for iOS on mount
  useEffect(() => {
    preCacheIntroMessage()
    
    // Preload FFmpeg for iOS devices to speed up first audio conversion
    if (isIOS) {
      console.log('🍎 Preloading FFmpeg for iOS audio conversion...')
      audioConverter.preload().catch(error => {
        console.warn('⚠️ FFmpeg preload failed (will try again on first use):', error)
      })
    }
  }, [preCacheIntroMessage, isIOS])

  if (isSystemLocked) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center relative">
        {/* Admin Button on locked screen */}
        <div className="absolute top-6 right-6 z-10">
          <AdminButton />
        </div>
        
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">System Locked</h1>
          <p className="text-gray-300 mb-6">The system is currently locked by an administrator.</p>
          <p className="text-sm text-gray-400">Administrators can unlock the system using the admin panel in the top-right corner.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background waves */}
        <div className="absolute inset-0 pointer-events-none">
          <Waves />
        </div>

        {/* iOS Permission Helper */}
        <IOSPermissionHelper
          isVisible={showIOSHelper}
          onClose={handleIOSHelperClose}
          onRetry={handleIOSHelperRetry}
          permissionType={iosHelperType}
          error={permissionError || undefined}
        />

        {/* Admin Button */}
        <div className="absolute top-6 right-6 z-10">
          <AdminButton />
        </div>

        {/* Main content */}
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-4 text-center">
          {/* iOS indicator and debug info */}
          <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white p-2 rounded-lg text-xs max-w-xs">
            <div className="mb-1">
              🍎 iOS: {isIOS ? 'YES' : 'NO'}
            </div>
            <div className="mb-1">
              Platform: {typeof window !== 'undefined' ? navigator.platform : 'SSR'}
            </div>
            <div className="mb-1">
              Touch Points: {typeof window !== 'undefined' ? navigator.maxTouchPoints : 'SSR'}
            </div>
            <div className="text-green-300">
              User Agent: {typeof window !== 'undefined' ? navigator.userAgent.substring(0, 50) + '...' : 'SSR'}
            </div>
          </div>

          {/* Harper logo/title */}
          <div className="mb-8">
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 mb-4">
              Harper
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-2">
              Your AI Conference Assistant
            </p>
            {isIOS && (
              <p className="text-sm text-blue-300">
                Optimized for iOS devices
              </p>
            )}
          </div>

          {/* Voice Orb */}
          <div className="relative mb-8">
            <VoiceOrb
              listening={unifiedVoice.listening}
              HarperDetected={unifiedVoice.HarperDetected}
              isNavigating={unifiedVoice.isNavigating || isProcessing}
              isVoiceInputActive={isVoiceInputActive}
              onVoiceInputToggle={handleVoiceOrbInteraction}
              isChatOpen={false}
              isHarperSpeaking={isHarperSpeaking}
              isHarperActivated={isHarperActivated}
              isThinking={isThinking}
            />
          </div>

          {/* Status text */}
          <div className="min-h-[3rem] flex items-center justify-center">
            {unifiedVoice.isProcessing ? (
              <MorphingText
                texts={['Processing...', 'Transcribing...', 'Understanding...']}
                className="text-blue-300 text-lg"
              />
            ) : isHarperSpeaking ? (
              <div className="text-center">
                <p className="text-green-300 text-lg animate-pulse">Harper is speaking...</p>
                {!hasPlayedIntroRef.current && (
                  <p className="text-blue-300 text-sm mt-1">Playing introduction</p>
                )}
                {isIOS && (
                  <button
                    onClick={() => {
                      console.log('🛑 Force stop speaking')
                      setIsHarperSpeaking(false)
                      // Force stop any audio
                      if (typeof window !== 'undefined') {
                        const audios = document.querySelectorAll('audio')
                        audios.forEach(audio => {
                          audio.pause()
                          audio.currentTime = 0
                        })
                      }
                    }}
                    className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm"
                  >
                    Stop Speaking
                  </button>
                )}
              </div>
            ) : isProcessing ? (
              <MorphingText
                texts={['Thinking...', 'Analyzing...', 'Preparing response...']}
                className="text-purple-300 text-lg"
              />
            ) : isVoiceInputActive ? (
              <div className="text-center">
                <p className="text-red-300 text-lg animate-pulse">🎤 Recording - Speak now</p>
                {isIOS && (
                  <button
                    onClick={() => {
                      console.log('🛑 Manual stop requested')
                      setIsVoiceInputActive(false)
                      // Force stop recording in unified voice
                      if (unifiedVoice.listening) {
                        unifiedVoice.stopListening()
                      }
                      // Also trigger manual stop on iOS voice
                      if (typeof window !== 'undefined' && (window as any).iosVoiceInstance) {
                        (window as any).iosVoiceInstance.stopRecording()
                      }
                    }}
                    className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm"
                  >
                    Stop Recording
                  </button>
                )}
              </div>
            ) : isHarperActivated ? (
              <p className="text-blue-300 text-lg">Tap to ask Harper a question</p>
            ) : (
              <div className="text-center">
                <p className="text-gray-300 text-lg mb-2">
                  Tap to meet Harper
                </p>
                {isIOS && !isUnlocked && (
                  <p className="text-blue-300 text-sm">
                    First tap will unlock audio
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Error display */}
          {(permissionError || voiceError) && (
            <div className="mt-4 p-4 bg-red-500 bg-opacity-20 border border-red-500 rounded-lg max-w-md">
              <p className="text-red-300 text-sm">
                {permissionError || voiceError}
              </p>
              {isIOS && (
                <button
                  onClick={() => setShowIOSHelper(true)}
                  className="mt-2 text-blue-300 underline text-sm"
                >
                  Need help? Tap here
                </button>
              )}
            </div>
          )}

          {/* Debug info for voice system */}
          <div className="mt-4 p-3 bg-gray-900 bg-opacity-75 rounded-lg max-w-md text-xs text-white">
            <div className="grid grid-cols-2 gap-2">
              <div>Listening: {unifiedVoice.listening ? '✅' : '❌'}</div>
              <div>Processing: {unifiedVoice.isProcessing ? '✅' : '❌'}</div>
              <div>Harper Active: {isHarperActivated ? '✅' : '❌'}</div>
              <div>Audio Unlocked: {isUnlocked ? '✅' : '❌'}</div>
              <div>Permission: {unifiedVoice.permissionStatus || 'unknown'}</div>
              <div>Voice Input: {isVoiceInputActive ? '✅' : '❌'}</div>
            </div>
            <div className="mt-2 text-xs text-gray-300">
              Platform: {isIOS ? 'iOS' : 'Other'} | Browser: {typeof window !== 'undefined' ? navigator.userAgent.includes('firefox') ? 'Firefox' : navigator.userAgent.includes('chrome') ? 'Chrome' : navigator.userAgent.includes('safari') ? 'Safari' : 'Other' : 'SSR'} | MediaRecorder: {typeof MediaRecorder !== 'undefined' ? '✅' : '❌'} | FFmpeg: {audioConverter.isReady() ? '✅' : '⏳'}
            </div>
            {isIOS && (
              <div className="mt-2 text-xs text-yellow-300">
                Recording Debug: {unifiedVoice.listening ? '🎤 Active' : '⏸️ Stopped'} | 
                Processing: {unifiedVoice.isProcessing ? '⚙️ Yes' : '❌ No'} |
                Transcript: {unifiedVoice.transcript ? '📝 Ready' : '❌ None'}
              </div>
            )}
            {unifiedVoice.transcript && (
              <div className="mt-2 p-2 bg-blue-900 bg-opacity-50 rounded">
                <strong>Heard:</strong> {unifiedVoice.transcript}
              </div>
            )}
            {(permissionError || voiceError) && (
              <div className="mt-2 p-2 bg-red-900 bg-opacity-50 rounded">
                <strong>Error:</strong> {permissionError || voiceError}
              </div>
            )}
            
            {/* Test buttons */}
            <div className="mt-3 flex gap-2">
              <button
                onClick={async () => {
                  try {
                    await speakText("Testing iOS audio playback")
                  } catch (e) {
                    console.error('TTS test failed:', e)
                  }
                }}
                className="px-3 py-1 bg-green-600 text-white rounded text-xs"
              >
                Test Audio
              </button>
              <button
                onClick={() => unifiedVoice.toggleListening()}
                className="px-3 py-1 bg-blue-600 text-white rounded text-xs"
              >
                Test Mic
              </button>
              <button
                onClick={async () => {
                  try {
                    console.log('🧪 Testing FFmpeg...')
                    console.log('🧪 Step 1: Check if FFmpeg is ready')
                    const isReady = audioConverter.isReady()
                    console.log('🧪 FFmpeg ready:', isReady)
                    
                    if (!isReady) {
                      console.log('🧪 Step 2: Preload FFmpeg')
                      await audioConverter.preload()
                      console.log('🧪 FFmpeg preload complete')
                    }
                    
                    console.log('🧪 Step 3: Create test blob')
                    const dummyBlob = new Blob(['test'], { type: 'audio/webm' })
                    console.log('🧪 Test blob created:', dummyBlob.size, 'bytes')
                    
                    console.log('🧪 Step 4: Convert audio')
                    const result = await audioConverter.convertForDevice(dummyBlob, 'webm')
                    console.log('🧪 FFmpeg test SUCCESS:', result)
                    alert('FFmpeg test successful!')
                  } catch (e) {
                    console.error('🧪 FFmpeg test FAILED:', e)
                    alert(`FFmpeg test failed: ${e}`)
                  }
                }}
                className="px-3 py-1 bg-purple-600 text-white rounded text-xs"
              >
                Test FFmpeg
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-8 text-center max-w-2xl">
            <p className="text-gray-400 text-sm mb-4">
              Tap the button to start. Ask about speakers, sessions, locations, dining, and more!
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-xs">
              <span className="bg-gray-800 bg-opacity-50 px-3 py-1 rounded-full text-gray-400">
                "Who's speaking today?"
              </span>
              <span className="bg-gray-800 bg-opacity-50 px-3 py-1 rounded-full text-gray-400">
                "Where is the lunch?"
              </span>
              <span className="bg-gray-800 bg-opacity-50 px-3 py-1 rounded-full text-gray-400">
                "What's the WiFi password?"
              </span>
            </div>
          </div>
        </div>
      </main>
  )
}