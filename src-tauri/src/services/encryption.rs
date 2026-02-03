use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit},
    Aes256Gcm, Key, Nonce
};
use bcrypt::{hash, verify, DEFAULT_COST};
use rand::RngCore;
use std::fs;
use std::path::Path;

pub struct EncryptionService {
    key: Option<Key<Aes256Gcm>>,
    password_hash: Option<String>,
}

impl EncryptionService {
    pub fn new() -> Self {
        Self {
            key: None,
            password_hash: None,
        }
    }

    pub fn initialize(&mut self, password: &str) -> Result<(), String> {
        // Hash password for verification
        self.password_hash = Some(
            hash(password, DEFAULT_COST)
                .map_err(|e| format!("Failed to hash password: {}", e))?
        );

        // Derive key from password (simplified - in production use PBKDF2 or Argon2)
        let key_bytes = self.derive_key(password);
        self.key = Some(Key::<Aes256Gcm>::from_slice(&key_bytes).clone());

        Ok(())
    }

    pub fn verify_password(&self, password: &str) -> bool {
        if let Some(ref hash) = self.password_hash {
            verify(password, hash).unwrap_or(false)
        } else {
            false
        }
    }

    pub fn is_initialized(&self) -> bool {
        self.key.is_some()
    }

    pub fn encrypt(&self, plaintext: &[u8]) -> Result<Vec<u8>, String> {
        let key = self.key.as_ref()
            .ok_or("Encryption not initialized")?;

        let cipher = Aes256Gcm::new(key);
        let nonce = Aes256Gcm::generate_nonce(&mut rand::thread_rng());
        
        let ciphertext = cipher
            .encrypt(&nonce, plaintext)
            .map_err(|e| format!("Encryption failed: {:?}", e))?;

        // Combine nonce + ciphertext
        let mut result = nonce.to_vec();
        result.extend_from_slice(&ciphertext);
        
        Ok(result)
    }

    pub fn decrypt(&self, ciphertext: &[u8]) -> Result<Vec<u8>, String> {
        let key = self.key.as_ref()
            .ok_or("Encryption not initialized")?;

        if ciphertext.len() < 12 {
            return Err("Invalid ciphertext".to_string());
        }

        let (nonce_bytes, encrypted_data) = ciphertext.split_at(12);
        let nonce = Nonce::from_slice(nonce_bytes);
        
        let cipher = Aes256Gcm::new(key);
        let plaintext = cipher
            .decrypt(nonce, encrypted_data)
            .map_err(|e| format!("Decryption failed: {:?}", e))?;

        Ok(plaintext)
    }

    fn derive_key(&self, password: &str) -> [u8; 32] {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let mut hasher = DefaultHasher::new();
        password.hash(&mut hasher);
        let hash1 = hasher.finish();

        let mut hasher = DefaultHasher::new();
        hash1.hash(&mut hasher);
        password.hash(&mut hasher);
        let hash2 = hasher.finish();

        let mut hasher = DefaultHasher::new();
        hash2.hash(&mut hasher);
        password.hash(&mut hasher);
        let hash3 = hasher.finish();

        let mut hasher = DefaultHasher::new();
        hash3.hash(&mut hasher);
        password.hash(&mut hasher);
        let hash4 = hasher.finish();

        let mut key = [0u8; 32];
        key[0..8].copy_from_slice(&hash1.to_le_bytes());
        key[8..16].copy_from_slice(&hash2.to_le_bytes());
        key[16..24].copy_from_slice(&hash3.to_le_bytes());
        key[24..32].copy_from_slice(&hash4.to_le_bytes());

        key
    }

    pub fn encrypt_file(&self, input_path: &Path, output_path: &Path) -> Result<(), String> {
        let data = fs::read(input_path)
            .map_err(|e| format!("Failed to read file: {}", e))?;
        
        let encrypted = self.encrypt(&data)?;
        
        fs::write(output_path, encrypted)
            .map_err(|e| format!("Failed to write file: {}", e))?;

        Ok(())
    }

    pub fn decrypt_file(&self, input_path: &Path, output_path: &Path) -> Result<(), String> {
        let data = fs::read(input_path)
            .map_err(|e| format!("Failed to read file: {}", e))?;
        
        let decrypted = self.decrypt(&data)?;
        
        fs::write(output_path, decrypted)
            .map_err(|e| format!("Failed to write file: {}", e))?;

        Ok(())
    }

    pub fn save_password_hash(&self, path: &Path) -> Result<(), String> {
        if let Some(ref hash) = self.password_hash {
            fs::write(path, hash)
                .map_err(|e| format!("Failed to save password hash: {}", e))?;
        }
        Ok(())
    }

    pub fn load_password_hash(&mut self, path: &Path) -> Result<(), String> {
        let hash = fs::read_to_string(path)
            .map_err(|e| format!("Failed to load password hash: {}", e))?;
        self.password_hash = Some(hash);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encryption_decryption() {
        let mut service = EncryptionService::new();
        service.initialize("test_password").unwrap();

        let plaintext = b"Hello, World!";
        let encrypted = service.encrypt(plaintext).unwrap();
        let decrypted = service.decrypt(&encrypted).unwrap();

        assert_eq!(plaintext.as_slice(), decrypted.as_slice());
    }

    #[test]
    fn test_password_verification() {
        let mut service = EncryptionService::new();
        service.initialize("correct_password").unwrap();

        assert!(service.verify_password("correct_password"));
        assert!(!service.verify_password("wrong_password"));
    }
}
