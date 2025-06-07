import json
import time
from dataclasses import dataclass
from typing import Dict, List, Optional, Any
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support.ui import Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import openai
from bs4 import BeautifulSoup
import os

@dataclass
class UserData:
    """Structure to hold user information for form filling"""
    personal_info: Dict[str, str] = None
    academic_info: Dict[str, str] = None
    contact_info: Dict[str, str] = None
    essays: Dict[str, str] = None
    files: Dict[str, str] = None

    def __post_init__(self):
        """Initialize default values for None fields"""
        self.personal_info = self.personal_info or {}
        self.academic_info = self.academic_info or {}
        self.contact_info = self.contact_info or {}
        self.essays = self.essays or {}
        self.files = self.files or {}

    @classmethod
    def from_profile(cls, profile_data: Dict[str, Any]):
        """Create UserData instance from profile data"""
        return cls(
            personal_info={
                'first_name': profile_data.get('firstName', ''),
                'last_name': profile_data.get('lastName', ''),
                'email': profile_data.get('email', ''),
                'phone': profile_data.get('phone', ''),
                'date_of_birth': profile_data.get('dateOfBirth', ''),
                'citizenship': profile_data.get('citizenshipStatus', ''),
                'gender': profile_data.get('gender', ''),
                'ethnicity': profile_data.get('ethnicity', []),
            },
            academic_info={
                'school': profile_data.get('school', ''),
                'school_year': profile_data.get('schoolYear', ''),
                'major': profile_data.get('major', ''),
                'minor': profile_data.get('minor', ''),
                'gpa': str(profile_data.get('gpa', '')),
                'graduation_year': str(profile_data.get('graduationYear', '')),
                'sat_total': str(profile_data.get('testScores', {}).get('sat', {}).get('total', '')),
                'sat_math': str(profile_data.get('testScores', {}).get('sat', {}).get('math', '')),
                'sat_reading': str(profile_data.get('testScores', {}).get('sat', {}).get('reading', '')),
                'act_composite': str(profile_data.get('testScores', {}).get('act', {}).get('composite', '')),
                'act_english': str(profile_data.get('testScores', {}).get('act', {}).get('english', '')),
                'act_math': str(profile_data.get('testScores', {}).get('act', {}).get('math', '')),
                'act_reading': str(profile_data.get('testScores', {}).get('act', {}).get('reading', '')),
                'act_science': str(profile_data.get('testScores', {}).get('act', {}).get('science', '')),
            },
            contact_info={
                'street': profile_data.get('address', {}).get('street', ''),
                'city': profile_data.get('address', {}).get('city', ''),
                'state': profile_data.get('address', {}).get('state', ''),
                'zip_code': profile_data.get('address', {}).get('zipCode', ''),
                'country': profile_data.get('address', {}).get('country', 'United States'),
            }
        )

class AIFormFiller:
    def __init__(self, config_file: str = 'ai.json', openai_api_key: str = None):
        """Initialize the AI form filler with configuration and OpenAI integration"""
        self.driver = None
        self.wait = None
        self.openai_client = openai.OpenAI(api_key=openai_api_key) if openai_api_key else None
        
        # Load configuration
        with open(config_file, 'r') as f:
            self.config = json.load(f)['config']
        
        # Extract configuration values
        self.field_patterns = self.config['form_fields']
        self.browser_options = self.config['selenium']['browser_options']
        self.delays = self.config['delays']
        self.selectors = self.config['selectors']

    def setup_browser(self):
        """Setup Chrome browser with stealth configuration"""
        options = Options()
        
        # Add browser options from config
        for option in self.browser_options:
            options.add_argument(option)
        
        if self.config['selenium']['headless']:
            options.add_argument('--headless')
        
        # Add experimental options
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        
        # Additional options for handling complex forms
        options.add_argument('--disable-popup-blocking')
        options.add_argument('--disable-notifications')
        options.add_argument('--start-maximized')
        
        self.driver = webdriver.Chrome(options=options)
        self.wait = WebDriverWait(self.driver, self.config['selenium']['timeout'])
        
        # Execute stealth script
        if self.config['selenium']['stealth_mode']:
            self.driver.execute_script(
                "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
            )
            # Additional stealth configurations
            self.driver.execute_script("""
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [1, 2, 3, 4, 5]
                });
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['en-US', 'en']
                });
            """)

    def analyze_form_with_ai(self, html_content: str) -> Dict[str, str]:
        """Use OpenAI to analyze form structure and suggest field mappings"""
        if not self.openai_client:
            return {}
        
        prompt = f"""
        Analyze this HTML form and identify form fields. Return a JSON object mapping field purposes to CSS selectors.
        
        Look for these common scholarship form fields:
        - First name, Last name, Full name
        - Email, Phone, Address
        - GPA, Major, School, Graduation year
        - Essay/Personal statement fields
        - Date of birth
        - File upload fields
        
        HTML Content:
        {html_content[:4000]}...
        
        Return only valid JSON in this format:
        {{
            "first_name": "input[name='firstname']",
            "email": "input[id='email']",
            "essay": "textarea[name='statement']"
        }}
        """
        
        try:
            response = self.openai_client.chat.completions.create(
                model=self.config['ai']['model'],
                messages=[{"role": "user", "content": prompt}],
                temperature=self.config['ai']['temperature']
            )
            
            response_text = response.choices[0].message.content
            # Extract JSON from response
            import re
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except Exception as e:
            print(f"AI analysis failed: {e}")
        
        return {}

    def detect_form_fields(self) -> Dict[str, Any]:
        """Detect form fields using multiple strategies"""
        fields_found = {}
        
        # Get page source for AI analysis
        html_content = self.driver.page_source
        
        # Try AI-powered detection first
        ai_mappings = self.analyze_form_with_ai(html_content)
        
        # Process each category of fields
        for category, fields in self.field_patterns.items():
            for field_name, patterns in fields.items():
                element = None
                selector = None
                
                # Check AI suggestions first
                if field_name in ai_mappings:
                    try:
                        element = self.driver.find_element(By.CSS_SELECTOR, ai_mappings[field_name])
                        selector = ai_mappings[field_name]
                    except:
                        pass
                
                # Fallback to pattern matching
                if not element:
                    element, selector = self._find_element_by_patterns(patterns)
                
                if element:
                    fields_found[field_name] = {
                        'element': element,
                        'selector': selector,
                        'type': self._get_element_type(element)
                    }
        
        return fields_found

    def _find_element_by_patterns(self, patterns: List[str]) -> tuple:
        """Find element using common naming patterns"""
        for pattern in patterns:
            # Try different selector strategies
            selectors = [
                f"input[name='{pattern}']",
                f"input[id='{pattern}']",
                f"input[name*='{pattern}']",
                f"input[id*='{pattern}']",
                f"textarea[name='{pattern}']",
                f"textarea[id='{pattern}']",
                f"select[name='{pattern}']",
                f"select[id='{pattern}']",
                f"input[placeholder*='{pattern}']"
            ]
            
            for selector in selectors:
                try:
                    element = self.driver.find_element(By.CSS_SELECTOR, selector)
                    return element, selector
                except NoSuchElementException:
                    continue
        
        return None, None

    def _get_element_type(self, element) -> str:
        """Determine the type of form element"""
        tag_name = element.tag_name.lower()
        if tag_name == 'input':
            return element.get_attribute('type') or 'text'
        return tag_name

    def _handle_national_merit_form(self, url: str) -> bool:
        """Special handling for National Merit Scholarship form"""
        if 'nationalmerit' in url.lower():
            print("Detected National Merit Scholarship form, applying special handling...")
            try:
                # Wait for form to be fully loaded
                self.wait.until(EC.presence_of_element_located((By.TAG_NAME, "form")))
                
                # Check for and handle any popup/overlay
                try:
                    popup = self.driver.find_element(By.CSS_SELECTOR, ".popup, .overlay, .modal")
                    if popup.is_displayed():
                        close_button = popup.find_element(By.CSS_SELECTOR, ".close, .dismiss, button[aria-label='Close']")
                        close_button.click()
                except:
                    pass
                
                # Sometimes forms are in iframes
                iframes = self.driver.find_elements(By.TAG_NAME, "iframe")
                if iframes:
                    for iframe in iframes:
                        try:
                            self.driver.switch_to.frame(iframe)
                            if self.driver.find_elements(By.TAG_NAME, "form"):
                                print("Found form in iframe")
                                break
                        except:
                            self.driver.switch_to.default_content()
                
                return True
            except Exception as e:
                print(f"Error in National Merit form handling: {e}")
                self.driver.switch_to.default_content()
                return False
        return True

    def fill_form(self, url: str, user_data: UserData) -> bool:
        """Main method to fill a form at the given URL"""
        try:
            # Navigate to the form
            print(f"Navigating to: {url}")
            self.driver.get(url)
            time.sleep(self.delays['page_load'])
            
            # Handle special cases
            if not self._handle_national_merit_form(url):
                print("Failed to handle National Merit form specifics")
                return False
            
            # Detect form fields
            print("Analyzing form structure...")
            fields = self.detect_form_fields()
            
            if not fields:
                print("No form fields detected!")
                return False
            
            print(f"Found {len(fields)} form fields")
            
            # Create data mapping
            data_mapping = self._create_data_mapping(user_data)
            
            # Fill each detected field
            filled_count = 0
            for field_name, field_info in fields.items():
                if field_name in data_mapping and data_mapping[field_name]:
                    print(f"Filling {field_name}...")
                    if self.fill_form_field(field_info, data_mapping[field_name]):
                        filled_count += 1
                        time.sleep(self.delays['between_actions'])
                    else:
                        print(f"Failed to fill {field_name}")
            
            print(f"Successfully filled {filled_count} out of {len(fields)} fields")
            return filled_count > 0
            
        except Exception as e:
            print(f"Error filling form: {e}")
            import traceback
            traceback.print_exc()
            return False

    def _create_data_mapping(self, user_data: UserData) -> Dict[str, str]:
        """Create mapping between form fields and user data"""
        mapping = {}
        
        # Personal Information
        mapping.update({
            'first_name': user_data.personal_info.get('first_name', ''),
            'last_name': user_data.personal_info.get('last_name', ''),
            'full_name': f"{user_data.personal_info.get('first_name', '')} {user_data.personal_info.get('last_name', '')}",
            'email': user_data.personal_info.get('email', ''),
            'phone': user_data.personal_info.get('phone', ''),
            'date_of_birth': user_data.personal_info.get('date_of_birth', ''),
            'citizenship': user_data.personal_info.get('citizenship', ''),
            'gender': user_data.personal_info.get('gender', ''),
            'ethnicity': user_data.personal_info.get('ethnicity', []),
        })
        
        # Academic Information
        mapping.update({
            'school': user_data.academic_info.get('school', ''),
            'school_year': user_data.academic_info.get('school_year', ''),
            'major': user_data.academic_info.get('major', ''),
            'minor': user_data.academic_info.get('minor', ''),
            'gpa': user_data.academic_info.get('gpa', ''),
            'graduation_year': user_data.academic_info.get('graduation_year', ''),
            'sat_total': user_data.academic_info.get('sat_total', ''),
            'sat_math': user_data.academic_info.get('sat_math', ''),
            'sat_reading': user_data.academic_info.get('sat_reading', ''),
            'act_composite': user_data.academic_info.get('act_composite', ''),
            'act_english': user_data.academic_info.get('act_english', ''),
            'act_math': user_data.academic_info.get('act_math', ''),
            'act_reading': user_data.academic_info.get('act_reading', ''),
            'act_science': user_data.academic_info.get('act_science', ''),
        })
        
        # Contact Information
        mapping.update({
            'address': user_data.contact_info.get('street', ''),
            'street': user_data.contact_info.get('street', ''),
            'city': user_data.contact_info.get('city', ''),
            'state': user_data.contact_info.get('state', ''),
            'zip': user_data.contact_info.get('zip_code', ''),
            'zip_code': user_data.contact_info.get('zip_code', ''),
            'country': user_data.contact_info.get('country', ''),
        })
        
        return mapping

    def _find_and_click_submit(self) -> bool:
        """Find and click submit button (use with caution)"""
        for selector in self.selectors['submit_buttons']:
            try:
                submit_btn = self.driver.find_element(By.CSS_SELECTOR, selector)
                submit_btn.click()
                return True
            except:
                continue
        return False

    def close(self):
        """Close the browser"""
        if self.driver:
            self.driver.quit()

    def __enter__(self):
        """Context manager entry"""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.close()

    def fill_form_field(self, field_info: Dict, value: str) -> bool:
        """Fill a specific form field with error handling"""
        try:
            element = field_info['element']
            field_type = field_info['type']
            
            # Scroll element into view
            self.driver.execute_script("arguments[0].scrollIntoView(true);", element)
            time.sleep(0.5)  # Wait for scroll to complete
            
            # Wait for element to be interactable
            self.wait.until(EC.element_to_be_clickable(element))
            
            # Try to focus the element
            try:
                element.click()
            except:
                self.driver.execute_script("arguments[0].focus();", element)
            
            if field_type in ['text', 'email', 'tel', 'number']:
                element.clear()
                # Type slowly to mimic human behavior
                for char in value:
                    element.send_keys(char)
                    time.sleep(0.1)
                
            elif field_type == 'textarea':
                element.clear()
                # Type slowly to mimic human behavior
                for char in value:
                    element.send_keys(char)
                    time.sleep(0.05)
                
            elif field_type == 'select':
                select = Select(element)
                # Try to select by visible text first, then by value
                try:
                    select.select_by_visible_text(value)
                except:
                    try:
                        select.select_by_value(value)
                    except:
                        # Try partial match
                        for option in select.options:
                            if value.lower() in option.text.lower():
                                select.select_by_visible_text(option.text)
                                break
                                
            elif field_type == 'file':
                if value and os.path.exists(value):
                    element.send_keys(value)
                    
            elif field_type in ['radio', 'checkbox']:
                if not element.is_selected():
                    element.click()
            
            # Verify the field was filled
            time.sleep(self.delays['field_fill'])
            
            # Additional verification for text fields
            if field_type in ['text', 'email', 'tel', 'number', 'textarea']:
                actual_value = element.get_attribute('value')
                if not actual_value and value:
                    # Try alternative input method
                    self.driver.execute_script(
                        f"arguments[0].value = '{value}';", element
                    )
            
            return True
            
        except Exception as e:
            print(f"Error filling field: {e}")
            return False 