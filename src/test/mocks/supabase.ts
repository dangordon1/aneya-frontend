import { vi } from 'vitest'

// Type for mock data configuration
interface MockTableConfig {
  data?: unknown[]
  error?: { message: string; code?: string } | null
}

// Create chainable mock query builder
function createQueryBuilder(mockData: unknown[] = [], mockError: { message: string; code?: string } | null = null) {
  const resolvedValue = { data: mockData, error: mockError }
  const singleValue = {
    data: Array.isArray(mockData) ? mockData[0] || null : mockData,
    error: mockError
  }

  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    overlaps: vi.fn().mockReturnThis(),
    textSearch: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    and: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(singleValue),
    maybeSingle: vi.fn().mockResolvedValue(singleValue),
    csv: vi.fn().mockReturnThis(),
    returns: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: (value: typeof resolvedValue) => void) => {
      resolve(resolvedValue)
      return Promise.resolve(resolvedValue)
    }),
  }

  // Make the query builder thenable (for await)
  Object.defineProperty(queryBuilder, 'then', {
    value: (onFulfilled?: (value: typeof resolvedValue) => unknown) => {
      return Promise.resolve(resolvedValue).then(onFulfilled)
    },
  })

  return queryBuilder
}

// Type for the mock Supabase client
type MockSupabaseClient = {
  from: ReturnType<typeof vi.fn>
  auth: {
    getSession: ReturnType<typeof vi.fn>
    getUser: ReturnType<typeof vi.fn>
    signIn: ReturnType<typeof vi.fn>
    signOut: ReturnType<typeof vi.fn>
    onAuthStateChange: ReturnType<typeof vi.fn>
  }
  channel: ReturnType<typeof vi.fn>
  removeChannel: ReturnType<typeof vi.fn>
  rpc: ReturnType<typeof vi.fn>
  storage: {
    from: ReturnType<typeof vi.fn>
  }
}

// Mock Supabase client
export const mockSupabaseClient: MockSupabaseClient = {
  from: vi.fn((_table: string) => createQueryBuilder()),
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signIn: vi.fn().mockResolvedValue({ data: null, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
  },
  channel: vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
  }),
  removeChannel: vi.fn(),
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
      download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/test' } }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
}

// Factory for creating configured mocks with specific table data
export function createSupabaseMock(config: {
  tables?: Record<string, MockTableConfig>
} = {}): MockSupabaseClient {
  const mock = { ...mockSupabaseClient }

  if (config.tables) {
    mock.from = vi.fn((table: string) => {
      const tableConfig = config.tables?.[table] || {}
      return createQueryBuilder(tableConfig.data || [], tableConfig.error || null)
    })
  }

  return mock
}

// Helper to configure specific table responses
export function mockSupabaseTable(
  tableName: string,
  data: unknown[] = [],
  error: { message: string; code?: string } | null = null
) {
  mockSupabaseClient.from = vi.fn((table: string) => {
    if (table === tableName) {
      return createQueryBuilder(data, error)
    }
    return createQueryBuilder()
  })
}

// Helper to reset all mocks
export function resetSupabaseMocks() {
  vi.clearAllMocks()
  mockSupabaseClient.from = vi.fn((_table: string) => createQueryBuilder())
}

// Default export for vi.mock
export const supabase = mockSupabaseClient
