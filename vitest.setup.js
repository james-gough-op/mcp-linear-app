// Mock objects and globals needed for testing

// Create a mock AbortController if testing in an environment without it
if (typeof AbortController === 'undefined') {
  global.AbortController = class AbortController {
    constructor() {
      this.signal = { aborted: false };
    }
    abort() {
      this.signal.aborted = true;
    }
  };
}

// Set up any other global variables needed for testing 