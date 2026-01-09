import { vi } from 'vitest'

// WebSocket ready states
export const WebSocketReadyState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
} as const

// Mock WebSocket class
export class MockWebSocket {
  static instances: MockWebSocket[] = []
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  url: string
  readyState: number = WebSocketReadyState.CONNECTING
  protocol: string = ''
  extensions: string = ''
  bufferedAmount: number = 0
  binaryType: BinaryType = 'blob'

  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  send = vi.fn()
  close = vi.fn(() => {
    this.readyState = WebSocketReadyState.CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: 1000, reason: 'Normal closure' }))
    }
  })

  addEventListener = vi.fn((event: string, handler: EventListener) => {
    switch (event) {
      case 'open':
        this.onopen = handler as (event: Event) => void
        break
      case 'close':
        this.onclose = handler as (event: CloseEvent) => void
        break
      case 'message':
        this.onmessage = handler as (event: MessageEvent) => void
        break
      case 'error':
        this.onerror = handler as (event: Event) => void
        break
    }
  })

  removeEventListener = vi.fn()
  dispatchEvent = vi.fn().mockReturnValue(true)

  constructor(url: string, protocols?: string | string[]) {
    this.url = url
    if (protocols) {
      this.protocol = Array.isArray(protocols) ? protocols[0] : protocols
    }
    MockWebSocket.instances.push(this)

    // Simulate async connection (use setTimeout to allow tests to set up handlers)
    setTimeout(() => {
      this.readyState = WebSocketReadyState.OPEN
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 0)
  }

  // Helper methods for tests

  /**
   * Simulate receiving a message from the server
   */
  simulateMessage(data: unknown) {
    if (this.onmessage) {
      const messageData = typeof data === 'string' ? data : JSON.stringify(data)
      this.onmessage(new MessageEvent('message', { data: messageData }))
    }
  }

  /**
   * Simulate a binary message from the server
   */
  simulateBinaryMessage(data: ArrayBuffer | Blob) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }))
    }
  }

  /**
   * Simulate a WebSocket error
   */
  simulateError(error?: unknown) {
    this.readyState = WebSocketReadyState.CLOSED
    if (this.onerror) {
      const errorEvent = new Event('error')
      if (error) {
        Object.assign(errorEvent, { error })
      }
      this.onerror(errorEvent)
    }
  }

  /**
   * Simulate the connection closing
   */
  simulateClose(code = 1000, reason = 'Normal closure') {
    this.readyState = WebSocketReadyState.CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason, wasClean: code === 1000 }))
    }
  }

  /**
   * Simulate the connection opening (if not already)
   */
  simulateOpen() {
    this.readyState = WebSocketReadyState.OPEN
    if (this.onopen) {
      this.onopen(new Event('open'))
    }
  }

  /**
   * Get all messages sent through this WebSocket
   */
  getSentMessages(): unknown[] {
    return this.send.mock.calls.map(call => {
      const data = call[0]
      if (typeof data === 'string') {
        try {
          return JSON.parse(data)
        } catch {
          return data
        }
      }
      return data
    })
  }

  // Static helper methods

  /**
   * Reset all instances
   */
  static reset() {
    MockWebSocket.instances = []
  }

  /**
   * Get the most recently created WebSocket instance
   */
  static getLastInstance(): MockWebSocket | undefined {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1]
  }

  /**
   * Get all WebSocket instances
   */
  static getAllInstances(): MockWebSocket[] {
    return MockWebSocket.instances
  }

  /**
   * Get instance by URL (partial match)
   */
  static getInstanceByUrl(urlPart: string): MockWebSocket | undefined {
    return MockWebSocket.instances.find(ws => ws.url.includes(urlPart))
  }
}

/**
 * Install the WebSocket mock globally
 * Returns a cleanup function to restore the original WebSocket
 */
export function installWebSocketMock(): () => void {
  const originalWebSocket = globalThis.WebSocket
  ;(globalThis as typeof globalThis & { WebSocket: unknown }).WebSocket = MockWebSocket as unknown as typeof WebSocket

  return () => {
    ;(globalThis as typeof globalThis & { WebSocket: unknown }).WebSocket = originalWebSocket
    MockWebSocket.reset()
  }
}

/**
 * Create a pre-configured WebSocket mock for specific test scenarios
 */
export function createWebSocketMock(options: {
  autoConnect?: boolean
  messages?: unknown[]
} = {}): MockWebSocket {
  const ws = new MockWebSocket('wss://test.example.com')

  if (options.autoConnect !== false) {
    // Already auto-connects in constructor
  }

  if (options.messages) {
    // Schedule messages to be sent after connection
    setTimeout(() => {
      options.messages?.forEach((msg, i) => {
        setTimeout(() => ws.simulateMessage(msg), i * 10)
      })
    }, 10)
  }

  return ws
}
