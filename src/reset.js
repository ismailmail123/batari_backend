const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 RESET TOTAL SYSTEM...');
console.log('========================');

const commands = [
    'taskkill /f /im node.exe /t',
    'taskkill /f /im chrome.exe /t',
    'taskkill /f /im chromedriver.exe /t',
    'taskkill /f /im chromium.exe /t'
];

function runCommand(cmd) {
    return new Promise((resolve) => {
        console.log(`🔧 Running: ${cmd}`);
        exec(cmd, (error) => {
            if (error) {
                console.log(`✅ ${cmd} - No processes found`);
            } else {
                console.log(`✅ ${cmd} - Success`);
            }
            resolve();
        });
    });
}

async function resetAll() {
    console.log('\n1. 🛑 Menghentikan semua proses...');
    for (const cmd of commands) {
        await runCommand(cmd);
    }

    console.log('\n2. 🗑️ Membersihkan session files...');
    const sessionDir = './whatsapp-sessions';
    if (fs.existsSync(sessionDir)) {
        try {
            fs.rmSync(sessionDir, { recursive: true, force: true });
            console.log('✅ Session directory berhasil dihapus');
        } catch (error) {
            console.log('⚠️ Gagal hapus session directory:', error.message);
        }
    } else {
        console.log('ℹ️ Session directory tidak ditemukan');
    }

    console.log('\n3. ⏳ Tunggu 5 detik...');
    for (let i = 5; i > 0; i--) {
        console.log(`   ${i}...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n🎯 RESET SELESAI!');
    console.log('================');
    console.log('🚀 Sekarang jalankan bot dengan: npm start');
}

resetAll().catch(console.error);