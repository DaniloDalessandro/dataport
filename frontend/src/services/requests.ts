export interface Request {
  id: number
  title: string
  description: string
  status: string
  created_at: string
}

export async function getRequests(): Promise<Request[]> {
  // TODO: Implement API call
  return []
}

export async function getRequest(id: number): Promise<Request | null> {
  // TODO: Implement API call
  return null
}

export async function createRequest(data: Partial<Request>): Promise<Request> {
  // TODO: Implement API call
  throw new Error('Not implemented')
}

export async function updateRequest(id: number, data: Partial<Request>): Promise<Request> {
  // TODO: Implement API call
  throw new Error('Not implemented')
}

export async function deleteRequest(id: number): Promise<void> {
  // TODO: Implement API call
}
