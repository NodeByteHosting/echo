import { BaseAgent } from './baseAgent.js'

export class CodeAnalysisAgent extends BaseAgent {
    constructor(aiModel) {
        super()
        this.aiModel = aiModel
        this.supportedLanguages = ['javascript', 'typescript', 'python', 'java']
        this.supportedAnalysisTypes = [
            'static',
            'performance',
            'memory',
            'complexity',
            'security',
            'dependencies',
            'coverage'
        ]

        // Supported profilers by environment
        this.supportedProfilers = {
            linux: ['perf', 'strace', 'ftrace', 'eBPF', 'SystemTap'],
            minecraft: ['spark', 'timings', 'lag-goggles', 'sampler'],
            node: ['node --prof', 'clinic doctor', '0x', 'autocannon'],
            java: ['jvisualvm', 'jprofiler', 'async-profiler', 'jfr', 'yourkit']
        }
    }

    // === AGENT INTERFACE METHODS ===

    async canHandle(message) {
        // Skip code generation requests
        const msg = message.toLowerCase()

        // Skip if this is clearly a code generation request, not analysis
        if (msg.includes('generate') && (msg.includes('code') || msg.includes('example') || msg.includes('sample'))) {
            return false
        }

        // Skip if asking for boilerplate or starter code
        if (
            (msg.includes('create') || msg.includes('make')) &&
            (msg.includes('boilerplate') || msg.includes('starter') || msg.includes('template'))
        ) {
            return false
        }

        // Use AI for complex cases
        const response = await this.aiModel.getResponse(
            `Determine if this message is requesting code analysis or code review.
Message: "${message}"
Consider:
1. Is it asking for code review or analysis?
2. Does it mention code quality, security, or performance?
3. Is it asking about code complexity or structure?
4. Does it request suggestions for code improvement?
5. IMPORTANT: If it's asking to GENERATE code or provide code EXAMPLES, this is NOT analysis.

Return: "true" ONLY if it's requesting analysis of EXISTING code, otherwise "false".`
        )
        return response.toLowerCase().includes('true')
    }

    async process(message, userId, contextData) {
        try {
            // Determine analysis type
            const analysisType = await this._determineAnalysisType(message)

            // Extract code or profiling data
            const { code, language, profilingData } = await this._extractContext(contextData, analysisType)

            // Request context if we don't have code or data
            if (!code && !profilingData) {
                return this._requestContext(analysisType)
            }

            // Perform requested analysis
            const analysis = await this._performAnalysis(code, language, profilingData, analysisType)

            // Format and return results
            return this.formatResponse(analysis, analysisType)
        } catch (error) {
            return this._handleError(error, contextData)
        }
    }

    // === CORE ANALYSIS METHODS ===

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

        // Check if we actually have code to analyze
        if (!contextData.code || contextData.code.trim() === '') {
            return {
                code: null,
                language: 'javascript',
                frameworks: [],
                codeType: 'unknown',
                dependencies: [],
                testingFrameworks: [],
                profilingData: null
            }
        }

        // Get code metadata with fallback for JSON parsing errors
        try {
            const analysis = await this._getCodeMetadata(contextData.code)
            return {
                code: contextData.code,
                ...analysis,
                profilingData: null
            }
        } catch (error) {
            console.error('Error extracting code context:', error)
            return {
                code: contextData.code,
                language: this._detectLanguageFromCode(contextData.code),
                profilingData: null
            }
        }
    }

    async _getCodeMetadata(code) {
        const analysis = await this.aiModel.getResponse(
            `Analyze this code and determine:
1. Programming language used
2. Framework or libraries used (if any)
3. Type of code (e.g., function, class, script)
4. Dependencies referenced
5. Testing frameworks used (if any)

Code:
${code}

IMPORTANT: Return ONLY valid JSON with these fields:
{
  "language": "detected language",
  "frameworks": ["framework1", "framework2"],
  "codeType": "function/class/etc",
  "dependencies": ["dep1", "dep2"],
  "testingFrameworks": ["test1", "test2"]
}`
        )

        try {
            const jsonMatch = analysis.match(/\{[\s\S]*\}/)
            return jsonMatch ? JSON.parse(jsonMatch[0]) : this._createDefaultMetadata(code)
        } catch (error) {
            return this._createDefaultMetadata(code)
        }
    }

    _createDefaultMetadata(code) {
        return {
            language: this._detectLanguageFromCode(code),
            frameworks: [],
            codeType: 'unknown',
            dependencies: [],
            testingFrameworks: []
        }
    }

    async _performAnalysis(code, language, profilingData, analysisType) {
        // Handle missing code for code-dependent analysis types
        if (!code && ['complexity', 'security', 'dependencies', 'coverage', 'static'].includes(analysisType)) {
            return this._generateEmptyAnalysisResult(analysisType)
        }

        // Dispatch to the appropriate analysis method
        const analysisMap = {
            performance: this._analyzePerformance.bind(this),
            memory: this._analyzeMemory.bind(this),
            complexity: this._analyzeComplexity.bind(this),
            security: this._analyzeSecurity.bind(this),
            dependencies: this._analyzeDependencies.bind(this),
            coverage: this._analyzeCoverage.bind(this),
            static: this._staticCodeAnalysis.bind(this)
        }

        const analyzeMethod = analysisMap[analysisType] || this._staticCodeAnalysis.bind(this)
        return analyzeMethod(code, language, profilingData)
    }

    // === SPECIFIC ANALYSIS METHODS ===

    async _analyzePerformance(code, profilingData) {
        if (!profilingData) {
            return {
                type: 'performance',
                recommendations: this._getProfilerRecommendations(profilingData?.environment?.type)
            }
        }

        const profilerType = this._detectProfilerType(profilingData)
        return this._getAnalysisWithJsonSafety(
            `Analyze this ${profilerType} profiling data and provide your findings in valid JSON format.
Please include these fields in your response:
- hotspots: Array of strings identifying hot functions/paths
- patterns: Array of strings describing CPU usage patterns
- bottlenecks: Array of strings noting performance bottlenecks
- optimizations: Array of strings with optimization suggestions
- resourceUsage: Object with resource usage summary
- environmentSpecific: Object with environment-specific insights

Profiling data:
${JSON.stringify(profilingData, null, 2)}

Code (if available):
${code || 'No code provided'}

IMPORTANT: Return ONLY valid JSON with NO EXPLANATORY TEXT before or after the JSON.`,
            {
                hotspots: ['⚠️ Error analyzing performance data'],
                patterns: ['The performance data could not be analyzed correctly'],
                bottlenecks: ['Try providing the performance data in a different format'],
                optimizations: ['Use one of the recommended profiling tools'],
                resourceUsage: { error: 'Unable to analyze resource usage' },
                environmentSpecific: { error: 'Unable to provide environment-specific insights' }
            }
        )
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

        return this._getAnalysisWithJsonSafety(
            `Analyze this memory profiling data and provide:
1. Memory leak indicators
2. Large object allocations
3. Garbage collection patterns
4. Memory usage trends
5. Optimization suggestions

Memory data:
${JSON.stringify(profilingData, null, 2)}

Code (if available):
${code || 'No code provided'}

IMPORTANT: Return ONLY valid JSON with these exact fields: 
{"leaks":[], "largeObjects":[], "gcPatterns":[], "trends":[], "optimizations":[]}`,
            {
                leaks: ['⚠️ Error analyzing memory data'],
                largeObjects: ['Could not process the memory profile data'],
                gcPatterns: ['Could not analyze garbage collection patterns'],
                trends: ['Memory usage trends could not be determined'],
                optimizations: ['Provide memory data in a standard heap snapshot format']
            }
        )
    }

    async _analyzeComplexity(code, language) {
        return this._getAnalysisWithJsonSafety(
            `Perform advanced complexity analysis of this ${language} code and provide:
1. Cyclomatic complexity per function
2. Cognitive complexity metrics
3. Maintainability index
4. Code duplication assessment
5. Dependency graph complexity
6. Nesting depth analysis

Code:
${code}

IMPORTANT: Return ONLY valid JSON with exactly these fields:
{
  "cyclomaticComplexity": {"functionName1": score1, "functionName2": score2},
  "cognitiveComplexity": {"functionName1": score1, "functionName2": score2},
  "maintainabilityIndex": number,
  "duplication": {"percentage": number, "duplicatedBlocks": number},
  "dependencyComplexity": number,
  "nestingDepth": {"max": number, "average": number},
  "recommendations": ["recommendation1", "recommendation2"]
}`,
            () => this._generateFallbackComplexityAnalysis(code, language)
        )
    }

    async _analyzeSecurity(code, language) {
        return this._getAnalysisWithJsonSafety(
            `Perform security audit of this ${language} code and provide:
1. Known vulnerability patterns
2. Input validation issues
3. Authentication/authorization concerns
4. Data exposure risks
5. Dependency security status
6. Secure coding guideline violations

Code:
${code}

IMPORTANT: Return ONLY valid JSON with exactly these fields:
{
  "highRiskIssues": ["issue1", "issue2"],
  "mediumRiskIssues": ["issue1", "issue2"],
  "lowRiskIssues": ["issue1", "issue2"],
  "recommendations": ["rec1", "rec2"],
  "securityScore": number,
  "criticalVulnerabilities": number
}`,
            {
                highRiskIssues: ['Error parsing security analysis - manual review recommended'],
                mediumRiskIssues: [],
                lowRiskIssues: [],
                recommendations: ['Request a manual security review', 'Check for input validation issues'],
                securityScore: 50,
                criticalVulnerabilities: 0
            }
        )
    }

    async _analyzeDependencies(code, language) {
        return this._getAnalysisWithJsonSafety(
            `Analyze dependencies in this ${language} code and provide:
1. Direct dependencies list
2. Transitive dependencies
3. Version compatibility issues
4. Known vulnerabilities
5. Update recommendations
6. Unused dependencies

Code:
${code}

IMPORTANT: Return ONLY valid JSON with these fields:
{
  "directDependencies": ["dep1", "dep2"],
  "vulnerableDependencies": ["vuln1", "vuln2"],
  "updateRecommendations": ["rec1", "rec2"],
  "compatibilityIssues": ["issue1", "issue2"],
  "unusedDependencies": ["unused1", "unused2"]
}`,
            {
                directDependencies: ['Could not analyze dependencies'],
                vulnerableDependencies: [],
                updateRecommendations: ['Try providing a package.json or requirements.txt file'],
                compatibilityIssues: [],
                unusedDependencies: []
            }
        )
    }

    async _analyzeCoverage(code, language) {
        return this._getAnalysisWithJsonSafety(
            `Analyze test coverage for this ${language} code and provide:
1. Statement coverage
2. Branch coverage
3. Function coverage
4. Line coverage
5. Uncovered code sections
6. Testing gaps and recommendations

Code:
${code}

IMPORTANT: Return ONLY valid JSON with these fields:
{
  "statementCoverage": number,
  "branchCoverage": number,
  "functionCoverage": number,
  "uncoveredSections": ["section1", "section2"],
  "recommendations": ["rec1", "rec2"]
}`,
            {
                statementCoverage: 0,
                branchCoverage: 0,
                functionCoverage: 0,
                uncoveredSections: ['Could not analyze code coverage'],
                recommendations: ['Provide test files along with the code']
            }
        )
    }

    async _staticCodeAnalysis(code, language) {
        return this._getAnalysisWithJsonSafety(
            `Perform a general code analysis of this ${language} code.
Identify:
1. Code quality issues
2. Potential bugs
3. Performance concerns
4. Style and best practice violations
5. Improvement suggestions

Code:
${code}

IMPORTANT: Return ONLY valid JSON with these fields:
{
  "complexity": {
    "conditionalCount": number,
    "loopCount": number,
    "functionCount": number,
    "overallComplexity": number
  },
  "suggestions": ["suggestion1", "suggestion2"],
  "bugs": ["potential bug1", "potential bug2"],
  "bestPractices": ["best practice1", "best practice2"],
  "securityIssues": ["security issue1", "security issue2"]
}`,
            {
                complexity: {
                    conditionalCount: code.split('if').length - 1,
                    loopCount: code.split('for').length - 1 + (code.split('while').length - 1),
                    functionCount: code.split('function').length - 1,
                    overallComplexity: 1
                },
                suggestions: ['Could not fully analyze the code'],
                bugs: [],
                bestPractices: ['Consider following standard coding conventions'],
                securityIssues: []
            }
        )
    }

    // === HELPER METHODS ===

    /**
     * Safe JSON parsing with fallback
     */
    async _getAnalysisWithJsonSafety(prompt, fallback) {
        try {
            const result = await this.aiModel.getResponse(prompt)
            const jsonMatch = result.match(/\{[\s\S]*\}/)
            const jsonString = jsonMatch ? jsonMatch[0] : result

            try {
                return JSON.parse(jsonString)
            } catch (parseError) {
                console.error('JSON Parse error in analysis:', parseError)
                return typeof fallback === 'function' ? fallback() : fallback
            }
        } catch (error) {
            console.error('Error in analysis:', error)
            return typeof fallback === 'function' ? fallback() : fallback
        }
    }

    /**
     * Simple language detection based on code patterns
     */
    _detectLanguageFromCode(code) {
        if (!code) {
            return 'javascript'
        }

        const codeStr = code.toLowerCase()

        if (codeStr.includes('func ') && codeStr.includes('package ')) {
            return 'go'
        }
        if (codeStr.includes('def ') && (codeStr.includes(':') || codeStr.includes('__init__'))) {
            return 'python'
        }
        if (codeStr.includes('public class ') || codeStr.includes('public static void')) {
            return 'java'
        }
        if (codeStr.includes('<?php')) {
            return 'php'
        }
        if (codeStr.includes('#include')) {
            return 'cpp'
        }
        if (codeStr.includes('fn ') && codeStr.includes('let mut ')) {
            return 'rust'
        }
        if (codeStr.includes('interface ') && codeStr.includes('<T>')) {
            return 'typescript'
        }

        return 'javascript'
    }

    /**
     * Detect profiler type from data format
     */
    _detectProfilerType(profilingData) {
        if (!profilingData) {
            return 'generic'
        }

        // Simple checks for different profiler types
        if (profilingData.spark || profilingData.timings) {
            return 'minecraft'
        }
        if (profilingData.perf_events || profilingData.strace) {
            return 'linux-perf'
        }
        if (profilingData.jfr || profilingData.async_profiler) {
            return 'java-profiler'
        }
        if (profilingData.v8Profile || profilingData.clinic) {
            return 'node-profiler'
        }

        return 'generic'
    }

    /**
     * Get profiler recommendations based on environment
     */
    _getProfilerRecommendations(envType) {
        const recommendations = ['To analyze performance, please provide profiling data from any of these tools:']

        if (envType === 'minecraft') {
            recommendations.push('• Spark: /spark profiler', '• Paper Timings: /timings report')
        } else if (envType === 'linux') {
            recommendations.push('• Linux perf: perf record -F 99 -p <pid>', '• strace: strace -c -p <pid>')
        } else if (envType === 'java') {
            recommendations.push('• Java Flight Recorder: jcmd <pid> JFR.start', '• VisualVM: Connect to JMX port')
        } else {
            recommendations.push('• Node.js: node --prof your-script.js', '• Chrome DevTools Performance panel')
        }

        return recommendations
    }

    /**
     * Generate fallback complexity analysis
     */
    _generateFallbackComplexityAnalysis(code, language) {
        const lines = code.split('\n').length
        const functions = (code.match(/function\s+\w+\s*\(/g) || []).length
        const conditionals = (code.match(/if\s*\(/g) || []).length
        const loops = (code.match(/for\s*\(/g) || []).length + (code.match(/while\s*\(/g) || []).length

        return {
            cyclomaticComplexity: { overall: conditionals + loops + 1 },
            cognitiveComplexity: { overall: conditionals * 2 + loops * 2 },
            maintainabilityIndex: Math.max(0, 100 - lines / 10),
            duplication: { percentage: 0, duplicatedBlocks: 0 },
            dependencyComplexity: 1,
            nestingDepth: { max: 2, average: 1 },
            recommendations: [
                'Consider breaking complex functions into smaller ones',
                'Review conditional logic for simplification'
            ]
        }
    }

    /**
     * Generate placeholder analysis for missing code
     */
    _generateEmptyAnalysisResult(analysisType) {
        const emptyResults = {
            complexity: {
                cyclomaticComplexity: { 'No code provided': 0 },
                cognitiveComplexity: { 'No code provided': 0 },
                maintainabilityIndex: 100,
                recommendations: ['Please provide code to analyze complexity metrics']
            },
            security: {
                highRiskIssues: ['No code provided for security analysis'],
                recommendations: ['Please provide code to perform security analysis']
            },
            dependencies: {
                directDependencies: ['No code or dependency file provided'],
                updateRecommendations: ['Provide code with import/require statements']
            },
            coverage: {
                statementCoverage: 0,
                uncoveredSections: ['No code provided for coverage analysis']
            },
            static: {
                complexity: { conditionalCount: 0, overallComplexity: 0 },
                suggestions: ['Please provide code to analyze']
            }
        }

        return emptyResults[analysisType] || emptyResults.static
    }

    /**
     * Handle errors in the process method
     */
    _handleError(error, contextData) {
        console.error(`Code analysis error: ${error.message}`, error.stack)

        let errorMessage = `Error performing ${contextData?.analysisType || 'code'} analysis: ${error.message}`

        if (error.message.includes('JSON Parse error')) {
            errorMessage +=
                "\n\nI couldn't properly process the analysis results. This typically happens when:" +
                '\n• The code is very complex or unusual' +
                '\n• The code contains syntax errors that need to be fixed first' +
                '\n• The formatting is non-standard'
        } else if (error.message.includes('timeout')) {
            errorMessage +=
                '\n\nThe analysis took too long to complete. Try:' +
                '\n• Analyzing a smaller code snippet' +
                "\n• Requesting a specific type of analysis (e.g., 'complexity' or 'security')"
        } else if (error.message.includes('context') || error.message.includes('undefined')) {
            errorMessage +=
                "\n\nI'm missing the necessary code or context to perform the analysis." +
                '\n• Please include the code you want analyzed' +
                '\n• Make sure the code is properly formatted with correct syntax'
        }

        return {
            content: errorMessage,
            error: true,
            errorType: error.name,
            recoverable: true,
            suggestedAction: 'Please try again with a smaller or simpler code sample.'
        }
    }

    // === RESPONSE FORMATTING ===

    formatResponse(analysis, analysisType) {
        // Check if this is an empty analysis due to no code
        if (this._isEmptyAnalysis(analysis, analysisType)) {
            return {
                content: `## ${analysisType.toUpperCase()} Analysis Request\n\nI need code to analyze for ${analysisType}. Please provide the code you'd like me to examine.\n\nYou can paste your code using a code block like this:\n\n\`\`\`language\n// Your code here\n\`\`\``,
                needsMoreContext: true,
                type: 'code_analysis_empty',
                analysisType: analysisType
            }
        }

        // Check if this is an error response
        if (analysis.error) {
            return this._formatErrorResponse(analysis, analysisType)
        }

        // Format normal response
        return {
            content: this._formatAnalysisContent(analysis, analysisType),
            type: 'code_analysis',
            analysisType: analysisType
        }
    }

    _isEmptyAnalysis(analysis, analysisType) {
        return (
            (analysisType === 'complexity' && analysis.cyclomaticComplexity?.['No code provided'] === 0) ||
            (analysisType === 'security' &&
                analysis.highRiskIssues?.[0] === 'No code provided for security analysis') ||
            (analysisType === 'dependencies' &&
                analysis.directDependencies?.[0] === 'No code or dependency file provided') ||
            (analysisType === 'coverage' &&
                analysis.uncoveredSections?.[0] === 'No code provided for coverage analysis')
        )
    }

    _formatErrorResponse(analysis, analysisType) {
        let errorResponse = `**⚠️ ${analysisType.toUpperCase()} Analysis Error**\n\n`
        errorResponse += `I encountered an error while analyzing your code: ${analysis.error}\n\n`

        // Add any available error details
        if (analysis.hotspots && analysis.hotspots[0].startsWith('⚠️')) {
            errorResponse += `**Error Details:**\n• ${analysis.hotspots[0]}\n`
        }

        // Add recommendations if available
        if (analysis.optimizations && analysis.optimizations.length > 0) {
            errorResponse += '\n**Recommendations:**\n'
            analysis.optimizations.forEach(opt => {
                errorResponse += `• ${opt}\n`
            })
        }

        errorResponse += '\nPlease try again with a different code sample or provide more specific information.'

        return {
            content: errorResponse,
            type: 'code_analysis_error',
            analysisType: analysisType,
            error: true
        }
    }

    _formatAnalysisContent(analysis, analysisType) {
        const formatters = {
            performance: this._formatPerformanceAnalysis,
            memory: this._formatMemoryAnalysis,
            complexity: this._formatComplexityAnalysis,
            security: this._formatSecurityAnalysis,
            dependencies: this._formatDependencyAnalysis,
            coverage: this._formatCoverageAnalysis,
            static: this._formatStaticAnalysis
        }

        const formatter = formatters[analysisType] || formatters.static
        return formatter.call(this, analysis)
    }

    _formatPerformanceAnalysis(analysis) {
        let response = `**PERFORMANCE Analysis Report**\n\n`
        response += '**🔥 Performance Hotspots:**\n'
        analysis.hotspots.forEach(spot => (response += `• ${spot}\n`))
        response += '\n**📈 Performance Patterns:**\n'
        analysis.patterns.forEach(pattern => (response += `• ${pattern}\n`))
        response += '\n**🚧 Bottlenecks:**\n'
        analysis.bottlenecks.forEach(bottleneck => (response += `• ${bottleneck}\n`))
        response += '\n**💡 Optimization Suggestions:**\n'
        analysis.optimizations.forEach(opt => (response += `• ${opt}\n`))
        return response
    }

    _formatMemoryAnalysis(analysis) {
        let response = `**MEMORY Analysis Report**\n\n`
        response += '**🔍 Memory Leak Indicators:**\n'
        analysis.leaks.forEach(leak => (response += `• ${leak}\n`))
        response += '\n**📦 Large Object Allocations:**\n'
        analysis.largeObjects.forEach(obj => (response += `• ${obj}\n`))
        response += '\n**♻️ GC Patterns:**\n'
        analysis.gcPatterns.forEach(pattern => (response += `• ${pattern}\n`))
        response += '\n**📊 Memory Trends:**\n'
        analysis.trends.forEach(trend => (response += `• ${trend}\n`))
        return response
    }

    _formatComplexityAnalysis(analysis) {
        let response = `**COMPLEXITY Analysis Report**\n\n`
        response += '**🔄 Cyclomatic Complexity:**\n'
        Object.entries(analysis.cyclomaticComplexity).forEach(([fn, score]) => (response += `• ${fn}: ${score}\n`))
        response += '\n**🧠 Cognitive Complexity:**\n'
        Object.entries(analysis.cognitiveComplexity).forEach(([fn, score]) => (response += `• ${fn}: ${score}\n`))
        response += '\n**🔧 Maintainability Index:**\n'
        response += `• Overall: ${analysis.maintainabilityIndex}\n`
        return response
    }

    _formatSecurityAnalysis(analysis) {
        let response = `**SECURITY Analysis Report**\n\n`
        response += '**🚨 High Risk Issues:**\n'
        analysis.highRiskIssues.forEach(issue => (response += `• ${issue}\n`))
        response += '\n**⚠️ Medium Risk Issues:**\n'
        analysis.mediumRiskIssues.forEach(issue => (response += `• ${issue}\n`))
        response += '\n**🔒 Security Recommendations:**\n'
        analysis.recommendations.forEach(rec => (response += `• ${rec}\n`))
        return response
    }

    _formatDependencyAnalysis(analysis) {
        let response = `**DEPENDENCIES Analysis Report**\n\n`
        response += '**📦 Direct Dependencies:**\n'
        analysis.directDependencies.forEach(dep => (response += `• ${dep}\n`))
        response += '\n**⚠️ Vulnerable Dependencies:**\n'
        analysis.vulnerableDependencies.forEach(dep => (response += `• ${dep}\n`))
        response += '\n**💡 Update Recommendations:**\n'
        analysis.updateRecommendations.forEach(rec => (response += `• ${rec}\n`))
        return response
    }

    _formatCoverageAnalysis(analysis) {
        let response = `**COVERAGE Analysis Report**\n\n`
        response += '**📊 Coverage Metrics:**\n'
        response += `• Statement Coverage: ${analysis.statementCoverage}%\n`
        response += `• Branch Coverage: ${analysis.branchCoverage}%\n`
        response += `• Function Coverage: ${analysis.functionCoverage}%\n`
        response += '\n**🔍 Uncovered Areas:**\n'
        analysis.uncoveredSections.forEach(section => (response += `• ${section}\n`))
        return response
    }

    _formatStaticAnalysis(analysis) {
        let response = `**STATIC Analysis Report**\n\n`
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
        return response
    }

    _requestContext(analysisType) {
        // Brief instructions for each analysis type
        const requests = {
            performance: `## Performance Analysis Request\n\nPlease provide profiling data or code to analyze performance issues.`,
            memory: '## Memory Analysis Request\n\nPlease provide a heap snapshot, memory profile, or code with potential memory issues.',
            static: "## Code Analysis Request\n\nPlease share the code snippet you'd like me to analyze.",
            complexity:
                "## Complexity Analysis Request\n\nPlease share the code you'd like me to analyze for complexity metrics.",
            security:
                "## Security Analysis Request\n\nPlease provide the code you'd like me to audit for security concerns.",
            dependencies: 'Please share your dependency file (package.json, requirements.txt, etc.) for analysis.',
            coverage: 'Please provide your code and test files to analyze test coverage.'
        }

        return {
            content:
                requests[analysisType] ||
                "## Code Analysis Request\n\nPlease provide the code you'd like me to analyze.",
            needsMoreContext: true
        }
    }
}
