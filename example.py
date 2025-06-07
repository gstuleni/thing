from autofill import AIFormFiller, UserData
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Your user data
user_data = UserData(
    personal_info={
        'first_name': 'Gleb',
        'last_name': 'Baluyan',
        'date_of_birth': '2006-09-12'
    },
    academic_info={
        'gpa': '3.9',
        'major': 'Political Science',
        'school': 'dorman high school',
        'graduation_year': '2025'
    },
    contact_info={
        'email': 'gbaluyann@gmail.com',
        'phone': '864-551-8774',
        'address': '812 montclair ct',
        'city': 'spartanburg',
        'state': 'SC',
        'zip_code': '29301'
    },
    essays={
        'personal_statement': '''I am passionate about technology and its potential to make a positive impact on society. 
        Throughout my academic career, I have maintained a high GPA while participating in various extracurricular activities 
        and research projects...'''
    },
    files={}
)

# Get API key from environment variable
openai_api_key = os.getenv('OPENAI_API_KEY')
if not openai_api_key:
    raise ValueError("OPENAI_API_KEY environment variable is not set")

# Initialize the form filler with your OpenAI API key
with AIFormFiller(openai_api_key=openai_api_key) as filler:
    try:
        # Set up the browser
        filler.setup_browser()
        
        # Fill a form
        success = filler.fill_form('https://example-scholarship-form.com', user_data)
        
        if success:
            print("Form filled successfully!")
        else:
            print("There was an error filling the form.")
    except Exception as e:
        print(f"Error during form filling: {e}")
    finally:
        # Ensure browser is closed even if an error occurs
        filler.close() 