// processor.js (The Worklet)
class MyRustProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    // Load your Rust WASM module here
  }

  process(inputs, _outputs) {
    const input = inputs[0][0] // Raw microphone samples
    if (input) {
      this.rustModule.process(input) // Call your Rust function
    }
    return true
  }
}
registerProcessor('my-rust-processor', MyRustProcessor)
