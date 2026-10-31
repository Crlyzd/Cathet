pub const ERR_UNSUPPORTED_DATA: &str =
    "This file contains binary data or an unsupported encoding. Cathet supports plain text and markdown documents.";

fn decode_utf16_le(bytes: &[u8]) -> Result<String, String> {
    if bytes.len() % 2 != 0 {
        return Err(ERR_UNSUPPORTED_DATA.to_string());
    }
    let u16s: Vec<u16> = bytes
        .chunks_exact(2)
        .map(|c| u16::from_le_bytes([c[0], c[1]]))
        .collect();
    std::char::decode_utf16(u16s)
        .collect::<Result<String, _>>()
        .map_err(|_| ERR_UNSUPPORTED_DATA.to_string())
}

fn decode_utf16_be(bytes: &[u8]) -> Result<String, String> {
    if bytes.len() % 2 != 0 {
        return Err(ERR_UNSUPPORTED_DATA.to_string());
    }
    let u16s: Vec<u16> = bytes
        .chunks_exact(2)
        .map(|c| u16::from_be_bytes([c[0], c[1]]))
        .collect();
    std::char::decode_utf16(u16s)
        .collect::<Result<String, _>>()
        .map_err(|_| ERR_UNSUPPORTED_DATA.to_string())
}

#[cfg(windows)]
fn decode_windows_ansi(bytes: &[u8]) -> Result<String, String> {
    use windows_sys::Win32::Globalization::{MultiByteToWideChar, CP_ACP};
    if bytes.is_empty() {
        return Ok(String::new());
    }
    let len = unsafe {
        MultiByteToWideChar(CP_ACP, 0, bytes.as_ptr(), bytes.len() as i32, std::ptr::null_mut(), 0)
    };
    if len <= 0 {
        return Err(ERR_UNSUPPORTED_DATA.to_string());
    }
    let mut wide: Vec<u16> = vec![0; len as usize];
    let written = unsafe {
        MultiByteToWideChar(CP_ACP, 0, bytes.as_ptr(), bytes.len() as i32, wide.as_mut_ptr(), len)
    };
    if written <= 0 {
        return Err(ERR_UNSUPPORTED_DATA.to_string());
    }
    String::from_utf16(&wide).map_err(|_| ERR_UNSUPPORTED_DATA.to_string())
}

#[cfg(not(windows))]
fn decode_windows_ansi(bytes: &[u8]) -> Result<String, String> {
    Ok(bytes.iter().map(|&b| b as char).collect())
}

/// Decodes raw file bytes into a UTF-8 String using a zero-bloat pipeline:
/// 1. BOM detection (UTF-8, UTF-16 LE, UTF-16 BE)
/// 2. Direct UTF-8 validation
/// 3. Heuristic UTF-16 LE detection (BOM-less)
/// 4. Binary guard (detects unprintable null bytes)
/// 5. Windows ANSI / System ACP fallback via Win32 MultiByteToWideChar
pub fn decode_text_bytes(bytes: &[u8]) -> Result<String, String> {
    if bytes.is_empty() {
        return Ok(String::new());
    }

    // 1. Check Byte Order Marks (BOM)
    if bytes.starts_with(&[0xEF, 0xBB, 0xBF]) {
        return String::from_utf8(bytes[3..].to_vec())
            .map_err(|_| ERR_UNSUPPORTED_DATA.to_string());
    }
    if bytes.starts_with(&[0xFF, 0xFE]) {
        return decode_utf16_le(&bytes[2..]);
    }
    if bytes.starts_with(&[0xFE, 0xFF]) {
        return decode_utf16_be(&bytes[2..]);
    }

    // 2. Direct UTF-8 validation (standard path for >95% of documents)
    if let Ok(s) = String::from_utf8(bytes.to_vec()) {
        return Ok(s);
    }

    // 3. BOM-less UTF-16 LE heuristic (dominant alternating null bytes)
    if bytes.len() >= 4 && bytes.len() % 2 == 0 {
        let sample = &bytes[..bytes.len().min(512)];
        let null_odds = sample.iter().enumerate().filter(|(i, &b)| i % 2 == 1 && b == 0).count();
        if null_odds as f32 / (sample.len() / 2) as f32 > 0.7 {
            if let Ok(s) = decode_utf16_le(bytes) {
                return Ok(s);
            }
        }
    }

    // 4. Binary guard: null bytes outside UTF-16 indicate binary files
    if bytes.iter().take(4096).any(|&b| b == 0) {
        return Err(ERR_UNSUPPORTED_DATA.to_string());
    }

    // 5. Windows ANSI / System ACP fallback
    decode_windows_ansi(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_utf8_plain() {
        let input = b"Hello world! \xf0\x9f\x91\x8d";
        assert_eq!(decode_text_bytes(input).unwrap(), "Hello world! 👍");
    }

    #[test]
    fn test_utf8_bom() {
        let mut input = vec![0xEF, 0xBB, 0xBF];
        input.extend_from_slice(b"# Title in UTF-8 BOM");
        assert_eq!(decode_text_bytes(&input).unwrap(), "# Title in UTF-8 BOM");
    }

    #[test]
    fn test_utf16_le_bom() {
        let mut input = vec![0xFF, 0xFE];
        for ch in "Cathet UTF-16 LE".encode_utf16() {
            input.extend_from_slice(&ch.to_le_bytes());
        }
        assert_eq!(decode_text_bytes(&input).unwrap(), "Cathet UTF-16 LE");
    }

    #[test]
    fn test_utf16_be_bom() {
        let mut input = vec![0xFE, 0xFF];
        for ch in "Cathet UTF-16 BE".encode_utf16() {
            input.extend_from_slice(&ch.to_be_bytes());
        }
        assert_eq!(decode_text_bytes(&input).unwrap(), "Cathet UTF-16 BE");
    }

    #[test]
    fn test_binary_guard_rejects_nulls() {
        let binary_data = vec![0x41, 0x42, 0x00, 0x43, 0xFF, 0xEE];
        assert!(decode_text_bytes(&binary_data).is_err());
    }

    #[cfg(windows)]
    #[test]
    fn test_windows_ansi_fallback() {
        // 0x93 and 0x94 are Windows-1252 curly quotes " "
        let ansi_bytes = [0x93, b'H', b'i', 0x94];
        let decoded = decode_text_bytes(&ansi_bytes);
        assert!(decoded.is_ok());
    }

    #[test]
    fn test_real_dji_file_if_exists() {
        let path = std::path::Path::new("F:\\DJI_0741.txt");
        if path.exists() {
            let bytes = std::fs::read(path).expect("Failed to read F:\\DJI_0741.txt");
            let decoded = decode_text_bytes(&bytes).expect("Failed to decode F:\\DJI_0741.txt");
            assert!(decoded.contains("General"));
            println!("Decoded DJI_0741.txt successfully! Length: {} characters", decoded.len());
        }
    }
}
