import { Octokit } from 'octokit'
import { EventEmitter } from 'events'
import { db } from '#database/client.js'
import { log } from '#functions/logger.js'

/**
 * Service for monitoring GitHub repositories and commits
 */
export class GitHubMonitor extends EventEmitter {
    constructor() {
        super()
        this.octokit = null
        this.initialized = false
        this.monitoredRepos = new Map()
        this.database = db.getInstance()
        this.pollingInterval = 5 * 60 * 1000 // 5 minutes
        this.pollingTimers = new Map()
        this.webhookSecret = process.env.GITHUB_WEBHOOK_SECRET
        this.init()
    }

    /**
     * Initialize the GitHub client
     */
    async init() {
        try {
            const token = process.env.GITHUB_TOKEN

            if (!token) {
                log('GitHub API token not configured', 'warn')
                return
            }

            this.octokit = new Octokit({ auth: token })

            // Verify API access
            await this.octokit.rest.users.getAuthenticated()
            this.initialized = true
            log('GitHub API client initialized successfully', 'info')

            // Load previously monitored repos from database
            await this._loadMonitoredRepos()

            // Start monitoring
            for (const [repoKey, config] of this.monitoredRepos.entries()) {
                this._startPolling(repoKey, config)
            }
        } catch (error) {
            log('Failed to initialize GitHub client', 'error', error)
        }
    }

    /**
     * Start monitoring a GitHub repository
     * @param {string} owner The repository owner
     * @param {string} repo The repository name
     * @param {Object} options Monitoring options
     * @param {Array<string>} [options.branches] Branches to monitor (default: ['main'])
     * @param {Array<string>} [options.events] Events to monitor (default: ['push', 'issues', 'pull_request'])
     * @param {string} [options.userId] User ID of who started monitoring
     * @returns {Promise<Object>} The monitoring configuration
     */
    async monitorRepository(owner, repo, options = {}) {
        if (!this.initialized) {
            throw new Error('GitHub client not initialized')
        }

        const repoKey = `${owner}/${repo}`

        // Default options
        const config = {
            owner,
            repo,
            branches: options.branches || ['main'],
            events: options.events || ['push', 'issues', 'pull_request'],
            lastChecked: Date.now(),
            lastCommits: {},
            lastIssues: {},
            lastPRs: {},
            userId: options.userId || 'system'
        }

        try {
            // Check if repo exists
            await this.octokit.rest.repos.get({ owner, repo })

            // Get initial state
            await this._getInitialState(config)

            // Save to our map and database
            this.monitoredRepos.set(repoKey, config)
            await this._saveMonitoredRepo(repoKey, config)

            // Start polling
            this._startPolling(repoKey, config)

            log('Started monitoring GitHub repository', 'info', { repo: repoKey })
            return { repoKey, config }
        } catch (error) {
            log('Failed to monitor GitHub repository', 'error', { repo: repoKey, error })
            throw error
        }
    }

    /**
     * Stop monitoring a GitHub repository
     * @param {string} owner The repository owner
     * @param {string} repo The repository name
     * @returns {Promise<boolean>} Whether monitoring was stopped
     */
    async stopMonitoring(owner, repo) {
        const repoKey = `${owner}/${repo}`

        if (!this.monitoredRepos.has(repoKey)) {
            return false
        }

        // Stop polling
        if (this.pollingTimers.has(repoKey)) {
            clearInterval(this.pollingTimers.get(repoKey))
            this.pollingTimers.delete(repoKey)
        }

        // Remove from our maps
        this.monitoredRepos.delete(repoKey)

        // Remove from database
        try {
            await this.database.settings.set(`github_monitor:${repoKey}`, null)
            log('Stopped monitoring GitHub repository', 'info', { repo: repoKey })
            return true
        } catch (error) {
            log('Error removing repository from database', 'error', { repo: repoKey, error })
            return false
        }
    }

    /**
     * Get all monitored repositories
     * @returns {Array<Object>} List of monitored repositories
     */
    getMonitoredRepositories() {
        return Array.from(this.monitoredRepos.entries()).map(([repoKey, config]) => ({
            repoKey,
            owner: config.owner,
            repo: config.repo,
            branches: config.branches,
            events: config.events,
            lastChecked: new Date(config.lastChecked),
            monitoredBy: config.userId
        }))
    }

    /**
     * Get repository status
     * @param {string} owner The repository owner
     * @param {string} repo The repository name
     * @returns {Promise<Object>} Repository status information
     */
    async getRepositoryStatus(owner, repo) {
        if (!this.initialized) {
            throw new Error('GitHub client not initialized')
        }

        try {
            const repoData = await this.octokit.rest.repos.get({ owner, repo })
            const branchesData = await this.octokit.rest.repos.listBranches({ owner, repo })
            const commitsData = await this.octokit.rest.repos.listCommits({ owner, repo, per_page: 5 })
            const issuesData = await this.octokit.rest.issues.listForRepo({
                owner,
                repo,
                state: 'open',
                per_page: 5
            })

            return {
                name: repoData.data.name,
                fullName: repoData.data.full_name,
                description: repoData.data.description,
                url: repoData.data.html_url,
                stars: repoData.data.stargazers_count,
                forks: repoData.data.forks_count,
                openIssues: repoData.data.open_issues_count,
                defaultBranch: repoData.data.default_branch,
                branches: branchesData.data.map(branch => branch.name),
                recentCommits: commitsData.data.map(commit => ({
                    sha: commit.sha,
                    message: commit.commit.message,
                    author: commit.commit.author.name,
                    date: commit.commit.author.date,
                    url: commit.html_url
                })),
                recentIssues: issuesData.data.map(issue => ({
                    number: issue.number,
                    title: issue.title,
                    state: issue.state,
                    author: issue.user.login,
                    createdAt: issue.created_at,
                    url: issue.html_url
                }))
            }
        } catch (error) {
            log('Failed to get repository status', 'error', { repo: `${owner}/${repo}`, error })
            throw error
        }
    }

    /**
     * Handle a webhook event from GitHub
     * @param {Object} payload The webhook payload
     * @param {string} signature The webhook signature
     * @returns {Promise<boolean>} Whether the event was processed
     */
    async handleWebhook(payload, signature) {
        if (!this.initialized) {
            throw new Error('GitHub client not initialized')
        }

        // Verify webhook signature
        if (!this._verifyWebhookSignature(payload, signature)) {
            log('Invalid webhook signature', 'warn')
            return false
        }

        const event = payload.action || payload.type
        const repo = payload.repository.full_name

        // If we're not monitoring this repo, ignore
        if (!this.monitoredRepos.has(repo)) {
            return false
        }

        const config = this.monitoredRepos.get(repo)

        // Check if we care about this event
        if (!config.events.includes(event)) {
            return false
        }

        log('Received GitHub webhook event', 'info', { repo, event })

        // Process the event
        await this._processEvent(repo, event, payload)

        return true
    }

    /**
     * Check a repository for updates
     * @param {string} repoKey The repository key (owner/repo)
     * @returns {Promise<Array>} List of events detected
     */
    async checkRepository(repoKey) {
        if (!this.initialized || !this.monitoredRepos.has(repoKey)) {
            return []
        }

        const config = this.monitoredRepos.get(repoKey)
        const [owner, repo] = repoKey.split('/')
        const events = []

        try {
            // Update last checked time
            config.lastChecked = Date.now()

            // Check each branch for new commits
            for (const branch of config.branches) {
                const branchKey = `${branch}`

                // Get latest commits
                const commits = await this.octokit.rest.repos.listCommits({
                    owner,
                    repo,
                    sha: branch,
                    per_page: 5
                })

                // If we have a previous commit to compare to
                if (config.lastCommits[branchKey]) {
                    const lastKnownCommit = config.lastCommits[branchKey]
                    const newCommits = []

                    // Find commits that are newer than our last known commit
                    for (const commit of commits.data) {
                        if (commit.sha === lastKnownCommit) {
                            break
                        }
                        newCommits.push(commit)
                    }

                    // If we found new commits, emit events
                    if (newCommits.length > 0) {
                        const commitEvent = {
                            type: 'commit',
                            repo: repoKey,
                            branch,
                            commits: newCommits.map(commit => ({
                                sha: commit.sha,
                                message: commit.commit.message,
                                author: commit.commit.author.name,
                                date: commit.commit.author.date,
                                url: commit.html_url
                            }))
                        }

                        events.push(commitEvent)
                        this.emit('commit', commitEvent)
                    }
                }

                // Update last known commit
                if (commits.data.length > 0) {
                    config.lastCommits[branchKey] = commits.data[0].sha
                }
            }

            // Check for new issues if we're monitoring them
            if (config.events.includes('issues')) {
                const issues = await this.octokit.rest.issues.listForRepo({
                    owner,
                    repo,
                    state: 'all',
                    per_page: 10,
                    sort: 'created',
                    direction: 'desc'
                })

                // Get last issue number we've seen
                const lastIssueNumber = config.lastIssues.number || 0
                const newIssues = issues.data.filter(issue => !issue.pull_request && issue.number > lastIssueNumber)

                if (newIssues.length > 0) {
                    const issueEvent = {
                        type: 'issue',
                        repo: repoKey,
                        issues: newIssues.map(issue => ({
                            number: issue.number,
                            title: issue.title,
                            state: issue.state,
                            author: issue.user.login,
                            createdAt: issue.created_at,
                            url: issue.html_url
                        }))
                    }

                    events.push(issueEvent)
                    this.emit('issue', issueEvent)

                    // Update last issue number
                    if (newIssues.length > 0) {
                        config.lastIssues.number = Math.max(...newIssues.map(i => i.number))
                    }
                }
            }

            // Check for new PRs if we're monitoring them
            if (config.events.includes('pull_request')) {
                const prs = await this.octokit.rest.pulls.list({
                    owner,
                    repo,
                    state: 'all',
                    per_page: 10,
                    sort: 'created',
                    direction: 'desc'
                })

                // Get last PR number we've seen
                const lastPRNumber = config.lastPRs.number || 0
                const newPRs = prs.data.filter(pr => pr.number > lastPRNumber)

                if (newPRs.length > 0) {
                    const prEvent = {
                        type: 'pull_request',
                        repo: repoKey,
                        pullRequests: newPRs.map(pr => ({
                            number: pr.number,
                            title: pr.title,
                            state: pr.state,
                            author: pr.user.login,
                            createdAt: pr.created_at,
                            url: pr.html_url,
                            mergeable: pr.mergeable
                        }))
                    }

                    events.push(prEvent)
                    this.emit('pull_request', prEvent)

                    // Update last PR number
                    if (newPRs.length > 0) {
                        config.lastPRs.number = Math.max(...newPRs.map(p => p.number))
                    }
                }
            }

            // Save updated config
            await this._saveMonitoredRepo(repoKey, config)

            return events
        } catch (error) {
            log('Error checking repository for updates', 'error', { repo: repoKey, error })
            return []
        }
    }

    /**
     * Load monitored repositories from database
     * @private
     */
    async _loadMonitoredRepos() {
        try {
            const keys = await this.database.settings.getKeysWithPrefix('github_monitor:')

            for (const key of keys) {
                const repoKey = key.replace('github_monitor:', '')
                const config = await this.database.settings.get(key)

                if (config) {
                    this.monitoredRepos.set(repoKey, config)
                    log('Loaded monitored repository from database', 'info', { repo: repoKey })
                }
            }
        } catch (error) {
            log('Error loading monitored repositories from database', 'error', error)
        }
    }

    /**
     * Save monitored repository to database
     * @param {string} repoKey The repository key
     * @param {Object} config The repository configuration
     * @private
     */
    async _saveMonitoredRepo(repoKey, config) {
        try {
            await this.database.settings.set(`github_monitor:${repoKey}`, config)
        } catch (error) {
            log('Error saving monitored repository to database', 'error', { repo: repoKey, error })
        }
    }

    /**
     * Get initial state for a repository
     * @param {Object} config The repository configuration
     * @private
     */
    async _getInitialState(config) {
        try {
            const { owner, repo, branches } = config

            // Get initial commit SHA for each branch
            for (const branch of branches) {
                const branchKey = `${branch}`
                const commits = await this.octokit.rest.repos.listCommits({
                    owner,
                    repo,
                    sha: branch,
                    per_page: 1
                })

                if (commits.data.length > 0) {
                    config.lastCommits[branchKey] = commits.data[0].sha
                }
            }

            // Get latest issue number
            const issues = await this.octokit.rest.issues.listForRepo({
                owner,
                repo,
                state: 'all',
                per_page: 1,
                sort: 'created',
                direction: 'desc'
            })

            if (issues.data.length > 0 && !issues.data[0].pull_request) {
                config.lastIssues.number = issues.data[0].number
            }

            // Get latest PR number
            const prs = await this.octokit.rest.pulls.list({
                owner,
                repo,
                state: 'all',
                per_page: 1,
                sort: 'created',
                direction: 'desc'
            })

            if (prs.data.length > 0) {
                config.lastPRs.number = prs.data[0].number
            }
        } catch (error) {
            log('Error getting initial state for repository', 'error', {
                repo: `${config.owner}/${config.repo}`,
                error
            })
        }
    }

    /**
     * Start polling a repository for updates
     * @param {string} repoKey The repository key
     * @param {Object} config The repository configuration
     * @private
     */
    _startPolling(repoKey, config) {
        // If already polling, stop first
        if (this.pollingTimers.has(repoKey)) {
            clearInterval(this.pollingTimers.get(repoKey))
        }

        // Start new polling interval
        const timer = setInterval(() => {
            this.checkRepository(repoKey).catch(error => {
                log('Error polling repository', 'error', { repo: repoKey, error })
            })
        }, this.pollingInterval)

        // Store timer reference
        this.pollingTimers.set(repoKey, timer)

        // Do an initial check
        this.checkRepository(repoKey).catch(error => {
            log('Error in initial repository check', 'error', { repo: repoKey, error })
        })
    }

    /**
     * Process a GitHub event
     * @param {string} repo The repository name
     * @param {string} event The event type
     * @param {Object} payload The event payload
     * @private
     */
    async _processEvent(repo, event, payload) {
        try {
            // Handle different event types
            switch (event) {
                case 'push':
                    // Get the branch name from the ref (refs/heads/main -> main)
                    const branch = payload.ref.replace('refs/heads/', '')

                    // Get the commits
                    const commits = payload.commits.map(commit => ({
                        sha: commit.id,
                        message: commit.message,
                        author: commit.author.name,
                        date: commit.timestamp,
                        url: commit.url
                    }))

                    // Emit commit event
                    this.emit('commit', {
                        type: 'commit',
                        repo,
                        branch,
                        commits
                    })
                    break

                case 'issues':
                case 'opened':
                case 'closed':
                case 'reopened':
                    // Emit issue event
                    this.emit('issue', {
                        type: 'issue',
                        repo,
                        action: payload.action,
                        issue: {
                            number: payload.issue.number,
                            title: payload.issue.title,
                            state: payload.issue.state,
                            author: payload.issue.user.login,
                            createdAt: payload.issue.created_at,
                            url: payload.issue.html_url
                        }
                    })
                    break

                case 'pull_request':
                    // Emit PR event
                    this.emit('pull_request', {
                        type: 'pull_request',
                        repo,
                        action: payload.action,
                        pullRequest: {
                            number: payload.pull_request.number,
                            title: payload.pull_request.title,
                            state: payload.pull_request.state,
                            author: payload.pull_request.user.login,
                            createdAt: payload.pull_request.created_at,
                            url: payload.pull_request.html_url,
                            mergeable: payload.pull_request.mergeable
                        }
                    })
                    break
            }
        } catch (error) {
            log('Error processing GitHub event', 'error', { repo, event, error })
        }
    }

    /**
     * Verify webhook signature
     * @param {Object} payload The webhook payload
     * @param {string} signature The webhook signature
     * @returns {boolean} Whether the signature is valid
     * @private
     */
    _verifyWebhookSignature(payload, signature) {
        if (!this.webhookSecret) {
            log('Webhook secret not configured, skipping signature verification', 'warn')
            return true
        }

        try {
            const crypto = require('crypto')
            const hmac = crypto.createHmac('sha256', this.webhookSecret)
            const digest = 'sha256=' + hmac.update(JSON.stringify(payload)).digest('hex')

            return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
        } catch (error) {
            log('Error verifying webhook signature', 'error', error)
            return false
        }
    }
}

// Create a singleton instance
let instance = null

/**
 * Get the GitHubMonitor instance
 * @returns {GitHubMonitor} The GitHubMonitor instance
 */
export function getGitHubMonitor() {
    if (!instance) {
        instance = new GitHubMonitor()
    }
    return instance
}
