use wasm_bindgen::prelude::*;
use js_sys::Float32Array;
use web_sys::{HtmlCanvasElement, CanvasRenderingContext2d, ImageData};

#[wasm_bindgen]
pub struct FingerprintGenerator {
    seed: u32,
}

#[wasm_bindgen]
impl FingerprintGenerator {
    #[wasm_bindgen(constructor)]
    pub fn new(seed: u32) -> FingerprintGenerator {
        FingerprintGenerator { seed }
    }

    fn next(&mut self) -> f64 {
        self.seed ^= self.seed << 13;
        self.seed ^= self.seed >> 17;
        self.seed ^= self.seed << 5;
        (self.seed as f64) / 4294967296.0
    }

    fn create_canvas(&self, width: u32, height: u32) -> Result<(HtmlCanvasElement, CanvasRenderingContext2d), JsValue> {
        let document = web_sys::window().unwrap().document().unwrap();
        let canvas = document.create_element("canvas")?.dyn_into::<HtmlCanvasElement>()?;
        canvas.set_width(width);
        canvas.set_height(height);
        let ctx = canvas.get_context("2d")?.unwrap().dyn_into::<CanvasRenderingContext2d>()?;
        Ok((canvas, ctx))
    }

    #[wasm_bindgen]
    pub fn generate_canvas_noise(&mut self, width: u32, height: u32) -> ImageData {
        let (_canvas, ctx) = self.create_canvas(width, height).unwrap();
        
        let image_data = ctx.create_image_data_with_sw_and_sh(width as f64, height as f64).unwrap();
        let mut data = image_data.data();
        
        for i in (0..data.len()).step_by(4) {
            let noise = (self.next() * 6.0 - 3.0) as i8;
            data[i] = data[i].saturating_add_signed(noise) as u8;
            data[i + 1] = data[i + 1].saturating_add_signed(noise) as u8;
            data[i + 2] = data[i + 2].saturating_add_signed(noise) as u8;
        }
        
        image_data
    }

    #[wasm_bindgen]
    pub fn generate_perlin_noise(&mut self, width: u32, height: u32, scale: f64) -> ImageData {
        let (_canvas, ctx) = self.create_canvas(width, height).unwrap();
        
        let image_data = ctx.create_image_data_with_sw_and_sh(width as f64, height as f64).unwrap();
        let mut data = image_data.data();
        
        let perm: Vec<u8> = (0..256).map(|_| (self.next() * 256.0) as u8).collect();
        
        for y in 0..height {
            for x in 0..width {
                let nx = x as f64 / width as f64 * scale;
                let ny = y as f64 / height as f64 * scale;
                let value = self.perlin_noise(nx, ny, &perm);
                let idx = ((y * width + x) * 4) as usize;
                let v = ((value + 1.0) * 127.5) as u8;
                data[idx] = v;
                data[idx + 1] = v;
                data[idx + 2] = v;
                data[idx + 3] = 255;
            }
        }
        
        image_data
    }

    fn perlin_noise(&self, x: f64, y: f64, perm: &[u8]) -> f64 {
        let xi = x.floor() as i32 & 255;
        let yi = y.floor() as i32 & 255;
        let xf = x - x.floor();
        let yf = y - y.floor();
        
        let u = self.fade(xf);
        let v = self.fade(yf);
        
        let aa = perm[(perm[xi as usize] as usize + yi as usize) % 256] as f64 / 255.0;
        let ab = perm[(perm[xi as usize] as usize + (yi + 1) as usize) % 256] as f64 / 255.0;
        let ba = perm[(perm[(xi + 1) as usize] as usize + yi as usize) % 256] as f64 / 255.0;
        let bb = perm[(perm[(xi + 1) as usize] as usize + (yi + 1) as usize) % 256] as f64 / 255.0;
        
        let x1 = self.lerp(aa, ba, u);
        let x2 = self.lerp(ab, bb, u);
        self.lerp(x1, x2, v) * 2.0 - 1.0
    }

    fn fade(&self, t: f64) -> f64 {
        t * t * t * (t * (t * 6.0 - 15.0) + 10.0)
    }

    fn lerp(&self, a: f64, b: f64, t: f64) -> f64 {
        a + t * (b - a)
    }

    #[wasm_bindgen]
    pub fn generate_pink_noise(&mut self, length: usize) -> Float32Array {
        let mut buffer = vec![0.0f32; length];
        let mut b0 = 0.0f32;
        let mut b1 = 0.0f32;
        let mut b2 = 0.0f32;
        let mut b3 = 0.0f32;
        let mut b4 = 0.0f32;
        let mut b5 = 0.0f32;
        let mut b6 = 0.0f32;

        for i in 0..length {
            let white = (self.next() as f32 * 2.0 - 1.0) * 0.001;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.76160 * b5 - white * 0.0168980;
            buffer[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.0001;
            b6 = white * 0.115926;
        }

        Float32Array::from(buffer.as_slice())
    }

    #[wasm_bindgen]
    pub fn hash_string(&mut self, input: &str) -> u32 {
        let mut hash = 0xdeadbeefu32;
        for byte in input.bytes() {
            hash = hash.wrapping_mul(2654435761).wrapping_add(byte as u32);
        }
        hash ^ (hash >> 16)
    }

    fn to_base36(&self, mut n: u32) -> String {
        if n == 0 { return "0".to_string(); }
        let mut digits = String::new();
        while n > 0 {
            let d = (n % 36) as u8;
            let c = if d < 10 { b'0' + d } else { b'a' + (d - 10) };
            digits.push(c as char);
            n /= 36;
        }
        digits.chars().rev().collect()
    }

    #[wasm_bindgen]
    pub fn derive_profile_id(&mut self, base_id: &str, origin: &str) -> String {
        let combined = format!("{}:{}", base_id, origin);
        let hash = self.hash_string(&combined);
        format!("{}:{}", base_id, self.to_base36(hash))
    }

    #[wasm_bindgen]
    pub fn generate_profile_seed(&mut self, profile_id: &str) -> u32 {
        self.hash_string(profile_id)
    }
}

#[wasm_bindgen]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}