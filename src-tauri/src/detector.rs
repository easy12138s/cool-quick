use regex::Regex;
use std::collections::HashMap;
use once_cell::sync::Lazy;

#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ContentType {
    Phone,
    Email,
    Url,
    Code,
    Password,
    Text,
}

impl ContentType {
    pub fn to_string(&self) -> String {
        match self {
            ContentType::Phone => "phone",
            ContentType::Email => "email",
            ContentType::Url => "url",
            ContentType::Code => "code",
            ContentType::Password => "password",
            ContentType::Text => "text",
        }.to_string()
    }

    pub fn icon(&self) -> &'static str {
        match self {
            ContentType::Phone => "📱",
            ContentType::Email => "✉️",
            ContentType::Url => "🔗",
            ContentType::Code => "💻",
            ContentType::Password => "🔐",
            ContentType::Text => "📝",
        }
    }
}

#[derive(Clone)]
pub struct ContentDetector {
    patterns: HashMap<String, Regex>,
}

impl ContentDetector {
    pub fn new() -> Self {
        let mut patterns = HashMap::new();
        
        // Phone number patterns
        patterns.insert(
            "phone_cn".to_string(),
            Regex::new(r"^1[3-9]\d{9}$").unwrap(),
        );
        patterns.insert(
            "phone_intl".to_string(),
            Regex::new(r"^\+[1-9]\d{1,14}$").unwrap(),
        );
        
        // Email pattern
        patterns.insert(
            "email".to_string(),
            Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$").unwrap(),
        );
        
        // URL pattern
        patterns.insert(
            "url".to_string(),
            Regex::new(r"^https?://.+|^www\..+").unwrap(),
        );
        
        // Code patterns
        patterns.insert(
            "code_braces".to_string(),
            Regex::new(r"[{};]|\b(function|class|def|import|from|const|let|var|if|for|while|return)\b").unwrap(),
        );
        
        Self { patterns }
    }

    pub fn detect(&self, content: &str) -> ContentType {
        let trimmed = content.trim();
        
        // Check phone numbers
        if self.patterns.get("phone_cn").unwrap().is_match(trimmed) ||
           self.patterns.get("phone_intl").unwrap().is_match(trimmed) {
            return ContentType::Phone;
        }
        
        // Check email
        if self.patterns.get("email").unwrap().is_match(trimmed) {
            return ContentType::Email;
        }
        
        // Check URL
        if self.patterns.get("url").unwrap().is_match(trimmed) {
            return ContentType::Url;
        }
        
        // Check password (high entropy)
        if self.is_password(trimmed) {
            return ContentType::Password;
        }
        
        // Check code
        if self.patterns.get("code_braces").unwrap().is_match(trimmed) {
            return ContentType::Code;
        }
        
        ContentType::Text
    }

    fn is_password(&self, content: &str) -> bool {
        if content.len() < 8 {
            return false;
        }
        
        let has_upper = content.chars().any(|c| c.is_ascii_uppercase());
        let has_lower = content.chars().any(|c| c.is_ascii_lowercase());
        let has_digit = content.chars().any(|c| c.is_ascii_digit());
        let has_special = content.chars().any(|c| !c.is_alphanumeric());
        
        // High entropy: multiple character types
        let entropy_score = [has_upper, has_lower, has_digit, has_special]
            .iter()
            .filter(|&&x| x)
            .count();
        
        entropy_score >= 3 && content.len() >= 10
    }
}
