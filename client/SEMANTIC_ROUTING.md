# Semantic Routing System

## Overview
The app now uses semantic embeddings for intelligent intent detection and routing.

## How It Works

### 1. Query Processing Flow
```
User Query → Semantic Intent Detection → Route to Services → Enhanced Response
```

### 2. Intent Detection
- **211 pre-computed example embeddings** covering 7 intents:
  - `info` - Conference information, policies, badges, parking, etc.
  - `meeting` - Committee meetings and councils
  - `workshop` - Workshops, training sessions, speakers
  - `exhibitor` - Vendors, booths, sponsors
  - `conference` - Schedule, events, tours
  - `location` - Venue navigation, rooms
  - `venue` - External places (restaurants, hotels)

### 3. Context Awareness
The system tracks conversation context to handle follow-up questions:
- "Tell me more about that" → Uses last topic
- "When is it?" → References previous entity
- "What about parking?" → Continues from last query

### 4. Service Routing Based on Intent

#### Info Intent → Conference Info Service
- Badges, parking, ADA assistance
- Lost & found, policies
- Business services, social media

#### Meeting Intent → Committee Meetings Service
- Committee schedules
- Meeting locations and times

#### Workshop Intent → Workshop Search Service
- Session search
- Speaker lookup
- CE credit workshops

#### Exhibitor Intent → Exhibitor Search Service
- Company search
- Booth locations
- Product categories

#### Conference Intent → Schedule Service
- Daily agendas
- Event times
- Facility tours

#### Location Intent → Room/Navigation
- Room locations
- Venue navigation

#### Venue Intent → Location Service
- Nearby restaurants
- Hotels
- Local attractions

### 5. Embedding Usage

1. **Query Embedding Generation**:
   - Server-side: Direct OpenAI API call
   - Client-side: `/api/embeddings` endpoint

2. **Semantic Matching**:
   - Cosine similarity with 211 examples
   - Confidence threshold: 0.5
   - Fallback to keyword matching if needed

3. **Service Integration**:
   - Intent determines which services to call
   - Services use their own embeddings for detailed search
   - No duplicate embedding generation

### 6. Follow-up Question Handling

Examples:
- User: "Where can I park?"
- Bot: [parking info]
- User: "How much does it cost?" ← System knows this refers to parking

The context service:
- Tracks last query, intent, topic, entities
- Expires after 5 minutes
- Enhances pronouns with actual topics

### 7. Performance Optimizations

- **Pre-computed embeddings** stored locally (6.62 MB minified)
- **Single embedding generation** per query
- **Intent-based service routing** prevents unnecessary API calls
- **Context caching** for follow-up questions

## Testing Semantic Intent

To verify it's working, look for these logs:
- `✅ Loaded intent embeddings for semantic routing`
- `✅ Generated embedding server-side/client-side`
- `🎯 Semantic Intent: "query" -> intent (confidence: X.XX)`
- `🔄 Context check: {original, enhanced, isFollowUp}`

## Example Queries That Work Better Now

### Before (Keyword Matching)
- "I lost something" → Might not match
- "Where's coffee?" → Might not match venue

### After (Semantic Matching)
- "I lost something" → `info` intent → Lost & found info
- "Where's coffee?" → `info` or `venue` intent → Food service info
- "Tell me about accessibility" → `info` intent → ADA assistance
- "What vendors are here?" → `exhibitor` intent → Exhibitor list

## Files Involved

- `/src/services/semantic-router.service.ts` - Core routing logic
- `/src/services/semantic-intent-detector.service.ts` - Intent detection
- `/src/services/conversation-context.service.ts` - Context tracking
- `/src/data/intent-embeddings.json` - Pre-computed embeddings
- `/src/services/prompt-enhancement.service.ts` - Service orchestration
- `/app/api/embeddings/route.ts` - Embedding generation endpoint