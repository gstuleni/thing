import { ScholarshipAggregator, ScholarshipRSSParser } from './scholarshipAggregator.js';

class ScholarshipService {
    constructor() {
        this.aggregator = new ScholarshipAggregator();
        this.rssParser = new ScholarshipRSSParser();
        this.setupSources();
    }

    setupSources() {
        // Add legitimate API sources
        // Example: Department of Education API (you would need to get actual API keys)
        this.aggregator.addSource(
            'Department of Education',
            'https://api.ed.gov/scholarships',
            process.env.ED_API_KEY
        );

        // Add RSS feeds for scholarship news
        this.rssParser.addFeed(
            'https://www.scholarships.com/rss/scholarship-news.xml',
            'Scholarships.com'
        );
    }

    async refreshScholarships() {
        try {
            // Fetch scholarships from APIs
            const scholarships = await this.aggregator.fetchAllScholarships();
            
            // Fetch latest news and updates
            const news = await this.rssParser.fetchFeeds();

            // Store in local storage or state management
            localStorage.setItem('scholarships', JSON.stringify(scholarships));
            localStorage.setItem('scholarshipNews', JSON.stringify(news));

            return {
                scholarships,
                news
            };
        } catch (error) {
            console.error('Error refreshing scholarships:', error);
            throw error;
        }
    }

    // Get scholarships with filtering
    getScholarships(filters = {}) {
        const scholarships = JSON.parse(localStorage.getItem('scholarships') || '[]');
        
        return scholarships.filter(scholarship => {
            let matches = true;

            if (filters.minAmount) {
                matches = matches && scholarship.amount >= filters.minAmount;
            }

            if (filters.deadline) {
                matches = matches && new Date(scholarship.deadline) >= new Date(filters.deadline);
            }

            if (filters.major) {
                matches = matches && scholarship.requirements.major.includes(filters.major);
            }

            if (filters.gpa) {
                matches = matches && scholarship.requirements.gpa <= filters.gpa;
            }

            return matches;
        });
    }

    // Get scholarship news and updates
    getScholarshipNews() {
        return JSON.parse(localStorage.getItem('scholarshipNews') || '[]');
    }

    // Set up automatic refresh interval
    startAutoRefresh(intervalMinutes = 60) {
        setInterval(() => {
            this.refreshScholarships()
                .catch(error => console.error('Auto-refresh failed:', error));
        }, intervalMinutes * 60 * 1000);
    }
}

// Create and export service instance
const scholarshipService = new ScholarshipService();
export default scholarshipService; 