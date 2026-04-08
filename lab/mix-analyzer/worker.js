'use strict';

// ============================================================
// DSP Constants (ported from MeteringMath.h)
// ============================================================
var PI = 3.14159265358979323846;
var ABSOLUTE_GATE_LUFS = -70.0;
var LUFS_HIST_BINS = 256;
var LUFS_HIST_MIN = -70.0;
var LUFS_HIST_MAX = 5.0;
var LUFS_HIST_BIN_WIDTH = (LUFS_HIST_MAX - LUFS_HIST_MIN) / LUFS_HIST_BINS;

// ============================================================
// K-Weighting Filter (ported from MeteringMath.h)
// Two-stage IIR: pre-filter (high shelf) + RLB (high-pass)
// Direct Form II Transposed
// ============================================================
function KWeightingFilter() {
  this.preB = [0, 0, 0];
  this.preA = [0, 0, 0];
  this.rlbB = [0, 0, 0];
  this.rlbA = [0, 0, 0];
  this.preState = [0, 0];
  this.rlbState = [0, 0];
}

KWeightingFilter.prototype.initFor48kHz = function () {
  this.preB[0] = 1.53512485958697;
  this.preB[1] = -2.69169618940638;
  this.preB[2] = 1.19839281085285;
  this.preA[0] = 1.0;
  this.preA[1] = -1.69065929318241;
  this.preA[2] = 0.73248077421585;
  this.rlbB[0] = 1.0;
  this.rlbB[1] = -2.0;
  this.rlbB[2] = 1.0;
  this.rlbA[0] = 1.0;
  this.rlbA[1] = -1.99004745483398;
  this.rlbA[2] = 0.99007225036621;
};

KWeightingFilter.prototype.initForSampleRate = function (sampleRate) {
  if (Math.abs(sampleRate - 48000) < 1) {
    this.initFor48kHz();
    return;
  }
  // Stage 1: Pre-filter (high shelf)
  var preF0 = 1681.974450955533;
  var preGain = 3.999843853973347;
  var preQ = 0.7071752369554196;

  var A = Math.pow(10, preGain / 40);
  var w0 = 2 * PI * preF0 / sampleRate;
  var cosw = Math.cos(w0);
  var sinw = Math.sin(w0);
  var alpha = sinw / (2 * preQ);
  var twoSqrtAalpha = 2 * Math.sqrt(A) * alpha;

  var b0 = A * ((A + 1) + (A - 1) * cosw + twoSqrtAalpha);
  var b1 = -2 * A * ((A - 1) + (A + 1) * cosw);
  var b2 = A * ((A + 1) + (A - 1) * cosw - twoSqrtAalpha);
  var a0 = (A + 1) - (A - 1) * cosw + twoSqrtAalpha;
  var a1 = 2 * ((A - 1) - (A + 1) * cosw);
  var a2 = (A + 1) - (A - 1) * cosw - twoSqrtAalpha;

  this.preB[0] = b0 / a0; this.preB[1] = b1 / a0; this.preB[2] = b2 / a0;
  this.preA[0] = 1.0; this.preA[1] = a1 / a0; this.preA[2] = a2 / a0;

  // Stage 2: RLB high-pass
  var rlbF0 = 38.13547087602444;
  var rlbQ = 0.5003270373238773;

  w0 = 2 * PI * rlbF0 / sampleRate;
  cosw = Math.cos(w0);
  sinw = Math.sin(w0);
  alpha = sinw / (2 * rlbQ);

  b0 = (1 + cosw) / 2; b1 = -(1 + cosw); b2 = (1 + cosw) / 2;
  a0 = 1 + alpha; a1 = -2 * cosw; a2 = 1 - alpha;

  this.rlbB[0] = b0 / a0; this.rlbB[1] = b1 / a0; this.rlbB[2] = b2 / a0;
  this.rlbA[0] = 1.0; this.rlbA[1] = a1 / a0; this.rlbA[2] = a2 / a0;
};

KWeightingFilter.prototype.process = function (sample) {
  var y = this.preB[0] * sample + this.preState[0];
  this.preState[0] = this.preB[1] * sample - this.preA[1] * y + this.preState[1];
  this.preState[1] = this.preB[2] * sample - this.preA[2] * y;

  var z = this.rlbB[0] * y + this.rlbState[0];
  this.rlbState[0] = this.rlbB[1] * y - this.rlbA[1] * z + this.rlbState[1];
  this.rlbState[1] = this.rlbB[2] * y - this.rlbA[2] * z;

  return z;
};

KWeightingFilter.prototype.reset = function () {
  this.preState[0] = this.preState[1] = 0;
  this.rlbState[0] = this.rlbState[1] = 0;
};

// ============================================================
// LR4 Filter (ported from MultiBandSplitter.h)
// Two cascaded 2nd-order Butterworth biquads
// ============================================================
function LR4Filter() {
  this.b1 = [0, 0, 0]; this.a1 = [0, 0, 0];
  this.b2 = [0, 0, 0]; this.a2 = [0, 0, 0];
  this.s1 = [0, 0];
  this.s2 = [0, 0];
}

LR4Filter.prototype.reset = function () {
  this.s1[0] = this.s1[1] = 0;
  this.s2[0] = this.s2[1] = 0;
};

LR4Filter.prototype.setLowpass = function (freq, sampleRate) {
  this._computeButterworth(freq, sampleRate, true);
};

LR4Filter.prototype.setHighpass = function (freq, sampleRate) {
  this._computeButterworth(freq, sampleRate, false);
};

LR4Filter.prototype.process = function (sample) {
  // Stage 1
  var y1 = this.b1[0] * sample + this.s1[0];
  this.s1[0] = this.b1[1] * sample - this.a1[1] * y1 + this.s1[1];
  this.s1[1] = this.b1[2] * sample - this.a1[2] * y1;
  // Stage 2
  var y2 = this.b2[0] * y1 + this.s2[0];
  this.s2[0] = this.b2[1] * y1 - this.a2[1] * y2 + this.s2[1];
  this.s2[1] = this.b2[2] * y1 - this.a2[2] * y2;
  return y2;
};

LR4Filter.prototype._computeButterworth = function (freq, sampleRate, lowpass) {
  var w0 = 2 * PI * freq / sampleRate;
  var cosw = Math.cos(w0);
  var sinw = Math.sin(w0);
  var alpha = sinw / (2 * 0.7071067811865476); // Q = sqrt(2)/2

  var b0, b1v, b2v, a0, a1v, a2v;
  if (lowpass) {
    b0 = (1 - cosw) / 2;
    b1v = 1 - cosw;
    b2v = (1 - cosw) / 2;
  } else {
    b0 = (1 + cosw) / 2;
    b1v = -(1 + cosw);
    b2v = (1 + cosw) / 2;
  }
  a0 = 1 + alpha;
  a1v = -2 * cosw;
  a2v = 1 - alpha;

  this.b1[0] = this.b2[0] = b0 / a0;
  this.b1[1] = this.b2[1] = b1v / a0;
  this.b1[2] = this.b2[2] = b2v / a0;
  this.a1[0] = this.a2[0] = 1.0;
  this.a1[1] = this.a2[1] = a1v / a0;
  this.a1[2] = this.a2[2] = a2v / a0;
};

// ============================================================
// Cubic Lagrange Interpolation (ported from PluginProcessor.h)
// 4-point interpolation for true peak detection
// ============================================================
function cubicInterpolate(y0, y1, y2, y3, t) {
  var a = -0.5 * y0 + 1.5 * y1 - 1.5 * y2 + 0.5 * y3;
  var b = y0 - 2.5 * y1 + 2.0 * y2 - 0.5 * y3;
  var c = -0.5 * y0 + 0.5 * y2;
  var d = y1;
  return ((a * t + b) * t + c) * t + d;
}

// ============================================================
// Utility functions (ported from MeteringMath.h)
// ============================================================
function meanSquareToLUFS(meanSquare) {
  return -0.691 + 10 * Math.log10(Math.max(1e-10, meanSquare));
}

function lufsToHistBin(lufs) {
  var bin = Math.floor((lufs - LUFS_HIST_MIN) / LUFS_HIST_BIN_WIDTH);
  return Math.max(0, Math.min(LUFS_HIST_BINS - 1, bin));
}

function gainToDb(gain) {
  if (gain <= 0) return -100;
  return 20 * Math.log10(gain);
}

// Largest-remainder rounding (ported from MeteringMath.h)
function roundToHundred(contributions) {
  var scaled = contributions.map(function (c) { return c * 100; });
  var truncated = scaled.map(function (s) { return Math.floor(s); });
  var sum = truncated.reduce(function (a, b) { return a + b; }, 0);
  var remainder = 100 - sum;
  var fractional = scaled.map(function (s, i) { return s - truncated[i]; });

  for (var r = 0; r < remainder; r++) {
    var maxIdx = 0;
    for (var i = 1; i < 3; i++) {
      if (fractional[i] > fractional[maxIdx]) maxIdx = i;
    }
    truncated[maxIdx]++;
    fractional[maxIdx] = -1;
  }
  return truncated;
}

// ============================================================
// Main Analysis Pipeline
// ============================================================
self.onmessage = function (e) {
  try {
    var data = e.data;
    var channels = data.channels;
    var sampleRate = data.sampleRate;
    var numChannels = data.numChannels;
    var totalSamples = channels[0].length;
    var isStereo = numChannels >= 2;

    var left = channels[0];
    var right = isStereo ? channels[1] : null;

    // Results accumulator
    var result = {};

    // ---------------------------------------------------
    // Pass 1: Sample peak + True peak + RMS + Phase correlation + L/R balance
    // ---------------------------------------------------
    self.postMessage({ type: 'progress', pct: 0, label: 'Measuring peaks and dynamics...' });

    var samplePeak = 0;
    var samplePeakAt = 0;
    var truePeak = 0;
    var truePeakAt = 0;
    var sumSquared = 0; // for RMS (full-bandwidth, unweighted)

    // True peak history buffers (per channel)
    var histL = [0, 0, 0];
    var histR = [0, 0, 0];

    // Phase correlation accumulators (Pearson)
    var sumL = 0, sumR = 0, sumLL = 0, sumRR = 0, sumLR = 0;

    // L/R balance: sum of abs values per channel
    var sumAbsL = 0, sumAbsR = 0;

    for (var i = 0; i < totalSamples; i++) {
      var sL = left[i];
      var sR = isStereo ? right[i] : sL;

      // Sample peak (max across channels)
      var absL = Math.abs(sL);
      var absR = Math.abs(sR);
      if (absL > samplePeak) { samplePeak = absL; samplePeakAt = i; }
      if (absR > samplePeak) { samplePeak = absR; samplePeakAt = i; }

      // RMS (average of L+R energy)
      sumSquared += sL * sL;
      if (isStereo) sumSquared += sR * sR;

      // True peak: 4x cubic Lagrange interpolation (ported from PluginProcessor.cpp)
      var tpL = absL;
      var tpR = absR;
      for (var k = 1; k <= 3; k++) {
        var t = k * 0.25;
        var interpL = Math.abs(cubicInterpolate(histL[0], histL[1], histL[2], sL, t));
        var interpR = Math.abs(cubicInterpolate(histR[0], histR[1], histR[2], sR, t));
        if (interpL > tpL) tpL = interpL;
        if (interpR > tpR) tpR = interpR;
      }
      if (tpL > truePeak) { truePeak = tpL; truePeakAt = i; }
      if (tpR > truePeak) { truePeak = tpR; truePeakAt = i; }

      // Shift true peak history
      histL[0] = histL[1]; histL[1] = histL[2]; histL[2] = sL;
      histR[0] = histR[1]; histR[1] = histR[2]; histR[2] = sR;

      // Phase correlation accumulators
      if (isStereo) {
        sumL += sL; sumR += sR;
        sumLL += sL * sL; sumRR += sR * sR;
        sumLR += sL * sR;
        sumAbsL += absL; sumAbsR += absR;
      }

      // Report progress every ~5%
      if (i % Math.floor(totalSamples / 20) === 0) {
        self.postMessage({ type: 'progress', pct: (i / totalSamples) * 30 });
      }
    }

    // Compute peak results
    var samplePeakDb = Math.min(0, gainToDb(samplePeak));
    var truePeakDb = gainToDb(truePeak);

    // RMS
    var rmsChannelCount = isStereo ? 2 : 1;
    var rmsLinear = Math.sqrt(sumSquared / (totalSamples * rmsChannelCount));
    var rmsDb = gainToDb(rmsLinear);

    // Crest factor
    var crestDb = samplePeakDb - rmsDb;

    // Phase correlation (Pearson coefficient, same as MeteringMath.h)
    var correlation = 0;
    if (isStereo) {
      var n = totalSamples;
      var num = n * sumLR - sumL * sumR;
      var denL = n * sumLL - sumL * sumL;
      var denR = n * sumRR - sumR * sumR;
      if (denL > 0 && denR > 0) {
        correlation = num / Math.sqrt(denL * denR);
        correlation = Math.max(-1, Math.min(1, correlation));
      }
    }

    // L/R balance: -1 = full left, +1 = full right, 0 = centered
    var balance = 0;
    if (isStereo && (sumAbsL + sumAbsR) > 0) {
      balance = (sumAbsR - sumAbsL) / (sumAbsR + sumAbsL);
    }

    // ---------------------------------------------------
    // Pass 2: K-weighted LUFS (integrated + LRA) + Tonal balance (3-band)
    // ---------------------------------------------------
    self.postMessage({ type: 'progress', pct: 30, label: 'Computing loudness and tonal balance...' });

    // Initialize K-weighting filters (for integrated LUFS)
    var kwFilterL = new KWeightingFilter();
    var kwFilterR = new KWeightingFilter();
    kwFilterL.initForSampleRate(sampleRate);
    kwFilterR.initForSampleRate(sampleRate);

    // 3-band crossover filters (per channel)
    var CROSSOVER_LOW = 200;
    var CROSSOVER_HIGH = 4000;

    var xover1LP_L = new LR4Filter(); xover1LP_L.setLowpass(CROSSOVER_LOW, sampleRate);
    var xover1HP_L = new LR4Filter(); xover1HP_L.setHighpass(CROSSOVER_LOW, sampleRate);
    var xover2LP_L = new LR4Filter(); xover2LP_L.setLowpass(CROSSOVER_HIGH, sampleRate);
    var xover2HP_L = new LR4Filter(); xover2HP_L.setHighpass(CROSSOVER_HIGH, sampleRate);
    // Phase compensation allpass for Low band (LP + HP at crossover 2 frequency)
    var allpassLP_L = new LR4Filter(); allpassLP_L.setLowpass(CROSSOVER_HIGH, sampleRate);
    var allpassHP_L = new LR4Filter(); allpassHP_L.setHighpass(CROSSOVER_HIGH, sampleRate);

    var xover1LP_R, xover1HP_R, xover2LP_R, xover2HP_R, allpassLP_R, allpassHP_R;
    if (isStereo) {
      xover1LP_R = new LR4Filter(); xover1LP_R.setLowpass(CROSSOVER_LOW, sampleRate);
      xover1HP_R = new LR4Filter(); xover1HP_R.setHighpass(CROSSOVER_LOW, sampleRate);
      xover2LP_R = new LR4Filter(); xover2LP_R.setLowpass(CROSSOVER_HIGH, sampleRate);
      xover2HP_R = new LR4Filter(); xover2HP_R.setHighpass(CROSSOVER_HIGH, sampleRate);
      allpassLP_R = new LR4Filter(); allpassLP_R.setLowpass(CROSSOVER_HIGH, sampleRate);
      allpassHP_R = new LR4Filter(); allpassHP_R.setHighpass(CROSSOVER_HIGH, sampleRate);
    }

    // Per-band K-weighting filters (3 bands x 2 channels)
    var bandKW_L = [new KWeightingFilter(), new KWeightingFilter(), new KWeightingFilter()];
    var bandKW_R = [new KWeightingFilter(), new KWeightingFilter(), new KWeightingFilter()];
    for (var b = 0; b < 3; b++) {
      bandKW_L[b].initForSampleRate(sampleRate);
      bandKW_R[b].initForSampleRate(sampleRate);
    }

    // LUFS block accumulation (100ms blocks for integrated LUFS + tonal balance)
    var samplesPerBlock = Math.floor(sampleRate * 0.1); // 100ms
    var blockSampleCount = 0;
    var kwSumL = 0, kwSumR = 0;
    var bandSumL = [0, 0, 0], bandSumR = [0, 0, 0];

    // Per-sample sliding windows for momentary (400ms) and short-term (3s)
    var momentaryWinSize = Math.floor(sampleRate * 0.4);
    var shortTermWinSize = Math.floor(sampleRate * 3.0);
    var momRing = new Float64Array(momentaryWinSize);
    var momSum = 0;
    var momPos = 0;
    var momentaryMax = -Infinity;
    var momentaryMaxAt = 0;
    var stRing = new Float64Array(shortTermWinSize);
    var stSum = 0;
    var stPos = 0;
    var shortTermMax = -Infinity;
    var shortTermMaxAt = 0;

    // Evaluate momentary/short-term every hopSize samples (≈10ms)
    var hopSize = Math.max(1, Math.floor(sampleRate * 0.01));

    // Integrated LUFS histogram (same as plugin)
    var integratedHist = new Int32Array(LUFS_HIST_BINS);
    var integratedCount = 0;
    var ungatedLinearSum = 0;

    // LRA histogram (populated with short-term LUFS values per EBU TECH 3342)
    var lraHist = new Int32Array(LUFS_HIST_BINS);
    var lraBlockCount = 0;
    var lraUngatedLinearSum = 0;

    // Short-term block buffer for LRA (100ms blocks, 30 blocks = 3s)
    var stBlockBuffer = [];

    // Band energy accumulators (integrated over whole file)
    var bandIntegratedSum = [0, 0, 0];

    for (var i = 0; i < totalSamples; i++) {
      var sL = left[i];
      var sR = isStereo ? right[i] : sL;

      // K-weight the full-band signal for LUFS
      var kwL = kwFilterL.process(sL);
      var kwR = kwFilterR.process(sR);
      kwSumL += kwL * kwL;
      kwSumR += kwR * kwR;

      // 3-band crossover (same topology as MultiBandSplitter.h)
      var lowL = xover1LP_L.process(sL);
      var upperL = xover1HP_L.process(sL);
      // Phase-compensate low band
      var apLPL = allpassLP_L.process(lowL);
      var apHPL = allpassHP_L.process(lowL);
      lowL = apLPL + apHPL;
      var midL = xover2LP_L.process(upperL);
      var highL = xover2HP_L.process(upperL);

      var lowR, midR, highR;
      if (isStereo) {
        lowR = xover1LP_R.process(sR);
        var upperR = xover1HP_R.process(sR);
        var apLPR = allpassLP_R.process(lowR);
        var apHPR = allpassHP_R.process(lowR);
        lowR = apLPR + apHPR;
        midR = xover2LP_R.process(upperR);
        highR = xover2HP_R.process(upperR);
      } else {
        lowR = lowL; midR = midL; highR = highL;
      }

      // K-weight each band and accumulate
      var bandsL = [lowL, midL, highL];
      var bandsR = [lowR, midR, highR];
      for (var b = 0; b < 3; b++) {
        var bkwL = bandKW_L[b].process(bandsL[b]);
        var bkwR = bandKW_R[b].process(bandsR[b]);
        bandSumL[b] += bkwL * bkwL;
        bandSumR[b] += bkwR * bkwR;
      }

      // Sliding window: update ring buffers with per-sample K-weighted energy
      var kwEnergy = kwL * kwL + kwR * kwR;
      momSum -= momRing[momPos];
      momRing[momPos] = kwEnergy;
      momSum += kwEnergy;
      momPos = (momPos + 1) % momentaryWinSize;

      stSum -= stRing[stPos];
      stRing[stPos] = kwEnergy;
      stSum += kwEnergy;
      stPos = (stPos + 1) % shortTermWinSize;

      // Evaluate momentary/short-term at hop intervals
      if (i % hopSize === 0) {
        if (i >= momentaryWinSize - 1) {
          var momLufs = meanSquareToLUFS(momSum / momentaryWinSize);
          if (momLufs > momentaryMax) { momentaryMax = momLufs; momentaryMaxAt = i; }
        }
        if (i >= shortTermWinSize - 1) {
          var stLufs = meanSquareToLUFS(stSum / shortTermWinSize);
          if (stLufs > shortTermMax) { shortTermMax = stLufs; shortTermMaxAt = i; }
        }
      }

      blockSampleCount++;

      // Commit block on 100ms boundary (for integrated LUFS, tonal balance, LRA)
      if (blockSampleCount >= samplesPerBlock) {
        var meanSq = (kwSumL + kwSumR) / blockSampleCount;
        var blockLufs = meanSquareToLUFS(meanSq);

        // LRA: track short-term LUFS from block averages (EBU TECH 3342)
        stBlockBuffer.push(blockLufs);
        if (stBlockBuffer.length > 30) stBlockBuffer.shift();
        if (stBlockBuffer.length >= 10) {
          var stBlockLufs = calculateLUFSFromBlocks(stBlockBuffer);
          if (stBlockLufs > ABSOLUTE_GATE_LUFS) {
            var lraBin = lufsToHistBin(stBlockLufs);
            lraHist[lraBin]++;
            lraBlockCount++;
            lraUngatedLinearSum += Math.pow(10, stBlockLufs * 0.1);
          }
        }

        // Integrated histogram with absolute gate
        if (blockLufs > ABSOLUTE_GATE_LUFS) {
          var bin = lufsToHistBin(blockLufs);
          integratedHist[bin]++;
          integratedCount++;
          ungatedLinearSum += Math.pow(10, blockLufs * 0.1);
        }

        // Band integrated energy
        for (var b = 0; b < 3; b++) {
          var bMeanSq = (bandSumL[b] + bandSumR[b]) / blockSampleCount;
          if (bMeanSq > 1e-14) bandIntegratedSum[b] += bMeanSq;
          bandSumL[b] = 0; bandSumR[b] = 0;
        }

        kwSumL = 0; kwSumR = 0;
        blockSampleCount = 0;
      }

      // Report progress
      if (i % Math.floor(totalSamples / 20) === 0) {
        self.postMessage({ type: 'progress', pct: 30 + (i / totalSamples) * 65 });
      }
    }

    // Handle final partial block
    if (blockSampleCount > 0) {
      var meanSq = (kwSumL + kwSumR) / blockSampleCount;
      var blockLufs = meanSquareToLUFS(meanSq);
      if (blockLufs > ABSOLUTE_GATE_LUFS) {
        var bin = lufsToHistBin(blockLufs);
        integratedHist[bin]++;
        integratedCount++;
        ungatedLinearSum += Math.pow(10, blockLufs * 0.1);
      }
      for (var b = 0; b < 3; b++) {
        var bMeanSq = (bandSumL[b] + bandSumR[b]) / blockSampleCount;
        if (bMeanSq > 1e-14) bandIntegratedSum[b] += bMeanSq;
      }
    }

    // ---------------------------------------------------
    // Compute Integrated LUFS (dual-gated per ITU-R BS.1770-4)
    // ---------------------------------------------------
    var integratedLUFS = -100;
    if (integratedCount > 0) {
      // Step 1: ungated mean
      var ungatedMean = 10 * Math.log10(ungatedLinearSum / integratedCount);
      // Step 2: relative gate at -10 LU below ungated mean
      var relativeGate = ungatedMean - 10;
      var relativeGateBin = lufsToHistBin(relativeGate);

      // Step 3: compute gated mean above relative gate
      var gatedSum = 0, gatedCount = 0;
      for (var b = relativeGateBin; b < LUFS_HIST_BINS; b++) {
        if (integratedHist[b] > 0) {
          var binCenter = LUFS_HIST_MIN + (b + 0.5) * LUFS_HIST_BIN_WIDTH;
          var linearPower = Math.pow(10, binCenter * 0.1);
          gatedSum += linearPower * integratedHist[b];
          gatedCount += integratedHist[b];
        }
      }
      if (gatedCount > 0) {
        integratedLUFS = 10 * Math.log10(gatedSum / gatedCount);
      }
    }

    // ---------------------------------------------------
    // Compute LRA (EBU TECH 3342 percentile method)
    // ---------------------------------------------------
    var lra = 0;
    if (lraBlockCount > 0) {
      var lraUngatedMean = 10 * Math.log10(lraUngatedLinearSum / lraBlockCount);
      var lraRelativeGate = lraUngatedMean - 20;
      var lraGateStartBin = lufsToHistBin(lraRelativeGate);

      var gatedTotal = 0;
      for (var b = lraGateStartBin; b < LUFS_HIST_BINS; b++) {
        gatedTotal += lraHist[b];
      }

      if (gatedTotal >= 2) {
        var target10 = Math.floor(gatedTotal * 0.10) + 1;
        var target95 = Math.floor(gatedTotal * 0.95) + 1;
        var p10 = LUFS_HIST_MIN;
        var p95 = LUFS_HIST_MAX;

        var cumulative = 0;
        for (var b = lraGateStartBin; b < LUFS_HIST_BINS; b++) {
          cumulative += lraHist[b];
          var binCenter = LUFS_HIST_MIN + (b + 0.5) * LUFS_HIST_BIN_WIDTH;
          if (cumulative >= target10 && p10 === LUFS_HIST_MIN) p10 = binCenter;
          if (cumulative >= target95) { p95 = binCenter; break; }
        }
        lra = Math.max(0, p95 - p10);
      }
    }

    // ---------------------------------------------------
    // Compute tonal balance percentages
    // ---------------------------------------------------
    var bandTotal = bandIntegratedSum[0] + bandIntegratedSum[1] + bandIntegratedSum[2];
    var bandContributions = [0, 0, 0];
    if (bandTotal > 0) {
      for (var b = 0; b < 3; b++) {
        bandContributions[b] = bandIntegratedSum[b] / bandTotal;
      }
    } else {
      bandContributions = [1 / 3, 1 / 3, 1 / 3];
    }
    var bandPct = roundToHundred(bandContributions);

    // ---------------------------------------------------
    // Compute stereo width (based on correlation)
    // width = 0 (mono) to 1 (fully decorrelated)
    // ---------------------------------------------------
    var stereoWidth = isStereo ? Math.max(0, 1 - correlation) / 2 : 0;
    // Clamp to 0-1 range for display; 0=mono, 0.5=balanced, 1=wide/inverted
    stereoWidth = Math.min(1, stereoWidth);

    // ---------------------------------------------------
    // Classify results
    // ---------------------------------------------------

    // Loudness status
    var loudnessStatus;
    if (integratedLUFS <= -100) loudnessStatus = 'Low';
    else if (integratedLUFS < -16) loudnessStatus = 'Low';
    else if (integratedLUFS < -10) loudnessStatus = 'Balanced';
    else if (integratedLUFS < -6) loudnessStatus = 'Loud';
    else loudnessStatus = 'Very Loud';

    // Peak clip risk
    var clipRisk;
    if (truePeakDb < -1.0) clipRisk = 'Safe';
    else if (truePeakDb < 0.0) clipRisk = 'Close to Limit';
    else clipRisk = 'Clipping Risk';

    // Dynamics status
    var dynamicsStatus;
    if (crestDb > 14) dynamicsStatus = 'Open';
    else if (crestDb > 8) dynamicsStatus = 'Balanced';
    else if (crestDb > 4) dynamicsStatus = 'Dense';
    else dynamicsStatus = 'Crushed';

    // Stereo status
    var stereoStatus;
    if (!isStereo) stereoStatus = 'Mono';
    else if (correlation > 0.85) stereoStatus = 'Narrow';
    else if (correlation > 0.5) stereoStatus = 'Balanced';
    else if (correlation > 0.15) stereoStatus = 'Wide';
    else stereoStatus = 'Very Wide';

    // Mono compatibility warning
    var monoWarning = isStereo && correlation < 0.3;

    // Tonal tilt label
    var tiltLabel;
    if (bandPct[0] >= bandPct[2] + 15) tiltLabel = 'Warm';
    else if (bandPct[2] >= bandPct[0] + 15) tiltLabel = 'Bright';
    else tiltLabel = 'Balanced';

    // ---------------------------------------------------
    // Findings engine
    // ---------------------------------------------------
    var findings = [];

    // Loudness findings
    if (integratedLUFS > -6) {
      findings.push({ message: 'The integrated loudness is very high at ' + integratedLUFS.toFixed(1) + ' LUFS. Most streaming platforms will apply significant loudness normalization.', severity: 'alert' });
    } else if (integratedLUFS > -10) {
      findings.push({ message: 'The loudness is on the high side at ' + integratedLUFS.toFixed(1) + ' LUFS. Streaming platforms may turn this down.', severity: 'notice' });
    } else if (integratedLUFS < -20 && integratedLUFS > -100) {
      findings.push({ message: 'The loudness is quite low at ' + integratedLUFS.toFixed(1) + ' LUFS. This may sound quiet compared to other material.', severity: 'notice' });
    } else if (integratedLUFS > -100) {
      findings.push({ message: 'The loudness sits at ' + integratedLUFS.toFixed(1) + ' LUFS, which is in a comfortable range for streaming.', severity: 'info' });
    }

    // Peak findings
    if (truePeakDb >= 0) {
      findings.push({ message: 'True peak reaches ' + truePeakDb.toFixed(1) + ' dBTP. This will likely clip on playback. Consider reducing the output level.', severity: 'alert' });
    } else if (truePeakDb > -1) {
      findings.push({ message: 'True peak is at ' + truePeakDb.toFixed(1) + ' dBTP, which is close to the limit. Most platforms require -1.0 dBTP or lower.', severity: 'warn' });
    }

    // Dynamics findings
    if (crestDb < 4) {
      findings.push({ message: 'The dynamics are heavily compressed with a crest factor of ' + crestDb.toFixed(1) + ' dB. The mix may sound fatiguing over time.', severity: 'warn' });
    } else if (crestDb > 18) {
      findings.push({ message: 'The dynamic range is very wide at ' + crestDb.toFixed(1) + ' dB crest factor. Some passages may feel too quiet relative to peaks.', severity: 'notice' });
    }

    // Stereo findings
    if (monoWarning) {
      findings.push({ message: 'Phase correlation is low (' + correlation.toFixed(2) + '). This mix may lose energy or clarity when summed to mono.', severity: 'warn' });
    }
    if (isStereo && Math.abs(balance) > 0.1) {
      var side = balance < 0 ? 'left' : 'right';
      findings.push({ message: 'The stereo balance leans ' + side + ' by about ' + Math.abs(balance * 100).toFixed(0) + '%.', severity: 'notice' });
    }

    // Tonal findings
    if (bandPct[2] >= bandPct[0] + 20) {
      findings.push({ message: 'The tonal balance leans bright, with the high band carrying ' + bandPct[2] + '% of the energy.', severity: 'notice' });
    } else if (bandPct[0] >= bandPct[2] + 20) {
      findings.push({ message: 'The tonal balance leans warm, with the low band carrying ' + bandPct[0] + '% of the energy.', severity: 'notice' });
    } else {
      findings.push({ message: 'The tonal balance is fairly even across the frequency range.', severity: 'info' });
    }

    // LRA finding
    if (lra > 15) {
      findings.push({ message: 'The loudness range is very wide at ' + lra.toFixed(1) + ' LU, indicating large differences between quiet and loud sections.', severity: 'notice' });
    }

    // Cap at 5 findings, prioritize by severity
    var severityOrder = { alert: 0, warn: 1, notice: 2, info: 3 };
    findings.sort(function (a, b) {
      return (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3);
    });
    findings = findings.slice(0, 5);

    // ---------------------------------------------------
    // Assemble result
    // ---------------------------------------------------
    self.postMessage({
      type: 'result',
      result: {
        loudness: {
          integrated: integratedLUFS,
          momentaryMax: momentaryMax === -Infinity ? -100 : momentaryMax,
          momentaryMaxAt: momentaryMaxAt / sampleRate,
          shortTermMax: shortTermMax === -Infinity ? -100 : shortTermMax,
          shortTermMaxAt: shortTermMaxAt / sampleRate,
          range: lra,
          status: loudnessStatus
        },
        peak: {
          samplePeakDb: samplePeakDb,
          samplePeakAt: samplePeakAt / sampleRate,
          truePeakDb: truePeakDb,
          truePeakAt: truePeakAt / sampleRate,
          clipRisk: clipRisk
        },
        dynamics: {
          rmsDb: rmsDb,
          crestDb: crestDb,
          status: dynamicsStatus
        },
        stereo: {
          balance: balance,
          width: stereoWidth,
          correlation: correlation,
          status: stereoStatus,
          monoWarning: monoWarning
        },
        tonal: {
          low: bandPct[0],
          mid: bandPct[1],
          high: bandPct[2],
          tiltLabel: tiltLabel
        },
        findings: findings
      }
    });

  } catch (err) {
    self.postMessage({ type: 'error', message: 'Analysis failed: ' + err.message });
  }
};

// Helper: calculate LUFS from array of block values
function calculateLUFSFromBlocks(blocks) {
  var sum = 0, valid = 0;
  for (var i = 0; i < blocks.length; i++) {
    if (blocks[i] > -100) {
      sum += Math.pow(10, blocks[i] * 0.1);
      valid++;
    }
  }
  if (valid === 0) return -100;
  return 10 * Math.log10(sum / valid);
}
