use std::collections::HashMap;

// Simple PDF generation using basic PDF structure
pub struct PdfService;

impl PdfService {
    pub fn new() -> Self {
        Self
    }

    pub fn generate_pdf(
        &self,
        notes: &Vec<crate::models::Note>,
        include_metadata: bool,
    ) -> Result<Vec<u8>, String> {
        let mut pdf_content = String::new();
        
        // PDF Header
        pdf_content.push_str("%PDF-1.4\n");
        // Binary comment to indicate binary content (using bytes)
        pdf_content.push('%' as char);
        pdf_content.push(0xe2 as char);
        pdf_content.push(0xe3 as char);
        pdf_content.push(0xcf as char);
        pdf_content.push(0xd3 as char);
        pdf_content.push('\n');

        let _objects: Vec<String> = Vec::new();
        let mut object_offsets: Vec<usize> = Vec::new();

        // Object 1: Catalog
        object_offsets.push(pdf_content.len());
        pdf_content.push_str("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

        // Object 2: Pages
        let page_count = (notes.len() / 10) + 1;
        object_offsets.push(pdf_content.len());
        let mut kids = String::from("[");
        for i in 0..page_count {
            if i > 0 {
                kids.push_str(" ");
            }
            kids.push_str(&format!("{} 0 R", i + 3));
        }
        kids.push_str("]");
        pdf_content.push_str(&format!("2 0 obj\n<< /Type /Pages /Kids {} /Count {} >>\nendobj\n", kids, page_count));

        // Generate pages
        let type_names: HashMap<&str, &str> = [
            ("phone", "Phone Number"),
            ("email", "Email"),
            ("url", "URL"),
            ("code", "Code"),
            ("password", "Password"),
            ("text", "Text"),
        ].iter().cloned().collect();

        let mut note_index = 0;
        for page_num in 0..page_count {
            let page_obj_num = page_num + 3;
            object_offsets.push(pdf_content.len());

            let mut page_content = String::from("");
            page_content.push_str("q\n"); // Save graphics state
            page_content.push_str("BT\n"); // Begin text
            page_content.push_str("/F1 12 Tf\n"); // Set font
            page_content.push_str("50 750 Td\n"); // Move to position

            // Title
            page_content.push_str(&format!("(CoolQuick Notes - Page {}) Tj\n", page_num + 1));
            page_content.push_str("0 -20 Td\n");
            page_content.push_str("(Generated: ");
            page_content.push_str(&chrono::Local::now().format("%Y-%m-%d %H:%M").to_string());
            page_content.push_str(") Tj\n");
            page_content.push_str("0 -30 Td\n");

            // Notes on this page (up to 10)
            let notes_on_page = notes.iter().skip(note_index).take(10);
            for note in notes_on_page {
                let note_type_str = note.note_type.clone();
                let type_name = type_names.get(note.note_type.as_str())
                    .map(|&s| s)
                    .unwrap_or_else(|| note_type_str.as_str());
                
                page_content.push_str(&format!("(Type: {}) Tj\n", type_name));
                page_content.push_str("0 -15 Td\n");

                if include_metadata {
                    let date_str = chrono::DateTime::from_timestamp_secs(note.created_at)
                        .map(|d: chrono::DateTime<chrono::Utc>| d.format("%Y-%m-%d %H:%M").to_string())
                        .unwrap_or_default();
                    page_content.push_str(&format!("(Date: {}) Tj\n", date_str));
                    page_content.push_str("0 -15 Td\n");
                }

                // Content (truncate if too long)
                let content = if note.content.len() > 200 {
                    format!("{}...", &note.content[..200])
                } else {
                    note.content.clone()
                };
                
                // Escape special characters
                let content = content
                    .replace('\\', "\\\\")
                    .replace('(', "\\(")
                    .replace(')', "\\)")
                    .replace('\n', "\\n");

                page_content.push_str(&format!("(Content: {}) Tj\n", content));
                page_content.push_str("0 -30 Td\n");

                note_index += 1;
            }

            page_content.push_str("ET\n"); // End text
            page_content.push_str("Q\n"); // Restore graphics state

            // Compress content (simplified - real implementation would use flate2)
            let compressed_content = page_content.clone();

            // Content stream object
            let content_obj_num = page_count + 3 + page_num;
            object_offsets.push(pdf_content.len());
            pdf_content.push_str(&format!(
                "{} 0 obj\n<< /Length {} >>\nstream\n{}\nendstream\nendobj\n",
                content_obj_num,
                compressed_content.len(),
                compressed_content
            ));

            // Page object
            pdf_content.push_str(&format!(
                "{} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents {} 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>\nendobj\n",
                page_obj_num,
                content_obj_num
            ));
        }

        // Build xref table
        let xref_offset = pdf_content.len();
        let obj_count = object_offsets.len() + 1;
        
        pdf_content.push_str(&format!("xref\n0 {}\n", obj_count));
        pdf_content.push_str("0000000000 65535 f \n");
        for offset in &object_offsets {
            pdf_content.push_str(&format!("{:010} 00000 n \n", offset));
        }

        // Trailer
        pdf_content.push_str(&format!(
            "trailer\n<< /Size {} /Root 1 0 R >>\nstartxref\n{}\n%%EOF\n",
            obj_count,
            xref_offset
        ));

        Ok(pdf_content.into_bytes())
    }
}
