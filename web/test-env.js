const fs = require('fs');
const path = require('path');

try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  console.log('--- .env.local content length:', envContent.length);
  
  const lines = envContent.split(/\r?\n/);
  const keyLine = lines.find(l => l.startsWith('FIREBASE_SERVICE_ACCOUNT_KEY='));
  
  if (!keyLine) {
    console.log('❌ KEY NOT FOUND IN .env.local');
    process.exit(1);
  }
  
  let val = keyLine.substring('FIREBASE_SERVICE_ACCOUNT_KEY='.length).trim();
  console.log('--- Value raw start:', val.substring(0, 50));
  
  if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
    console.log('--- Stripping surrounding quotes');
    val = val.substring(1, val.length - 1);
  }
  
  try {
    const parsed = JSON.parse(val);
    console.log('✅ JSON PARSE SUCCESSFUL');
    console.log('--- Project ID:', parsed.project_id);
    console.log('--- Private Key Found:', !!parsed.private_key);
    console.log('--- Private Key starts with BEGIN:', parsed.private_key?.includes('BEGIN PRIVATE KEY'));
  } catch (e) {
    console.log('❌ JSON PARSE FAILED:', e.message);
    console.log('--- Problematic value start:', val.substring(0, 100));
  }
} catch (e) {
  console.log('❌ Error reading file:', e.message);
}
