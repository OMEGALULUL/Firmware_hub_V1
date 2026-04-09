// app.js - M5Stick Firmware Hub
// Contains Firmware Recommender and Custom Flasher

export default function initApp() {
    // ---------- FIRMWARE RECOMMENDER ----------
    const goalSelect = document.getElementById('goalSelect');
    const otaButtons = document.querySelectorAll('.option-btn');
    let otaChoice = 'no';
    const recBox = document.getElementById('recommendationBox');
    const recFirmwareName = document.getElementById('recFirmwareName');
    const recDescription = document.getElementById('recDescription');
    const recFlashLink = document.getElementById('recFlashLink');
    const recNote = document.getElementById('recNote');

    if (goalSelect && otaButtons.length) {
        function updateRecommendation() {
            const goal = goalSelect.value;
            let firmware = '', description = '', link = '', note = '';
            if (otaChoice === 'yes') {
                firmware = 'M5Launcher (Bootloader)';
                description = 'Install M5Launcher once, then use its OTA menu to wirelessly flash Bruce, Marauder, or Infiltra without a PC.';
                link = 'https://bmorcelli.github.io/M5Stick-Launcher/flash0.html';
                note = 'After installing Launcher, you can download any firmware directly on the device.';
            } else {
                switch(goal) {
                    case 'wifi':
                        firmware = 'Marauder';
                        description = 'Specialized Wi-Fi pentesting: deauth attacks, beacon floods, packet monitoring, and wardriving.';
                        link = 'https://atomnft.github.io/M5stick-Marauder/flash0.html';
                        note = 'Best for dedicated Wi-Fi security testing.';
                        break;
                    case 'allround':
                        firmware = 'Bruce';
                        description = 'Most comprehensive toolkit: Wi-Fi, BLE, IR, RFID/NFC, BadUSB, Evil Portal, and more.';
                        link = 'https://bruce.computer/flasher';
                        note = 'Select M5StickC Plus 2 in the flasher.';
                        break;
                    case 'ota':
                        firmware = 'M5Launcher';
                        description = 'Bootloader + OTA manager. Install this first, then use it to download other firmwares over Wi-Fi.';
                        link = 'https://bmorcelli.github.io/M5Stick-Launcher/flash0.html';
                        note = 'After flashing Launcher, you never need a PC again.';
                        break;
                    case 'rfid':
                        firmware = 'Bruce or Infiltra';
                        description = 'Both support RFID/NFC, IR, and BLE. Bruce has more active attacks; Infiltra focuses on recon and file explorer.';
                        link = 'https://bruce.computer/flasher';
                        note = 'Try Bruce first for RFID cloning and IR attacks. Infiltra is also excellent.';
                        break;
                    default:
                        firmware = 'Bruce';
                        description = 'Versatile all-in-one firmware for most use cases.';
                        link = 'https://bruce.computer/flasher';
                        note = 'Reliable choice for general hacking.';
                }
            }
            recFirmwareName.innerText = firmware;
            recDescription.innerText = description;
            recFlashLink.href = link;
            recNote.innerText = note;
            recBox.style.display = 'block';
        }

        otaButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                otaButtons.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                otaChoice = btn.getAttribute('data-ota');
                updateRecommendation();
            });
        });
        goalSelect.addEventListener('change', updateRecommendation);
        const defaultNo = document.querySelector('.option-btn[data-ota="no"]');
        if (defaultNo) defaultNo.classList.add('selected');
        updateRecommendation();
    }

    // ---------- CUSTOM FLASHER (esptool-js) ----------
    // Try to load esptool-js from root (if placed there) or fallback to CDN
    const loadEsptool = async () => {
        try {
            // Attempt local file in root (you must place esptool.js there)
            const module = await import('./esptool.js');
            return module;
        } catch {
            // Fallback to CDN (online only)
            console.warn('Local esptool.js not found, using CDN (offline flashing will not work)');
            return import('https://unpkg.com/esptool-js@0.4.0/lib/index.js');
        }
    };

    const fileInput = document.getElementById('firmwareFile');
    const fileLabel = document.getElementById('fileLabel');
    const fileNameSpan = document.getElementById('fileName');
    const flashButton = document.getElementById('flashButton');
    const logDiv = document.getElementById('log');
    const offsetSelect = document.getElementById('offsetSelect');

    if (!fileInput || !flashButton) return;

    let selectedFile = null;

    function addLog(msg) {
        const p = document.createElement('div');
        p.textContent = msg;
        logDiv.appendChild(p);
        logDiv.scrollTop = logDiv.scrollHeight;
        console.log(msg);
    }

    function clearLog() {
        logDiv.innerHTML = '';
    }

    fileInput.addEventListener('change', (event) => {
        if (event.target.files.length > 0) {
            selectedFile = event.target.files[0];
            fileNameSpan.textContent = selectedFile.name;
            flashButton.disabled = false;
            addLog(`[INFO] Firmware selected: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(2)} KB)`);
        } else {
            selectedFile = null;
            fileNameSpan.textContent = 'No file selected';
            flashButton.disabled = true;
        }
    });

    if (fileLabel) fileLabel.addEventListener('click', () => fileInput.click());

    flashButton.addEventListener('click', async () => {
        if (!selectedFile) {
            addLog('[ERROR] No firmware file selected.');
            return;
        }

        flashButton.disabled = true;
        flashButton.textContent = 'Connecting...';
        clearLog();
        addLog('[INFO] Starting flashing process...');

        try {
            const { ESPLoader, Transport } = await loadEsptool();
            addLog('[INFO] Requesting serial port (select your M5Stick COM port)...');
            const port = await navigator.serial.requestPort();
            addLog('[INFO] Port selected.');

            const transport = new Transport(port, true);
            const esploader = new ESPLoader({
                transport,
                baudrate: 115200,
                enableTracing: false,
                terminal: {
                    clean: () => {},
                    writeLine: (data) => addLog(`[ESP] ${data}`),
                    write: (data) => addLog(`[ESP] ${data}`)
                }
            });

            addLog('[INFO] Connecting to ESP32...');
            const chip = await esploader.main();
            addLog(`[INFO] Connected to chip: ${chip}`);

            addLog('[INFO] Reading firmware binary...');
            const arrayBuffer = await selectedFile.arrayBuffer();
            const firmwareData = new Uint8Array(arrayBuffer);
            addLog(`[INFO] Firmware size: ${firmwareData.length} bytes`);

            // Get offset from dropdown (value is hex string like "0x10000")
            const offsetHex = offsetSelect.value;
            const offset = parseInt(offsetHex, 16);
            addLog(`[INFO] Using flash offset: ${offsetHex}`);

            addLog(`[INFO] Erasing and flashing at offset ${offsetHex}...`);
            await esploader.flashData(offset, firmwareData, (addr, total, current) => {
                const percent = (current / total * 100).toFixed(1);
                addLog(`[PROGRESS] ${percent}% - address: 0x${addr.toString(16)}`);
            });
            addLog('[SUCCESS] Firmware flashed successfully!');

            addLog('[INFO] Resetting device...');
            await esploader.reset();
            addLog('[INFO] Device reset. Your M5Stick should now boot the new firmware.');
        } catch (err) {
            addLog(`[ERROR] ${err.message || err}`);
            console.error(err);
        } finally {
            flashButton.disabled = false;
            flashButton.textContent = 'Connect & Flash';
        }
    });
}
