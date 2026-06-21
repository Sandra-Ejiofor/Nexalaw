const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const allFiles = new Set();
walkDir('.', (filePath) => {
  if (!filePath.includes('node_modules') && !filePath.includes('.git') && !filePath.includes('.next')) {
    // Store lowercase version as key, actual path as value
    allFiles.add(filePath.replace(/\\/g, '/'));
  }
});

let foundMismatch = false;

allFiles.forEach(file => {
  if (file.endsWith('.ts') || file.endsWith('.tsx')) {
    const content = fs.readFileSync(file, 'utf8');
    const importRegex = /import\s+.*?from\s+['"](.*?)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath.startsWith('.')) {
        const absoluteImportPath = path.resolve(path.dirname(file), importPath).replace(/\\/g, '/');
        // Check if there is an exact match in allFiles (we need to resolve extensions too)
        
        let matched = false;
        const possibleExtensions = ['', '.ts', '.tsx', '.js', '/index.ts', '/index.tsx'];
        for (const ext of possibleExtensions) {
          const checkPath = absoluteImportPath + ext;
          // find relative to root
          const relativeCheck = path.relative(process.cwd(), checkPath).replace(/\\/g, '/');
          
          if (fs.existsSync(relativeCheck)) {
             // File exists on Windows. Let's check if the casing is EXACTLY right
             const actualBasename = path.basename(relativeCheck);
             const dirFiles = fs.readdirSync(path.dirname(relativeCheck));
             if (!dirFiles.includes(actualBasename)) {
               console.log(`Mismatch found in ${file}: import '${importPath}' -> actual file is named differently in filesystem.`);
               foundMismatch = true;
             }
          }
        }
      }
    }
  }
});

if (!foundMismatch) console.log("No case mismatches found in local imports.");
