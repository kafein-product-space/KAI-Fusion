#!/usr/bin/env node

/**
 * Script to remove unused Lucide React imports
 * This is a simple approach - in production, you'd use tools like ts-prune or eslint-plugin-unused-imports
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Unused imports detected from build output
const unusedImports = ['Menu', 'CableCar', 'Divide', 'BookOpenIcon', 'Bot', 'X'];

// Files to exclude from cleanup (they use many imports for icon mapping)
const excludedFiles = [
  'DraggableNode.tsx',
  'FlowCanvas.tsx'
];

function removeUnusedImports(filePath) {
  try {
    // Check if file should be excluded
    const fileName = path.basename(filePath);
    if (excludedFiles.includes(fileName)) {
      return false;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Check if file has lucide-react imports
    const importRegex = /import\s*{\s*([^}]+)\s*}\s*from\s*["']lucide-react["'];?/g;
    const match = importRegex.exec(content);
    
    if (match) {
      const imports = match[1].split(',').map(s => s.trim());
      const usedImports = imports.filter(imp => {
        // Check if import is used in the file (simple regex check)
        const importName = imp.replace(/\s+as\s+\w+/, ''); // Remove 'as' aliases
        const isUsed = content.includes(`<${importName}`) || 
                       content.includes(`${importName}(`) || 
                       content.includes(`${importName}.`) ||
                       content.includes(`{${importName}}`);
        return isUsed;
      });

      if (usedImports.length !== imports.length) {
        modified = true;
        if (usedImports.length === 0) {
          // Remove entire import line
          content = content.replace(importRegex, '');
        } else {
          // Keep only used imports
          const newImportLine = `import { ${usedImports.join(', ')} } from "lucide-react";`;
          content = content.replace(match[0], newImportLine);
        }
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Cleaned unused imports in: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Find all .tsx files
function findTsxFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      files.push(...findTsxFiles(fullPath));
    } else if (item.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Main execution
console.log('🧹 Starting unused import cleanup...');

const appDir = path.join(__dirname, 'app');
const tsxFiles = findTsxFiles(appDir);

let totalCleaned = 0;
for (const file of tsxFiles) {
  if (removeUnusedImports(file)) {
    totalCleaned++;
  }
}

console.log(`✨ Cleanup complete! Cleaned ${totalCleaned} files.`);