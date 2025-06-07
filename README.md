# Scholarship Form Autofill System

An intelligent form autofilling system that uses AI to analyze and automatically fill scholarship application forms.

## Features

- AI-powered form field analysis using OpenAI GPT-4 and Anthropic Claude
- Smart pattern matching for common scholarship form fields
- Human-like form filling with natural typing delays and scrolling
- Browser automation with stealth mode to avoid detection
- Rate limiting and error handling
- Configurable field patterns and transformations
- Support for various field types (text, select, textarea, etc.)

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd scholarship-autofill
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
- Copy `config/env.example` to `.env`
- Fill in your API keys and configuration values
```bash
cp config/env.example .env
```

4. Configure form patterns and settings:
- Review and customize `config/autofill.json`
- Adjust field patterns, delays, and validations as needed

## Usage

### Basic Usage

```python
from autofill import AIFormFiller, UserData

# Prepare your user data
user_data = UserData(
    personal_info={
        'first_name': 'John',
        'last_name': 'Doe',
        # ... other fields
    },
    academic_info={
        'gpa': '3.9',
        'major': 'Computer Science',
        # ... other fields
    }
)

# Initialize and use the form filler
with AIFormFiller() as filler:
    try:
        filler.setup_browser()
        success = filler.fill_form('https://scholarship-form.com', user_data)
        print("Form filled successfully!" if success else "Error filling form")
    except Exception as e:
        print(f"Error: {e}")
```

### Running the AI Service

1. Start the AI service:
```bash
python ai_autofill_service.py
```

2. The service will be available at `http://localhost:5001`

## Configuration

### Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key
- `ANTHROPIC_API_KEY`: Your Anthropic API key
- `AI_SERVICE_URL`: URL for the AI service (default: http://localhost:5001)
- `MAX_CALLS_PER_HOUR`: Rate limit for API calls per hour
- `MAX_CALLS_PER_DAY`: Rate limit for API calls per day
- See `config/env.example` for all available options

### Form Field Patterns

Field patterns are defined in `config/autofill.json`. The system uses these patterns to match form fields with user data. Example structure:

```json
{
  "field_patterns": {
    "personal": {
      "first_name": ["first.*name", "fname", "given.*name"],
      "last_name": ["last.*name", "lname", "family.*name"]
    },
    "academic": {
      "gpa": ["gpa", "grade.*point.*average"],
      "major": ["major", "field.*study", "program"]
    }
  }
}
```

### Browser Settings

Configure browser automation settings in `config/autofill.json`:

```json
{
  "browser_settings": {
    "stealth_mode": true,
    "timeout": 30000,
    "viewport": {
      "width": 1920,
      "height": 1080
    }
  }
}
```

## Error Handling

The system includes comprehensive error handling:

- API failures fallback to pattern matching
- Browser automation errors are caught and logged
- Rate limiting prevents API abuse
- Validation ensures proper field filling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - See LICENSE file for details
