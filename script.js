let synth;
let currentType = 'piano';
let sustainEnabled = false;
let sustainedNotes = new Set();
let activeNotes = new Map();

// Database de acordes
const chordsDatabase = {
    basic: [
        { name: 'C', notes: ['C4', 'E4', 'G4'], formula: '1 - 3 - 5' },
        { name: 'Cm', notes: ['C4', 'D#4', 'G4'], formula: '1 - ♭3 - 5' },
        { name: 'D', notes: ['D4', 'F#4', 'A4'], formula: '1 - 3 - 5' },
        { name: 'Dm', notes: ['D4', 'F4', 'A4'], formula: '1 - ♭3 - 5' },
        { name: 'E', notes: ['E4', 'G#4', 'B4'], formula: '1 - 3 - 5' },
        { name: 'Em', notes: ['E4', 'G4', 'B4'], formula: '1 - ♭3 - 5' },
        { name: 'F', notes: ['F4', 'A4', 'C5'], formula: '1 - 3 - 5' },
        { name: 'Fm', notes: ['F4', 'G#4', 'C5'], formula: '1 - ♭3 - 5' },
        { name: 'G', notes: ['G4', 'B4', 'D5'], formula: '1 - 3 - 5' },
        { name: 'Gm', notes: ['G4', 'A#4', 'D5'], formula: '1 - ♭3 - 5' },
        { name: 'A', notes: ['A4', 'C#5', 'E5'], formula: '1 - 3 - 5' },
        { name: 'Am', notes: ['A3', 'C4', 'E4'], formula: '1 - ♭3 - 5' },
        { name: 'B', notes: ['B3', 'D#4', 'F#4'], formula: '1 - 3 - 5' },
        { name: 'Bm', notes: ['B3', 'D4', 'F#4'], formula: '1 - ♭3 - 5' }
    ],
    seventh: [
        { name: 'C7', notes: ['C4', 'E4', 'G4', 'A#4'], formula: '1 - 3 - 5 - ♭7' },
        { name: 'Cmaj7', notes: ['C4', 'E4', 'G4', 'B4'], formula: '1 - 3 - 5 - 7' },
        { name: 'Cm7', notes: ['C4', 'D#4', 'G4', 'A#4'], formula: '1 - ♭3 - 5 - ♭7' },
        { name: 'D7', notes: ['D4', 'F#4', 'A4', 'C5'], formula: '1 - 3 - 5 - ♭7' },
        { name: 'Dmaj7', notes: ['D4', 'F#4', 'A4', 'C#5'], formula: '1 - 3 - 5 - 7' },
        { name: 'Dm7', notes: ['D4', 'F4', 'A4', 'C5'], formula: '1 - ♭3 - 5 - ♭7' },
        { name: 'E7', notes: ['E4', 'G#4', 'B4', 'D5'], formula: '1 - 3 - 5 - ♭7' },
        { name: 'Emaj7', notes: ['E4', 'G#4', 'B4', 'D#5'], formula: '1 - 3 - 5 - 7' },
        { name: 'Em7', notes: ['E4', 'G4', 'B4', 'D5'], formula: '1 - ♭3 - 5 - ♭7' },
        { name: 'G7', notes: ['G4', 'B4', 'D5', 'F5'], formula: '1 - 3 - 5 - ♭7' },
        { name: 'Gmaj7', notes: ['G4', 'B4', 'D5', 'F#5'], formula: '1 - 3 - 5 - 7' },
        { name: 'Am7', notes: ['A3', 'C4', 'E4', 'G4'], formula: '1 - ♭3 - 5 - ♭7' }
    ],
    extended: [
        { name: 'C9', notes: ['C4', 'E4', 'G4', 'A#4', 'D5'], formula: '1 - 3 - 5 - ♭7 - 9' },
        { name: 'Cmaj9', notes: ['C4', 'E4', 'G4', 'B4', 'D5'], formula: '1 - 3 - 5 - 7 - 9' },
        { name: 'Csus4', notes: ['C4', 'F4', 'G4'], formula: '1 - 4 - 5' },
        { name: 'Csus2', notes: ['C4', 'D4', 'G4'], formula: '1 - 2 - 5' },
        { name: 'Cadd9', notes: ['C4', 'E4', 'G4', 'D5'], formula: '1 - 3 - 5 - 9' },
        { name: 'Cdim', notes: ['C4', 'D#4', 'F#4'], formula: '1 - ♭3 - ♭5' },
        { name: 'Caug', notes: ['C4', 'E4', 'G#4'], formula: '1 - 3 - #5' },
        { name: 'C6', notes: ['C4', 'E4', 'G4', 'A4'], formula: '1 - 3 - 5 - 6' }
    ]
};

// Campo harmônico
const harmonicFields = {
    major: {
        intervals: [0, 2, 4, 5, 7, 9, 11],
        chordTypes: ['maj', 'm', 'm', 'maj', 'maj', 'm', 'dim'],
        degrees: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']
    },
    minor: {
        intervals: [0, 2, 3, 5, 7, 8, 10],
        chordTypes: ['m', 'dim', 'maj', 'm', 'm', 'maj', 'maj'],
        degrees: ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']
    }
};

const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Inicializar sintetizador
function initSynth() {
    const volume = (document.getElementById('volume').value - 50) / 50;
    
    const synthTypes = {
        piano: new Tone.PolySynth(Tone.Sampler, {
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

initSynth();

// Tocar nota
function playNote(note, duration = "8n") {
    if (Tone.context.state !== 'running') {
        Tone.start();
    }
    
    if (sustainEnabled) {
        sustainedNotes.add(note);
        if (!activeNotes.has(note)) {
            synth.triggerAttack(note);
            activeNotes.set(note, true);
        }
    } else {
        synth.triggerAttackRelease(note, duration);
    }
}

// Parar nota
function stopNote(note) {
    if (sustainEnabled && sustainedNotes.has(note)) {
        return;
    }
    
    if (activeNotes.has(note)) {
        synth.triggerRelease(note);
        activeNotes.delete(note);
    }
}

// Tocar acorde
function playChord(notes) {
    if (Tone.context.state !== 'running') {
        Tone.start();
    }
    
    // Destacar teclas
    notes.forEach(note => {
        const key = document.querySelector(`[data-note="${note}"]`);
        if (key) {
            key.classList.add('highlight');
            setTimeout(() => key.classList.remove('highlight'), 1000);
        }
    });
    
    synth.triggerAttackRelease(notes, "2n");
}

// Renderizar acordes
function renderChords(category) {
    const display = document.getElementById('chordsDisplay');
    const chords = chordsDatabase[category];
    
    display.innerHTML = chords.map(chord => `
        <div class="chord-card" onclick="playChord(${JSON.stringify(chord.notes)})">
            <div class="chord-name">${chord.name}</div>
            <div class="chord-notes">${chord.notes.join(' - ')}</div>
            <div class="chord-formula">${chord.formula}</div>
        </div>
    `).join('');
}

// Gerar campo harmônico
function generateHarmonicField() {
    const key = document.getElementById('harmonicKey').value;
    const mode = document.getElementById('harmonicMode').value;
    const field = harmonicFields[mode];
    const display = document.getElementById('harmonicDisplay');
    
    const rootIndex = noteNames.indexOf(key);
    const chords = [];
    
    field.intervals.forEach((interval, i) => {
        const noteIndex = (rootIndex + interval) % 12;
        const noteName = noteNames[noteIndex];
        const chordType = field.chordTypes[i];
        const degree = field.degrees[i];
        
        // Construir as notas do acorde
        const chordNotes = buildChordNotes(noteName, chordType);
        
        chords.push({
            degree: degree,
            name: noteName + (chordType === 'm' ? 'm' : chordType === 'dim' ? 'dim' : ''),
            notes: chordNotes
        });
    });
    
    display.innerHTML = chords.map(chord => `
        <div class="harmonic-chord" onclick="playChord(${JSON.stringify(chord.notes)})">
            <div class="degree">${chord.degree}</div>
            <div class="chord-name">${chord.name}</div>
            <div class="notes">${chord.notes.join(' - ')}</div>
        </div>
    `).join('');
}

// Construir notas do acorde
function buildChordNotes(root, type) {
    const rootIndex = noteNames.indexOf(root);
    let intervals;
    
    if (type === 'maj') {
        intervals = [0, 4, 7];
    } else if (type === 'm') {
        intervals = [0, 3, 7];
    } else if (type === 'dim') {
        intervals = [0, 3, 6];
    }
    
    return intervals.map(interval => {
        const noteIndex = (rootIndex + interval) % 12;
        return noteNames[noteIndex] + '4';
    });
}

// Event listeners para teclas
document.querySelectorAll('.key').forEach(key => {
    key.addEventListener('mousedown', () => {
        const note = key.dataset.note;
        playNote(note);
        key.classList.add('active');
    });

    key.addEventListener('mouseup', () => {
        const note = key.dataset.note;
        if (!sustainEnabled) {
            stopNote(note);
        }
        key.classList.remove('active');
    });

    key.addEventListener('mouseleave', () => {
        key.classList.remove('active');
    });
});

// Event listeners para teclado
const keyMap = {};
document.querySelectorAll('.key').forEach(key => {
    const keyChar = key.dataset.key.toLowerCase();
    if (keyChar) {
        keyMap[keyChar] = key;
    }
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
        const note = key.dataset.note;
        if (!sustainEnabled) {
            stopNote(note);
        }
        key.classList.remove('active');
    }
});

// Sustain toggle
document.getElementById('sustainToggle').addEventListener('change', (e) => {
    sustainEnabled = e.target.checked;
    
    if (!sustainEnabled) {
        // Parar todas as notas sustentadas
        sustainedNotes.forEach(note => {
            synth.triggerRelease(note);
        });
        sustainedNotes.clear();
        activeNotes.clear();
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

// Tabs de acordes
document.querySelectorAll('.chord-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.chord-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderChords(tab.dataset.category);
    });
});

// Campo harmônico listeners
document.getElementById('harmonicKey').addEventListener('change', generateHarmonicField);
document.getElementById('harmonicMode').addEventListener('change', generateHarmonicField);

// Inicializar
renderChords('basic');
generateHarmonicField();
