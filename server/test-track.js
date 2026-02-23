const fetch = require('node-fetch');
async function test() {
  const res = await fetch('http://localhost:3001/api/keywords/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      siteId: '0cbb7fb3-bf2e-4364-aeba-129ce07af574', // need the actual siteId
      keywords: [{ keyword: 'laptop repair chennai', category: 'Uncategorized' }]
    })
  });
  console.log(await res.json());
}
test();
