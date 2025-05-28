const TgcfBasePlugin = require('./tgcf.base.plugin');

class ReplacePlugin extends TgcfBasePlugin {
  static get id() { return "replace"; }
  static get name() { return "Text Replacer"; }
  static get description() { return "Replaces text in messages based on configured rules."; }
  static get configSchema() {
    return {
      rules: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'The text or regex pattern to search for.' },
            replacement: { type: 'string', description: 'The text to replace the pattern with.' },
            is_regex: { type: 'boolean', default: false, description: 'Whether the pattern is a regular expression.' },
            case_sensitive: { type: 'boolean', default: true, description: 'Perform case-sensitive matching. Only applies if not regex or regex has no flags.'}
          },
          required: ['pattern', 'replacement']
        },
        default: []
      }
    };
  }

  constructor(config, globalAppConfig) {
    super(config, globalAppConfig);
    this.rules = this.config.rules || [];
  }

  modify(tgcfMessage) {
    if (tgcfMessage.text && this.rules.length > 0) {
      let currentText = tgcfMessage.text;
      for (const rule of this.rules) {
        if (rule.is_regex) {
          try {
            // Basic flags handling, can be extended
            const flags = rule.case_sensitive === false ? 'gi' : 'g'; // Global, and optionally case-insensitive
            const regex = new RegExp(rule.pattern, flags);
            currentText = currentText.replace(regex, rule.replacement);
          } catch (e) {
            console.error(`ReplacePlugin: Invalid regex pattern "${rule.pattern}". Error: ${e.message}`);
          }
        } else {
          // Simple string replacement
          if (rule.case_sensitive === false) {
            // Inefficient for many replacements, but demonstrates concept
            const lowerPattern = rule.pattern.toLowerCase();
            const lowerText = currentText.toLowerCase();
            let newText = "";
            let lastIndex = 0;
            let foundIndex = lowerText.indexOf(lowerPattern, lastIndex);
            while(foundIndex !== -1) {
                newText += currentText.substring(lastIndex, foundIndex) + rule.replacement;
                lastIndex = foundIndex + rule.pattern.length;
                foundIndex = lowerText.indexOf(lowerPattern, lastIndex);
            }
            newText += currentText.substring(lastIndex);
            currentText = newText;

          } else {
            currentText = currentText.split(rule.pattern).join(rule.replacement); // Simple but effective for non-overlapping
          }
        }
      }
      tgcfMessage.text = currentText;
    }
    return tgcfMessage;
  }
}

module.exports = ReplacePlugin;
