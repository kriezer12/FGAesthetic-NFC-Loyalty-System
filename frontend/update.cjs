const fs = require('fs');

const files = [
  'c:/Users/Administrator/Desktop/FGAC/frontend/src/pages/portal/dashboard.tsx',
  'c:/Users/Administrator/Desktop/FGAC/frontend/src/pages/portal/settings.tsx'
];

files.forEach(p => {
  let content = fs.readFileSync(p, 'utf-8');
  content = content.replace(/\.eq\("user_id",\s*user\.id\)\s*\.single\(\)/g, '.eq("user_id", user.id)\n            .limit(1)\n            .maybeSingle()');
  fs.writeFileSync(p, content, 'utf-8');
  console.log(`Updated ${p}`);
});
