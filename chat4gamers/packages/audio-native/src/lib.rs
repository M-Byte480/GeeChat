use napi_derive::napi;
use napi::bindgen_prelude::*;

#[napi]
pub struct NoiseGate {
  threshold: f64,
}

#[napi]
impl NoiseGate {
  // This creates the filter in JavaScript: const gate = new NoiseGate(0.05)
  #[napi(constructor)]
  pub fn new(threshold: f64) -> Self {
    NoiseGate { threshold }
  }

  // This is the high-speed loop that processes the audio data
  #[napi]
  pub fn process(&self, mut data: Vec<f64>) -> Vec<f64> {
    for sample in data.iter_mut() {
      // If the volume of this specific sample is below the threshold, kill it
      if sample.abs() < self.threshold {
        *sample = 0.0;
      }
    }
    data
  }

  // Version 2: High-speed (Zero Copy)
  #[napi]
  pub fn process_audio_fast(&self, mut data: Float32Array) {
    let thresh = self.threshold as f32;
    println!("Rust processing {} samples", data.len());

    // We use unsafe here to get direct mutable access to the JS memory
    unsafe {
      let slice = data.as_mut();
      for sample in slice.iter_mut() {
        if sample.abs() < thresh {
          *sample = 0.0;
        }
      }
    }
  }
}
