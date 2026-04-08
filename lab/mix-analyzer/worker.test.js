'use strict';

// ============================================================
// Unit tests for worker.js DSP functions
//
// Run: node lab/mix-analyzer/worker.test.js
//
// Loads the worker source, stubs `self.onmessage` and
// `self.postMessage`, then exercises every function with
// known signals and checks the results.
// ============================================================

// --- Load worker.js into a sandbox so all functions are accessible ---
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var postedMessages = [];
var sandbox = {
  self: {
    onmessage: null,
    postMessage: function (msg) { postedMessages.push(msg); }
  },
  Math: Math,
  Float32Array: Float32Array,
  Int32Array: Int32Array,
  Infinity: Infinity
};
vm.createContext(sandbox);

var workerSrc = fs.readFileSync(path.join(__dirname, 'worker.js'), 'utf8');
vm.runInContext(workerSrc, sandbox, { filename: 'worker.js' });

// Pull all worker functions/constants into local scope
var cubicInterpolate = sandbox.cubicInterpolate;
var gainToDb = sandbox.gainToDb;
var meanSquareToLUFS = sandbox.meanSquareToLUFS;
var lufsToHistBin = sandbox.lufsToHistBin;
var roundToHundred = sandbox.roundToHundred;
var calculateLUFSFromBlocks = sandbox.calculateLUFSFromBlocks;
var KWeightingFilter = sandbox.KWeightingFilter;

// --- Test harness ---
var passed = 0;
var failed = 0;
var PI = Math.PI;

function assert(condition, name) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error('  FAIL: ' + name);
  }
}

function assertClose(actual, expected, tolerance, name) {
  var diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    passed++;
  } else {
    failed++;
    console.error('  FAIL: ' + name + ' — expected ' + expected + ' ± ' + tolerance + ', got ' + actual);
  }
}

// Helper: run the full analysis pipeline and return the result
function analyze(left, right, sampleRate) {
  postedMessages = [];
  var channels = right ? [left, right] : [left];
  sandbox.self.onmessage({
    data: {
      channels: channels,
      sampleRate: sampleRate || 48000,
      numChannels: right ? 2 : 1
    }
  });
  var resultMsg = postedMessages.filter(function (m) { return m.type === 'result'; });
  if (resultMsg.length === 0) {
    var errMsg = postedMessages.filter(function (m) { return m.type === 'error'; });
    if (errMsg.length > 0) {
      console.error('  Worker error: ' + errMsg[0].message);
    }
    return null;
  }
  return resultMsg[0].result;
}

// Helper: generate a sine wave buffer
function sine(freq, durationSec, sampleRate, amplitude) {
  sampleRate = sampleRate || 48000;
  amplitude = amplitude || 1.0;
  var n = Math.floor(sampleRate * durationSec);
  var buf = new Float32Array(n);
  for (var i = 0; i < n; i++) {
    buf[i] = amplitude * Math.sin(2 * PI * freq * i / sampleRate);
  }
  return buf;
}

// Helper: generate silence
function silence(durationSec, sampleRate) {
  sampleRate = sampleRate || 48000;
  return new Float32Array(Math.floor(sampleRate * durationSec));
}

// Helper: generate white noise (deterministic PRNG for reproducibility)
function noise(durationSec, sampleRate, amplitude) {
  sampleRate = sampleRate || 48000;
  amplitude = amplitude || 1.0;
  var n = Math.floor(sampleRate * durationSec);
  var buf = new Float32Array(n);
  var seed = 12345;
  for (var i = 0; i < n; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    buf[i] = amplitude * (seed / 0x7fffffff * 2 - 1);
  }
  return buf;
}

// Helper: generate DC offset signal
function dc(value, durationSec, sampleRate) {
  sampleRate = sampleRate || 48000;
  var n = Math.floor(sampleRate * durationSec);
  var buf = new Float32Array(n);
  for (var i = 0; i < n; i++) buf[i] = value;
  return buf;
}

// ============================================================
// Test: cubicInterpolate
// ============================================================
console.log('\n— cubicInterpolate');

(function () {
  // Flat line: interpolation should return the same value
  var r = cubicInterpolate(0.5, 0.5, 0.5, 0.5, 0.5);
  assertClose(r, 0.5, 1e-10, 'flat line returns constant');

  // Linear ramp: y = 0, 1, 2, 3 → should be exact at midpoints
  r = cubicInterpolate(0, 1, 2, 3, 0.5);
  assertClose(r, 1.5, 1e-10, 'linear ramp at t=0.5');

  r = cubicInterpolate(0, 1, 2, 3, 0.25);
  assertClose(r, 1.25, 1e-10, 'linear ramp at t=0.25');

  // At t=0, should return y1
  r = cubicInterpolate(10, 20, 30, 40, 0);
  assertClose(r, 20, 1e-10, 't=0 returns y1');

  // At t=1, should return y2
  r = cubicInterpolate(10, 20, 30, 40, 1);
  assertClose(r, 30, 1e-10, 't=1 returns y2');
})();

// ============================================================
// Test: gainToDb
// ============================================================
console.log('\n— gainToDb');

(function () {
  assertClose(gainToDb(1.0), 0.0, 1e-10, '1.0 → 0 dB');
  assertClose(gainToDb(0.5), -6.0206, 0.001, '0.5 → -6.02 dB');
  assertClose(gainToDb(2.0), 6.0206, 0.001, '2.0 → +6.02 dB');
  assert(gainToDb(0) === -100, '0 → -100 dB');
  assert(gainToDb(-1) === -100, 'negative → -100 dB');
})();

// ============================================================
// Test: meanSquareToLUFS
// ============================================================
console.log('\n— meanSquareToLUFS');

(function () {
  // 0 dBFS sine: mean square = 0.5 → LUFS = -0.691 + 10*log10(0.5) = -3.7
  assertClose(meanSquareToLUFS(0.5), -3.701, 0.01, 'meanSq 0.5 → -3.7 LUFS');

  // Very quiet signal
  var r = meanSquareToLUFS(1e-10);
  assertClose(r, -100.691, 0.01, 'floor value → ~ -100.7 LUFS');

  // Zero input: clamped to 1e-10
  assertClose(meanSquareToLUFS(0), -100.691, 0.01, 'zero clamped');
})();

// ============================================================
// Test: lufsToHistBin and roundToHundred
// ============================================================
console.log('\n— lufsToHistBin / roundToHundred');

(function () {
  assert(lufsToHistBin(-70) === 0, '-70 LUFS → bin 0');
  assert(lufsToHistBin(5) === 255, '+5 LUFS → last bin');
  assert(lufsToHistBin(-200) === 0, 'clamps below');
  assert(lufsToHistBin(100) === 255, 'clamps above');

  var r = roundToHundred([0.333, 0.333, 0.334]);
  assert(r[0] + r[1] + r[2] === 100, 'roundToHundred sums to 100');
})();

// ============================================================
// Test: calculateLUFSFromBlocks
// ============================================================
console.log('\n— calculateLUFSFromBlocks');

(function () {
  // All blocks at same level: result = that level
  assertClose(calculateLUFSFromBlocks([-14, -14, -14, -14]), -14, 0.01,
    'uniform blocks return that level');

  // All blocks below -100: returns -100
  assert(calculateLUFSFromBlocks([-110, -120]) === -100,
    'all sub-threshold blocks → -100');

  // Empty array
  assert(calculateLUFSFromBlocks([]) === -100, 'empty → -100');

  // Power average of -14 and -20:
  // linear: (10^-1.4 + 10^-2.0)/2 = (0.03981 + 0.01)/2 = 0.024905
  // LUFS: 10*log10(0.024905) = -16.04
  assertClose(calculateLUFSFromBlocks([-14, -20]), -16.04, 0.1,
    'power average of -14 and -20');
})();

// ============================================================
// Test: K-weighting filter
// ============================================================
console.log('\n— KWeightingFilter');

(function () {
  var sr = 48000;

  // 1kHz sine at 0 dBFS through K-weight → gain ≈ 0 dB (K-weighting is ~flat at 1kHz)
  var kw = new KWeightingFilter();
  kw.initForSampleRate(sr);
  var sumSq = 0;
  var N = sr * 2; // 2 seconds
  for (var i = 0; i < N; i++) {
    var s = Math.sin(2 * PI * 1000 * i / sr);
    var out = kw.process(s);
    if (i >= sr) sumSq += out * out; // skip first second (transient)
  }
  var ms = sumSq / sr; // only count second second
  var lufs = meanSquareToLUFS(ms);
  assertClose(lufs, -3.0, 0.3, '1kHz → ~-3.0 LUFS (K-weight has slight boost at 1kHz)');

  // 50Hz sine: K-weight should attenuate (RLB high-pass)
  kw = new KWeightingFilter();
  kw.initForSampleRate(sr);
  sumSq = 0;
  for (var i = 0; i < N; i++) {
    var s = Math.sin(2 * PI * 50 * i / sr);
    var out = kw.process(s);
    if (i >= sr) sumSq += out * out;
  }
  ms = sumSq / sr;
  var lufs50 = meanSquareToLUFS(ms);
  assert(lufs50 < lufs - 1, '50Hz attenuated more than 1kHz (got ' + lufs50.toFixed(1) + ' vs ' + lufs.toFixed(1) + ')');

  // 5kHz sine: K-weight should boost slightly (pre-filter shelf)
  kw = new KWeightingFilter();
  kw.initForSampleRate(sr);
  sumSq = 0;
  for (var i = 0; i < N; i++) {
    var s = Math.sin(2 * PI * 5000 * i / sr);
    var out = kw.process(s);
    if (i >= sr) sumSq += out * out;
  }
  ms = sumSq / sr;
  var lufs5k = meanSquareToLUFS(ms);
  assert(lufs5k > lufs, '5kHz boosted relative to 1kHz (got ' + lufs5k.toFixed(1) + ' vs ' + lufs.toFixed(1) + ')');

  // Test initFor48kHz matches initForSampleRate(48000)
  var kw48 = new KWeightingFilter();
  kw48.initFor48kHz();
  var kwGen = new KWeightingFilter();
  kwGen.initForSampleRate(48000);
  assertClose(kw48.preB[0], kwGen.preB[0], 1e-6, '48kHz shortcut matches generic preB[0]');
  assertClose(kw48.rlbA[1], kwGen.rlbA[1], 1e-6, '48kHz shortcut matches generic rlbA[1]');
})();

// ============================================================
// Test: Full pipeline — sample peak
// ============================================================
console.log('\n— Sample Peak');

(function () {
  // 1kHz sine at 0 dBFS: sample peak should be ≤ 0 dB
  var buf = sine(1000, 2, 48000, 1.0);
  var r = analyze(buf, null, 48000);
  assert(r !== null, 'analysis completed (mono sine)');
  assert(r.peak.samplePeakDb <= 0.01, 'mono 0dBFS sine: sample peak ≤ 0 dB (got ' + r.peak.samplePeakDb.toFixed(2) + ')');
  assertClose(r.peak.samplePeakDb, 0.0, 0.1, 'mono 0dBFS sine: sample peak ≈ 0 dB');

  // -6 dBFS sine (amplitude 0.5): sample peak ≈ -6 dB
  buf = sine(1000, 2, 48000, 0.5);
  r = analyze(buf, null, 48000);
  assertClose(r.peak.samplePeakDb, -6.02, 0.1, '-6dBFS sine: sample peak ≈ -6 dB');

  // -20 dBFS sine (amplitude 0.1): sample peak ≈ -20 dB
  buf = sine(1000, 2, 48000, 0.1);
  r = analyze(buf, null, 48000);
  assertClose(r.peak.samplePeakDb, -20.0, 0.1, '-20dBFS sine: sample peak ≈ -20 dB');

  // Silence: sample peak → -100 (floor)
  buf = silence(2, 48000);
  r = analyze(buf, null, 48000);
  assert(r.peak.samplePeakDb === -100, 'silence: sample peak = -100');

  // Stereo: peak should track the louder channel
  var left = sine(1000, 2, 48000, 0.5);
  var right = sine(1000, 2, 48000, 0.25);
  r = analyze(left, right, 48000);
  assertClose(r.peak.samplePeakDb, -6.02, 0.1, 'stereo: peak follows louder channel');

  // Normalized signal (amplitude exactly 1.0): peak must NOT exceed 0 dB
  buf = sine(440, 5, 44100, 1.0);
  r = analyze(buf, null, 44100);
  assert(r.peak.samplePeakDb <= 0.01, '440Hz 0dBFS at 44.1k: sample peak ≤ 0 dB (got ' + r.peak.samplePeakDb.toFixed(4) + ')');
})();

// ============================================================
// Test: Full pipeline — true peak
// ============================================================
console.log('\n— True Peak');

(function () {
  // True peak should be ≥ sample peak
  var buf = sine(1000, 2, 48000, 1.0);
  var r = analyze(buf, null, 48000);
  assert(r.peak.truePeakDb >= r.peak.samplePeakDb, 'true peak ≥ sample peak');

  // For a full-scale sine that hits exactly ±1.0 at sample points,
  // true peak should be very close to 0 dBTP (might be slightly above
  // due to inter-sample peaks if frequency doesn't divide evenly)
  assertClose(r.peak.truePeakDb, 0.0, 0.5, '1kHz 0dBFS: true peak near 0 dBTP');

  // A signal specifically crafted for inter-sample peaks:
  // two consecutive samples at +1, -1 have an inter-sample peak > 1.0
  // Actually, let's use a frequency where the sine peak falls between samples
  // At 48kHz, a ~11025Hz sine will have peaks between samples
  buf = sine(11025, 2, 48000, 1.0);
  r = analyze(buf, null, 48000);
  assert(r.peak.truePeakDb >= r.peak.samplePeakDb, 'high freq: true peak ≥ sample peak');
})();

// ============================================================
// Test: Full pipeline — RMS and crest factor
// ============================================================
console.log('\n— RMS & Crest Factor');

(function () {
  // 0 dBFS sine: RMS = -3.01 dB, crest = 3.01 dB
  var buf = sine(1000, 2, 48000, 1.0);
  var r = analyze(buf, null, 48000);
  assertClose(r.dynamics.rmsDb, -3.01, 0.1, '0dBFS sine: RMS ≈ -3.01 dB');
  assertClose(r.dynamics.crestDb, 3.01, 0.2, '0dBFS sine: crest ≈ 3.01 dB');

  // DC at 0.5: RMS = -6.02 dB, peak = -6.02 dB, crest = 0 dB
  buf = dc(0.5, 2, 48000);
  r = analyze(buf, null, 48000);
  assertClose(r.dynamics.rmsDb, -6.02, 0.1, 'DC 0.5: RMS ≈ -6.02 dB');
  assertClose(r.dynamics.crestDb, 0.0, 0.1, 'DC 0.5: crest ≈ 0 dB');
})();

// ============================================================
// Test: Full pipeline — integrated LUFS (1kHz reference)
// ============================================================
console.log('\n— Integrated LUFS');

(function () {
  // 1kHz sine at -23 LUFS (≈ amplitude 0.0988 for single-channel)
  // K-weight at 1kHz is ~0 dB, so LUFS ≈ -0.691 + 10*log10(amp²/2)
  // For -23 LUFS: amp²/2 = 10^((-23+0.691)/10) = 10^(-2.2309) = 0.005878
  // amp = sqrt(0.01176) = 0.1084
  var amp = Math.sqrt(2 * Math.pow(10, (-23 + 0.691) / 10));
  var buf = sine(1000, 10, 48000, amp);
  // For mono, LUFS calculation uses both channels (L=R) so effective power doubles
  // mono: meanSq = (kwSumL + kwSumR) / blockSampleCount where sR = sL
  // This means mono signal is measured as if stereo with identical channels
  var r = analyze(buf, null, 48000);
  // The mono doubling means: actual LUFS = target + 3 dB
  // So we need amp that accounts for this: meanSq = 2 * amp²/2 = amp²
  // LUFS = -0.691 + 10*log10(amp²) = -0.691 + 20*log10(amp)
  // For -23 LUFS: amp = 10^((-23 + 0.691) / 20) = 10^(-1.11545) = 0.0768
  var ampMono = Math.pow(10, (-23 + 0.691) / 20);
  buf = sine(1000, 10, 48000, ampMono);
  r = analyze(buf, null, 48000);
  assertClose(r.loudness.integrated, -23, 1.5, 'mono 1kHz at -23 LUFS target (got ' + r.loudness.integrated.toFixed(1) + ')');

  // Stereo 1kHz at -14 LUFS
  // stereo: meanSq = kwSumL/N + kwSumR/N = 2*(amp²/2) = amp²
  // Same as mono — LUFS = -0.691 + 10*log10(amp²)
  var ampStereo = Math.pow(10, (-14 + 0.691) / 20);
  var left = sine(1000, 10, 48000, ampStereo);
  var right = sine(1000, 10, 48000, ampStereo);
  r = analyze(left, right, 48000);
  assertClose(r.loudness.integrated, -14, 1.5, 'stereo 1kHz at -14 LUFS target (got ' + r.loudness.integrated.toFixed(1) + ')');

  // Silence: -100
  buf = silence(5, 48000);
  r = analyze(buf, null, 48000);
  assert(r.loudness.integrated === -100, 'silence: integrated = -100');
})();

// ============================================================
// Test: Full pipeline — momentary max & short-term max
// ============================================================
console.log('\n— Momentary Max / Short-term Max');

(function () {
  // Constant-level signal: momentary max ≈ integrated
  var amp = Math.pow(10, (-14 + 0.691) / 20);
  var buf = sine(1000, 10, 48000, amp);
  var r = analyze(buf, null, 48000);
  assertClose(r.loudness.momentaryMax, r.loudness.integrated, 2.0,
    'constant signal: momentary ≈ integrated');
  assertClose(r.loudness.shortTermMax, r.loudness.integrated, 2.0,
    'constant signal: short-term ≈ integrated');

  // Momentary and short-term should not be -inf for normal audio
  assert(r.loudness.momentaryMax > -100, 'momentary max is not -inf (got ' + r.loudness.momentaryMax.toFixed(1) + ')');
  assert(r.loudness.shortTermMax > -100, 'short-term max is not -inf (got ' + r.loudness.shortTermMax.toFixed(1) + ')');

  // Timestamps should be within the file duration
  assert(r.loudness.momentaryMaxAt >= 0 && r.loudness.momentaryMaxAt <= 10,
    'momentary max timestamp in range');
  assert(r.loudness.shortTermMaxAt >= 0 && r.loudness.shortTermMaxAt <= 10,
    'short-term max timestamp in range');
})();

// ============================================================
// Test: Full pipeline — stereo correlation & balance
// ============================================================
console.log('\n— Stereo Correlation & Balance');

(function () {
  // Identical L/R: correlation ≈ +1
  var buf = sine(1000, 5, 48000, 0.5);
  var r = analyze(buf, buf, 48000);
  assertClose(r.stereo.correlation, 1.0, 0.05, 'identical L/R: correlation ≈ +1');
  assertClose(r.stereo.balance, 0.0, 0.01, 'identical L/R: balance ≈ 0');

  // Inverted R: correlation ≈ -1
  var inv = new Float32Array(buf.length);
  for (var i = 0; i < buf.length; i++) inv[i] = -buf[i];
  r = analyze(buf, inv, 48000);
  assertClose(r.stereo.correlation, -1.0, 0.05, 'inverted R: correlation ≈ -1');

  // Left only: balance should lean left
  var sil = silence(5, 48000);
  r = analyze(buf, sil, 48000);
  assert(r.stereo.balance < -0.5, 'left only: balance leans left (got ' + r.stereo.balance.toFixed(2) + ')');

  // Right only: balance should lean right
  r = analyze(sil, buf, 48000);
  assert(r.stereo.balance > 0.5, 'right only: balance leans right (got ' + r.stereo.balance.toFixed(2) + ')');

  // Mono file: stereo section should indicate mono
  r = analyze(buf, null, 48000);
  assert(r.stereo.status === 'Mono', 'mono file: status = Mono');
})();

// ============================================================
// Test: Full pipeline — tonal balance
// ============================================================
console.log('\n— Tonal Balance');

(function () {
  // 100Hz sine: should be mostly low band (crossover at 200Hz)
  var buf = sine(100, 5, 48000, 0.5);
  var r = analyze(buf, null, 48000);
  assert(r.tonal.low > r.tonal.mid && r.tonal.low > r.tonal.high,
    '100Hz: low band dominant (got ' + r.tonal.low + '/' + r.tonal.mid + '/' + r.tonal.high + ')');

  // 1kHz sine: should be mostly mid band (200Hz - 4kHz)
  buf = sine(1000, 5, 48000, 0.5);
  r = analyze(buf, null, 48000);
  assert(r.tonal.mid > r.tonal.low && r.tonal.mid > r.tonal.high,
    '1kHz: mid band dominant (got ' + r.tonal.low + '/' + r.tonal.mid + '/' + r.tonal.high + ')');

  // 8kHz sine: should be mostly high band (above 4kHz)
  buf = sine(8000, 5, 48000, 0.5);
  r = analyze(buf, null, 48000);
  assert(r.tonal.high > r.tonal.low && r.tonal.high > r.tonal.mid,
    '8kHz: high band dominant (got ' + r.tonal.low + '/' + r.tonal.mid + '/' + r.tonal.high + ')');

  // Percentages sum to 100
  assert(r.tonal.low + r.tonal.mid + r.tonal.high === 100,
    'tonal percentages sum to 100');
})();

// ============================================================
// Test: Full pipeline — LRA
// ============================================================
console.log('\n— Loudness Range (LRA)');

(function () {
  // Constant signal: LRA ≈ 0
  var amp = Math.pow(10, (-14 + 0.691) / 20);
  var buf = sine(1000, 10, 48000, amp);
  var r = analyze(buf, null, 48000);
  assertClose(r.loudness.range, 0, 2, 'constant signal: LRA near 0 (got ' + r.loudness.range.toFixed(1) + ')');

  // Signal with loud and quiet sections: LRA > 0
  var loud = sine(1000, 5, 48000, 0.3);
  var quiet = sine(1000, 5, 48000, 0.01);
  var combined = new Float32Array(loud.length + quiet.length);
  combined.set(loud, 0);
  combined.set(quiet, loud.length);
  r = analyze(combined, null, 48000);
  assert(r.loudness.range > 2, 'loud+quiet sections: LRA > 2 (got ' + r.loudness.range.toFixed(1) + ')');
})();

// ============================================================
// Test: Full pipeline — status classifications
// ============================================================
console.log('\n— Status Classifications');

(function () {
  // Very loud signal
  var buf = sine(1000, 5, 48000, 0.9);
  var r = analyze(buf, null, 48000);
  assert(r.loudness.status === 'Very Loud' || r.loudness.status === 'Loud',
    'loud signal: status is Loud or Very Loud (got ' + r.loudness.status + ')');

  // Quiet signal
  buf = sine(1000, 5, 48000, 0.001);
  r = analyze(buf, null, 48000);
  assert(r.loudness.status === 'Low', 'quiet signal: status is Low (got ' + r.loudness.status + ')');
})();

// ============================================================
// Test: Full pipeline — timestamps
// ============================================================
console.log('\n— Timestamps');

(function () {
  // Build a signal that's quiet then loud at a known time
  var sr = 48000;
  var quiet = sine(1000, 5, sr, 0.01);
  var loud = sine(1000, 2, sr, 0.8);
  var trailing = sine(1000, 3, sr, 0.01);
  var buf = new Float32Array(quiet.length + loud.length + trailing.length);
  buf.set(quiet, 0);
  buf.set(loud, quiet.length);
  buf.set(trailing, quiet.length + loud.length);

  var r = analyze(buf, null, sr);

  // Sample peak should occur during the loud section (5s - 7s)
  assert(r.peak.samplePeakAt >= 4.9 && r.peak.samplePeakAt <= 7.1,
    'sample peak timestamp in loud section (got ' + r.peak.samplePeakAt.toFixed(2) + 's)');

  // True peak should also occur during the loud section
  assert(r.peak.truePeakAt >= 4.9 && r.peak.truePeakAt <= 7.1,
    'true peak timestamp in loud section (got ' + r.peak.truePeakAt.toFixed(2) + 's)');

  // Momentary max should be near the loud section
  assert(r.loudness.momentaryMaxAt >= 4.5 && r.loudness.momentaryMaxAt <= 7.5,
    'momentary max timestamp near loud section (got ' + r.loudness.momentaryMaxAt.toFixed(2) + 's)');
})();

// ============================================================
// Test: Edge cases
// ============================================================
console.log('\n— Edge Cases');

(function () {
  // Very short file (< 1 block = 100ms)
  var buf = sine(1000, 0.05, 48000, 0.5);
  var r = analyze(buf, null, 48000);
  assert(r !== null, 'very short file (50ms) completes');
  assert(r.peak.samplePeakDb <= 0, 'short file: sample peak ≤ 0 dB');

  // 44.1kHz sample rate
  buf = sine(1000, 5, 44100, 0.5);
  r = analyze(buf, null, 44100);
  assert(r !== null, '44.1kHz analysis completes');
  assertClose(r.peak.samplePeakDb, -6.02, 0.1, '44.1kHz: peak correct');

  // Findings array exists and is capped at 5
  buf = sine(1000, 5, 48000, 0.9);
  r = analyze(buf, null, 48000);
  assert(Array.isArray(r.findings), 'findings is an array');
  assert(r.findings.length <= 5, 'findings capped at 5');
})();

// ============================================================
// Summary
// ============================================================
console.log('\n========================================');
console.log('  ' + passed + ' passed, ' + failed + ' failed');
console.log('========================================\n');

process.exit(failed > 0 ? 1 : 0);
