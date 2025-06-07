let fillDelay = 500; // Delay between filling fields

// Field mapping configurations
const fieldMappings = {
  personal: {
    firstName: ['first_name', 'firstname', 'fname', 'given_name', 'first-name', 'applicant_first_name'],
    lastName: ['last_name', 'lastname', 'lname', 'family_name', 'last-name', 'applicant_last_name'],
    email: ['email', 'email_address', 'e-mail', 'e_mail', 'applicant_email', 'student_email'],
    phone: ['phone', 'telephone', 'phone_number', 'mobile', 'cell', 'contact_number'],
    dateOfBirth: ['dob', 'date_of_birth', 'birth_date', 'birthday', 'birthdate'],
    address: ['address', 'street_address', 'street', 'address1', 'address_1'],
    city: ['city', 'town', 'municipality'],
    state: ['state', 'province', 'region'],
    zipCode: ['zip', 'zipcode', 'zip_code', 'postal_code', 'postcode']
  },
  academic: {
    school: ['school', 'university', 'college', 'institution', 'school_name', 'current_school'],
    gpa: ['gpa', 'grade_point_average', 'cumulative_gpa', 'overall_gpa'],
    major: ['major', 'field_of_study', 'program', 'course', 'intended_major'],
    gradeLevel: ['grade_level', 'year', 'class_year', 'academic_year', 'student_year'],
    satScore: ['sat', 'sat_score', 'sat_total', 'sat_composite'],
    actScore: ['act', 'act_score', 'act_composite']
  },
  essays: {
    careerGoals: ['career_goals', 'goals', 'future_plans', 'career_essay', 'professional_goals'],
    whyDeserving: ['why_deserving', 'deserve_scholarship', 'why_you', 'personal_statement'],
    challenges: ['challenges', 'obstacles', 'overcome', 'hardship', 'adversity']
  }
};

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fillForm') {
    fillFormFields(request.profile);
  }
});

// Find form fields by various attributes
function findField(patterns) {
  for (const pattern of patterns) {
    // Try by name attribute
    let field = document.querySelector(`input[name*="${pattern}" i], textarea[name*="${pattern}" i], select[name*="${pattern}" i]`);
    if (field && field.offsetParent !== null) return field;
    
    // Try by id attribute
    field = document.querySelector(`input[id*="${pattern}" i], textarea[id*="${pattern}" i], select[id*="${pattern}" i]`);
    if (field && field.offsetParent !== null) return field;
    
    // Try by placeholder
    field = document.querySelector(`input[placeholder*="${pattern}" i]`);
    if (field && field.offsetParent !== null) return field;
    
    // Try by label
    const labels = document.querySelectorAll('label');
    for (const label of labels) {
      if (label.textContent.toLowerCase().includes(pattern.toLowerCase())) {
        const forAttr = label.getAttribute('for');
        if (forAttr) {
          field = document.getElementById(forAttr);
          if (field && field.offsetParent !== null) return field;
        }
        // Check if label contains the input
        field = label.querySelector('input, textarea, select');
        if (field && field.offsetParent !== null) return field;
      }
    }
  }
  return null;
}

// Fill a single field with typing simulation
async function fillField(field, value) {
  if (!field || !value) return;
  
  // Focus the field
  field.focus();
  field.click();
  
  // Clear existing value
  field.value = '';
  
  // Dispatch input event to trigger any listeners
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
  
  // Type each character with delay
  for (const char of value.toString()) {
    field.value += char;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  // Final events
  field.dispatchEvent(new Event('change', { bubbles: true }));
  field.dispatchEvent(new Event('blur', { bubbles: true }));
  
  // Wait before next field
  await new Promise(resolve => setTimeout(resolve, fillDelay));
}

// Main function to fill all form fields
async function fillFormFields(profile) {
  if (!profile) {
    console.error('No profile data available');
    return;
  }
  
  // Show filling indicator
  showFillingIndicator();
  
  try {
    // Fill personal information
    for (const [key, patterns] of Object.entries(fieldMappings.personal)) {
      const field = findField(patterns);
      if (field && profile[key]) {
        await fillField(field, profile[key]);
      }
    }
    
    // Fill academic information
    for (const [key, patterns] of Object.entries(fieldMappings.academic)) {
      const field = findField(patterns);
      if (field && profile[key]) {
        await fillField(field, profile[key]);
      }
    }
    
    // Fill essay questions
    for (const [key, patterns] of Object.entries(fieldMappings.essays)) {
      const field = findField(patterns);
      if (field && profile[key]) {
        await fillField(field, profile[key]);
      }
    }
    
    // Hide indicator
    hideFillingIndicator();
    
    // Show completion message
    showCompletionMessage();
    
  } catch (error) {
    console.error('Error filling form:', error);
    hideFillingIndicator();
    showErrorMessage();
  }
}

// UI Helper Functions
function showFillingIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'scholarai-filling-indicator';
  indicator.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4F46E5;
      color: white;
      padding: 15px 25px;
      border-radius: 10px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      font-family: Arial, sans-serif;
      display: flex;
      align-items: center;
      gap: 10px;
    ">
      <div class="spinner" style="
        width: 20px;
        height: 20px;
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: spin 1s linear infinite;
      "></div>
      <span>ScholarAI is filling your application...</span>
    </div>
    <style>
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  `;
  document.body.appendChild(indicator);
}

function hideFillingIndicator() {
  const indicator = document.getElementById('scholarai-filling-indicator');
  if (indicator) indicator.remove();
}

function showCompletionMessage() {
  const message = document.createElement('div');
  message.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10B981;
      color: white;
      padding: 15px 25px;
      border-radius: 10px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      font-family: Arial, sans-serif;
    ">
      ✓ Application filled successfully!
    </div>
  `;
  document.body.appendChild(message);
  setTimeout(() => message.remove(), 3000);
}

function showErrorMessage() {
  const message = document.createElement('div');
  message.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: #EF4444;
      color: white;
      padding: 15px 25px;
      border-radius: 10px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      font-family: Arial, sans-serif;
    ">
      ✗ Error filling form. Please try again.
    </div>
  `;
  document.body.appendChild(message);
  setTimeout(() => message.remove(), 3000);
}

class AIFormFiller {
  constructor() {
      this.apiUrl = 'http://localhost:5001'; // Your AI service URL
      this.fillingDelay = 500;
      this.typingSpeed = 50;
      this.filledFields = [];
  }

  async fillForm(userData) {
      try {
          // Show filling indicator
          this.showStatus('Analyzing form with AI...');
          
          // Step 1: Extract form HTML
          const formHTML = this.extractFormHTML();
          
          // Step 2: Send to AI for analysis
          const analysis = await this.analyzeFormWithAI(formHTML, userData);
          
          if (!analysis.success) {
              // Fallback to pattern matching
              this.showStatus('Using smart pattern matching...');
              await this.fillWithPatterns(userData);
              return;
          }
          
          // Step 3: Execute AI filling instructions
          this.showStatus('Filling form fields...');
          await this.executeFilling(analysis.fillingInstructions);
          
          // Step 4: Validate filling
          await this.validateFilling();
          
          this.showStatus('Form filled successfully!', 'success');
          
      } catch (error) {
          console.error('Form filling error:', error);
          this.showStatus('Error filling form', 'error');
      }
  }
  
  extractFormHTML() {
      // Get all forms on the page
      const forms = document.querySelectorAll('form');
      const formData = [];
      
      forms.forEach(form => {
          // Clone form to avoid modifying the page
          const clonedForm = form.cloneNode(true);
          
          // Remove script tags for security
          clonedForm.querySelectorAll('script').forEach(script => script.remove());
          
          formData.push(clonedForm.outerHTML);
      });
      
      // Also get standalone fields not in forms
      const standaloneFields = document.querySelectorAll('input:not(form input), textarea:not(form textarea), select:not(form select)');
      const standaloneHTML = Array.from(standaloneFields).map(field => field.outerHTML).join('\n');
      
      return formData.join('\n') + '\n' + standaloneHTML;
  }
  
  async analyzeFormWithAI(html, userData) {
      try {
          const response = await fetch(`${this.apiUrl}/api/analyze-form`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                  html: html,
                  userData: userData,
                  url: window.location.href
              })
          });
          
          return await response.json();
      } catch (error) {
          console.error('AI analysis error:', error);
          return { success: false };
      }
  }
  
  async executeFilling(instructions) {
      // Sort instructions by priority
      instructions.sort((a, b) => (a.priority || 99) - (b.priority || 99));
      
      for (const instruction of instructions) {
          try {
              const element = document.querySelector(instruction.selector);
              if (!element || !this.isVisible(element)) {
                  // Try alternative selectors
                  const altElement = await this.findFieldByPatterns(instruction.fieldPatterns || []);
                  if (altElement) {
                      await this.fillField(altElement, instruction);
                  }
              } else {
                  await this.fillField(element, instruction);
              }
              
              // Wait between fields
              await this.wait(this.fillingDelay);
              
          } catch (error) {
              console.error(`Error filling field ${instruction.selector}:`, error);
          }
      }
  }
  
  async fillField(element, instruction) {
      // Scroll to element
      if (instruction.scrollToField !== false) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await this.wait(300);
      }
      
      // Highlight field
      this.highlightField(element);
      
      // Focus element
      element.focus();
      element.click();
      
      // Apply transformation if needed
      let value = instruction.value;
      if (instruction.transform) {
          value = this.transformValue(value, instruction.transform);
      }
      
      // Validate before filling
      if (instruction.validation && !this.validateValue(value, instruction.validation)) {
          console.warn(`Invalid value for field: ${value}`);
          return;
      }
      
      // Fill based on method
      switch (instruction.method) {
          case 'type':
              await this.typeValue(element, value);
              break;
          case 'select':
              await this.selectValue(element, value);
              break;
          case 'check':
              element.checked = true;
              break;
          case 'click':
              element.click();
              break;
      }
      
      // Track filled field
      this.filledFields.push({
          selector: instruction.selector,
          value: value,
          element: element
      });
      
      // Trigger events
      this.triggerEvents(element);
  }
  
  async typeValue(element, value) {
      // Clear existing value
      element.value = '';
      
      // Type character by character for essay fields
      if (value.length > 100) {
          // For long text, type in chunks
          const chunks = value.match(/.{1,10}/g) || [];
          for (const chunk of chunks) {
              element.value += chunk;
              element.dispatchEvent(new Event('input', { bubbles: true }));
              await this.wait(20);
          }
      } else {
          // Type character by character
          for (const char of value) {
              element.value += char;
              element.dispatchEvent(new Event('input', { bubbles: true }));
              await this.wait(this.typingSpeed);
          }
      }
  }
  
  async selectValue(element, value) {
      const options = element.options;
      let matched = false;
      
      // Try exact match first
      for (let i = 0; i < options.length; i++) {
          if (options[i].value === value || options[i].text === value) {
              element.selectedIndex = i;
              matched = true;
              break;
          }
      }
      
      // Try fuzzy match
      if (!matched) {
          const lowerValue = value.toLowerCase();
          for (let i = 0; i < options.length; i++) {
              if (options[i].text.toLowerCase().includes(lowerValue)) {
                  element.selectedIndex = i;
                  break;
              }
          }
      }
  }
  
  async findFieldByPatterns(patterns) {
      for (const pattern of patterns) {
          // Try multiple strategies
          const strategies = [
              // By name attribute
              `input[name*="${pattern}" i], textarea[name*="${pattern}" i], select[name*="${pattern}" i]`,
              // By id
              `input[id*="${pattern}" i], textarea[id*="${pattern}" i], select[id*="${pattern}" i]`,
              // By placeholder
              `input[placeholder*="${pattern}" i], textarea[placeholder*="${pattern}" i]`,
              // By class
              `input[class*="${pattern}" i], textarea[class*="${pattern}" i], select[class*="${pattern}" i]`
          ];
          
          for (const selector of strategies) {
              try {
                  const elements = document.querySelectorAll(selector);
                  for (const el of elements) {
                      if (this.isVisible(el) && !el.disabled) {
                          return el;
                      }
                  }
              } catch (e) {
                  // Invalid selector, continue
              }
          }
          
          // Try by label text
          const labels = document.querySelectorAll('label');
          for (const label of labels) {
              if (label.textContent.toLowerCase().includes(pattern.toLowerCase())) {
                  const field = this.getFieldFromLabel(label);
                  if (field && this.isVisible(field)) {
                      return field;
                  }
              }
          }
      }
      
      return null;
  }
  
  getFieldFromLabel(label) {
      // Check 'for' attribute
      const forAttr = label.getAttribute('for');
      if (forAttr) {
          return document.getElementById(forAttr);
      }
      
      // Check if input is inside label
      return label.querySelector('input, textarea, select');
  }
  
  isVisible(element) {
      return element.offsetParent !== null && 
             element.offsetWidth > 0 && 
             element.offsetHeight > 0 &&
             window.getComputedStyle(element).display !== 'none';
  }
  
  transformValue(value, transform) {
      switch (transform) {
          case 'phone':
              // Format phone number
              const digits = value.replace(/\D/g, '');
              if (digits.length === 10) {
                  return `(${digits.substr(0,3)}) ${digits.substr(3,3)}-${digits.substr(6,4)}`;
              }
              return value;
              
          case 'date':
              // Convert date format
              const date = new Date(value);
              return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
              
          default:
              return value;
      }
  }
  
  validateValue(value, validation) {
      switch (validation) {
          case 'email':
              return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
          case 'phone':
              return /^\d{10}$/.test(value.replace(/\D/g, ''));
          case 'number':
              return !isNaN(value);
          default:
              return true;
      }
  }
  
  triggerEvents(element) {
      const events = ['input', 'change', 'blur'];
      events.forEach(eventType => {
          element.dispatchEvent(new Event(eventType, { bubbles: true }));
      });
  }
  
  highlightField(element) {
      const originalBorder = element.style.border;
      element.style.border = '2px solid #4F46E5';
      element.style.boxShadow = '0 0 10px rgba(79, 70, 229, 0.3)';
      
      setTimeout(() => {
          element.style.border = originalBorder;
          element.style.boxShadow = '';
      }, 2000);
  }
  
  async validateFilling() {
      // Send filled fields to AI for validation
      try {
          await fetch(`${this.apiUrl}/api/validate-filled-form`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                  filledFields: this.filledFields.map(f => ({
                      selector: f.selector,
                      value: f.value
                  })),
                  url: window.location.href
              })
          });
      } catch (error) {
          console.error('Validation error:', error);
      }
  }
  
  showStatus(message, type = 'info') {
      // Remove existing status
      const existing = document.getElementById('scholarai-status');
      if (existing) existing.remove();
      
      const status = document.createElement('div');
      status.id = 'scholarai-status';
      
      const colors = {
          info: '#4F46E5',
          success: '#10B981',
          error: '#EF4444'
      };
      
      status.innerHTML = `
          <div style="
              position: fixed;
              top: 20px;
              right: 20px;
              background: ${colors[type]};
              color: white;
              padding: 15px 25px;
              border-radius: 10px;
              box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
              z-index: 10000;
              font-family: Arial, sans-serif;
              animation: slideIn 0.3s ease-out;
          ">
              ${message}
          </div>
          <style>
              @keyframes slideIn {
                  from { transform: translateX(100%); opacity: 0; }
                  to { transform: translateX(0); opacity: 1; }
              }
          </style>
      `;
      
      document.body.appendChild(status);
      
      if (type !== 'info') {
          setTimeout(() => status.remove(), 3000);
      }
  }
  
  wait(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Fallback pattern matching when AI is unavailable
  async fillWithPatterns(userData) {
      const patterns = [
          { patterns: ['first.*name', 'fname'], value: userData.firstName },
          { patterns: ['last.*name', 'lname'], value: userData.lastName },
          { patterns: ['email'], value: userData.email },
          { patterns: ['phone', 'tel'], value: userData.phone },
          { patterns: ['address', 'street'], value: userData.address },
          { patterns: ['city'], value: userData.city },
          { patterns: ['state'], value: userData.state },
          { patterns: ['zip'], value: userData.zipCode },
          { patterns: ['school', 'university'], value: userData.school },
          { patterns: ['gpa'], value: userData.gpa },
          { patterns: ['major'], value: userData.major }
      ];
      
      for (const pattern of patterns) {
          if (!pattern.value) continue;
          
          const field = await this.findFieldByPatterns(pattern.patterns);
          if (field) {
              await this.fillField(field, {
                  selector: '',
                  value: pattern.value,
                  method: field.tagName === 'SELECT' ? 'select' : 'type'
              });
              await this.wait(this.fillingDelay);
          }
      }
  }
}

// Initialize filler
const aiFiller = new AIFormFiller();

// Listen for fill command
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fillForm') {
      aiFiller.fillForm(request.profile);
  }
});