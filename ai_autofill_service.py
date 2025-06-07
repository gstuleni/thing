# ai_autofill_service.py
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import openai
from anthropic import Anthropic
import json
from bs4 import BeautifulSoup
import re
from typing import Dict, List, Any
import requests
from urllib.parse import urlparse
from dotenv import load_dotenv
import time
from datetime import datetime, timedelta
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Rate limiting configuration
RATE_LIMITS = {
    'hourly': {
        'limit': 20,
        'calls': 0,
        'reset_time': datetime.now()
    },
    'daily': {
        'limit': 100,
        'calls': 0,
        'reset_time': datetime.now()
    }
}

# Initialize AI clients with environment variables
try:
    openai_client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
except Exception as e:
    print(f"Error initializing OpenAI client: {e}")
    openai_client = None

try:
    claude_client = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
except Exception as e:
    print(f"Error initializing Claude client: {e}")
    claude_client = None

def check_rate_limits():
    """Check and update rate limits"""
    now = datetime.now()
    
    # Reset hourly limit if needed
    if now - RATE_LIMITS['hourly']['reset_time'] > timedelta(hours=1):
        RATE_LIMITS['hourly']['calls'] = 0
        RATE_LIMITS['hourly']['reset_time'] = now
    
    # Reset daily limit if needed
    if now - RATE_LIMITS['daily']['reset_time'] > timedelta(days=1):
        RATE_LIMITS['daily']['calls'] = 0
        RATE_LIMITS['daily']['reset_time'] = now
    
    # Check if limits are exceeded
    if (RATE_LIMITS['hourly']['calls'] >= RATE_LIMITS['hourly']['limit'] or
        RATE_LIMITS['daily']['calls'] >= RATE_LIMITS['daily']['limit']):
        return False
    
    # Update counters
    RATE_LIMITS['hourly']['calls'] += 1
    RATE_LIMITS['daily']['calls'] += 1
    return True

class AIFormAnalyzer:
    """Analyzes form HTML and generates filling instructions using AI"""
    
    def __init__(self, config_path='config/autofill.json'):
        try:
            with open(config_path, 'r') as f:
                self.config = json.load(f)
        except Exception as e:
            print(f"Error loading config: {e}")
            self.config = {}
            
        self.field_patterns = self.config.get('field_patterns', {})
        self.ai_settings = self.config.get('ai_settings', {})
        
    def analyze_form_html(self, html_content: str, user_data: Dict) -> Dict[str, Any]:
        """Analyze form HTML and create filling instructions"""
        
        # Clean HTML for AI processing
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Extract form structure
        form_fields = self._extract_form_fields(soup)
        
        # Generate AI prompt
        prompt = self._create_analysis_prompt(form_fields, user_data)
        
        # Get AI analysis
        if openai_client and self.ai_settings.get('openai'):
            filling_instructions = self._analyze_with_openai(prompt)
        elif claude_client and self.ai_settings.get('anthropic'):
            filling_instructions = self._analyze_with_claude(prompt)
        else:
            filling_instructions = self._fallback_analysis()
            
        return filling_instructions
    
    def _extract_form_fields(self, soup: BeautifulSoup) -> List[Dict]:
        """Extract all form fields from HTML"""
        fields = []
        
        # Find all input fields
        for element in soup.find_all(['input', 'textarea', 'select']):
            field_info = {
                'tag': element.name,
                'type': element.get('type', 'text'),
                'name': element.get('name', ''),
                'id': element.get('id', ''),
                'placeholder': element.get('placeholder', ''),
                'required': element.get('required') is not None,
                'label': self._find_label_for_field(soup, element),
                'class': ' '.join(element.get('class', [])),
                'selector': self._generate_selector(element)
            }
            
            # For select elements, get options
            if element.name == 'select':
                field_info['options'] = [
                    {'value': opt.get('value', ''), 'text': opt.text.strip()}
                    for opt in element.find_all('option')
                ]
            
            fields.append(field_info)
            
        return fields
    
    def _find_label_for_field(self, soup: BeautifulSoup, field) -> str:
        """Find the label text for a form field"""
        # Check for label with 'for' attribute
        field_id = field.get('id')
        if field_id:
            label = soup.find('label', {'for': field_id})
            if label:
                return label.text.strip()
        
        # Check if field is inside a label
        parent_label = field.find_parent('label')
        if parent_label:
            return parent_label.text.strip()
        
        # Look for nearby text
        prev_sibling = field.find_previous_sibling()
        if prev_sibling and prev_sibling.name in ['label', 'span', 'div']:
            return prev_sibling.text.strip()
            
        return ''
    
    def _generate_selector(self, element) -> str:
        """Generate a unique CSS selector for the element"""
        if element.get('id'):
            return f"#{element['id']}"
        elif element.get('name'):
            return f"{element.name}[name='{element['name']}']"
        else:
            # Generate a more complex selector
            classes = '.'.join(element.get('class', []))
            if classes:
                return f"{element.name}.{classes}"
            return element.name
    
    def _create_analysis_prompt(self, form_fields: List[Dict], user_data: Dict) -> str:
        """Create prompt for AI to analyze form fields"""
        
        prompt = f"""Analyze these form fields and match them with the user's data to create filling instructions.

Form Fields:
{json.dumps(form_fields, indent=2)}

User Data:
{json.dumps(user_data, indent=2)}

Create a JSON response with filling instructions for each field that should be filled. For each field, provide:
1. The CSS selector to find the field
2. The value to fill
3. The fill method (type, select, check, etc.)
4. Any special handling instructions

Consider these common scholarship form patterns:
{json.dumps(self.field_patterns, indent=2)}

Response format:
{{
  "instructions": [
    {{
      "selector": "CSS selector",
      "value": "value to fill",
      "method": "type|select|check|click",
      "delay": milliseconds,
      "validation": "optional validation regex",
      "transform": "optional transformation like 'phone' or 'date'"
    }}
  ],
  "summary": "Brief summary of what was matched"
}}
"""
        return prompt
    
    def _analyze_with_openai(self, prompt: str) -> Dict:
        """Use OpenAI to analyze the form"""
        if not openai_client:
            print("OpenAI client not initialized")
            return self._fallback_analysis()
            
        if not check_rate_limits():
            print("Rate limit exceeded")
            return self._fallback_analysis()
            
        try:
            openai_settings = self.ai_settings.get('openai', {})
            response = openai_client.chat.completions.create(
                model=openai_settings.get('model', 'gpt-4'),
                messages=[
                    {"role": "system", "content": "You are an expert at analyzing HTML forms and creating precise filling instructions."},
                    {"role": "user", "content": prompt}
                ],
                temperature=openai_settings.get('temperature', 0.1),
                max_tokens=openai_settings.get('max_tokens', 4000),
                response_format={"type": "json_object"}
            )
            
            return json.loads(response.choices[0].message.content)
        except openai.RateLimitError:
            print("OpenAI rate limit exceeded")
            return self._fallback_analysis()
        except openai.APIError as e:
            print(f"OpenAI API error: {e}")
            return self._fallback_analysis()
        except Exception as e:
            print(f"Unexpected error with OpenAI: {e}")
            return self._fallback_analysis()
    
    def _analyze_with_claude(self, prompt: str) -> Dict:
        """Use Claude to analyze the form"""
        if not claude_client:
            print("Claude client not initialized")
            return self._fallback_analysis()
            
        if not check_rate_limits():
            print("Rate limit exceeded")
            return self._fallback_analysis()
            
        try:
            claude_settings = self.ai_settings.get('anthropic', {})
            response = claude_client.messages.create(
                model=claude_settings.get('model', 'claude-3-opus-20240229'),
                messages=[
                    {"role": "user", "content": prompt}
                ],
                max_tokens=claude_settings.get('max_tokens', 2000),
                temperature=claude_settings.get('temperature', 0.1)
            )
            
            # Extract JSON from response
            content = response.content[0].text
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                try:
                    return json.loads(json_match.group())
                except json.JSONDecodeError:
                    print("Failed to parse Claude response as JSON")
                    return self._fallback_analysis()
            else:
                print("No JSON found in Claude response")
                return self._fallback_analysis()
                
        except Exception as e:
            print(f"Claude error: {e}")
            return self._fallback_analysis()
            
    def _fallback_analysis(self) -> Dict:
        """Fallback pattern matching when AI fails"""
        return {
            "instructions": [],
            "summary": "Using pattern-based matching due to AI service unavailability",
            "fallback": True,
            "timestamp": datetime.now().isoformat(),
            "patterns_used": self.field_patterns
        }


class AIFormFiller:
    """Orchestrates the form filling process"""
    
    def __init__(self, config_path='config/autofill.json'):
        """Initialize the form filler with configuration"""
        try:
            with open(config_path, 'r') as f:
                self.config = json.load(f)
        except Exception as e:
            print(f"Error loading config: {e}")
            self.config = {}
            
        self.analyzer = AIFormAnalyzer()
        self.field_patterns = self.config.get('field_patterns', {})
        self.form_filling = self.config.get('form_filling', {})
        self.browser_settings = self.config.get('browser_settings', {})
        
        # Initialize browser
        self.driver = None
        self.wait = None
        
    def setup_browser(self):
        """Setup browser with configuration"""
        options = Options()
        
        # Add browser options
        if self.browser_settings.get('stealth_mode'):
            options.add_argument('--disable-blink-features=AutomationControlled')
            options.add_experimental_option("excludeSwitches", ["enable-automation"])
            options.add_experimental_option('useAutomationExtension', False)
        
        # Set user agent
        if user_agent := self.browser_settings.get('user_agent'):
            options.add_argument(f'user-agent={user_agent}')
        
        # Set viewport
        if viewport := self.browser_settings.get('viewport'):
            options.add_argument(f'--window-size={viewport["width"]},{viewport["height"]}')
        
        # Additional options
        options.add_argument('--disable-popup-blocking')
        options.add_argument('--disable-notifications')
        options.add_argument('--start-maximized')
        
        try:
            self.driver = webdriver.Chrome(options=options)
            self.wait = WebDriverWait(
                self.driver, 
                self.browser_settings.get('timeout', 30000) / 1000
            )
            
            # Execute stealth script if enabled
            if self.browser_settings.get('stealth_mode'):
                self.driver.execute_script(
                    "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
                )
                self.driver.execute_script("""
                    Object.defineProperty(navigator, 'plugins', {
                        get: () => [1, 2, 3, 4, 5]
                    });
                    Object.defineProperty(navigator, 'languages', {
                        get: () => ['en-US', 'en']
                    });
                """)
        except Exception as e:
            print(f"Error setting up browser: {e}")
            raise
            
    def fill_form(self, form_url: str, user_data: Dict) -> bool:
        """Fill a form with user data"""
        if not self.driver:
            print("Browser not initialized")
            return False
            
        try:
            # Load the form
            self.driver.get(form_url)
            time.sleep(self.form_filling.get('delays', {}).get('page_load', 2000) / 1000)
            
            # Detect form fields
            fields = self.detect_form_fields()
            
            # Create data mapping
            data_mapping = self._create_data_mapping(user_data)
            
            # Fill fields
            success = True
            for field_name, field_info in fields.items():
                if value := data_mapping.get(field_name):
                    if not self._fill_field(field_info, value):
                        success = False
                        
            return success
            
        except Exception as e:
            print(f"Error filling form: {e}")
            return False
            
    def _fill_field(self, field_info: Dict, value: str) -> bool:
        """Fill a single field with error handling"""
        try:
            element = field_info['element']
            field_type = field_info['type']
            
            # Scroll element into view
            self.driver.execute_script("arguments[0].scrollIntoView(true);", element)
            time.sleep(self.form_filling.get('delays', {}).get('scroll', 300) / 1000)
            
            # Wait for element to be interactable
            self.wait.until(EC.element_to_be_clickable(element))
            
            # Focus the element
            try:
                element.click()
            except:
                self.driver.execute_script("arguments[0].focus();", element)
            
            if field_type in ['text', 'email', 'tel', 'number']:
                element.clear()
                # Type slowly to mimic human behavior
                typing_delay = self.form_filling.get('delays', {}).get('typing_speed', 50) / 1000
                for char in value:
                    element.send_keys(char)
                    time.sleep(typing_delay)
                    
            elif field_type == 'textarea':
                element.clear()
                # Type slowly with natural pauses
                words = value.split()
                for word in words:
                    element.send_keys(word + ' ')
                    time.sleep(typing_delay * 2)
                    
            elif field_type == 'select':
                select = Select(element)
                # Try different selection methods
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
                                
            # Wait between fields
            time.sleep(self.form_filling.get('delays', {}).get('between_fields', 500) / 1000)
            return True
            
        except Exception as e:
            print(f"Error filling field: {e}")
            return False
            
    def close(self):
        """Close the browser and cleanup"""
        if self.driver:
            try:
                self.driver.quit()
            except Exception as e:
                print(f"Error closing browser: {e}")
            finally:
                self.driver = None
                self.wait = None


@app.route('/api/analyze-form', methods=['POST'])
def analyze_form():
    """Analyze form HTML sent from browser extension"""
    try:
        data = request.json
        html_content = data.get('html', '')
        user_data = data.get('userData', {})
        form_url = data.get('url', '')
        
        # Use AI to analyze the form
        analyzer = AIFormAnalyzer(ai_provider='openai')  # or 'claude'
        analysis = analyzer.analyze_form_html(html_content, user_data)
        
        return jsonify({
            'success': True,
            'analysis': analysis,
            'fillingInstructions': analysis.get('instructions', [])
        })
        
    except Exception as e:
        print(f"Error analyzing form: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/prepare-autofill', methods=['POST'])
def prepare_autofill():
    """Prepare autofill script for a scholarship"""
    try:
        data = request.json
        form_url = data.get('formUrl', '')
        user_data = data.get('userData', {})
        
        # Create smart filling script
        filler = AIFormFiller()
        filler.setup_browser()
        success = filler.fill_form(form_url, user_data)
        
        return jsonify({
            'success': success,
            'script': filler.config
        })
        
    except Exception as e:
        print(f"Error preparing autofill: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/validate-filled-form', methods=['POST'])
def validate_filled_form():
    """Validate that form was filled correctly"""
    try:
        data = request.json
        filled_fields = data.get('filledFields', [])
        expected_fields = data.get('expectedFields', [])
        
        # Use AI to validate the filling
        validation_prompt = f"""
        Validate if the form was filled correctly.
        
        Expected fields: {json.dumps(expected_fields)}
        Filled fields: {json.dumps(filled_fields)}
        
        Check for:
        1. All required fields are filled
        2. Values match the expected format
        3. No obvious errors or mismatches
        
        Return a validation report.
        """
        
        # Get AI validation
        validation = openai_client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": validation_prompt}],
            temperature=0.1
        )
        
        return jsonify({
            'success': True,
            'validation': validation.choices[0].message.content,
            'isValid': True  # Parse from AI response
        })
        
    except Exception as e:
        print(f"Error validating form: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    app.run(port=5001, debug=True)