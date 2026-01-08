import { http, HttpResponse } from 'msw'

const API_URL = 'http://localhost:8000'

// Default mock data
const mockDiagnoses = [
  {
    diagnosis: 'Test Diagnosis',
    confidence: 'high',
    source: 'NICE Guidelines',
    summary: 'This is a test diagnosis summary',
    primary_care: {
      medications: ['Paracetamol 500mg'],
      supportive_care: ['Rest', 'Hydration'],
      when_to_escalate: ['If symptoms worsen'],
    },
  },
]

export const handlers = [
  // Health check
  http.get(`${API_URL}/health`, () => {
    return HttpResponse.json({ status: 'healthy' })
  }),

  http.get(`${API_URL}/api/health`, () => {
    return HttpResponse.json({ status: 'healthy' })
  }),

  // Analyze endpoint (SSE streaming)
  http.post(`${API_URL}/api/analyze-stream`, async () => {
    // Create a streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        // Location event
        controller.enqueue(
          encoder.encode('event: location\ndata: {"country":"UK","detected":true}\n\n')
        )

        // Diagnoses event
        controller.enqueue(
          encoder.encode(
            `event: diagnoses\ndata: ${JSON.stringify({
              diagnoses: mockDiagnoses,
              drugs_pending: [],
            })}\n\n`
          )
        )

        // Complete event
        controller.enqueue(encoder.encode('event: complete\ndata: {"success":true}\n\n'))

        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }),

  // Legacy analyze endpoint (non-streaming)
  http.post(`${API_URL}/api/analyze`, async () => {
    return HttpResponse.json({
      diagnoses: mockDiagnoses,
      location: { country: 'UK', detected: true },
      success: true,
    })
  }),

  // Summarize endpoint
  http.post(`${API_URL}/api/summarize`, async () => {
    return HttpResponse.json({
      summary: 'Test consultation summary with key clinical findings.',
      consultation_data: {
        summary_data: {
          chief_complaint: 'Test complaint',
          history_of_present_illness: 'Test history',
          review_of_systems: {},
          physical_examination: {},
          assessment: 'Test assessment',
          plan: 'Test plan',
        },
      },
    })
  }),

  // Transcribe endpoint
  http.post(`${API_URL}/api/transcribe`, async () => {
    return HttpResponse.json({
      transcript: 'Test transcription result from the audio file.',
      language: 'en-IN',
      duration: 5.2,
      confidence: 0.95,
    })
  }),

  // Transcribe with diarization
  http.post(`${API_URL}/api/transcribe-diarized`, async () => {
    return HttpResponse.json({
      segments: [
        {
          speaker: 'SPEAKER_00',
          text: 'Hello, how are you feeling today?',
          start: 0.0,
          end: 2.5,
        },
        {
          speaker: 'SPEAKER_01',
          text: 'I have been having headaches for the past week.',
          start: 2.8,
          end: 5.2,
        },
      ],
      language: 'en-IN',
    })
  }),

  // Appointment status update
  http.patch(`${API_URL}/api/appointments/:id/status`, async ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      status: 'in_progress',
      updated_at: new Date().toISOString(),
    })
  }),

  // PDF generation
  http.get(`${API_URL}/api/appointments/:id/consultation-pdf`, async () => {
    const pdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46]) // PDF magic bytes
    return new Response(new Blob([pdfContent], { type: 'application/pdf' }), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="consultation.pdf"',
      },
    })
  }),

  // Feedback endpoint
  http.post(`${API_URL}/api/feedback`, async () => {
    return HttpResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
    })
  }),

  // Drug details lookup
  http.get(`${API_URL}/api/drugs/:drugName`, async ({ params }) => {
    return HttpResponse.json({
      name: params.drugName,
      bnf_url: `https://bnf.nice.org.uk/drugs/${params.drugName}`,
      interactions: [],
      contraindications: [],
      dosage: 'As directed',
    })
  }),

  // Examples endpoint
  http.get(`${API_URL}/api/examples`, async () => {
    return HttpResponse.json({
      examples: [
        {
          id: 1,
          title: 'Example Consultation',
          text: 'Patient presents with headache...',
        },
      ],
    })
  }),

  // Consultation create/update
  http.post(`${API_URL}/api/consultations`, async () => {
    return HttpResponse.json({
      id: 'test-consultation-id',
      created_at: new Date().toISOString(),
    })
  }),

  http.patch(`${API_URL}/api/consultations/:id`, async ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      updated_at: new Date().toISOString(),
    })
  }),
]

// Handler overrides for specific test scenarios
export const errorHandlers = {
  analyzeError: http.post(`${API_URL}/api/analyze-stream`, () => {
    return HttpResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }),

  transcribeError: http.post(`${API_URL}/api/transcribe`, () => {
    return HttpResponse.json({ error: 'Transcription failed' }, { status: 500 })
  }),

  networkError: http.post(`${API_URL}/api/analyze-stream`, () => {
    return HttpResponse.error()
  }),

  unauthorized: http.post(`${API_URL}/api/analyze-stream`, () => {
    return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }),
}

// Helper to create custom response handlers
export function createMockHandler<T>(
  method: 'get' | 'post' | 'patch' | 'delete',
  path: string,
  response: T,
  status = 200
) {
  const fullPath = path.startsWith('http') ? path : `${API_URL}${path}`

  switch (method) {
    case 'get':
      return http.get(fullPath, () => HttpResponse.json(response, { status }))
    case 'post':
      return http.post(fullPath, () => HttpResponse.json(response, { status }))
    case 'patch':
      return http.patch(fullPath, () => HttpResponse.json(response, { status }))
    case 'delete':
      return http.delete(fullPath, () => HttpResponse.json(response, { status }))
  }
}
