/**
 * NoiseSuppressor — AudioWorkletProcessor backed by nnnoiseless (RNNoise) via WASM.
 *
 * The ring buffer that matches 480-sample WASM frames to 128-sample Web Audio
 * blocks lives entirely inside the WASM (Rust) code.  This processor is a
 * trivial 3-step pass-through:
 *
 *   1. Copy 128 input samples → WASM INPUT_BLK
 *   2. Call process_block() — Rust accumulates, denoises, drains
 *   3. Copy 128 output samples ← WASM OUTPUT_BLK
 *
 * Zero JS heap allocations in the hot path.
 */
class NoiseSuppressor extends AudioWorkletProcessor {
  constructor(options) {
    super()
    this._wasm = null
    this._wasmIn = null
    this._wasmOut = null

    const wasmModule = options?.processorOptions?.wasmModule
    if (wasmModule) this._setup(wasmModule)
  }

  _setup(wasmModule) {
    try {
      const instance = new WebAssembly.Instance(wasmModule)
      const exp = instance.exports
      exp.init()
      this._wasm = exp
      // INPUT_BLK and OUTPUT_BLK are 128-element static arrays in WASM memory.
      // These views are stable — the Rust code never grows WASM memory after init().
      this._wasmIn = new Float32Array(exp.memory.buffer, exp.input_ptr(), 128)
      this._wasmOut = new Float32Array(exp.memory.buffer, exp.output_ptr(), 128)
    } catch {
      this._wasm = null
    }
  }

  process(inputs, outputs) {
    const inp = inputs[0]?.[0]
    const out = outputs[0]?.[0]
    if (!out) return true

    if (!this._wasm || !inp) {
      if (inp) out.set(inp)
      return true
    }

    // WASM memory can grow during the first few process_block() calls while
    // nnnoiseless warms up its allocator.  If that happens the typed-array views
    // are detached — refresh them cheaply with a single pointer comparison.
    if (this._wasmIn.buffer !== this._wasm.memory.buffer) {
      this._wasmIn = new Float32Array(this._wasm.memory.buffer, this._wasm.input_ptr(), 128)
      this._wasmOut = new Float32Array(this._wasm.memory.buffer, this._wasm.output_ptr(), 128)
    }

    this._wasmIn.set(inp) // 128 floats [-1,1] → WASM INPUT_BLK
    this._wasm.process_block() // Rust handles ring buffer + nnnoiseless
    out.set(this._wasmOut) // WASM OUTPUT_BLK → 128 floats [-1,1]

    return true
  }
}

registerProcessor('noise-suppressor', NoiseSuppressor)
