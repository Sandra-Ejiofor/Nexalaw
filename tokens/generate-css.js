const fs = require('fs');

const coloursRaw = JSON.parse(fs.readFileSync('colours-tokens.json', 'utf8'));
const designRaw = JSON.parse(fs.readFileSync('design-tokens.tokens (2).json', 'utf8'));

const primitiveLookup = {};

for (const [key, value] of Object.entries(coloursRaw.color.key)) {
  primitiveLookup[`color.key.${key}`] = value;
}

for (const [paletteName, tones] of Object.entries(coloursRaw.color.palette)) {
  for (const [tone, value] of Object.entries(tones)) {
    primitiveLookup[`color.palette.${paletteName}.${tone}`] = value;
  }
}

function resolveReference(ref) {
  const match = ref.match(/^\{(.+)\}$/);
  if (!match) return ref;
  return primitiveLookup[match[1]] || ref;
}

function toCssName(str) {
  return str
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/\s+/g, '-');
}

let css = '/* Auto-generated CSS Variables from Design Tokens */\n\n';

css += '/* Colour Roles */\n\n';

css += ':root {\n';
for (const [role, ref] of Object.entries(coloursRaw.color.role.light)) {
  css += `  --color-${toCssName(role)}: ${resolveReference(ref)};\n`;
}
css += '}\n\n';

css += '[data-theme="dark"] {\n';
for (const [role, ref] of Object.entries(coloursRaw.color.role.dark)) {
  css += `  --color-${toCssName(role)}: ${resolveReference(ref)};\n`;
}
css += '}\n\n';

css += '/* Typography */\n\n';
css += ':root {\n';

for (const [tokenName, properties] of Object.entries(designRaw.typography)) {
  const baseName = toCssName(tokenName);
  for (const [prop, data] of Object.entries(properties)) {
    const propName = toCssName(prop);
    let value = data.value;
    if (['fontSize', 'lineHeight', 'letterSpacing', 'paragraphIndent', 'paragraphSpacing'].includes(prop)) {
      value = `${value}px`;
    }
    if (prop === 'fontFamily') {
      value = `"${value}"`;
    }
    css += `  --typography-${baseName}-${propName}: ${value};\n`;
  }
}
css += '}\n';

fs.writeFileSync('tokens.css', css);
console.log('✓ Generated tokens.css');
