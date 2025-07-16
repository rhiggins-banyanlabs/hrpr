# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

The project uses Next.js with TypeScript for the frontend. All commands should be run from the `client/` directory:

```bash
cd client
npm run dev      # Start development server (localhost:3000)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

For Docker development:
```bash
docker compose up --build    # Run with hot reload
```

## Architecture Overview

Beacon is a voice-enabled conference chatbot built with Next.js and TypeScript. The architecture consists of:

### AI Service
- **Core Service**: `src/services/openai.service.ts` - OpenAI GPT-4o-mini integration
- **Configuration**: `src/config/env.config.ts` - Environment configuration for OpenAI API
- **Caching**: Built-in caching for instant responses via `cache.service.ts`
- **Enhancement**: Conference data and location service integration for contextual responses

### Voice & Chat System
- **Voice Components**: `src/features/voice/` - Voice input/output with speech recognition
- **Chat Hook**: `src/hooks/useChat.ts` - Unified chat logic with typing effects and OpenAI integration
- **Voice Orb**: `src/features/voice/components/VoiceOrb.tsx` - Interactive voice UI component
- **Chat Storage**: `src/lib/supabase/` - Supabase integration for message persistence

### Conference Data Enhancement
- **Conference Service**: `src/services/conference-data.service.ts` - Loads speaker/session data
- **Location Service**: `src/services/location.service.ts` - Google Maps integration for venue info
- **Prompt Enhancement**: `src/services/prompt-enhancement.service.ts` - Enriches prompts with conference context

### Admin System
- **Admin Components**: `src/components/admin/` - Analytics, chat sessions, conference management
- **Database Analytics**: Real-time chat analytics and performance metrics
- **Security**: Admin authentication with protected routes

## Key Configuration

### Environment Variables
Required environment variables for full functionality:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase database URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `OPENAI_API_KEY` - OpenAI API access for GPT-4o-mini
- `GOOGLE_MAPS_API_KEY` - Google Maps integration for location services

### AI Provider
The application uses OpenAI's GPT-4o-mini model for all chat interactions:
- **Model**: GPT-4o-mini - Cost-effective with high performance
- **Features**: Conference data enhancement, location services integration
- **Response limit**: 300 tokens for optimal performance

## Development Patterns

### Chat Messages
Use the `useChat` hook for all chat functionality. It handles:
- Message persistence to Supabase
- Voice transcription integration
- OpenAI integration with conference data enhancement
- Typing effects synchronized with text-to-speech

### Voice Integration
Voice features use the `VoiceOrb` component with:
- Wake word detection ("Hey Harper")
- Speech-to-text transcription
- Text-to-speech with multiple voice options
- Visual feedback for recording states

### Admin Features
Admin functionality requires:
- Session-based authentication
- Real-time analytics updates
- Conference data management
- Chat session monitoring

## Testing

Currently uses Next.js built-in linting. Run tests with:
```bash
npm run lint
```

## Database Schema

Uses Supabase with tables for:
- `chat_sessions` - User chat sessions
- `chat_messages` - Individual messages with metadata
- `analytics_events` - User interaction tracking
- Conference data (speakers, sessions, schedule)