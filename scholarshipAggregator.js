// Scholarship data aggregator
class ScholarshipAggregator {
    constructor() {
        this.sources = [];
        this.apiKeys = {};
    }

    // Add a legitimate data source
    addSource(name, apiEndpoint, apiKey) {
        this.sources.push({
            name,
            endpoint: apiEndpoint
        });
        if (apiKey) {
            this.apiKeys[name] = apiKey;
        }
    }

    // Fetch scholarships from all sources
    async fetchAllScholarships() {
        const allScholarships = [];
        
        for (const source of this.sources) {
            try {
                const scholarships = await this.fetchFromSource(source);
                allScholarships.push(...scholarships);
            } catch (error) {
                console.error(`Error fetching from ${source.name}:`, error);
            }
        }

        return this.standardizeScholarships(allScholarships);
    }

    // Fetch from a single source
    async fetchFromSource(source) {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.apiKeys[source.name]) {
            headers['Authorization'] = `Bearer ${this.apiKeys[source.name]}`;
        }

        const response = await fetch(source.endpoint, { headers });
        const data = await response.json();
        return data;
    }

    // Standardize scholarship format
    standardizeScholarships(scholarships) {
        return scholarships.map(scholarship => ({
            id: scholarship.id || generateUniqueId(),
            title: scholarship.title || scholarship.name,
            organization: scholarship.organization || scholarship.provider,
            amount: parseFloat(scholarship.amount) || 0,
            deadline: new Date(scholarship.deadline),
            requirements: {
                gpa: scholarship.requirements?.gpa || null,
                major: scholarship.requirements?.major || [],
                year: scholarship.requirements?.year || [],
                citizenship: scholarship.requirements?.citizenship || null
            },
            description: scholarship.description || '',
            applicationUrl: scholarship.applicationUrl || scholarship.url,
            status: 'available',
            matchScore: this.calculateMatchScore(scholarship)
        }));
    }

    // Calculate match score based on user profile
    calculateMatchScore(scholarship) {
        // Implement matching logic based on user profile
        return Math.floor(Math.random() * 30) + 70; // Placeholder
    }
}

// RSS Feed Parser for scholarship news and updates
class ScholarshipRSSParser {
    constructor() {
        this.feeds = [];
    }

    addFeed(url, source) {
        this.feeds.push({ url, source });
    }

    async fetchFeeds() {
        const allFeeds = [];
        
        for (const feed of this.feeds) {
            try {
                const parser = new DOMParser();
                const response = await fetch(feed.url);
                const text = await response.text();
                const xml = parser.parseFromString(text, 'text/xml');
                
                const items = xml.querySelectorAll('item');
                const feedItems = Array.from(items).map(item => ({
                    title: item.querySelector('title')?.textContent,
                    description: item.querySelector('description')?.textContent,
                    link: item.querySelector('link')?.textContent,
                    pubDate: item.querySelector('pubDate')?.textContent,
                    source: feed.source
                }));
                
                allFeeds.push(...feedItems);
            } catch (error) {
                console.error(`Error fetching RSS feed from ${feed.source}:`, error);
            }
        }

        return allFeeds;
    }
}

// Helper function to generate unique IDs
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Export the classes
export { ScholarshipAggregator, ScholarshipRSSParser }; 