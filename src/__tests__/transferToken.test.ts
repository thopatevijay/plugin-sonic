import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Memory, IAgentRuntime, ModelClass, State } from '@elizaos/core'
import { transferToken } from '../actions/transferToken/transferToken'

// Mock the core module functions
vi.mock('@elizaos/core', async () => {
    const actual = await vi.importActual('@elizaos/core')
    return {
        ...actual,
        generateObjectDeprecated: vi.fn(),
        composeContext: vi.fn(),
        elizaLogger: {
            info: vi.fn(),
            error: vi.fn(),
        }
    }
})

// Mock ethers
vi.mock('ethers', () => ({
    ethers: {
        JsonRpcProvider: vi.fn(() => ({
            getBalance: vi.fn()
        })),
        Wallet: vi.fn(() => ({
            sendTransaction: vi.fn(),
        })),
        parseEther: vi.fn()
    }
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

describe('transferToken', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should fail validation when SONIC_WALLET_PRIVATE_KEY is not provided', async () => {
        // Mock getSetting to return undefined for SONIC_WALLET_PRIVATE_KEY
        vi.mocked(mockRuntime.getSetting).mockReturnValue(null)

        const result = await transferToken.validate(mockRuntime, {} as Memory)
        expect(result).toBe(false)
    })

    it('should pass validation when SONIC_WALLET_PRIVATE_KEY is provided', async () => {
        // Mock getSetting to return a private key
        vi.mocked(mockRuntime.getSetting).mockReturnValue('mock-private-key')

        const result = await transferToken.validate(mockRuntime, {} as Memory)
        expect(result).toBe(true)
    })
}) 