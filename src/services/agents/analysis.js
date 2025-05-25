import { BaseAgent } from './baseAgent.js'

export class CodeAnalysisAgent extends BaseAgent {
    constructor(aiModel) {
        super()
        this.aiModel = aiModel
        this.supportedLanguages = ['javascript', 'typescript', 'python', 'java']
        this.supportedAnalysisTypes = [
            'static', // Basic code analysis
            'performance', // Performance profiling
            'memory', // Memory usage analysis
            'complexity', // Advanced complexity metrics
            'security', // Security audit
            'dependencies', // Dependency analysis
            'coverage' // Test coverage analysis
        ]

        this.supportedProfilers = {
            linux: [
                'perf', // Linux perf_events profiler
                'strace', // System call tracer
                'ftrace', // Function tracer
                'eBPF', // Extended Berkeley Packet Filter
                'SystemTap' // Dynamic instrumentation
            ],
            minecraft: [
                'spark', // Spark profiler
                'timings', // Paper/Spigot timings
                'lag-goggles', // Forge server profiler
                'sampler' // Fabric profiler
            ],
            node: [
                'node --prof', // V8 profiler
                'node --prof-process', // Profile processor
                'clinic doctor', // Node Clinic suite
                '0x', // Single-command profiler
                'autocannon' // Load testing
            ],
            java: [
                'jvisualvm', // Java VisualVM
                'jprofiler', // JProfiler
                'async-profiler', // Async-profiler
                'jfr', // Java Flight Recorder
                'yourkit' // YourKit Java Profiler
            ]
        }
    }

    async canHandle(message) {
        const response = await this.aiModel.getResponse(`Determine if this message is requesting code analysis.
Message: "${message}"
Consider:
1. Is it asking for code review or analysis?
2. Does it mention code quality, security, or performance?
3. Is it asking about code complexity or structure?
4. Does it request suggestions for code improvement?

Return: true or false`)

        return response.toLowerCase().includes('true')
    }

    async process(message, userId, contextData) {
        try {
            // Determine analysis type            const analysisType = await this._determineAnalysisType(message)

            // Extract code or profiling data
            const { code, language, profilingData } = await this._extractContext(contextData, analysisType)
            if (!code && !profilingData) {
                return this.requestContext(analysisType)
            }

            // Perform requested analysis
            const analysis = await this._performAnalysis(code, language, profilingData, analysisType)

            // Format and return results
            return this.formatResponse(analysis, analysisType)
        } catch (error) {
            return {
                content: `Error performing analysis: ${error.message}`,
                error: true
            }
        }
    }
    async _determineAnalysisType(message) {
        const analysisPrompt = `Determine the type of analysis being requested:
Message: "${message}"
Available types: ${this.supportedAnalysisTypes.join(', ')}

Consider:
1. Is it asking for performance profiling?
2. Is it about memory usage?
3. Is it a basic code review?
4. Is it about security?
5. Is it about dependencies?
6. Is it about test coverage?

Return only one of: ${this.supportedAnalysisTypes.join(', ')}`

        const type = await this.aiModel.getResponse(analysisPrompt)
        return type.toLowerCase().trim()
    }
    async _extractContext(contextData, analysisType) {
        if (!contextData) {
            return { code: null, language: null, profilingData: null }
        }

        if (analysisType === 'performance' || analysisType === 'memory') {
            return {
                profilingData: contextData.profilingData,
                code: contextData.code || null,
                language: contextData.language || 'javascript'
            }
        }

        // Use AI to detect language and extract relevant context
        const analysis = await this.aiModel.getResponse(`Analyze this code and determine:
1. Programming language used
2. Framework or libraries used (if any)
3. Type of code (e.g., function, class, script)
4. Dependencies referenced
5. Testing frameworks used (if any)

Code:
${contextData.code}

Return: JSON with language, frameworks, codeType, dependencies, and testingFrameworks`)

        const details = JSON.parse(analysis)
        return {
            code: contextData.code,
            ...details,
            profilingData: null
        }
    }
    async _performAnalysis(code, language, profilingData, analysisType) {
        switch (analysisType) {
            case 'performance':
                return await this._analyzePerformance(code, profilingData)
            case 'memory':
                return await this._analyzeMemory(code, profilingData)
            case 'complexity':
                return await this._analyzeComplexity(code, language)
            case 'security':
                return await this._analyzeSecurity(code, language)
            case 'dependencies':
                return await this._analyzeDependencies(code, language)
            case 'coverage':
                return await this._analyzeCoverage(code, language)
            default:
                return await this.analyzeCode(code, { language })
        }
    }

    async _analyzePerformance(code, profilingData) {
        if (!profilingData) {
            // Generate profiler recommendations based on detected environment
            const recommendations = ['To analyze performance, please provide profiling data from any of these tools:']

            if (profilingData?.environment?.type === 'minecraft') {
                recommendations.push(
                    '• Spark: /spark profiler',
                    '• Paper Timings: /timings report',
                    '• Lag Goggles: /laggoogles start',
                    '• Fabric Sampler: /sampler start'
                )
            } else if (profilingData?.environment?.type === 'linux') {
                recommendations.push(
                    '• Linux perf: perf record -F 99 -p <pid>',
                    '• strace: strace -c -p <pid>',
                    '• ftrace: trace-cmd record -p function_graph -F <pid>',
                    "• eBPF: bpftrace -e 'profile:hz:99 { @[kstack] = count(); }'",
                    '• SystemTap: stap -v profile.stp -c <command>'
                )
            } else if (profilingData?.environment?.type === 'java') {
                recommendations.push(
                    '• Java Flight Recorder: jcmd <pid> JFR.start',
                    '• async-profiler: profiler.sh -d 30 -f profile.html <pid>',
                    '• JProfiler: Remote profiling via JProfiler GUI',
                    '• VisualVM: Connect to JMX port'
                )
            } else {
                recommendations.push(
                    '• Node.js: node --prof your-script.js',
                    '• Clinic.js: clinic doctor -- node your-script.js',
                    '• 0x: 0x your-script.js',
                    '• Chrome DevTools Performance panel for browser code'
                )
            }

            return {
                type: 'performance',
                recommendations
            }
        }

        // Determine profiler type from data format
        const profilerType = this.detectProfilerType(profilingData)

        let analysisPrompt = `Analyze this ${profilerType} profiling data and provide:
1. Hot functions/paths
2. CPU usage patterns
3. Bottlenecks
4. Optimization suggestions
5. Resource usage summary
6. Environment-specific insights\n\n`

        // Add profiler-specific analysis questions
        switch (profilerType) {
            case 'minecraft':
                analysisPrompt += `7. TPS (Ticks Per Second) analysis
8. Entity/chunk loading patterns
9. Plugin/mod overhead assessment
10. World generation impact\n\n`
                break
            case 'linux-perf':
                analysisPrompt += `7. System call patterns
8. Kernel-space vs user-space time
9. Hardware event correlations
10. Context switch frequency\n\n`
                break
            case 'java-profiler':
                analysisPrompt += `7. Garbage collection impact
8. Thread contention analysis
9. IO operation patterns
10. Memory leak indicators\n\n`
                break
            default:
                analysisPrompt += `7. Event loop blockage
8. Async operation patterns
9. Network/IO bottlenecks
10. Memory allocation patterns\n\n`
        }

        analysisPrompt += `Profiling data:
${JSON.stringify(profilingData, null, 2)}

Code (if available):
${code || 'No code provided'}

Return: JSON with sections for hotspots, patterns, bottlenecks, optimizations, resourceUsage, and environmentSpecific`

        return JSON.parse(analysis)
    }
    async _analyzeMemory(code, profilingData) {
        if (!profilingData) {
            return {
                type: 'memory',
                recommendations: [
                    'To analyze memory usage, please provide heap snapshot or memory profile',
                    'You can use Chrome DevTools Memory panel',
                    'Or use node --inspect and Chrome DevTools for Node.js'
                ]
            }
        }

        const analysis = await this.aiModel.getResponse(`Analyze this memory profiling data and provide:
1. Memory leak indicators
2. Large object allocations
3. Garbage collection patterns
4. Memory usage trends
5. Optimization suggestions

Memory data:
${JSON.stringify(profilingData, null, 2)}

Code (if available):
${code || 'No code provided'}

Return: JSON with sections for leaks, largeObjects, gcPatterns, trends, and optimizations`)

        return JSON.parse(analysis)
    }
    async _analyzeComplexity(code, language) {
        const analysis = await this.aiModel
            .getResponse(`Perform advanced complexity analysis of this ${language} code and provide:
1. Cyclomatic complexity per function
2. Cognitive complexity metrics
3. Maintainability index
4. Code duplication assessment
5. Dependency graph complexity
6. Nesting depth analysis

Code:
${code}

Return: JSON with detailed complexity metrics and recommendations`)

        return JSON.parse(analysis)
    }
    async _analyzeSecurity(code, language) {
        const analysis = await this.aiModel.getResponse(`Perform security audit of this ${language} code and provide:
1. Known vulnerability patterns
2. Input validation issues
3. Authentication/authorization concerns
4. Data exposure risks
5. Dependency security status
6. Secure coding guideline violations

Code:
${code}

Return: JSON with security findings, risk levels, and remediation steps`)

        return JSON.parse(analysis)
    }
    async _analyzeDependencies(code, language) {
        const analysis = await this.aiModel.getResponse(`Analyze dependencies in this ${language} code and provide:
1. Direct dependencies list
2. Transitive dependencies
3. Version compatibility issues
4. Known vulnerabilities
5. Update recommendations
6. Unused dependencies

Code:
${code}

Return: JSON with dependency analysis results and recommendations`)

        return JSON.parse(analysis)
    }
    async _analyzeCoverage(code, language) {
        const analysis = await this.aiModel.getResponse(`Analyze test coverage for this ${language} code and provide:
1. Statement coverage
2. Branch coverage
3. Function coverage
4. Line coverage
5. Uncovered code sections
6. Testing gaps and recommendations

Code:
${code}

Return: JSON with coverage metrics and testing recommendations`)

        return JSON.parse(analysis)
    }

    _formatResponse(analysis, analysisType) {
        let response = `**${analysisType.toUpperCase()} Analysis Report**\n\n`

        switch (analysisType) {
            case 'performance':
                response += '**🔥 Performance Hotspots:**\n'
                analysis.hotspots.forEach(spot => (response += `• ${spot}\n`))
                response += '\n**📈 Performance Patterns:**\n'
                analysis.patterns.forEach(pattern => (response += `• ${pattern}\n`))
                response += '\n**🚧 Bottlenecks:**\n'
                analysis.bottlenecks.forEach(bottleneck => (response += `• ${bottleneck}\n`))
                response += '\n**💡 Optimization Suggestions:**\n'
                analysis.optimizations.forEach(opt => (response += `• ${opt}\n`))
                break

            case 'memory':
                response += '**🔍 Memory Leak Indicators:**\n'
                analysis.leaks.forEach(leak => (response += `• ${leak}\n`))
                response += '\n**📦 Large Object Allocations:**\n'
                analysis.largeObjects.forEach(obj => (response += `• ${obj}\n`))
                response += '\n**♻️ GC Patterns:**\n'
                analysis.gcPatterns.forEach(pattern => (response += `• ${pattern}\n`))
                response += '\n**📊 Memory Trends:**\n'
                analysis.trends.forEach(trend => (response += `• ${trend}\n`))
                break

            case 'complexity':
                response += '**🔄 Cyclomatic Complexity:**\n'
                Object.entries(analysis.cyclomaticComplexity).forEach(
                    ([fn, score]) => (response += `• ${fn}: ${score}\n`)
                )
                response += '\n**🧠 Cognitive Complexity:**\n'
                Object.entries(analysis.cognitiveComplexity).forEach(
                    ([fn, score]) => (response += `• ${fn}: ${score}\n`)
                )
                response += '\n**🔧 Maintainability Index:**\n'
                response += `• Overall: ${analysis.maintainabilityIndex}\n`
                break

            case 'security':
                response += '**🚨 High Risk Issues:**\n'
                analysis.highRiskIssues.forEach(issue => (response += `• ${issue}\n`))
                response += '\n**⚠️ Medium Risk Issues:**\n'
                analysis.mediumRiskIssues.forEach(issue => (response += `• ${issue}\n`))
                response += '\n**🔒 Security Recommendations:**\n'
                analysis.recommendations.forEach(rec => (response += `• ${rec}\n`))
                break

            case 'dependencies':
                response += '**📦 Direct Dependencies:**\n'
                analysis.directDependencies.forEach(dep => (response += `• ${dep}\n`))
                response += '\n**⚠️ Vulnerable Dependencies:**\n'
                analysis.vulnerableDependencies.forEach(dep => (response += `• ${dep}\n`))
                response += '\n**💡 Update Recommendations:**\n'
                analysis.updateRecommendations.forEach(rec => (response += `• ${rec}\n`))
                break

            case 'coverage':
                response += '**📊 Coverage Metrics:**\n'
                response += `• Statement Coverage: ${analysis.statementCoverage}%\n`
                response += `• Branch Coverage: ${analysis.branchCoverage}%\n`
                response += `• Function Coverage: ${analysis.functionCoverage}%\n`
                response += '\n**🔍 Uncovered Areas:**\n'
                analysis.uncoveredSections.forEach(section => (response += `• ${section}\n`))
                break

            default:
                response += '**Complexity Metrics:**\n'
                response += `• Conditional statements: ${analysis.complexity.conditionalCount}\n`
                response += `• Loops: ${analysis.complexity.loopCount}\n`
                response += `• Functions: ${analysis.complexity.functionCount}\n`
                response += `• Overall complexity score: ${analysis.complexity.overallComplexity}\n\n`

                if (analysis.suggestions?.length > 0) {
                    response += '**Suggestions:**\n'
                    analysis.suggestions.forEach(suggestion => {
                        response += `• ${suggestion}\n`
                    })
                    response += '\n'
                }

                if (analysis.securityIssues?.length > 0) {
                    response += '**Security Concerns:**\n'
                    analysis.securityIssues.forEach(issue => {
                        response += `• 🚨 ${issue}\n`
                    })
                }
        }

        return response
    }

    _requestContext(analysisType) {
        const requests = {
            performance: `Please provide performance profiling data to analyze. You can use:

For Minecraft servers:
• Spark: /spark profiler
• Paper Timings: /timings report
• Lag Goggles: /laggoogles start
• Fabric Sampler: /sampler start

For Linux servers:
• perf: perf record -F 99 -p <pid>
• strace: strace -c -p <pid>
• ftrace: trace-cmd record
• eBPF: bpftrace profiling
• SystemTap: Custom probes

For Java applications:
• JFR: jcmd <pid> JFR.start
• async-profiler
• JProfiler
• VisualVM

For Node.js:
• node --prof
• Clinic.js
• 0x
• Chrome DevTools`,
            memory: 'Please provide a heap snapshot or memory profile to analyze. You can generate this using Chrome DevTools Memory panel.',
            static: "Please share the code snippet you'd like me to analyze.",
            complexity: "Please share the code you'd like me to analyze for complexity metrics.",
            security: "Please provide the code you'd like me to audit for security concerns.",
            dependencies:
                'Please share the code or dependency manifest (package.json, requirements.txt, etc.) to analyze.',
            coverage: 'Please provide the code and test files for coverage analysis.'
        }

        return {
            content: requests[analysisType] || "Please provide the code you'd like me to analyze.",
            needsMoreContext: true
        }
    }
    _detectProfilerType(profilingData) {
        // Check for Minecraft server profilers
        if (profilingData.spark || profilingData.timings || profilingData.lagGoggles || profilingData.sampler) {
            return 'minecraft'
        }

        // Check for Linux performance tools
        if (profilingData.perf_events || profilingData.strace || profilingData.ftrace || profilingData.bpf) {
            return 'linux-perf'
        }

        // Check for Java profilers
        if (profilingData.jfr || profilingData.async_profiler || profilingData.jvisualvm || profilingData.jprofiler) {
            return 'java-profiler'
        }

        // Check for Node.js profilers
        if (profilingData.v8Profile || profilingData.clinic || profilingData.zeroX || profilingData.autocannon) {
            return 'node-profiler'
        }

        // Default to generic profiler
        return 'generic'
    }
}
