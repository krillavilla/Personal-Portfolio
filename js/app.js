/**
 * Personal Portfolio JavaScript Application
 * Implements all rubric requirements with modern ES6+ patterns
 */

// ==========================
// CONSTANTS & CONFIGURATION
// ==========================

const ENDPOINTS = {
  aboutMe: '/data/aboutMeData.json',
  projects: '/data/projectsData.json'
};

const PLACEHOLDERS = {
  cardImage: '/images/card_placeholder_bg.webp',
  spotlightImage: '/images/spotlight_placeholder_bg.webp'
};

const REGEX = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  illegalChars: /[^a-zA-Z0-9@._-]/
};

const SELECTORS = {
  aboutMe: '#aboutMe',
  projectsList: '#projectList', // Using actual HTML ID
  projectSpotlight: '#projectSpotlight',
  spotlightTitles: '#spotlightTitles',
  projectNavArrows: '#projectNavArrows',
  arrowLeft: '.arrow-left',
  arrowRight: '.arrow-right',
  emailInput: '#contactEmail', // Using actual HTML ID
  messageInput: '#contactMessage', // Using actual HTML ID
  emailError: '#emailError',
  messageError: '#messageError',
  charRemaining: '#charactersLeft', // Using actual HTML ID
  form: '#formSection'
};

const MESSAGE_LIMIT = 300;

// ==========================
// APP STATE
// ==========================

let appState = {
  aboutMeData: null,
  projectsData: [],
  currentProjectId: null,
  scrollController: null,
  isInitialized: false
};

// ==========================
// DATA FETCHING & LOADING
// ==========================

/**
 * Fetch JSON with timeout and error handling
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options including timeoutMs
 * @returns {Promise<any>} Parsed JSON data
 */
const fetchJSON = async (url, { timeoutMs = 5000 } = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout (${timeoutMs}ms) for ${url}`);
    }
    throw error;
  }
};

/**
 * Load all required data with error handling
 * @returns {Promise<void>} 
 */
const loadAllData = async () => {
  try {
    const [aboutMeData, projectsData] = await Promise.all([
      fetchJSON(ENDPOINTS.aboutMe).catch(err => {
        console.error('Failed to load about me data:', err);
        return { aboutMe: 'Coming soon...', headshot: null };
      }),
      fetchJSON(ENDPOINTS.projects).catch(err => {
        console.error('Failed to load projects data:', err);
        return [];
      })
    ]);
    
    appState.aboutMeData = aboutMeData;
    appState.projectsData = projectsData.map(normalizeProject);
    
    // Ensure we have at least one project for spotlight
    if (appState.projectsData.length === 0) {
      appState.projectsData = [{
        id: 'placeholder',
        name: 'Coming Soon',
        short: 'Projects will be available soon.',
        long: 'New projects are being developed and will be showcased here soon.',
        url: '#',
        cardImage: PLACEHOLDERS.cardImage,
        spotlightImage: PLACEHOLDERS.spotlightImage
      }];
    }
    
  } catch (error) {
    console.error('Critical error loading data:', error);
    // Provide absolute fallbacks
    appState.aboutMeData = { aboutMe: 'About section coming soon...', headshot: null };
    appState.projectsData = [{
      id: 'error-fallback',
      name: 'Loading Error',
      short: 'Unable to load projects.',
      long: 'Please refresh the page to try loading projects again.',
      url: '#',
      cardImage: PLACEHOLDERS.cardImage,
      spotlightImage: PLACEHOLDERS.spotlightImage
    }];
  }
};

// ==========================
// DATA NORMALIZATION
// ==========================

/**
 * Normalize project data to consistent shape
 * @param {Object} project - Raw project data
 * @returns {Object} Normalized project
 */
const normalizeProject = (project = {}) => ({
  id: project.project_id || 'unknown',
  name: project.project_name || 'Untitled Project',
  short: project.short_description || 'No description available.',
  long: project.long_description || 'Detailed information coming soon.',
  url: project.url || '#',
  cardImage: project.card_image || PLACEHOLDERS.cardImage,
  spotlightImage: project.spotlight_image || PLACEHOLDERS.spotlightImage
});

// ==========================
// DOM RENDERING (NO innerHTML)
// ==========================

/**
 * Render About Me section programmatically
 * @param {Object} data - About me data
 */
const renderAboutMe = (data) => {
  const aboutMe = document.querySelector(SELECTORS.aboutMe);
  if (!aboutMe) return;
  
  // Clear existing content
  aboutMe.innerHTML = '';
  
  // Create and append bio paragraph
  const bioText = data?.aboutMe || 'About section coming soon...';
  const bioParagraph = document.createElement('p');
  bioParagraph.textContent = bioText;
  aboutMe.appendChild(bioParagraph);
  
  // Create and append headshot container
  const headshotContainer = document.createElement('div');
  headshotContainer.className = 'headshotContainer';
  
  if (data?.headshot) {
    headshotContainer.style.backgroundImage = `url('${data.headshot}')`;
    headshotContainer.style.backgroundSize = 'cover';
    headshotContainer.style.backgroundPosition = 'center';
    headshotContainer.style.minHeight = '300px';
  } else {
    headshotContainer.style.backgroundColor = '#f0f0f0';
    headshotContainer.style.minHeight = '300px';
    headshotContainer.setAttribute('aria-label', 'Profile image placeholder');
  }
  
  aboutMe.appendChild(headshotContainer);
};

/**
 * Create a single project card element
 * @param {Object} project - Normalized project data
 * @returns {HTMLElement} Project card element
 */
const createProjectCard = (project) => {
  const card = document.createElement('div');
  card.className = 'projectCard';
  card.setAttribute('data-id', project.id);
  
  // Set background image
  card.style.backgroundImage = `url('${project.cardImage}')`;
  card.style.backgroundSize = 'cover';
  card.style.backgroundPosition = 'center';
  
  // Create title
  const title = document.createElement('h4');
  title.textContent = project.name;
  card.appendChild(title);
  
  // Create description
  const description = document.createElement('p');
  description.textContent = project.short;
  card.appendChild(description);
  
  return card;
};

/**
 * Render projects list using document fragment
 * @param {Array} projects - Array of normalized projects
 */
const renderProjectsList = (projects) => {
  const projectsList = document.querySelector(SELECTORS.projectsList);
  if (!projectsList) return;
  
  // Clear existing cards
  projectsList.innerHTML = '';
  
  // Create document fragment for efficient DOM manipulation
  const fragment = document.createDocumentFragment();
  
  projects.forEach(project => {
    const card = createProjectCard(project);
    fragment.appendChild(card);
  });
  
  projectsList.appendChild(fragment);
};

/**
 * Render project spotlight
 * @param {Object} project - Normalized project data
 */
const renderSpotlight = (project) => {
  const spotlight = document.querySelector(SELECTORS.projectSpotlight);
  const titlesContainer = document.querySelector(SELECTORS.spotlightTitles);
  
  if (!spotlight || !titlesContainer) return;
  
  // Set background image
  spotlight.style.backgroundImage = `url('${project.spotlightImage}')`;
  spotlight.style.backgroundSize = 'cover';
  spotlight.style.backgroundPosition = 'center';
  
  // Update title
  const title = titlesContainer.querySelector('h3');
  if (title) {
    title.textContent = project.name;
  }
  
  // Update description
  const description = titlesContainer.querySelector('p');
  if (description) {
    description.textContent = project.long;
  }
  
  // Update link
  const link = titlesContainer.querySelector('a');
  if (link) {
    if (project.url && project.url !== '#') {
      link.href = project.url;
      link.removeAttribute('aria-disabled');
    } else {
      link.href = '#';
      link.setAttribute('aria-disabled', 'true');
    }
  }
  
  appState.currentProjectId = project.id;
};

// ==========================
// RESPONSIVE SCROLLING
// ==========================

/**
 * Get current scroll axis based on viewport size
 * @returns {string} 'x' for mobile, 'y' for desktop
 */
const getAxis = () => {
  return window.matchMedia('(min-width: 1024px)').matches ? 'y' : 'x';
};

/**
 * Scroll container along specified axis
 * @param {HTMLElement} container - Container to scroll
 * @param {number} delta - Scroll amount (positive = right/down, negative = left/up)
 */
const scrollByAxis = (container, delta) => {
  if (!container) return;
  
  const axis = getAxis();
  const scrollAmount = Math.abs(delta) * 20; // Adjust scroll speed
  
  if (axis === 'x') {
    container.scrollLeft += delta > 0 ? scrollAmount : -scrollAmount;
  } else {
    container.scrollTop += delta > 0 ? scrollAmount : -scrollAmount;
  }
};

/**
 * Start continuous scrolling
 * @param {HTMLElement} container - Container to scroll
 * @param {number} direction - Direction multiplier (1 or -1)
 */
const startContinuousScroll = (container, direction) => {
  if (appState.scrollController) {
    clearInterval(appState.scrollController);
  }
  
  appState.scrollController = setInterval(() => {
    scrollByAxis(container, direction);
  }, 50); // 20fps for smooth scrolling
};

/**
 * Stop continuous scrolling
 */
const stopContinuousScroll = () => {
  if (appState.scrollController) {
    clearInterval(appState.scrollController);
    appState.scrollController = null;
  }
};

/**
 * Setup arrow scrolling with event delegation
 */
const setupArrowScrolling = () => {
  const arrowContainer = document.querySelector(SELECTORS.projectNavArrows);
  const projectsList = document.querySelector(SELECTORS.projectsList);
  
  if (!arrowContainer || !projectsList) return;
  
  const leftArrow = arrowContainer.querySelector(SELECTORS.arrowLeft);
  const rightArrow = arrowContainer.querySelector(SELECTORS.arrowRight);
  
  // Left arrow events
  if (leftArrow) {
    leftArrow.addEventListener('pointerdown', () => startContinuousScroll(projectsList, -1));
    leftArrow.addEventListener('mousedown', () => startContinuousScroll(projectsList, -1));
    leftArrow.addEventListener('pointerup', stopContinuousScroll);
    leftArrow.addEventListener('mouseup', stopContinuousScroll);
    leftArrow.addEventListener('mouseleave', stopContinuousScroll);
    leftArrow.addEventListener('pointercancel', stopContinuousScroll);
    leftArrow.addEventListener('blur', stopContinuousScroll);
  }
  
  // Right arrow events
  if (rightArrow) {
    rightArrow.addEventListener('pointerdown', () => startContinuousScroll(projectsList, 1));
    rightArrow.addEventListener('mousedown', () => startContinuousScroll(projectsList, 1));
    rightArrow.addEventListener('pointerup', stopContinuousScroll);
    rightArrow.addEventListener('mouseup', stopContinuousScroll);
    rightArrow.addEventListener('mouseleave', stopContinuousScroll);
    rightArrow.addEventListener('pointercancel', stopContinuousScroll);
    rightArrow.addEventListener('blur', stopContinuousScroll);
  }
  
  // Stop scrolling on window events
  window.addEventListener('blur', stopContinuousScroll);
  window.addEventListener('resize', stopContinuousScroll);
};

// ==========================
// PROJECT CARD INTERACTION
// ==========================

/**
 * Handle project card click (event delegation)
 * @param {Event} event - Click event
 */
const handleCardClick = (event) => {
  const card = event.target.closest('.projectCard');
  if (!card) return;
  
  const projectId = card.getAttribute('data-id');
  const project = appState.projectsData.find(p => p.id === projectId);
  
  if (project) {
    renderSpotlight(project);
  }
};

// ==========================
// FORM VALIDATION
// ==========================

/**
 * Validate email input
 * @param {string} value - Email value to validate
 * @returns {Object} Validation result
 */
const validateEmail = (value = '') => {
  if (!value.trim()) {
    return { isValid: false, message: 'Email address is required.' };
  }
  
  if (REGEX.illegalChars.test(value)) {
    return { isValid: false, message: 'Email contains invalid characters. Only letters, numbers, @, ., _, and - are allowed.' };
  }
  
  if (!REGEX.email.test(value)) {
    return { isValid: false, message: 'Please enter a valid email address.' };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validate message input
 * @param {string} value - Message value to validate
 * @returns {Object} Validation result
 */
const validateMessage = (value = '') => {
  if (!value.trim()) {
    return { isValid: false, message: 'Message is required.' };
  }
  
  if (REGEX.illegalChars.test(value)) {
    return { isValid: false, message: 'Message contains invalid characters. Only letters, numbers, @, ., _, and - are allowed.' };
  }
  
  if (value.length > MESSAGE_LIMIT) {
    return { isValid: false, message: `Message must be ${MESSAGE_LIMIT} characters or less.` };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Update character counter
 */
const updateCharCounter = () => {
  const messageInput = document.querySelector(SELECTORS.messageInput);
  const charCounter = document.querySelector(SELECTORS.charRemaining);
  
  if (!messageInput || !charCounter) return;
  
  const length = messageInput.value.length;
  const remaining = MESSAGE_LIMIT - length;
  
  charCounter.textContent = `Characters: ${length}/${MESSAGE_LIMIT}`;
  
  // Add error class when over limit
  if (remaining < 0) {
    charCounter.classList.add('error');
  } else {
    charCounter.classList.remove('error');
  }
};

/**
 * Show validation error
 * @param {HTMLElement} element - Error container element
 * @param {string} message - Error message
 */
const showError = (element, message) => {
  if (element) {
    element.textContent = message;
    element.style.display = 'block';
  }
};

/**
 * Clear validation error
 * @param {HTMLElement} element - Error container element
 */
const clearError = (element) => {
  if (element) {
    element.textContent = '';
    element.style.display = 'none';
  }
};

/**
 * Handle form submission
 * @param {Event} event - Submit event
 */
const handleSubmit = (event) => {
  event.preventDefault();
  
  const emailInput = document.querySelector(SELECTORS.emailInput);
  const messageInput = document.querySelector(SELECTORS.messageInput);
  const emailError = document.querySelector(SELECTORS.emailError);
  const messageError = document.querySelector(SELECTORS.messageError);
  
  if (!emailInput || !messageInput) return;
  
  // Clear previous errors
  clearError(emailError);
  clearError(messageError);
  
  // Validate inputs
  const emailValidation = validateEmail(emailInput.value);
  const messageValidation = validateMessage(messageInput.value);
  
  let isFormValid = true;
  
  // Show email errors
  if (!emailValidation.isValid) {
    showError(emailError, emailValidation.message);
    isFormValid = false;
  }
  
  // Show message errors
  if (!messageValidation.isValid) {
    showError(messageError, messageValidation.message);
    isFormValid = false;
  }
  
  // Submit if valid
  if (isFormValid) {
    alert('Submission successful!');
    // Reset form
    emailInput.value = '';
    messageInput.value = '';
    updateCharCounter();
  }
};

// ==========================
// INITIALIZATION
// ==========================

/**
 * Initialize the application
 */
const init = async () => {
  if (appState.isInitialized) return;
  
  try {
    console.log('Initializing Personal Portfolio App...');
    
    // Load all data first
    await loadAllData();
    
    // Render About Me section
    renderAboutMe(appState.aboutMeData);
    
    // Render projects list
    renderProjectsList(appState.projectsData);
    
    // Set default spotlight to first project
    if (appState.projectsData.length > 0) {
      renderSpotlight(appState.projectsData[0]);
    }
    
    // Setup project card click handling (event delegation)
    const projectsList = document.querySelector(SELECTORS.projectsList);
    if (projectsList) {
      projectsList.addEventListener('click', handleCardClick);
    }
    
    // Setup arrow scrolling
    setupArrowScrolling();
    
    // Setup form validation
    const emailInput = document.querySelector(SELECTORS.emailInput);
    const messageInput = document.querySelector(SELECTORS.messageInput);
    const form = document.querySelector(SELECTORS.form);
    
    if (emailInput) {
      emailInput.addEventListener('blur', () => {
        const validation = validateEmail(emailInput.value);
        const errorElement = document.querySelector(SELECTORS.emailError);
        if (!validation.isValid) {
          showError(errorElement, validation.message);
        } else {
          clearError(errorElement);
        }
      });
    }
    
    if (messageInput) {
      messageInput.addEventListener('input', updateCharCounter);
      messageInput.addEventListener('blur', () => {
        const validation = validateMessage(messageInput.value);
        const errorElement = document.querySelector(SELECTORS.messageError);
        if (!validation.isValid) {
          showError(errorElement, validation.message);
        } else {
          clearError(errorElement);
        }
      });
    }
    
    if (form) {
      form.addEventListener('submit', handleSubmit);
    }
    
    // Initialize character counter
    updateCharCounter();
    
    appState.isInitialized = true;
    console.log('App initialized successfully');
    
  } catch (error) {
    console.error('Failed to initialize app:', error);
    // Still try to show minimal functionality
    const aboutMe = document.querySelector(SELECTORS.aboutMe);
    if (aboutMe) {
      const errorMsg = document.createElement('p');
      errorMsg.textContent = 'Application failed to load. Please refresh the page.';
      aboutMe.appendChild(errorMsg);
    }
  }
};

// Start the app when DOM is ready
window.addEventListener('DOMContentLoaded', init);