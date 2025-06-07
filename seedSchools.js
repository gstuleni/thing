require('dotenv').config();
const mongoose = require('mongoose');
const School = require('./models/School');

const schools = [
    // High Schools
    {
        name: "Thomas Jefferson High School for Science and Technology",
        type: "high-school",
        city: "Alexandria",
        state: "VA",
        website: "https://tjhsst.fcps.edu/"
    },
    {
        name: "Stuyvesant High School",
        type: "high-school",
        city: "New York",
        state: "NY",
        website: "https://stuy.enschool.org/"
    },
    // Universities
    {
        name: "Massachusetts Institute of Technology",
        type: "university",
        city: "Cambridge",
        state: "MA",
        website: "https://web.mit.edu/"
    },
    {
        name: "Stanford University",
        type: "university",
        city: "Stanford",
        state: "CA",
        website: "https://www.stanford.edu/"
    },
    {
        name: "Harvard University",
        type: "university",
        city: "Cambridge",
        state: "MA",
        website: "https://www.harvard.edu/"
    },
    // Colleges
    {
        name: "Williams College",
        type: "college",
        city: "Williamstown",
        state: "MA",
        website: "https://www.williams.edu/"
    },
    {
        name: "Amherst College",
        type: "college",
        city: "Amherst",
        state: "MA",
        website: "https://www.amherst.edu/"
    }
    // Add more schools as needed
];

async function seedSchools() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scholarai', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        // Clear existing schools
        await School.deleteMany({});
        console.log('Cleared existing schools');
        
        // Insert new schools
        const result = await School.insertMany(schools);
        console.log(`Successfully seeded ${result.length} schools`);
        
        await mongoose.connection.close();
    } catch (error) {
        console.error('Error seeding schools:', error);
        process.exit(1);
    }
}

seedSchools(); 