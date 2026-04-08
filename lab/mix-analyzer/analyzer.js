(function () {
  'use strict';

  // --- Constants ---
  const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB
  const MAX_DURATION_SEC = 20 * 60; // 20 minutes

  // --- DOM refs ---
  const uploadSection = document.getElementById('analyzer-upload');
  const processingSection = document.getElementById('analyzer-processing');
  const resultsSection = document.getElementById('analyzer-results');
  const errorSection = document.getElementById('analyzer-error');
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const processingFilename = document.getElementById('processing-filename');
  const progressBar = document.getElementById('progress-bar');
  const progressLabel = document.getElementById('progress-label');
  const summaryCards = document.getElementById('summary-cards');
  const findingsList = document.getElementById('findings-list');
  const errorMessage = document.getElementById('error-message');
  const analyzeAnother = document.getElementById('analyze-another');
  const errorRetry = document.getElementById('error-retry');

  let worker = null;

  // --- State management ---
  function showSection(section) {
    [uploadSection, processingSection, resultsSection, errorSection].forEach(
      s => s.hidden = true
    );
    section.hidden = false;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // --- File handling ---
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });

  analyzeAnother.addEventListener('click', resetToUpload);
  errorRetry.addEventListener('click', resetToUpload);

  function resetToUpload() {
    fileInput.value = '';
    if (worker) { worker.terminate(); worker = null; }
    showSection(uploadSection);
  }

  // Read native sample rate from WAV/AIFF header to avoid browser resampling
  function detectSampleRate(arrayBuffer) {
    try {
      var view = new DataView(arrayBuffer);
      var tag = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
      if (tag === 'RIFF') {
        // WAV: sample rate at byte 24 (little-endian)
        return view.getUint32(24, true);
      }
      if (tag === 'FORM') {
        // AIFF: sample rate at byte 26 (80-bit extended, read rough approximation)
        var exp = view.getUint16(26) - 16383;
        var mantissa = view.getUint32(28);
        return Math.round(mantissa * Math.pow(2, exp - 31));
      }
    } catch (e) { /* ignore parse errors */ }
    return null;
  }

  function handleFile(file) {
    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      showError('This file is too large. The Mix Analyzer supports files up to 200 MB.');
      return;
    }

    // Validate type (basic check — decodeAudioData will catch unsupported formats)
    const validTypes = ['audio/wav', 'audio/wave', 'audio/x-wav', 'audio/aiff',
      'audio/x-aiff', 'audio/mpeg', 'audio/mp3', 'audio/flac', 'audio/x-flac',
      'audio/aac', 'audio/mp4', 'audio/x-m4a', 'audio/m4a'];
    const validExtensions = ['.wav', '.aiff', '.aif', '.mp3', '.flac', '.m4a', '.aac'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) {
      showError('This file format is not supported. Please use WAV, AIFF, MP3, FLAC, or AAC/M4A.');
      return;
    }

    // Show processing
    processingFilename.textContent = file.name;
    setProgress(0, 'Reading file...');
    showSection(processingSection);

    // Read file and decode
    const reader = new FileReader();
    reader.onload = function () {
      setProgress(10, 'Decoding audio...');
      // Detect native sample rate from file header to prevent browser resampling
      const nativeSR = detectSampleRate(reader.result);
      const ctxOpts = nativeSR ? { sampleRate: nativeSR } : undefined;
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)(ctxOpts);
      audioCtx.decodeAudioData(reader.result).then(function (audioBuffer) {
        audioCtx.close();

        // Validate duration
        if (audioBuffer.duration > MAX_DURATION_SEC) {
          showError('This file is longer than 20 minutes. Please use a shorter file.');
          return;
        }

        setProgress(25, 'Analyzing...');
        runAnalysis(audioBuffer, file.name);
      }).catch(function () {
        showError('Unable to decode this audio file. It may be corrupted or in an unsupported format.');
      });
    };
    reader.onerror = function () {
      showError('Unable to read the file. Please try again.');
    };
    reader.readAsArrayBuffer(file);
  }

  function setProgress(pct, label) {
    progressBar.style.width = pct + '%';
    progressBar.setAttribute('aria-valuenow', pct);
    if (label) progressLabel.textContent = label;
  }

  function showError(msg) {
    errorMessage.textContent = msg;
    showSection(errorSection);
  }

  // --- Analysis via Worker ---
  function runAnalysis(audioBuffer, fileName) {
    // Extract channel data as transferable Float32Arrays
    const channels = [];
    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
      channels.push(audioBuffer.getChannelData(ch).slice()); // copy for transfer
    }

    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;
    const numChannels = audioBuffer.numberOfChannels;

    // Determine format from filename extension
    const ext = fileName.split('.').pop().toLowerCase();
    const formatMap = { wav: 'WAV', aiff: 'AIFF', aif: 'AIFF', mp3: 'MP3',
      flac: 'FLAC', m4a: 'AAC/M4A', aac: 'AAC/M4A' };
    const format = formatMap[ext] || ext.toUpperCase();

    worker = new Worker('worker.js?v=6');

    worker.onmessage = function (e) {
      const msg = e.data;
      if (msg.type === 'progress') {
        // Worker reports progress from 25-95%
        setProgress(25 + msg.pct * 0.7, msg.label || 'Analyzing...');
      } else if (msg.type === 'result') {
        setProgress(100, 'Done');
        msg.result.file = {
          name: fileName,
          durationSec: duration,
          sampleRate: sampleRate,
          channels: numChannels,
          format: format
        };
        renderResults(msg.result);
        showSection(resultsSection);
        worker.terminate();
        worker = null;
      } else if (msg.type === 'error') {
        showError(msg.message || 'An error occurred during analysis.');
        worker.terminate();
        worker = null;
      }
    };

    worker.onerror = function () {
      showError('An unexpected error occurred during analysis.');
      worker.terminate();
      worker = null;
    };

    // Transfer channel buffers to worker (zero-copy)
    const transferables = channels.map(ch => ch.buffer);
    worker.postMessage({
      channels: channels,
      sampleRate: sampleRate,
      numChannels: numChannels
    }, transferables);
  }

  // --- Result rendering ---
  function renderResults(result) {
    renderFileInfo(result.file);
    renderSummaryCards(result);
    renderFindings(result.findings);
    renderDetailLoudness(result);
    renderDetailPeak(result);
    renderDetailDynamics(result);
    renderDetailStereo(result);
    renderDetailTonal(result);
  }

  function renderFileInfo(file) {
    const dur = formatDuration(file.durationSec);
    const sr = (file.sampleRate / 1000).toFixed(1) + ' kHz';
    const ch = file.channels === 1 ? 'Mono' : file.channels === 2 ? 'Stereo' : file.channels + 'ch';
    document.getElementById('result-file-info').innerHTML =
      infoItem('File', file.name) +
      infoItem('Duration', dur) +
      infoItem('Sample Rate', sr) +
      infoItem('Channels', ch) +
      infoItem('Format', file.format);
  }

  function infoItem(label, value) {
    return '<span class="file-info-item"><span class="file-info-label">' + label +
      ':</span> <span class="file-info-value">' + value + '</span></span>';
  }

  function formatDuration(sec) {
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function fmtAt(sec) {
    if (sec === undefined || sec === null) return '';
    return ' <span class="detail-timestamp">at ' + formatDuration(sec) + '</span>';
  }

  function renderSummaryCards(result) {
    var html = '';
    html += summaryCard('Loudness', fmtDb(result.loudness.integrated) + ' LUFS',
      result.loudness.status, statusColor(result.loudness.status));
    html += summaryCard('Peak', fmtDb(result.peak.truePeakDb) + ' dBTP',
      result.peak.clipRisk, peakStatusColor(result.peak.clipRisk));
    html += summaryCard('Dynamics', fmtDb(result.dynamics.crestDb) + ' dB',
      result.dynamics.status, dynamicsStatusColor(result.dynamics.status));
    html += summaryCard('Stereo', fmtCorrelation(result.stereo.correlation),
      result.stereo.status, stereoStatusColor(result.stereo.status));
    html += summaryCard('Tonal', result.tonal.tiltLabel,
      bandSummary(result.tonal), 'status-blue');
    summaryCards.innerHTML = html;
  }

  function summaryCard(label, value, status, colorClass) {
    return '<div class="summary-card">' +
      '<div class="summary-card-label">' + label + '</div>' +
      '<div class="summary-card-value">' + value + '</div>' +
      '<span class="summary-card-status ' + colorClass + '">' + status + '</span>' +
      '</div>';
  }

  function fmtDb(val) {
    if (val === undefined || val === null) return '—';
    if (val <= -100) return '-inf';
    return (val >= 0 ? '+' : '') + val.toFixed(1);
  }

  function fmtCorrelation(val) {
    return (val >= 0 ? '+' : '') + val.toFixed(2);
  }

  function bandSummary(tonal) {
    return tonal.low + '% / ' + tonal.mid + '% / ' + tonal.high + '%';
  }

  // Status color mapping
  function statusColor(status) {
    var map = { 'Low': 'status-yellow', 'Balanced': 'status-green',
      'Loud': 'status-orange', 'Very Loud': 'status-red' };
    return map[status] || 'status-blue';
  }

  function peakStatusColor(status) {
    var map = { 'Safe': 'status-green', 'Close to Limit': 'status-yellow',
      'Clipping Risk': 'status-red' };
    return map[status] || 'status-blue';
  }

  function dynamicsStatusColor(status) {
    var map = { 'Open': 'status-blue', 'Balanced': 'status-green',
      'Dense': 'status-orange', 'Crushed': 'status-red' };
    return map[status] || 'status-blue';
  }

  function stereoStatusColor(status) {
    var map = { 'Mono': 'status-blue', 'Narrow': 'status-yellow',
      'Balanced': 'status-green', 'Wide': 'status-green',
      'Very Wide': 'status-orange' };
    return map[status] || 'status-blue';
  }

  function renderFindings(findings) {
    var html = '';
    findings.forEach(function (f) {
      var severityClass = 'severity-' + f.severity;
      var icon = f.severity === 'info' ? 'i' : f.severity === 'notice' ? '!' : f.severity === 'warn' ? '!' : '!!';
      html += '<li class="finding-item">' +
        '<span class="finding-icon ' + severityClass + '" aria-hidden="true">' + icon + '</span>' +
        '<span>' + f.message + '</span></li>';
    });
    findingsList.innerHTML = html;
  }

  function renderDetailLoudness(result) {
    var body = document.getElementById('detail-loudness-body');
    var html = detailRow('Integrated LUFS', fmtDb(result.loudness.integrated) + ' LUFS');
    html += detailRow('Momentary Max', fmtDb(result.loudness.momentaryMax) + ' LUFS' + fmtAt(result.loudness.momentaryMaxAt));
    html += detailRow('Short-term Max', fmtDb(result.loudness.shortTermMax) + ' LUFS' + fmtAt(result.loudness.shortTermMaxAt));
    html += detailRow('Loudness Range (LRA)', result.loudness.range.toFixed(1) + ' LU');
    html += detailRow('Status', result.loudness.status);
    html += '<p class="detail-explainer">Integrated is the overall loudness of your mix. Momentary Max is the loudest peak moment. Short-term Max is the loudest few seconds. Loudness Range shows how much variation there is between the quietest and loudest parts.</p>';
    body.innerHTML = html;
  }

  function renderDetailPeak(result) {
    var body = document.getElementById('detail-peak-body');
    var html = detailRow('Sample Peak', fmtDb(result.peak.samplePeakDb) + ' dBFS');
    html += detailRow('True Peak', fmtDb(result.peak.truePeakDb) + ' dBTP');
    html += detailRow('Clip Risk', result.peak.clipRisk);
    html += '<p class="detail-explainer">Sample peak is the highest level in the audio data. True peak catches peaks between samples that can cause distortion during playback. Most streaming platforms want true peak below -1.0 dBTP.</p>';
    body.innerHTML = html;
  }

  function renderDetailDynamics(result) {
    var body = document.getElementById('detail-dynamics-body');
    var html = detailRow('RMS Level', fmtDb(result.dynamics.rmsDb) + ' dBFS');
    html += detailRow('Crest Factor', result.dynamics.crestDb.toFixed(1) + ' dB');
    html += detailRow('Status', result.dynamics.status);
    html += '<p class="detail-explainer">Crest factor tells you how much headroom your mix has between average and peak levels. Higher means more dynamic, lower means more compressed. A healthy mix typically sits around 8\u201314 dB.</p>';
    body.innerHTML = html;
  }

  function renderDetailStereo(result) {
    var body = document.getElementById('detail-stereo-body');
    var isMono = result.file && result.file.channels === 1;
    if (isMono) {
      body.innerHTML = '<p style="color:var(--color-text-muted);font-size:0.9rem;">Stereo analysis is not available for mono files.</p>';
      return;
    }
    var html = detailRow('L/R Balance', formatBalance(result.stereo.balance));
    html += detailRow('Phase Correlation', fmtCorrelation(result.stereo.correlation));
    html += detailRow('Stereo Width', result.stereo.status);
    if (result.stereo.monoWarning) {
      html += '<p style="color:#ffb74d;font-size:0.85rem;margin-top:8px;">Phase correlation is low. This mix may lose energy or clarity when summed to mono.</p>';
    }
    // Phase correlation bar
    html += '<div class="phase-bar"><div class="phase-bar-fill" style="' + phaseBarStyle(result.stereo.correlation) + '"></div></div>';
    html += '<div class="phase-bar-labels"><span>-1</span><span>0</span><span>+1</span></div>';
    html += '<p class="detail-explainer">Correlation shows how similar the left and right channels are. Near +1 means very mono-like, near 0 means wide stereo, and negative values mean phase issues. Below +0.3 your mix may not translate well to mono playback (phones, clubs, Bluetooth speakers).</p>';
    body.innerHTML = html;
  }

  function phaseBarStyle(corr) {
    // Map correlation -1..+1 to 0%..100% of bar width
    // The fill extends from center (50%) toward the correlation value
    var center = 50;
    var pos = (corr + 1) / 2 * 100; // -1->0%, 0->50%, +1->100%
    var left, width;
    if (pos >= center) {
      left = center;
      width = pos - center;
    } else {
      left = pos;
      width = center - pos;
    }
    var color = corr >= 0.3 ? 'var(--color-primary)' : corr >= 0 ? '#ffd54f' : '#ef5350';
    return 'left:' + left + '%;width:' + width + '%;background:' + color;
  }

  function formatBalance(bal) {
    if (Math.abs(bal) < 0.01) return 'Centered';
    var pct = Math.abs(bal * 100).toFixed(0);
    return pct + '% ' + (bal < 0 ? 'Left' : 'Right');
  }

  function renderDetailTonal(result) {
    var body = document.getElementById('detail-tonal-body');
    var html = '<div class="tonal-bars">';
    html += tonalBar('Low', result.tonal.low, '< 200 Hz');
    html += tonalBar('Mid', result.tonal.mid, '200 Hz - 4 kHz');
    html += tonalBar('High', result.tonal.high, '> 4 kHz');
    html += '</div>';
    html += detailRow('Tilt', result.tonal.tiltLabel);
    html += '<p class="detail-explainer">Shows how your mix\'s energy is spread across low (sub/bass), mid, and high (presence/air) frequencies. Use this to spot if your mix is bass-heavy, thin, or well balanced.</p>';
    body.innerHTML = html;
  }

  function tonalBar(label, pct, sublabel) {
    var height = Math.max(5, pct); // min 5% visible
    return '<div class="tonal-bar-group">' +
      '<div class="tonal-bar-pct">' + pct + '%</div>' +
      '<div class="tonal-bar-track"><div class="tonal-bar-fill" style="height:' + height + '%"></div></div>' +
      '<div class="tonal-bar-label">' + label + '</div>' +
      '</div>';
  }

  function detailRow(label, value) {
    return '<div class="detail-row"><span class="detail-label">' + label +
      '</span><span class="detail-value">' + value + '</span></div>';
  }

})();
