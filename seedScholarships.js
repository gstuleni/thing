const mongoose = require('mongoose');
require('dotenv').config();
const Scholarship = require('./models/Scholarship');

// Define the Scholarship Schema
const scholarshipSchema = new mongoose.Schema({
    name: { type: String, required: true },
    org: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    requirements: [String],
    matchScore: { type: Number, default: 0 },
    deadline: { type: Date, required: true },
    status: { type: String, enum: ['active', 'expired', 'closed'], default: 'active' }
});

const ScholarshipModel = mongoose.model('Scholarship', scholarshipSchema);

// Sample scholarships data
const scholarships = [
    {
        name: 'STEM Excellence Scholarship',
        org: 'National Science Foundation',
        description: 'For students pursuing degrees in Science, Technology, Engineering, or Mathematics',
        amount: 10000,
        requirements: ['STEM major', 'GPA 3.5+', 'US Citizen'],
        deadline: new Date('2025-12-31'),
        status: 'active'
    },
    {
        name: 'Future Leaders Grant',
        org: 'Leadership Foundation',
        description: 'Supporting students who demonstrate exceptional leadership potential',
        amount: 5000,
        requirements: ['Leadership experience', 'Community service', 'Essay required'],
        deadline: new Date('2025-11-30'),
        status: 'active'
    },
    {
        name: 'Arts & Humanities Fellowship',
        org: 'Cultural Arts Society',
        description: 'For students in arts, literature, history, or related fields',
        amount: 7500,
        requirements: ['Arts/Humanities major', 'Portfolio submission', 'Essay required'],
        deadline: new Date('2025-10-15'),
        status: 'active'
    },
    {
        name: 'First Generation Scholar Award',
        org: 'Education Access Foundation',
        description: 'Supporting first-generation college students',
        amount: 12000,
        requirements: ['First-generation student', 'Financial need', 'Essay required'],
        deadline: new Date('2025-09-30'),
        status: 'active'
    },
    {
        name: 'Global Diversity Scholarship',
        org: 'International Education Fund',
        description: 'Promoting diversity and cross-cultural understanding',
        amount: 15000,
        requirements: ['International student', 'Cultural essay', 'Community involvement'],
        deadline: new Date('2025-08-31'),
        status: 'active'
    },
    // Adding new scholarships
    {
        name: 'Tech Innovation Award',
        org: 'Silicon Valley Foundation',
        description: 'For students innovating in technology and computer science',
        amount: 20000,
        requirements: ['CS/Engineering major', 'Project portfolio', 'Innovation essay'],
        deadline: new Date('2025-12-15'),
        status: 'active'
    },
    {
        name: 'Environmental Studies Grant',
        org: 'Green Earth Foundation',
        description: 'Supporting students focused on environmental science and sustainability',
        amount: 8000,
        requirements: ['Environmental focus', 'Research proposal', 'Sustainability project'],
        deadline: new Date('2025-11-15'),
        status: 'active'
    },
    {
        name: 'Healthcare Heroes Scholarship',
        org: 'Medical Education Alliance',
        description: 'For future healthcare professionals',
        amount: 25000,
        requirements: ['Pre-med/Nursing/Healthcare', 'Clinical experience', 'Healthcare essay'],
        deadline: new Date('2025-10-30'),
        status: 'active'
    }
];

async function seedScholarships() {
    try {
        await mongoose.connect('mongodb://localhost:27017/scholarai', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        // Clear existing scholarships
        await Scholarship.deleteMany({});
        console.log('Cleared existing scholarships');
        
        // Insert new scholarships
        const result = await Scholarship.insertMany(scholarships);
        console.log(`Successfully seeded ${result.length} scholarships`);
        
        await mongoose.connection.close();
    } catch (error) {
        console.error('Error seeding scholarships:', error);
        process.exit(1);
    }
}

seedScholarships(); 