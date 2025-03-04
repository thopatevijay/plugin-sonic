import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ethers } from 'ethers'
import { Memory, IAgentRuntime } from '@elizaos/core'
import { getBalance } from '../actions/getBalance'

// Mock the ethers provider
vi.mock('ethers', () => ({
  JsonRpcProvider: vi.fn(),
  formatEther: vi.fn(),
}))

// Mock runtime
const mockRuntime = {
  composeState: vi.fn(),
  updateRecentMessageState: vi.fn(),
  getSetting: vi.fn(),
  elizaLogger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}

describe('getBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should validate successfully', async () => {
    const result = await getBalance.validate(mockRuntime as unknown as IAgentRuntime, {} as Memory  )
    expect(result).toBe(true)
  })

})
