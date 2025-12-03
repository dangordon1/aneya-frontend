# Real-Time Streaming Implementation Plan

## Goal
Provide real-time progress updates to the frontend as the backend processes the clinical consultation, allowing users to see:
1. Location detection results
2. Guidelines being searched
3. Diagnoses as they're identified
4. BNF drug lookups with loading states
5. Incremental report rendering

## Architecture Overview

### Backend: Server-Sent Events (SSE)
- New endpoint: `POST /api/analyze-stream`
- Streams progress events to frontend
- Events include: location, progress, diagnosis, bnf_drug, complete, error

### Frontend: EventSource API
- Connect to SSE endpoint
- Update UI progressively as events arrive
- Show partial results immediately
- Display loading states for pending data

## Implementation Steps

### Phase 1: Backend SSE Endpoint ✓ (Started)

**File**: `api.py`

**Status**: Basic structure added

**Events to emit**:
```javascript
// Event types
{
  "start": {"message": "Starting analysis..."},
  "location": {"country": "India", "country_code": "IN", "ip": "..."},
  "progress": {"step": "validating|analyzing|searching|bnf", "message": "..."},
  "diagnosis": {
    "diagnosis": "Intrahepatic Cholestasis of Pregnancy",
    "confidence": "high",
    "source": "PubMed",
    "url": "...",
    "summary": "..."
  },
  "bnf_drug": {"medication": "ursodeoxycholic acid", "status": "looking_up|complete"},
  "complete": {full_result_object},
  "error": {"type": "invalid_input", "message": "..."},
  "done": {"message": "Analysis complete"}
}
```

**Needed improvements**:
1. Add more granular progress events during guideline searches
2. Emit diagnosis events as soon as Claude identifies them (before BNF lookup)
3. Emit bnf_drug events with "looking_up" status before fetching, then "complete" after

### Phase 2: Frontend EventSource Integration

**File**: `frontend/src/App.tsx`

**Changes needed**:
```typescript
const handleAnalyze = async (consultation: string, patientDetails: PatientDetails) => {
  setCurrentScreen('progress');

  // Use EventSource for streaming
  const eventSource = new EventSource(
    `${API_URL}/api/analyze-stream`,
    {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        consultation,
        patient_name: patientDetails.name,
        // ...
      })
    }
  );

  eventSource.addEventListener('location', (e) => {
    const data = JSON.parse(e.data);
    setDetectedLocation(data);
  });

  eventSource.addEventListener('progress', (e) => {
    const data = JSON.parse(e.data);
    setProgressMessage(data.message);
  });

  eventSource.addEventListener('diagnosis', (e) => {
    const data = JSON.parse(e.data);
    // Add diagnosis to partial results
    setPartialDiagnoses(prev => [...prev, data]);
    // Show report screen with partial results
    setCurrentScreen('report');
  });

  eventSource.addEventListener('bnf_drug', (e) => {
    const data = JSON.parse(e.data);
    // Update drug lookup status
    updateDrugStatus(data);
  });

  eventSource.addEventListener('complete', (e) => {
    const data = JSON.parse(e.data);
    setAnalysisResult(data);
    eventSource.close();
  });

  eventSource.addEventListener('error', (e) => {
    const data = JSON.parse(e.data);
    alert(data.message);
    eventSource.close();
    setCurrentScreen('input');
  });
};
```

**Note**: EventSource doesn't support POST. Need to use `fetch()` with streaming instead:

```typescript
const response = await fetch(`${API_URL}/api/analyze-stream`, {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({...})
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const {done, value} = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const events = chunk.split('\n\n');

  for (const event of events) {
    if (!event.trim()) continue;

    const [eventLine, dataLine] = event.split('\n');
    const eventType = eventLine.replace('event: ', '');
    const data = JSON.parse(dataLine.replace('data: ', ''));

    handleEvent(eventType, data);
  }
}
```

### Phase 3: Progressive UI Updates

#### ProgressScreen Updates
**File**: `frontend/src/components/ProgressScreen.tsx`

**New features**:
```typescript
interface ProgressScreenProps {
  detectedLocation?: {country: string, country_code: string};
  currentStep?: string;
  guidelinesSearched?: string[];
}

// Show detected location
{detectedLocation && (
  <div className="location-badge">
    📍 {detectedLocation.country}
  </div>
)}

// Show current step
{currentStep && (
  <div className="current-step">
    {currentStep}
  </div>
)}

// Show guidelines being searched
{guidelinesSearched && guidelinesSearched.length > 0 && (
  <div className="guidelines-list">
    <h4>Searching Guidelines:</h4>
    {guidelinesSearched.map(g => (
      <div key={g} className="guideline-item">✓ {g}</div>
    ))}
  </div>
)}
```

#### ReportScreen Partial Results
**File**: `frontend/src/components/ReportScreen.tsx`

**Changes**:
1. Accept partial results prop
2. Show diagnoses immediately when received
3. Show loading states for treatments section
4. Update treatments as BNF data arrives

```typescript
interface Treatment {
  name: string;
  medications: Array<{
    name: string;
    status: 'loading' | 'complete';
    details?: {...};
  }>;
}

// In treatments section
{treatment.medications.map(med => (
  med.status === 'loading' ? (
    <div className="drug-loading">
      <Loader /> Looking up {med.name} in BNF...
    </div>
  ) : (
    <DrugDetails drug={med} />
  )
))}
```

### Phase 4: Backend Granular Progress

**File**: `servers/clinical_decision_support/client.py`

**Add progress callback parameter**:
```python
async def clinical_decision_support(
    self,
    clinical_scenario: str,
    progress_callback: Optional[Callable] = None,
    ...
):
    # Emit events at key points
    if progress_callback:
        await progress_callback("step", {"message": "Validating input..."})

    # After validation
    if progress_callback:
        await progress_callback("step", {"message": "Searching guidelines..."})

    # When tool is called
    if progress_callback:
        await progress_callback("tool", {"name": tool_name, "params": params})

    # When diagnosis identified
    if progress_callback:
        await progress_callback("diagnosis", diagnosis_data)

    # Before BNF lookup
    if progress_callback:
        await progress_callback("bnf_lookup", {"drug": drug_name, "status": "starting"})

    # After BNF lookup
    if progress_callback:
        await progress_callback("bnf_lookup", {"drug": drug_name, "status": "complete", "data": ...})
```

## Event Flow Example

```
User submits consultation
  ↓
1. SSE: start
2. SSE: progress (geolocation)
3. SSE: location (India, IN)
4. SSE: progress (connecting to servers)
5. SSE: progress (validating input)
6. SSE: progress (analyzing with AI)
7. SSE: progress (searching guidelines)
   - FOGSI guidelines
   - PubMed articles
8. SSE: diagnosis #1 (Intrahepatic Cholestasis)
   → Frontend shows report with diagnosis #1
9. SSE: diagnosis #2 (if multiple)
10. SSE: progress (looking up BNF)
11. SSE: bnf_drug (ursodeoxycholic acid, looking_up)
   → Frontend shows "Looking up..." with spinner
12. SSE: bnf_drug (ursodeoxycholic acid, complete, data...)
   → Frontend shows full drug details
13. SSE: bnf_drug (bezafibrate, looking_up)
14. SSE: bnf_drug (bezafibrate, complete, data...)
15. SSE: complete (full result)
16. SSE: done
```

## Benefits

1. **Perceived Performance**: Users see progress immediately
2. **Better UX**: No black box waiting - transparent process
3. **Early Access**: Can read diagnosis while treatments load
4. **Location Awareness**: Users see their region being used
5. **Educational**: Users understand what guidelines are being consulted

## Testing Checklist

- [ ] SSE endpoint returns proper event stream format
- [ ] Events are sent in correct order
- [ ] Frontend properly parses SSE events
- [ ] UI updates progressively with each event
- [ ] Loading states show correctly
- [ ] Error handling works for invalid input
- [ ] Connection closes properly on completion
- [ ] Works across different browsers
- [ ] Mobile compatibility
- [ ] Network interruption handling

## Alternative: WebSockets

If SSE proves problematic (some proxies/load balancers don't handle well), can use WebSockets instead:

**Pros**:
- Bidirectional communication
- Better browser support
- More control over connection

**Cons**:
- More complex setup
- Need WebSocket library (fastapi-websocket)
- Requires connection state management

## Files to Modify

### Backend
- [x] `api.py` - Add `/api/analyze-stream` endpoint (basic structure added)
- [ ] `servers/clinical_decision_support/client.py` - Add progress_callback parameter
- [ ] Add granular progress events throughout workflow

### Frontend
- [ ] `src/App.tsx` - Use streaming endpoint, handle SSE events
- [ ] `src/components/ProgressScreen.tsx` - Show location, steps, guidelines
- [ ] `src/components/ReportScreen.tsx` - Handle partial results, loading states
- [ ] `src/types.ts` - Add types for streaming events

### Documentation
- [ ] Update API documentation with streaming endpoint
- [ ] Add examples of SSE consumption
- [ ] Document event types and payloads

## Next Steps

1. Complete backend SSE implementation with granular events
2. Test SSE endpoint manually with curl/Postman
3. Implement frontend SSE consumption
4. Update UI components for progressive rendering
5. End-to-end testing
6. Deploy and verify in production

## Estimated Effort

- Backend completion: 2-3 hours
- Frontend implementation: 3-4 hours
- Testing & refinement: 2-3 hours
- **Total**: 7-10 hours

## Notes

- Keep regular `/api/analyze` endpoint for backward compatibility
- SSE requires HTTP/1.1 (not HTTP/2 multiplexing)
- Consider rate limiting for streaming endpoints
- Monitor server resource usage with streaming connections
