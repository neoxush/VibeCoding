const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('Ticket System Setup');
console.log('===================');
console.log('This script will help you set up your environment variables.');
console.log('You need to have a Supabase account and project created.');
console.log('');

rl.question('Enter your Supabase URL: ', (supabaseUrl) => {
  rl.question('Enter your Supabase Anon Key: ', (supabaseAnonKey) => {
    const envContent = `# Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnonKey}`;

    fs.writeFileSync(path.join(__dirname, '.env.local'), envContent);
    
    console.log('');
    console.log('Environment variables have been saved to .env.local');
    console.log('');
    console.log('Next steps:');
    console.log('1. Run "npm install" to install dependencies');
    console.log('2. Run "npm run dev" to start the development server');
    console.log('3. Open http://localhost:3000 in your browser');
    console.log('');
    console.log('Make sure to set up your Supabase database schema as described in the README.md file.');
    
    rl.close();
  });
});
