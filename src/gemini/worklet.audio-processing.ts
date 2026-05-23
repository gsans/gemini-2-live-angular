const AudioRecordingWorklet = `
class AudioProcessingWorklet extends AudioWorkletProcessor {
  // send and clear buffer every 2048 samples, 
  // which at 16khz is about 8 times a second
  buffer = new Int16Array(2048);

  // current write index
  bufferWriteIndex = 0;

  /**
   * @param inputs Float32Array[][] [input#][channel#][sample#] so to access first inputs 1st channel inputs[0][0]
   */
  process(inputs) {
    if (inputs[0] && inputs[0].length > 0) {
      const channel0 = inputs[0][0];
      this.processChunk(channel0);
    }
    return true;
  }

  sendAndClearBuffer() {
    this.port.postMessage({
      event: "chunk",
      data: {
        int16arrayBuffer: this.buffer.slice(0, this.bufferWriteIndex).buffer,
      },
    });
    this.bufferWriteIndex = 0;
  }

  processChunk(float32Array) {
    const l = float32Array.length;
    for (let i = 0; i < l; i++) {
      // 1. Safe Clamp between -1.0 and 1.0 to prevent overflow
      const clamped = Math.max(-1.0, Math.min(1.0, float32Array[i]));
      // 2. Perform safe scaling based on polarity
      const int16Value = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
      
      this.buffer[this.bufferWriteIndex++] = int16Value;
      if (this.bufferWriteIndex >= this.buffer.length) {
        this.sendAndClearBuffer();
      }
    }
  }
}
`;

export default AudioRecordingWorklet;