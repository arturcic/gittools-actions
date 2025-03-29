import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as os from 'node:os'
import * as path from 'node:path'
import * as fs from 'node:fs/promises'
import { DotnetTool, ISettingsProvider } from '@tools/common'
import { IBuildAgent } from '@agents/common'
import { Dirent } from 'node:fs'

// Mock modules
vi.mock('node:os')
vi.mock('node:fs/promises')

// Create a test implementation of the abstract class
class TestDotnetTool extends DotnetTool {
    get packageName(): string {
        return 'test-package'
    }

    get toolName(): string {
        return 'test-tool'
    }

    get toolPathVariable(): string {
        return 'TEST_TOOL_PATH'
    }

    get versionRange(): string | null {
        return null
    }

    get settingsProvider(): ISettingsProvider {
        return {
            getSetupSettings: () => ({
                versionSpec: '1.0.0',
                includePrerelease: false,
                preferLatestVersion: false,
                ignoreFailedSources: false
            })
        }
    }

    // Expose protected methods for testing
    async testFindToolExecutable(toolBasePath: string): Promise<string | null> {
        return this.findToolExecutable(toolBasePath)
    }
}

describe('DotnetTool', () => {
    let buildAgent: IBuildAgent
    let tool: TestDotnetTool

    beforeEach(() => {
        // Reset mocks
        vi.resetAllMocks()

        // Mock build agent with proper typing for vi.fn()
        const mockFileExists = vi.fn().mockResolvedValue(false)
        const mockInfo = vi.fn()
        const mockDebug = vi.fn()
        const mockSetVariable = vi.fn()

        buildAgent = {
            info: mockInfo,
            debug: mockDebug,
            warning: vi.fn(),
            error: vi.fn(),
            setSucceeded: vi.fn(),
            setFailed: vi.fn(),
            getInput: vi.fn(),
            getBooleanInput: vi.fn(),
            setOutput: vi.fn(),
            setVariable: mockSetVariable,
            getVariable: vi.fn().mockReturnValue(undefined),
            getVariableAsPath: vi.fn(),
            addPath: vi.fn(),
            which: vi.fn(),
            exec: vi.fn().mockResolvedValue({ code: 0, stdout: '', stderr: '' }),
            getExecOutput: vi.fn(),
            fileExists: mockFileExists,
            directoryExists: vi.fn(),
            findLocalTool: vi.fn(),
            cacheToolDirectory: vi.fn(),
            removeDirectory: vi.fn(),
            sourceDir: '/source',
            tempDir: '/temp',
            workDir: '/work',
            runnerDir: '/runner'
        } as unknown as IBuildAgent

        tool = new TestDotnetTool(buildAgent)
    })

    describe('findToolExecutable', () => {
        it('should return tool path when executable exists in base path', async () => {
            const basePath = '/tools/test-tool'
            const mockFileExists = vi.fn().mockImplementation(async (filePath: string) => {
                return Promise.resolve(filePath === path.join(basePath, 'test-tool'))
            })

            // Type cast to access mock properties
            buildAgent.fileExists = mockFileExists as unknown as typeof buildAgent.fileExists

            const result = await tool.testFindToolExecutable(basePath)

            expect(result).toBe(path.join(basePath, 'test-tool'))
            expect(mockFileExists).toHaveBeenCalledWith(path.join(basePath, 'test-tool'))
        })

        it('should return windows executable path when on windows', async () => {
            vi.mocked(os.platform).mockReturnValue('win32')
            const basePath = '/tools/test-tool'
            const mockFileExists = vi.fn().mockImplementation(async (filePath: string) => {
                return Promise.resolve(filePath === path.join(basePath, 'test-tool.exe'))
            })

            buildAgent.fileExists = mockFileExists as unknown as typeof buildAgent.fileExists

            const result = await tool.testFindToolExecutable(basePath)

            expect(result).toBe(path.join(basePath, 'test-tool.exe'))
            expect(mockFileExists).toHaveBeenCalledWith(path.join(basePath, 'test-tool.exe'))
        })

        it('should check architecture-specific paths for x64', async () => {
            vi.mocked(os.arch).mockReturnValue('x64')
            vi.mocked(os.platform).mockReturnValue('linux')

            const basePath = '/tools/test-tool'
            const x64Path = path.join(basePath, 'x64', 'test-tool')

            const mockFileExists = vi.fn().mockImplementation(async (filePath: string) => {
                return Promise.resolve(filePath === x64Path)
            })

            buildAgent.fileExists = mockFileExists as unknown as typeof buildAgent.fileExists

            const result = await tool.testFindToolExecutable(basePath)

            expect(result).toBe(x64Path)

            const calls = mockFileExists.mock.calls
            expect(calls.some(call => call[0] === path.join(basePath, 'test-tool'))).toBe(true)
            expect(calls.some(call => call[0] === x64Path)).toBe(true)
        })

        it('should check architecture-specific paths for arm64', async () => {
            vi.mocked(os.arch).mockReturnValue('arm64')
            vi.mocked(os.platform).mockReturnValue('linux')

            const basePath = '/tools/test-tool'
            const arm64Path = path.join(basePath, 'arm64', 'test-tool')

            const mockFileExists = vi.fn().mockImplementation(async (filePath: string) => {
                return Promise.resolve(filePath === arm64Path)
            })

            buildAgent.fileExists = mockFileExists as unknown as typeof buildAgent.fileExists

            const result = await tool.testFindToolExecutable(basePath)

            expect(result).toBe(arm64Path)

            const calls = mockFileExists.mock.calls
            expect(calls.some(call => call[0] === path.join(basePath, 'test-tool'))).toBe(true)
            expect(calls.some(call => call[0] === arm64Path)).toBe(true)
        })

        it('should check macOS-specific paths for x64', async () => {
            vi.mocked(os.arch).mockReturnValue('x64')
            vi.mocked(os.platform).mockReturnValue('darwin')

            const basePath = '/tools/test-tool'
            const osxX64Path = path.join(basePath, 'osx-x64', 'test-tool')

            const mockFileExists = vi.fn().mockImplementation(async (filePath: string) => {
                return Promise.resolve(filePath === osxX64Path)
            })

            buildAgent.fileExists = mockFileExists as unknown as typeof buildAgent.fileExists

            const result = await tool.testFindToolExecutable(basePath)

            expect(result).toBe(osxX64Path)

            const calls = mockFileExists.mock.calls
            expect(calls.some(call => call[0] === path.join(basePath, 'test-tool'))).toBe(true)
            expect(calls.some(call => call[0] === path.join(basePath, 'x64', 'test-tool'))).toBe(true)
            expect(calls.some(call => call[0] === osxX64Path)).toBe(true)
        })

        it('should check macOS-specific paths for arm64', async () => {
            vi.mocked(os.arch).mockReturnValue('arm64')
            vi.mocked(os.platform).mockReturnValue('darwin')

            const basePath = '/tools/test-tool'
            const osxArm64Path = path.join(basePath, 'osx-arm64', 'test-tool')

            const mockFileExists = vi.fn().mockImplementation(async (filePath: string) => {
                return Promise.resolve(filePath === osxArm64Path)
            })

            buildAgent.fileExists = mockFileExists as unknown as typeof buildAgent.fileExists

            const result = await tool.testFindToolExecutable(basePath)

            expect(result).toBe(osxArm64Path)

            const calls = mockFileExists.mock.calls
            expect(calls.some(call => call[0] === path.join(basePath, 'test-tool'))).toBe(true)
            expect(calls.some(call => call[0] === path.join(basePath, 'arm64', 'test-tool'))).toBe(true)
            expect(calls.some(call => call[0] === osxArm64Path)).toBe(true)
        })

        it('should search subdirectories as fallback', async () => {
            vi.mocked(os.arch).mockReturnValue('x64')
            vi.mocked(os.platform).mockReturnValue('linux')

            const basePath = '/tools/test-tool'
            const customDirPath = path.join(basePath, 'custom-dir', 'test-tool')

            // Mock file does not exist in standard locations
            const mockFileExists = vi.fn().mockImplementation(async (filePath: string) => {
                return Promise.resolve(filePath === customDirPath)
            })

            buildAgent.fileExists = mockFileExists as unknown as typeof buildAgent.fileExists

            // Mock directory listing
            vi.mocked(fs.readdir).mockResolvedValue([
                { name: 'custom-dir', isDirectory: () => true } as unknown as Dirent,
                { name: 'not-a-dir', isDirectory: () => false } as unknown as Dirent
            ])

            const result = await tool.testFindToolExecutable(basePath)

            expect(result).toBe(customDirPath)
            expect(fs.readdir).toHaveBeenCalledWith(basePath, { withFileTypes: true })
            expect(mockFileExists).toHaveBeenCalledWith(customDirPath)
        })

        it('should handle errors when reading subdirectories', async () => {
            vi.mocked(os.arch).mockReturnValue('x64')
            vi.mocked(os.platform).mockReturnValue('linux')

            const basePath = '/tools/test-tool'

            // Mock file does not exist in standard locations
            const mockFileExists = vi.fn().mockResolvedValue(false)
            const mockDebug = vi.fn()

            buildAgent.fileExists = mockFileExists as unknown as typeof buildAgent.fileExists
            buildAgent.debug = mockDebug

            // Mock directory listing error
            vi.mocked(fs.readdir).mockRejectedValue(new Error('Permission denied'))

            const result = await tool.testFindToolExecutable(basePath)

            expect(result).toBeNull()
            expect(fs.readdir).toHaveBeenCalledWith(basePath, { withFileTypes: true })
            expect(mockDebug).toHaveBeenCalledWith('Error reading subdirectories: Permission denied')
        })

        it('should return null when executable not found anywhere', async () => {
            vi.mocked(os.arch).mockReturnValue('x64')
            vi.mocked(os.platform).mockReturnValue('linux')

            const basePath = '/tools/test-tool'

            // Mock file does not exist anywhere
            const mockFileExists = vi.fn().mockResolvedValue(false)
            buildAgent.fileExists = mockFileExists as unknown as typeof buildAgent.fileExists

            // Mock empty directory listing
            vi.mocked(fs.readdir).mockResolvedValue([])

            const result = await tool.testFindToolExecutable(basePath)

            expect(result).toBeNull()
        })
    })

    // Add more tests for other methods as needed
    describe('disableTelemetry', () => {
        it('should set telemetry environment variables', () => {
            const mockInfo = vi.fn()
            const mockSetVariable = vi.fn()

            buildAgent.info = mockInfo
            buildAgent.setVariable = mockSetVariable

            tool.disableTelemetry()

            expect(mockInfo).toHaveBeenCalledWith('Disable Telemetry')
            expect(mockSetVariable).toHaveBeenCalledWith('DOTNET_CLI_TELEMETRY_OPTOUT', 'true')
            expect(mockSetVariable).toHaveBeenCalledWith('DOTNET_NOLOGO', 'true')
        })
    })

    // Test other methods as needed
})
