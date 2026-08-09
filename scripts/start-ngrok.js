import { spawn } from 'child_process';

const AUTHTOKEN = '3Hf8KgFgi4fnt1itSyU4bDa1NcI_7XWTEB44CPtJSM9uuonoK';
const DOMAIN = 'unabased-melodie-collapsable.ngrok-free.dev';

console.log('🌐 Setting up Permanent Ngrok Tunnel for port 5000...');

// Configure authtoken first
const setToken = spawn('npx', ['ngrok', 'config', 'add-authtoken', AUTHTOKEN], { shell: true });

setToken.on('close', () => {
  console.log('🔑 Authtoken configured successfully.');
  
  // Start ngrok with exact permanent domain
  const ngrok = spawn('npx', ['ngrok', 'http', '5000', `--url=${DOMAIN}`], {
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const publicUrl = `https://${DOMAIN}`;
  console.log('\n==================================================');
  console.log('🚀 [PERMANENT NGROK TUNNEL ACTIVATED]');
  console.log(`🌐 Public Backend URL: ${publicUrl}`);
  console.log(`⚡ WEBHOOK SEPAY URL:  ${publicUrl}/api/payments/webhook/sepay`);
  console.log('📌 LINK NÀY ĐÃ CỐ ĐỊNH VĨNH VIỄN - KHÔNG BAO GIỜ ĐỔI NỮA!');
  console.log('==================================================\n');

  ngrok.stdout?.on('data', (data) => {
    const str = data.toString();
    if (str.includes('error') || str.includes('ERR_')) {
      console.log('[Ngrok]:', str);
    }
  });

  ngrok.stderr?.on('data', (data) => {
    console.log('[Ngrok Stderr]:', data.toString());
  });
});
