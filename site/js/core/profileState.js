
export const DEFAULT_STATE_KEY = 'TEXT_PROFILE';

// createEmptyProfile handles this function's logic.
export function createEmptyProfile() {
  return { form: {}, styles: [], options: [], snippets: [], mode: 'template', template: '', prompt: '', ollama: null };
}


// Get Profile.
export function getProfile(state, stateKey = DEFAULT_STATE_KEY) {
  if (!state || typeof state.get !== 'function') return null;
  return state.get(String(stateKey));
}


// Set Profile.
export function setProfile(state, profile, stateKey = DEFAULT_STATE_KEY) {
  if (!state || typeof state.set !== 'function') throw new Error('profileState: missing state.set adapter');
  // Mutate shared state so dependent panes stay in sync.
  state.set(String(stateKey), profile);
  return profile;
}


// Ensure Profile State.
export function ensureProfileState(state, stateKey = DEFAULT_STATE_KEY) {
  if (!state || typeof state.get !== 'function' || typeof state.set !== 'function') throw new Error('profileState: missing state adapter');
  const key = String(stateKey);
  let profile = getProfile(state, key);
  if (!profile || typeof profile !== 'object') {
    profile = createEmptyProfile();
    // Mutate shared state so dependent panes stay in sync.
    setProfile(state, profile, key);
    return profile;
  }
  if (!profile.form || typeof profile.form !== 'object') profile.form = {};
  if (!Array.isArray(profile.styles)) profile.styles = [];
  if (!Array.isArray(profile.options)) profile.options = [];
  if (!Array.isArray(profile.snippets)) profile.snippets = [];
  return profile;
}
