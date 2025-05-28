const ReplacePlugin = require('../replace.plugin');
const TgcfBasePlugin = require('../tgcf.base.plugin'); // Needed if ReplacePlugin calls super or for type checks

// Mock the base plugin if necessary, or ensure it's usable as is.
// For this test, we'll assume TgcfBasePlugin can be instantiated or its methods don't interfere.

describe('ReplacePlugin', () => {
  let replacePlugin;
  const mockGlobalConfig = {}; // Mock global config if needed by base plugin

  describe('modify method', () => {
    it('should replace simple text correctly', () => {
      const pluginConfig = {
        rules: [{ pattern: 'hello', replacement: 'hi', is_regex: false, case_sensitive: true }],
      };
      replacePlugin = new ReplacePlugin(pluginConfig, mockGlobalConfig);
      const message = {
        text: 'hello world, hello there',
        raw_text: 'hello world, hello there',
        // ... other necessary ITgcfMessage fields
      };
      const result = replacePlugin.modify(message);
      expect(result.text).toBe('hi world, hi there');
      expect(result.raw_text).toBe('hi world, hi there');
    });

    it('should handle case-insensitive simple replacement', () => {
      const pluginConfig = {
        rules: [{ pattern: 'Hello', replacement: 'Hi', is_regex: false, case_sensitive: false }],
      };
      replacePlugin = new ReplacePlugin(pluginConfig, mockGlobalConfig);
      const message = { text: 'hello WORLD, HELLO there' };
      const result = replacePlugin.modify(message);
      expect(result.text).toBe('Hi WORLD, Hi there'); // Based on current plugin's simple case-insensitive logic
    });

    it('should replace regex patterns correctly', () => {
      const pluginConfig = {
        rules: [{ pattern: 'h[a-e]llo', replacement: 'hey', is_regex: true, case_sensitive: true }], // Will be 'g' flag
      };
      replacePlugin = new ReplacePlugin(pluginConfig, mockGlobalConfig);
      const message = { text: 'hallo world, hello there, hbllo' };
      const result = replacePlugin.modify(message);
      expect(result.text).toBe('hey world, hey there, hey');
    });

    it('should handle case-insensitive regex replacement', () => {
      const pluginConfig = {
        rules: [{ pattern: 'h[a-e]llo', replacement: 'Hey', is_regex: true, case_sensitive: false }], // Will be 'gi' flag
      };
      replacePlugin = new ReplacePlugin(pluginConfig, mockGlobalConfig);
      const message = { text: 'Hallo world, heLLO there, Hbllo' };
      const result = replacePlugin.modify(message);
      expect(result.text).toBe('Hey world, Hey there, Hey');
    });

    it('should handle multiple rules sequentially', () => {
      const pluginConfig = {
        rules: [
          { pattern: 'apple', replacement: 'orange', is_regex: false, case_sensitive: true },
          { pattern: 'orange', replacement: 'banana', is_regex: false, case_sensitive: true },
        ],
      };
      replacePlugin = new ReplacePlugin(pluginConfig, mockGlobalConfig);
      const message = { text: 'I have an apple.' };
      const result = replacePlugin.modify(message);
      expect(result.text).toBe('I have an banana.');
    });

    it('should do nothing if no text in message', () => {
      const pluginConfig = {
        rules: [{ pattern: 'hello', replacement: 'hi' }],
      };
      replacePlugin = new ReplacePlugin(pluginConfig, mockGlobalConfig);
      const message = { text: null };
      const result = replacePlugin.modify(message);
      expect(result.text).toBeNull();
    });

    it('should do nothing if no rules are configured', () => {
      const pluginConfig = { rules: [] };
      replacePlugin = new ReplacePlugin(pluginConfig, mockGlobalConfig);
      const message = { text: 'hello world' };
      const result = replacePlugin.modify(message);
      expect(result.text).toBe('hello world');
    });

    it('should handle invalid regex pattern gracefully', () => {
      const pluginConfig = {
        rules: [{ pattern: '[', replacement: 'wontfix', is_regex: true }],
      };
      replacePlugin = new ReplacePlugin(pluginConfig, mockGlobalConfig);
      const message = { text: 'some text with [' };
      // Spy on console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
      const result = replacePlugin.modify(message);
      expect(result.text).toBe('some text with ['); // Should not change text
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
