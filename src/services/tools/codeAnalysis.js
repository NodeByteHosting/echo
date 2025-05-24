import { exec } from 'child_process'
import { promisify } from 'util'
const execAsync = promisify(exec)

export class CodeAnalysisTool {
    constructor() {
        this.supportedLanguages = ['javascript', 'typescript', 'python', 'java']
    }

    async analyzeCode(code, language) {
        // Basic code analysis
        const analysis = {
            complexity: this.calculateComplexity(code),
            suggestions: await this.getSuggestions(code, language),
            securityIssues: this.checkSecurity(code, language)
        }

        return this.formatAnalysis(analysis)
    }

    calculateComplexity(code) {
        // Simple complexity calculation based on:
        // - Number of conditional statements
        // - Loop depth
        // - Function length
        const conditionals = (code.match(/if|while|for|switch/g) || []).length
        const loops = (code.match(/for|while/g) || []).length
        const functions = (code.match(/function|=>/g) || []).length

        return {
            conditionalCount: conditionals,
            loopCount: loops,
            functionCount: functions,
            overallComplexity: conditionals + loops * 2 + functions
        }
    }

    async getSuggestions(code, language) {
        const suggestions = []

        // Common patterns to check
        if (language === 'javascript' || language === 'typescript') {
            if (code.includes('console.log')) {
                suggestions.push('Consider using a proper logging system for production code')
            }
            if (
                code
                    .match(/catch\s*\([^)]*\)\s*{[\s\S]*?}/g)
                    ?.some(catch_block => catch_block.includes('console.error') && !catch_block.includes('throw'))
            ) {
                suggestions.push('Consider proper error handling instead of just logging')
            }
        }

        return suggestions
    }

    checkSecurity(code, language) {
        const issues = []

        // Common security checks
        if (code.includes('eval(')) {
            issues.push('Avoid using eval() as it can execute arbitrary code')
        }

        if (language === 'javascript' || language === 'typescript') {
            if (code.match(/exec\s*\(/)) {
                issues.push('Be careful with exec() calls. Ensure input is properly sanitized')
            }
            if (code.includes('innerHTML')) {
                issues.push('Using innerHTML can lead to XSS vulnerabilities. Consider textContent or sanitized HTML')
            }
        }

        return issues
    }

    formatAnalysis(analysis) {
        let report = '**Code Analysis Report**\n\n'

        report += '**Complexity Metrics:**\n'
        report += `• Conditional statements: ${analysis.complexity.conditionalCount}\n`
        report += `• Loops: ${analysis.complexity.loopCount}\n`
        report += `• Functions: ${analysis.complexity.functionCount}\n`
        report += `• Overall complexity score: ${analysis.complexity.overallComplexity}\n\n`

        if (analysis.suggestions.length > 0) {
            report += '**Suggestions:**\n'
            analysis.suggestions.forEach(suggestion => {
                report += `• ${suggestion}\n`
            })
            report += '\n'
        }

        if (analysis.securityIssues.length > 0) {
            report += '**Security Concerns:**\n'
            analysis.securityIssues.forEach(issue => {
                report += `• 🚨 ${issue}\n`
            })
        }

        return report
    }
}
