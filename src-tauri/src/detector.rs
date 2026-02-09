#![allow(dead_code)]

use regex::Regex;
use std::collections::HashMap;

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
            ContentType::Password => "🔒",
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

        // Password patterns - 检测可能的密码内容
        // 只使用关键词匹配，复杂模式在 is_likely_password 函数中处理
        // 常见密码关键词
        patterns.insert(
            "password_keywords".to_string(),
            Regex::new(r"(?i)\b(password|passwd|pwd|pass|密钥|密码)\b[:\s]*").unwrap(),
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

        // Check password - 使用关键词匹配和启发式检测
        if self.patterns.get("password_keywords").unwrap().is_match(trimmed) ||
           self.is_likely_password(trimmed) {
            return ContentType::Password;
        }
        
        // Check code
        if self.patterns.get("code_braces").unwrap().is_match(trimmed) {
            return ContentType::Code;
        }
        
        ContentType::Text
    }

    /// 判断内容是否可能是密码（辅助检测）
    fn is_likely_password(&self, content: &str) -> bool {
        // 如果是纯数字验证码（短于6位），不是密码
        if content.chars().all(|c| c.is_ascii_digit()) && content.len() < 6 {
            return false;
        }

        // 密码特征检测
        let length = content.len();
        let has_upper = content.chars().any(|c| c.is_ascii_uppercase());
        let has_lower = content.chars().any(|c| c.is_ascii_lowercase());
        let has_digit = content.chars().any(|c| c.is_ascii_digit());
        let has_special = content.chars().any(|c| !c.is_alphanumeric());

        // 强密码特征：8位以上，包含至少3种字符类型
        if length >= 8 {
            let char_types = [has_upper, has_lower, has_digit, has_special]
                .iter()
                .filter(|&&x| x)
                .count();
            if char_types >= 3 {
                return true;
            }
        }

        // 排除常见的非密码内容
        // 排除纯数字长串（如订单号）
        if content.chars().all(|c| c.is_ascii_digit()) && length > 20 {
            return false;
        }

        // 排除纯字母长串（如英文段落）
        if content.chars().all(|c| c.is_ascii_alphabetic() || c.is_whitespace()) && length > 50 {
            return false;
        }

        // 排除包含空格的（密码通常不包含空格）
        if content.contains(' ') {
            return false;
        }

        // 中等密码特征：6-15位，包含大小写或数字和特殊字符
        if length >= 6 && length <= 32 {
            let char_types = [has_upper, has_lower, has_digit, has_special]
                .iter()
                .filter(|&&x| x)
                .count();
            if char_types >= 2 {
                // 进一步验证：不包含常见标点符号分隔符
                let common_separators = ['.', ',', ';', ':', '-', '_', '/'];
                if !content.chars().any(|c| common_separators.contains(&c)) {
                    return true;
                }
            }
        }

        false
    }
}
