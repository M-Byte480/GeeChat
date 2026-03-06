#![deny(clippy::all)]

use napi_derive::napi;
use nnnoiseless::DenoiseState;

/// Number of samples per RNNoise frame (fixed by the algorithm).
const FRAME: usize = 480;

/// Stateful RNNoise denoiser.  One instance per voice session.
/// Exposed to Node.js/Electron as a plain JS class via napi-rs.
#[napi]
pub struct Denoiser {
  state: Box<DenoiseState<'static>>,
}

#[napi]
impl Denoiser {
  /// Create a new denoiser.  Allocates the RNNoise GRU state (~10 KB).
  #[napi(constructor)]
  pub fn new() -> Self {
    Self {
      state: DenoiseState::new(),
    }
  }

  /// Process one 480-sample audio frame.
  ///
  /// `input`  — 480 numbers in the range [-1.0, 1.0]  (Web Audio float samples)
  /// Returns   — 480 numbers in the range [-1.0, 1.0]  (noise-suppressed)
  ///
  /// Called synchronously from Electron's preload via contextBridge, which in
  /// turn is called from ScriptProcessorNode.onaudioprocess in the renderer.
  #[napi]
  pub fn process_frame(&mut self, input: Vec<f64>) -> Vec<f64> {
    // RNNoise expects [-32768, 32768]; Web Audio uses [-1, 1]
    let mut buf_in  = [0.0f32; FRAME];
    let mut buf_out = [0.0f32; FRAME];

    for (i, &s) in input.iter().enumerate().take(FRAME) {
      buf_in[i] = s as f32 * 32768.0;
    }

    self.state.process_frame(&mut buf_out, &buf_in);

    buf_out.iter().map(|&s| (s / 32768.0) as f64).collect()
  }
}
