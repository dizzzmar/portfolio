# Música original del tráiler, sintetizada desde cero (sin samples): 120 BPM, La menor.
# Genera public/music.wav. Solo necesita numpy.  Uso: python3 music/make_music.py
import os, wave
import numpy as np

SR = 44100
BPM = 120
BEAT = 60 / BPM            # 0,5 s = 15 fotogramas a 30 fps
TOTAL = 25.5               # segundos (el vídeo dura 24,5 s + cola)
N = int(SR * TOTAL)
rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N)

def t(sec): return np.arange(int(sec * SR)) / SR

def place(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N: return
    s = sig[: N - i] * gain
    L[i:i + len(s)] += s * (1 - max(pan, 0))
    R[i:i + len(s)] += s * (1 + min(pan, 0))

def lowpass(x, cutoff):
    # filtro de un polo; cutoff puede ser un número o un array (barrido)
    cutoff = np.broadcast_to(cutoff, x.shape)
    a = 1 - np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc); y[i] = acc
    return y

def highpass(x, cutoff): return x - lowpass(x, cutoff)

def saw(freq, sec):
    ph = np.cumsum(np.broadcast_to(freq, (int(sec * SR),)) / SR)
    return 2 * (ph % 1) - 1

def note(n): return 440 * 2 ** ((n - 69) / 12)

# ---------- instrumentos ----------
def kick():
    x = t(0.4)
    f = 45 + 110 * np.exp(-x * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 7) + 0.3 * np.exp(-x * 300) * rng.uniform(-1, 1, len(x))

def clap():
    x = t(0.25); n = rng.uniform(-1, 1, len(x))
    env = np.zeros(len(x))
    for d in (0, 0.011, 0.022):
        k = int(d * SR); env[k:] += np.exp(-(x[: len(x) - k]) * (60 if d < 0.02 else 18))
    return highpass(n, 900) * env * 0.6

def hat(open_=False):
    x = t(0.18 if open_ else 0.05)
    return highpass(rng.uniform(-1, 1, len(x)), 7000) * np.exp(-x * (18 if open_ else 90)) * 0.35

def bass(n, sec):
    x = t(sec)
    s = saw(note(n), sec) + 0.5 * np.sin(2 * np.pi * note(n - 12) * x)
    env = np.minimum(1, x * 400) * np.exp(-x * 6)
    return lowpass(s * env, 300 + 1800 * np.exp(-x * 14)) * 0.55

def stab(notes, sec, bright=2500):
    x = t(sec); s = np.zeros(len(x))
    for n in notes:
        for d in (-0.08, 0.08):
            s += saw(note(n + d), sec)
    s /= len(notes) * 2
    env = np.minimum(1, x * 300) * np.exp(-x * 5)
    return lowpass(s * env, bright) * 0.5

def riser(sec):
    x = t(sec); p = x / sec
    n = rng.uniform(-1, 1, len(x))
    tone = np.sin(2 * np.pi * np.cumsum(200 + 1400 * p ** 2) / SR)
    return (lowpass(n, 400 + 9000 * p ** 2) * 0.6 + tone * 0.15) * p ** 2

def impact(sec=2.0):
    x = t(sec)
    sub = np.sin(2 * np.pi * np.cumsum(30 + 60 * np.exp(-x * 8)) / SR) * np.exp(-x * 2.2)
    noise = lowpass(rng.uniform(-1, 1, len(x)), 2500) * np.exp(-x * 4)
    return sub * 0.9 + noise * 0.5

def blip(n, sec=0.12):
    x = t(sec)
    return np.sin(2 * np.pi * note(n) * x) * np.exp(-x * 30) * 0.25

# ---------- arreglo ----------
# Progresión de 2 compases por acorde: Am  F  C  G
CHORDS = [(57, 60, 64), (53, 57, 60), (48, 55, 64), (55, 59, 62)]
ROOTS = [45, 41, 48, 43]
def chord_at(beat): return (beat // 4) % 4

place(impact(1.8), 0.0, 0.9)
place(stab((57, 60, 64, 69), 0.6, 4000), 0.0, 0.6)
# Riser corto antes de que entre el ritmo
place(riser(0.95), 0.05, 0.5)

DRUMS_START, BREAK_A, BREAK_B, OUTRO = 2, 20, 22, 42
for b in range(DRUMS_START, OUTRO):
    if BREAK_A <= b < BREAK_B:
        continue
    at = b * BEAT
    place(kick(), at, 0.95)
    if b % 2 == 1: place(clap(), at, 0.8, 0.0)
    # charles: corcheas al principio, semicorcheas en la segunda mitad
    subdiv = 4 if b >= BREAK_B else 2
    for k in range(subdiv):
        if k == 0: continue
        place(hat(open_=(subdiv == 2)), at + k * BEAT / subdiv, 0.6, 0.3 if k % 2 else -0.3)
    # bajo rodante en semicorcheas a contratiempo
    root = ROOTS[chord_at(b)]
    for k in (1, 2, 3):
        place(bass(root + (12 if k == 3 and b % 4 == 3 else 0), BEAT / 4), at + k * BEAT / 4, 0.8)
    # acorde al principio de cada compás
    if b % 4 == 0:
        place(stab(CHORDS[chord_at(b)], 1.2), at, 0.45, 0.0)

# Parón (10–11 s): riser y golpe en la vuelta
place(riser(BEAT * 2), BREAK_A * BEAT, 0.7)
place(impact(1.5), BREAK_B * BEAT, 0.8)
# Pequeños "blips" de interfaz en la escena del navegador (6,25–7,5 s)
for i, n in enumerate((81, 84, 88, 86, 84, 88, 93)):
    place(blip(n), 6.3 + i * BEAT / 4, 0.7, 0.2 * (-1) ** i)
# Final: silencio un pulso, golpe grande y acorde largo
place(riser(BEAT * 2), (OUTRO - 2) * BEAT, 0.5)
place(impact(3.0), (OUTRO + 1) * BEAT, 1.0)
place(stab((45, 57, 60, 64, 69), 3.0, 1800), (OUTRO + 1) * BEAT, 0.7)

# ---------- reverb sencilla y mezcla ----------
def reverb(x):
    out = x.copy()
    for d, g in ((0.031, 0.35), (0.043, 0.3), (0.057, 0.25), (0.079, 0.2), (0.11, 0.15)):
        k = int(d * SR); y = np.zeros_like(x); y[k:] = x[:-k] * g; out += y
    return out
L, R = reverb(L), reverb(R)
fade = np.ones(N); fl = int(0.6 * SR); fade[-fl:] = np.linspace(1, 0, fl)
mix = np.stack([L, R], 1) * fade[:, None]
mix = np.tanh(mix / np.max(np.abs(mix)) * 1.6) * 0.89

out = os.path.join(os.path.dirname(__file__), '..', 'public', 'music.wav')
os.makedirs(os.path.dirname(out), exist_ok=True)
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('ok', out)
