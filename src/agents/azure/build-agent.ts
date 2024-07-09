import * as os from 'os'
import * as path from 'path'

import { injectable } from 'inversify'

import * as taskLib from 'azure-pipelines-task-lib/task'
import * as toolLib from 'azure-pipelines-tool-lib/tool'

import { IRequestOptions } from 'typed-rest-client/Interfaces'
import { type ExecResult } from '../common/models'
import { IBuildAgent } from '../common/build-agent'

@injectable()
class BuildAgent implements IBuildAgent {
    public get agentName(): string {
        return 'Azure Pipelines'
    }

    public proxyConfiguration(url: string): IRequestOptions {
        return {
            proxy: taskLib.getHttpProxyConfiguration(url),
            cert: taskLib.getHttpCertConfiguration(),
            ignoreSslError: !!taskLib.getVariable('Agent.SkipCertValidation')
        }
    }

    public findLocalTool(toolName: string, versionSpec: string, arch?: string): string {
        return toolLib.findLocalTool(toolName, versionSpec, arch)
    }

    public cacheToolDirectory(sourceDir: string, tool: string, version: string, arch?: string): Promise<string> {
        return toolLib.cacheDir(sourceDir, tool, version, arch)
    }

    public createTempDirectory(): Promise<string> {
        return Promise.resolve(taskLib.getVariable('Agent.TempDirectory'))
    }

    public removeDirectory(dir: string): Promise<void> {
        taskLib.rmRF(dir)
        return Promise.resolve()
    }

    public debug(message: string): void {
        taskLib.debug(message)
    }

    public info(message: string): void {
        process.stdout.write(message + os.EOL)
    }

    public error(message: string): void {
        taskLib.error(message)
    }

    public setFailed(message: string, done?: boolean): void {
        taskLib.setResult(taskLib.TaskResult.Failed, message, done)
    }

    public setSucceeded(message: string, done?: boolean): void {
        taskLib.setResult(taskLib.TaskResult.Succeeded, message, done)
    }

    public setVariable(name: string, value: string): void {
        taskLib.setVariable(name, value)
    }

    public getVariable(name: string): string {
        return taskLib.getVariable(name)
    }

    public getVariableAsPath(name: string): string {
        return path.resolve(path.normalize(this.getVariable(name)))
    }

    public addPath(inputPath: string): void {
        toolLib.prependPath(inputPath)
    }

    public which(tool: string, check?: boolean): Promise<string> {
        return Promise.resolve(taskLib.which(tool, check))
    }

    public exec(exec: string, args: string[]): Promise<ExecResult> {
        const tr = taskLib.tool(exec)
        tr.arg(args)

        const result = tr.execSync()
        return Promise.resolve({
            code: result.code,
            error: result.error,
            stderr: result.stderr,
            stdout: result.stdout
        })
    }

    public getSourceDir(): string {
        return this.getVariable('Build.SourcesDirectory')
    }

    public setOutput(name: string, value: string): void {
        taskLib.setVariable(name, value, false, true)
    }

    public getInput(input: string, required?: boolean): string {
        return taskLib.getInput(input, required)?.trim()
    }

    public getListInput(input: string, required?: boolean): string[] {
        return taskLib.getDelimitedInput(input, '\n', required).filter(x => x !== '')
    }

    public getBooleanInput(input: string, required?: boolean): boolean {
        return taskLib.getBoolInput(input, required)
    }

    public isValidInputFile(input: string, file: string): boolean {
        return taskLib.filePathSupplied(input) && this.fileExists(file)
    }

    public fileExists(file: string): boolean {
        return taskLib.exist(file) && taskLib.stats(file).isFile()
    }

    public directoryExists(file: string): boolean {
        return taskLib.exist(file) && taskLib.stats(file).isDirectory()
    }
}

export { BuildAgent }