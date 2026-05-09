/**
 * Script to remove local duplicate definitions of:
 *   - function SummarySkeleton() { ... }
 *   - function TableLoadingState() { ... }
 *   - function formatDisplay(value) { ... }
 *   - function formatNumber(value) { ... }
 *
 * And add shared imports if not already present.
 * Also replaces formatDisplay() calls with formatNumber().
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const FEATURES_DIR = path.join(__dirname, 'src', 'features');

// Find all .jsx files under features/
const files = glob.sync(path.join(FEATURES_DIR, '**', '*.jsx'));

const SHARED_IMPORT_TABLE = `import { SummarySkeleton, TableLoadingState } from '../../components/TableLoadingState';`;
const SHARED_IMPORT_FORMAT = `import { formatNumber } from '../../lib/formatters';`;

// Regex to match entire function block (handles nested braces up to 3 levels)
function removeFunctionBlock(content, funcName) {
  // Match 'function funcName(...) {' through the closing brace
  const regex = new RegExp(
    `\\n?function ${funcName}\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n\\}\\n?`,
    'g'
  );
  return content.replace(regex, '\n');
}

let totalChanges = 0;

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  const relPath = path.relative(__dirname, filePath);
  
  let hadSummarySkeleton = content.includes('function SummarySkeleton');
  let hadTableLoadingState = content.includes('function TableLoadingState');
  let hadFormatDisplay = content.includes('function formatDisplay');
  let hadFormatNumber = content.includes('function formatNumber');
  
  if (!hadSummarySkeleton && !hadTableLoadingState && !hadFormatDisplay && !hadFormatNumber) {
    continue;
  }

  // Remove local function definitions
  if (hadSummarySkeleton) {
    content = removeFunctionBlock(content, 'SummarySkeleton');
  }
  if (hadTableLoadingState) {
    content = removeFunctionBlock(content, 'TableLoadingState');
  }
  if (hadFormatDisplay) {
    content = removeFunctionBlock(content, 'formatDisplay');
  }
  if (hadFormatNumber) {
    content = removeFunctionBlock(content, 'formatNumber');
  }

  // Replace formatDisplay calls with formatNumber
  if (hadFormatDisplay) {
    content = content.replace(/formatDisplay\(/g, 'formatNumber(');
  }

  // Add shared imports if not already present
  const needsTableImport = (hadSummarySkeleton || hadTableLoadingState) && !content.includes('TableLoadingState');
  const needsFormatImport = (hadFormatDisplay || hadFormatNumber) && !content.includes("from '../../lib/formatters'");
  
  // Find position after last import to insert new imports
  if (needsTableImport || needsFormatImport) {
    const lines = content.split('\n');
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trimStart().startsWith('import ')) {
        lastImportIdx = i;
      }
    }
    
    const newImports = [];
    if (needsTableImport) newImports.push(SHARED_IMPORT_TABLE);
    if (needsFormatImport) newImports.push(SHARED_IMPORT_FORMAT);
    
    if (lastImportIdx >= 0) {
      lines.splice(lastImportIdx + 1, 0, ...newImports);
    }
    content = lines.join('\n');
  }

  // Clean up consecutive blank lines (max 2)
  content = content.replace(/\n{4,}/g, '\n\n\n');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ ${relPath} — removed: ${[hadSummarySkeleton && 'SummarySkeleton', hadTableLoadingState && 'TableLoadingState', hadFormatDisplay && 'formatDisplay', hadFormatNumber && 'formatNumber'].filter(Boolean).join(', ')}`);
    totalChanges++;
  }
}

console.log(`\nDone. ${totalChanges} files updated.`);
