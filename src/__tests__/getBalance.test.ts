import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ethers } from 'ethers'
import { Memory, IAgentRuntime, State, ModelClass } from '@elizaos/core'
import { getBalance } from '../actions/getBalance'

// Mock the core module functions
vi.mock('@elizaos/core', async () => {
  const actual = await vi.importActual('@elizaos/core')
  return {
    ...actual,
    generateObjectDeprecated: vi.fn(),
    composeContext: vi.fn(),
  }
})

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
} as unknown as IAgentRuntime

describe('getBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should validate successfully', async () => {
    const result = await getBalance.validate(mockRuntime, {} as Memory)
    expect(result).toBe(true)
  })

  it('should fail when no wallet address is provided', async () => {
    // Mock the necessary functions
    const { generateObjectDeprecated } = await import('@elizaos/core')
    vi.mocked(generateObjectDeprecated).mockResolvedValue({ address: '' })
    vi.mocked(mockRuntime.composeState).mockResolvedValue({} as State)
    const mockCallback = vi.fn()

    const result = await getBalance.handler(
      mockRuntime,
      {} as Memory,
      undefined,
      {},
      mockCallback
    )

    expect(result).toBe(false)
    expect(mockCallback).toHaveBeenCalledWith({
      text: "I need a wallet address to check the balance. Please provide a wallet address.",
      content: { error: "Missing wallet address" }
    })
  })
})
