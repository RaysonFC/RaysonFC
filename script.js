let synth;
let currentType = 'piano';

// Inicializar o sintetizador
function initSynth() {
    const volume = (document.getElementById('volume').value - 50) / 50;
    
    const synthTypes = {
        piano: new Tone.Sampler({
            urls: {
                A4: "A4.mp3",
                C4: "C4.mp3",
                "D#4": "Ds4.mp3",
                "F#4": "Fs4.mp3",
            },
            release: 1,
            baseUrl: "https://tonejs.github.io/audio/salamander/",
            volume: volume * 10
        }).toDestination(),
        
        synth: new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "triangle" },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 },
            volume: volume * 10
        }).toDestination(),
        
        organ: new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "sine" },
            envelope: { attack: 0.001, decay: 0.1, sustain: 0.9, release: 0.3 },
            volume: volume * 10
        }).toDestination(),
        
        bass: new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "sawtooth" },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.8 },
            volume: volume * 10 - 5
        }).toDestination()
    };

    if (synth) {
        synth.dispose();
    }
    
    synth = synthTypes[currentType];
}

// Inicializar
initSynth();

// Tocar nota
function playNote(note) {
    if (Tone.context.state !== 'running') {
        Tone.start();
    }
    synth.triggerAttackRelease(note, "8n");
}

// Event listeners para cliques
document.querySelectorAll('.key').forEach(key => {
    key.addEventListener('mousedown', () => {
        const note = key.dataset.note;
        playNote(note);
        key.classList.add('active');
    });

    key.addEventListener('mouseup', () => {
        key.classList.remove('active');
    });

    key.addEventListener('mouseleave', () => {
        key.classList.remove('active');
    });
});

// Event listeners para teclado
const keyMap = {};
document.querySelectorAll('.key').forEach(key => {
    keyMap[key.dataset.key.toLowerCase()] = key;
});

document.addEventListener('keydown', (e) => {
    const key = keyMap[e.key.toLowerCase()];
    if (key && !key.classList.contains('active')) {
        const note = key.dataset.note;
        playNote(note);
        key.classList.add('active');
    }
});

document.addEventListener('keyup', (e) => {
    const key = keyMap[e.key.toLowerCase()];
    if (key) {
        key.classList.remove('active');
    }
});

// Mudar tipo de som
document.getElementById('soundType').addEventListener('change', (e) => {
    currentType = e.target.value;
    initSynth();
});

// Ajustar volume
document.getElementById('volume').addEventListener('input', (e) => {
    const volumeValue = e.target.value;
    document.getElementById('volumeDisplay').textContent = volumeValue + '%';
    const dbValue = (volumeValue - 50) / 50 * 10;
    if (synth) {
        synth.volume.value = dbValue;
    }
});
