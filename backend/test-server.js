// Simple test script to verify server setup
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/health',
  method: 'GET'
};

console.log('Testing server connection...');

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    if (res.statusCode === 200) {
      console.log('✅ Server is running!');
    } else {
      console.log('❌ Server responded with error');
    }
  });
});

req.on('error', (error) => {
  console.log('❌ Connection error:', error.message);
  console.log('\nMake sure the server is running:');
  console.log('  cd backend');
  console.log('  npm run dev');
});

req.end();

